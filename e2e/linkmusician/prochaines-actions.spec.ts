import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady, waitForPath } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import {
	createMusician,
	deleteMusicians,
	horizontalOverflow,
	skipOnboarding
} from '../support/linkmusician';

/**
 * N3 — Prochaines actions (#72, conception 21 §8–§9) sur l'accueil `/espace`,
 * pivot « priorités » : un compte neuf ne reçoit rien ; quand Inès a confirmé
 * notre prise de son, « Confirme… » passe en tête, avant un crédit à
 * confirmer et un mixage à trouver ; trois au plus ; la tuile mène à l'écran
 * du geste, au clavier aussi ; 390 px sans débordement, sans erreur axe.
 */
test.describe('LinkMusician — prochaines actions', () => {
	test.setTimeout(3 * 60_000);
	const toulouse = { code: '31555', nom: 'Toulouse', dep: '31', lat: 43.6007, lng: 1.4328 };

	test('une attente réelle d’abord, puis les demandes et les besoins', async ({
		page,
		account
	}) => {
		const created: Awaited<ReturnType<typeof createMusician>>[] = [];
		const DAY = 86_400_000;
		try {
			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			const me = await db.person.findUniqueOrThrow({
				where: { userId: (await requireUser(account.email)).id }
			});
			await db.person.update({
				where: { actorId: me.actorId },
				data: { birthDate: new Date('1990-01-01'), ambition: 'RECORD' }
			});
			await page.setViewportSize({ width: 390, height: 844 });
			const next = page.getByRole('region', { name: 'À faire maintenant' });
			const hero = page.getByTestId('action-hero');

			await test.step('1. Compte neuf : aucune prochaine action', async () => {
				await page.goto('/espace');
				await waitForAppReady(page);
				const cookieNotice = page.getByRole('button', { name: 'Compris', exact: true });
				if (await cookieNotice.isVisible()) await cookieNotice.click();
				await expect(page.getByRole('region', { name: 'Actions prioritaires' })).toBeVisible();
				await expect(next).toHaveCount(0);
				await expect(hero).toHaveCount(0);
				// « Commence ici » : trois portes réelles, dont Rencontre (UX-1, D74).
				const start = page.getByTestId('start-hero');
				await expect(start.getByRole('link')).toHaveCount(3);
				await expect(
					start.getByRole('link', { name: /Rencontrer des musicien·nes/ })
				).toHaveAttribute('href', '/jam');
				// L'objectif reste accessible, en tête de « repères ».
				await expect(page.getByRole('link', { name: /^Ta prochaine étape/ })).toBeVisible();
			});

			const ines = await createMusician({ name: 'Ines', commune: toulouse });
			const lea = await createMusician({ name: 'Lea', commune: toulouse });
			created.push(ines, lea);
			// Inès, ingé son de mon réseau, a confirmé notre prise de son.
			await db.soundEngineerProfile.create({
				data: { personId: ines.actorId, specialties: ['RECORDING', 'MIXING'] }
			});
			await db.savedContact.create({ data: { ownerId: me.actorId, contactId: ines.actorId } });
			const conversation = await db.conversation.create({
				data: {
					pairKey: [me.actorId, ines.actorId].sort().join(':'),
					initiatorId: ines.actorId,
					participants: {
						create: [
							{ actorId: me.actorId, state: 'ACCEPTED' },
							{ actorId: ines.actorId, state: 'ACCEPTED' }
						]
					}
				}
			});
			await db.collaboration.create({
				data: {
					kind: 'RECORDING',
					status: 'ACCEPTED',
					title: 'Prise de son Lumière',
					happenedOn: new Date(new Date(Date.now() - 3 * DAY).toISOString().slice(0, 10)),
					proposedById: ines.actorId,
					conversationId: conversation.id,
					participants: {
						create: [
							{ actorId: me.actorId, acceptedAt: new Date(Date.now() - 9 * DAY) },
							{
								actorId: ines.actorId,
								acceptedAt: new Date(Date.now() - 9 * DAY),
								confirmedCompletionAt: new Date(Date.now() - DAY),
								service: 'RECORDING'
							}
						]
					}
				}
			});
			// Léa m'a crédité·e sur son morceau ; mon morceau enregistré attend son mixage.
			const nuit = await db.work.create({
				data: { ownerId: lea.actorId, createdById: lea.actorId, title: 'Nuit blanche' }
			});
			await db.workContributor.create({ data: { workId: nuit.id, personId: me.actorId } });
			await db.work.create({
				data: {
					ownerId: me.actorId,
					createdById: me.actorId,
					title: 'Aube',
					state: 'COMPOSED',
					proof: 'DECLARED',
					composedAt: new Date(Date.now() - 20 * DAY),
					recordedAt: new Date(Date.now() - 5 * DAY)
				}
			});

			await test.step('2. L’attente réelle est le héros, la suite en dessous (UX-1, D74)', async () => {
				await page.reload();
				await waitForAppReady(page);
				await expect(hero).toContainText('Quelqu’un t’attend');
				await expect(hero).toContainText(
					`Confirme « Prise de son Lumière » avec ${ines.displayName}`
				);
				// Une demande : aucun « Plus tard » ni « Pas pour moi ».
				await expect(hero.getByRole('button')).toHaveCount(0);
				// Trois au plus en tout : le héros et deux dans la liste, sans doublon.
				const items = next.getByRole('list', { name: 'Prochaines actions' }).getByRole('link');
				await expect(items).toHaveCount(2);
				await expect(items.nth(0)).toContainText('Confirme ton rôle sur « Nuit blanche »');
				await expect(items.nth(1)).toContainText('« Aube » est enregistré : place au mixage');
				await expect(next).not.toContainText('Prise de son Lumière');
				// Ni XP, ni jam, ni reproche.
				await expect(hero).not.toContainText(/XP|jam|toujours pas|retard/i);
				await expect(next).not.toContainText(/XP|jam|toujours pas|retard/i);
				expect(await horizontalOverflow(page)).toEqual([]);
				await expectNoA11yViolations(page, ['.cartButton']);
			});

			await test.step('3. Au clavier, le héros ouvre l’écran du geste', async () => {
				const first = hero.getByRole('link', { name: /Confirmer/ });
				await first.focus();
				await expect(first).toBeFocused();
				await page.keyboard.press('Enter');
				await waitForPath(page, `/messages/${conversation.id}`);
			});

			await test.step('4. Le mixage pris en charge disparaît ; un blocage retire la demande', async () => {
				await db.work.updateMany({
					where: { ownerId: me.actorId, title: 'Aube' },
					data: { mixedAt: new Date() }
				});
				await db.block.create({
					data: { blockerActorId: ines.actorId, blockedActorId: me.actorId }
				});
				await page.goto('/espace');
				await waitForAppReady(page);
				await expect(hero).toContainText('Nuit blanche');
				await expect(hero).not.toContainText(/Aube|Prise de son/);
				await expect(next).toHaveCount(0);
				await hero.getByRole('link', { name: /Voir mon rôle/ }).click();
				await waitForPath(page, `/morceaux/${nuit.id}`);
			});
		} finally {
			await deleteMusicians(created);
		}
	});
});
