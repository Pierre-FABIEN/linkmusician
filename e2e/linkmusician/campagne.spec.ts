import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { makeAccount } from '../support/account';
import { db, deleteUser, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { createMusician, deleteMusicians, skipOnboarding } from '../support/linkmusician';

/**
 * P4-10 — Campagne d'un morceau, de la composition à la production : Léa a
 * composé « Lumière » (crédit confirmé) et Sam, ingé son, l'a enregistré.
 * Nora, productrice, propose la production dans leur conversation ; Léa
 * confirme. Le morceau est produit : sa fiche affiche « Campagne bouclée »
 * avec le chemin et les pros, et la carte de Léa franchit « La production ».
 */
test.describe('LinkMusician — campagne d’un morceau', () => {
	test.setTimeout(6 * 60_000);
	const toulouse = { code: '31555', nom: 'Toulouse', dep: '31', lat: 43.6007, lng: 1.4328 };

	test('de la composition à la production', async ({ page, account, browser }) => {
		const noraAccount = makeAccount();
		const noraContext = await browser.newContext();
		const noraPage = await noraContext.newPage();
		const created: Awaited<ReturnType<typeof createMusician>>[] = [];
		const title = `Lumière ${Math.random().toString(36).slice(2, 6)}`;
		try {
			// Léa (account) : musicienne, a composé le morceau (crédit confirmé).
			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			const lea = await db.person.findUniqueOrThrow({
				where: { userId: (await requireUser(account.email)).id }
			});
			const composedAt = new Date(Date.now() - 20 * 86_400_000);
			const work = await db.work.create({
				data: {
					title,
					ownerId: lea.actorId,
					createdById: lea.actorId,
					state: 'COMPOSED',
					proof: 'DECLARED',
					composedAt,
					createdAt: new Date(Date.now() - 30 * 86_400_000)
				}
			});
			const credit = await db.workContributor.create({
				data: { workId: work.id, personId: lea.actorId, confirmedAt: composedAt }
			});
			await db.workRole.create({
				data: { workId: work.id, kind: 'COMPOSITION', contributorId: credit.id }
			});

			// Sam : ingé son, a déjà enregistré le morceau (collaboration terminée).
			const sam = await createMusician({ name: 'Sam', commune: toulouse });
			created.push(sam);
			await db.personTrack.create({ data: { personId: sam.actorId, track: 'SOUND_ENGINEER' } });
			const recordedOn = new Date(Date.now() - 10 * 86_400_000);
			await db.collaboration.create({
				data: {
					kind: 'RECORDING',
					status: 'COMPLETED',
					title: 'Prise voix',
					happenedOn: recordedOn,
					completedAt: recordedOn,
					proposedById: sam.actorId,
					workId: work.id,
					participants: {
						create: [
							{
								actorId: sam.actorId,
								acceptedAt: recordedOn,
								confirmedCompletionAt: recordedOn,
								service: 'RECORDING'
							},
							{ actorId: lea.actorId, acceptedAt: recordedOn, confirmedCompletionAt: recordedOn }
						]
					}
				}
			});
			await db.work.update({ where: { id: work.id }, data: { recordedAt: recordedOn } });

			// Nora : productrice, en conversation ouverte avec Léa.
			await signUpAndVerify(noraPage, noraAccount);
			await skipOnboarding(noraPage, noraAccount.email);
			const nora = await db.person.findUniqueOrThrow({
				where: { userId: (await requireUser(noraAccount.email)).id },
				include: { actor: true }
			});
			await db.personTrack.create({ data: { personId: nora.actorId, track: 'PRODUCER' } });
			await db.producerProfile.create({
				data: { personId: nora.actorId, specialties: ['PRODUCTION'] }
			});
			const conversation = await db.conversation.create({
				data: {
					pairKey: [lea.actorId, nora.actorId].sort().join(':'),
					initiatorId: lea.actorId,
					participants: {
						create: [
							{ actorId: lea.actorId, state: 'ACCEPTED' },
							{ actorId: nora.actorId, state: 'ACCEPTED' }
						]
					}
				}
			});
			// N2 : l'épreuve se lit dans la tuile de sa branche, avec son état en toutes lettres.
			const actIV = page
				.getByRole('list', { name: 'Épreuves · Production' })
				.locator(':scope > li')
				.filter({ hasText: 'La production' });

			await test.step('1. Avant : « La production » reste à franchir', async () => {
				await page.goto('/espace/carte');
				await waitForAppReady(page);
				await expect(actIV).toBeVisible();
				await expect(actIV).not.toContainText('Franchie');
			});

			await test.step('2. Nora propose la production du morceau', async () => {
				await noraPage.goto(`/messages/${conversation.id}`);
				await waitForAppReady(noraPage);
				await noraPage.getByText(/Proposer une collaboration/).click();
				await noraPage.getByLabel('Type').selectOption('PRODUCTION');
				await noraPage.getByLabel('Moi').check();
				await noraPage.getByLabel(/Morceau concerné/).selectOption(work.id);
				await noraPage.getByLabel('Titre').fill('Production de Lumière');
				await noraPage.getByRole('button', { name: 'Proposer' }).click();
				await expect(noraPage.getByText(`Morceau : ${title}`)).toBeVisible();
			});

			await test.step('3. Léa confirme : le morceau est produit', async () => {
				await page.goto(`/messages/${conversation.id}`);
				await waitForAppReady(page);
				await page.getByRole('button', { name: 'Confirmer' }).click();
				await expect(page.getByRole('button', { name: "Ce n'est pas exact" })).toBeHidden();
			});

			await test.step('4. La fiche du morceau : « Campagne bouclée »', async () => {
				await page.goto(`/morceaux/${work.id}`);
				await waitForAppReady(page);
				const campaign = page.getByRole('region', { name: 'Campagne bouclée' });
				await expect(campaign).toBeVisible();
				await expect(campaign).toContainText('Composé');
				await expect(campaign).toContainText('Enregistré');
				await expect(campaign).toContainText(`prise de son : ${sam.displayName}`);
				await expect(campaign).toContainText('Produit');
				await expect(campaign).toContainText(`production : ${nora.actor.displayName}`);
				await expect(campaign.getByRole('link', { name: nora.actor.displayName })).toHaveAttribute(
					'href',
					`/@${nora.actor.handle}`
				);
				await expectNoA11yViolations(page, ['.cartButton']);
			});

			await test.step('5. Ma carte : « La production » est franchie', async () => {
				await page.goto('/espace/carte');
				await waitForAppReady(page);
				await expect(actIV).toContainText('La production · Franchie');
			});
		} finally {
			await noraContext.close();
			await deleteMusicians(created);
			await deleteUser(noraAccount.email).catch(() => {});
		}
	});
});
