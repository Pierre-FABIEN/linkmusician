import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { makeAccount } from '../support/account';
import { db, deleteUser, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { skipOnboarding } from '../support/linkmusician';

/**
 * P3-04 — Étapes de groupe : dans mon groupe formé, je déclare notre premier
 * concert (date et précision) ; il entre dans le parcours « déclaré », le
 * groupe gagne l'XP déclarée et j'en reçois une part ; un visiteur le voit
 * sur la page publique du groupe.
 * P3-05 — Preuves : un membre du groupe ne peut pas corroborer le concert ;
 * avec le lien de l'événement et la confirmation d'une personne extérieure,
 * il devient « corroboré » et le groupe reçoit la différence d'XP.
 */
test.describe('LinkMusician — étapes de groupe', () => {
	test.setTimeout(3 * 60_000);
	// Bouton panier du boilerplate (boutique active en e2e), remontée n° 14.
	const A11Y_EXCLUDE = ['.cartButton'];

	test('je déclare le premier concert du groupe', async ({ page, account, browser }) => {
		const suffix = Math.random().toString(36).slice(2, 7);
		const bandName = `E2E Les Étapes ${suffix}`;
		const bandHandle = `e2e-etapes-${suffix}`;
		const drummerHandle = `e2e-etapes-batterie-${suffix}`;
		try {
			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			const me = await db.person.findUniqueOrThrow({
				where: { userId: (await requireUser(account.email)).id },
				include: { actor: true }
			});

			// Un groupe déjà formé (P3-01 a son propre e2e) : moi et une batteuse.
			const startedAt = new Date(Date.now() - 30 * 86_400_000);
			const drummer = await db.actor.create({
				data: { kind: 'PERSON', handle: drummerHandle, displayName: `E2E Batteuse ${suffix}` }
			});
			const band = await db.actor.create({
				data: {
					kind: 'ORGANIZATION',
					handle: bandHandle,
					displayName: bandName,
					organization: {
						create: {
							kind: 'BAND',
							formedAt: startedAt,
							memberships: {
								create: [
									{ personId: me.actorId, role: 'OWNER', status: 'ACTIVE', startedAt },
									{ personId: drummer.id, role: 'MEMBER', status: 'ACTIVE', startedAt }
								]
							}
						}
					}
				}
			});
			const xp = async (actorId: string) =>
				(
					await db.xpTransaction.aggregate({
						where: { actorId, ruleId: { startsWith: 'milestone.' } },
						_sum: { amount: true }
					})
				)._sum.amount ?? 0;

			await test.step('1. Le parcours du groupe montre les étapes à franchir', async () => {
				await page.goto(`/groupes/${bandHandle}`);
				await waitForAppReady(page);
				await expect(page.getByRole('heading', { name: 'Parcours du groupe' })).toBeVisible();
				const steps = page.getByRole('list', { name: 'Étapes du groupe' });
				await expect(steps).toContainText('Premier concert');
				await expect(steps).toContainText('Arrive avec votre premier morceau composé');
				await expect(page.getByText('Ensuite : première tournée')).toBeVisible();
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
			});

			await test.step('2. Je déclare notre premier concert', async () => {
				await page.getByRole('button', { name: 'C’est fait : Premier concert' }).click();
				await expect(page.getByText('+50 points pour le groupe')).toBeVisible();
				await page.getByLabel('Date').fill('2026-06-21');
				await page.getByLabel('Précision').fill('Fête de la musique, place du Capitole');
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
				await page.getByRole('button', { name: 'Ajouter au parcours' }).click();
				await expect(page.getByText('C’est dans votre parcours !')).toBeVisible();
				const steps = page.getByRole('list', { name: 'Étapes du groupe' });
				await expect(steps).toContainText('Déclarée');
				await expect(steps).toContainText('21 juin 2026 · Fête de la musique, place du Capitole');
				await expect(
					page.getByRole('button', { name: 'Modifier : Premier concert' })
				).toBeVisible();
			});

			await test.step('3. Le groupe gagne l’XP déclarée, chaque membre une part', async () => {
				await expect.poll(() => xp(band.id)).toBe(50);
				expect(await xp(me.actorId)).toBe(13);
				expect(await xp(drummer.id)).toBe(13);
			});

			await test.step('4. Un visiteur voit l’étape sur la page du groupe', async () => {
				const visitor = await browser.newContext();
				try {
					const visitorPage = await visitor.newPage();
					await visitorPage.goto(`/@${bandHandle}`);
					await waitForAppReady(visitorPage);
					const steps = visitorPage.getByRole('list', { name: 'Étapes franchies' });
					await expect(steps).toContainText('Premier concert');
					await expect(steps).toContainText('Déclarée');
					await expect(steps).toContainText('juin 2026 · Fête de la musique');
					await expectNoA11yViolations(visitorPage, A11Y_EXCLUDE);
				} finally {
					await visitor.close();
				}
			});
		} finally {
			await db.actor.deleteMany({ where: { handle: { in: [bandHandle, drummerHandle] } } });
		}
	});

	test('une personne extérieure corrobore notre premier concert', async ({
		page,
		account,
		browser
	}) => {
		const suffix = Math.random().toString(36).slice(2, 7);
		const bandHandle = `e2e-preuves-${suffix}`;
		const drummerHandle = `e2e-preuves-batterie-${suffix}`;
		const friendAccount = makeAccount();
		const friendContext = await browser.newContext();
		const friendPage = await friendContext.newPage();
		try {
			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			await signUpAndVerify(friendPage, friendAccount);
			await skipOnboarding(friendPage, friendAccount.email);
			const person = async (email: string) =>
				db.person.findUniqueOrThrow({
					where: { userId: (await requireUser(email)).id },
					include: { actor: true }
				});
			const me = await person(account.email);
			const friend = await person(friendAccount.email);

			// Un groupe formé, avec son premier concert déclaré (P3-04 a son e2e).
			const startedAt = new Date(Date.now() - 30 * 86_400_000);
			await db.actor.create({
				data: { kind: 'PERSON', handle: drummerHandle, displayName: `E2E Batteuse ${suffix}` }
			});
			const drummer = await db.actor.findUniqueOrThrow({ where: { handle: drummerHandle } });
			const band = await db.actor.create({
				data: {
					kind: 'ORGANIZATION',
					handle: bandHandle,
					displayName: `E2E Les Preuves ${suffix}`,
					organization: {
						create: {
							kind: 'BAND',
							formedAt: startedAt,
							memberships: {
								create: [
									{ personId: me.actorId, role: 'OWNER', status: 'ACTIVE', startedAt },
									{ personId: drummer.id, role: 'MEMBER', status: 'ACTIVE', startedAt }
								]
							}
						}
					}
				}
			});
			const gig = await db.milestone.create({
				data: {
					definitionId: 'FIRST_GIG',
					bandId: band.id,
					proof: 'DECLARED',
					occurredAt: new Date('2026-06-21T12:00:00Z'),
					note: 'Fête de la musique',
					declaredById: me.actorId,
					definitionVersion: 1
				}
			});
			const bandXp = async () =>
				(
					await db.xpTransaction.aggregate({
						where: { actorId: band.id, ruleId: 'milestone.band' },
						_sum: { amount: true }
					})
				)._sum.amount ?? 0;

			await test.step('1. Un membre du groupe ne peut pas corroborer le concert', async () => {
				await page.goto(`/groupes/${bandHandle}`);
				await waitForAppReady(page);
				const proofs = page.getByRole('list', { name: 'Preuves : Premier concert' });
				await expect(proofs).toContainText('Une personne hors du groupe qui y était confirme');
				await page.getByRole('button', { name: 'Prouver : Premier concert' }).click();
				await page.getByLabel('Une personne hors du groupe qui y était').fill(`@${drummerHandle}`);
				await page.getByRole('button', { name: 'Demander de confirmer' }).click();
				await expect(page.getByRole('alert')).toContainText('Il faut une personne extérieure');
				expect((await db.milestone.findUniqueOrThrow({ where: { id: gig.id } })).proof).toBe(
					'DECLARED'
				);
			});

			await test.step('2. Je joins l’affiche et je demande à une amie qui y était', async () => {
				await page
					.getByLabel('Lien vers l’événement ou l’affiche')
					.fill('https://www.instagram.com/p/affiche-fete-musique/');
				await page.getByRole('button', { name: 'Ajouter le lien' }).click();
				await expect(page.getByText('Lien ajouté.')).toBeVisible();
				// Le panneau reste ouvert : on enchaîne avec la demande.
				await db.actor.update({ where: { id: friend.actorId }, data: { trustLevel: 1 } });
				await page
					.getByLabel('Une personne hors du groupe qui y était')
					.fill(`@${friend.actor.handle}`);
				await page.getByRole('button', { name: 'Demander de confirmer' }).click();
				await expect(
					page.getByText(`Demande envoyée à ${friend.actor.displayName}.`)
				).toBeVisible();
				await expect(
					page.getByRole('list', { name: 'Demandes et liens : Premier concert' })
				).toContainText(`${friend.actor.displayName} · en attente`);
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
			});

			await test.step('3. Elle confirme depuis sa notification : corroboré', async () => {
				await friendPage.goto('/notifications');
				await waitForAppReady(friendPage);
				await friendPage.getByRole('link', { name: /te demande de confirmer/ }).click();
				await expect(friendPage).toHaveURL(new RegExp(`/etapes/${gig.id}$`));
				await expect(
					friendPage.getByRole('heading', { name: 'Premier concert', level: 1 })
				).toBeVisible();
				await expectNoA11yViolations(friendPage, A11Y_EXCLUDE);
				await db.actor.update({ where: { id: friend.actorId }, data: { trustLevel: 1 } });
				await friendPage.getByRole('button', { name: 'Je confirme, j’y étais' }).click();
				await expect(
					friendPage.getByText('Merci ! Grâce à toi, l’étape est corroborée.')
				).toBeVisible();
				await expect.poll(bandXp).toBe(350);

				await page.reload();
				await expect(page.getByRole('list', { name: 'Étapes du groupe' })).toContainText(
					'Corroborée'
				);
			});
		} finally {
			await friendContext.close();
			await db.actor.deleteMany({ where: { handle: { in: [bandHandle, drummerHandle] } } });
			await deleteUser(friendAccount.email);
		}
	});
});
