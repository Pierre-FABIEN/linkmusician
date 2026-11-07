import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { skipOnboarding } from '../support/linkmusician';

/**
 * P3-04 — Étapes de groupe : dans mon groupe formé, je déclare notre premier
 * concert (date et précision) ; il entre dans le parcours « déclaré », le
 * groupe gagne l'XP déclarée et j'en reçois une part ; un visiteur le voit
 * sur la page publique du groupe.
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
});
