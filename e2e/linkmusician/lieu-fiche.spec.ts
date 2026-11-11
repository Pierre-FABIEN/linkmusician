import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady, waitForPath } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { skipOnboarding } from '../support/linkmusician';

/**
 * P5-03b — Fiche d'un lieu : le patron d'un bar dont la revendication est
 * approuvée (P5-03a, préparée en base) remplit la fiche, la publie (rang
 * « Lieu ouvert »), puis publie une date chez lui, sans le métier
 * d'organisateur·rice (Q34). La page du lieu montre la fiche et la date.
 */
test.describe('LinkMusician — fiche d’un lieu', () => {
	test.setTimeout(6 * 60_000);
	const A11Y_EXCLUDE = ['.cartButton'];
	const toulouse = { code: '31555', nom: 'Toulouse', dep: '31', lat: 43.6007, lng: 1.4328 };

	test('un bar crée sa fiche et publie une date', async ({ page, account }) => {
		const suffix = Math.random().toString(36).slice(2, 8);
		const venueName = `E2E Le Comptoir ${suffix}`;
		let venueId = '';
		let orgId = '';
		try {
			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			const me = await db.person.update({
				where: { userId: (await requireUser(account.email)).id },
				data: { birthDate: new Date('1980-02-14T00:00:00Z') }
			});
			// Revendication approuvée (P5-03a) : l'organisation du lieu, gérée par moi.
			venueId = (
				await db.venue.create({
					data: {
						name: venueName,
						nameKey: venueName.toLowerCase(),
						kind: 'BAR',
						communeCode: toulouse.code,
						communeName: toulouse.nom,
						departmentCode: toulouse.dep,
						lat: toulouse.lat,
						lng: toulouse.lng,
						createdById: me.actorId,
						validatedAt: new Date()
					}
				})
			).id;
			orgId = (
				await db.actor.create({
					data: {
						kind: 'ORGANIZATION',
						handle: `e2e-comptoir-${suffix}`,
						displayName: venueName,
						organization: {
							create: {
								kind: 'VENUE',
								memberships: {
									create: {
										personId: me.actorId,
										role: 'OWNER',
										status: 'ACTIVE',
										startedAt: new Date()
									}
								}
							}
						}
					}
				})
			).id;
			await db.venue.update({ where: { id: venueId }, data: { claimedByActorId: orgId } });
			await db.venueClaim.create({
				data: {
					venueId,
					requestedById: me.actorId,
					code: `E2E${suffix}`.toUpperCase().slice(0, 8),
					status: 'APPROVED',
					orgId,
					reviewedAt: new Date()
				}
			});

			await test.step('1. Depuis la page du lieu, j’ouvre sa gestion', async () => {
				await page.goto(`/lieux/${venueId}`);
				await waitForAppReady(page);
				await page.getByRole('link', { name: 'Gérer la fiche du lieu' }).click();
				await waitForPath(page, `/lieux/${venueId}/gerer`);
				await waitForAppReady(page);
				await expect(page.getByText('Complète et publie ta fiche')).toBeVisible();
			});

			await test.step('2. Je remplis la fiche et la publie', async () => {
				await page.getByLabel('Jauge').fill('80');
				await page
					.getByLabel('Scène et son')
					.fill('Petite scène de 4 m sur 3, sono 2 × 500 W, deux retours.');
				await page.getByRole('checkbox', { name: 'Chapeau' }).check();
				await page.getByRole('checkbox', { name: 'Jeudi' }).check();
				await page.getByLabel('Rock', { exact: true }).check();
				await page.getByRole('button', { name: 'Enregistrer la fiche' }).click();
				await expect(page.getByText('La fiche est enregistrée.').first()).toBeVisible();
				await page.getByRole('button', { name: 'Publier la fiche' }).click();
				await expect(page.getByText(/Ta fiche est publiée/).first()).toBeVisible();
				await expect(page.getByText('fiche publiée')).toBeVisible();
				await expect(page.locator('span', { hasText: 'Lieu ouvert' }).first()).toBeVisible();
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
			});

			await test.step('3. Je publie une date, chez moi', async () => {
				await page.getByRole('link', { name: 'Publier une date' }).click();
				await waitForPath(page, '/plateaux/nouveau');
				await waitForAppReady(page);
				await expect(page.getByText(`Lieu : ${venueName}`)).toBeVisible();
				const day = new Date(Date.now() + 9 * 86_400_000).toISOString().slice(0, 10);
				await page.getByLabel('Date').fill(day);
				await page.getByLabel('Titre').fill('Jeudi rock au Comptoir');
				await page
					.getByLabel('Description')
					.fill('Deux groupes, chapeau et une boisson offerte, fin à minuit.');
				await page.getByRole('button', { name: 'Publier le plateau' }).click();
				await expect(page).toHaveURL(/\/annonces\/c/);
				await expect(page.getByText(/Plateau proposé par/)).toContainText(venueName);
			});

			await test.step('4. La page du lieu montre la fiche et la date', async () => {
				await page.goto(`/lieux/${venueId}`);
				await waitForAppReady(page);
				await expect(page.getByRole('heading', { name: 'Jouer ici' })).toBeVisible();
				await expect(page.getByText('80 personnes')).toBeVisible();
				await expect(page.getByRole('link', { name: /Jeudi rock au Comptoir/ })).toBeVisible();
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
			});
		} finally {
			if (venueId) await db.venue.deleteMany({ where: { id: venueId } });
			if (orgId) await db.actor.deleteMany({ where: { id: orgId } });
		}
	});
});
