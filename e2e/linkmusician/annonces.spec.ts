import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import {
	createMusician,
	createOpportunity,
	deleteMusicians,
	setCity,
	skipOnboarding
} from '../support/linkmusician';

/**
 * P2-02 — Annonces : on voit les annonces actives autour de soi (pas les
 * échues), on publie une annonce (sans XP), le quota de confiance limite un TL0
 * à une annonce active, on clôture, on signale.
 */
test.describe('LinkMusician — annonces', () => {
	test.setTimeout(6 * 60_000);
	// Bouton panier du boilerplate (boutique active en e2e), remontée n° 14.
	const A11Y_EXCLUDE = ['.cartButton'];

	test('voir, publier, clôturer, signaler', async ({ page, account }) => {
		const other = await createMusician({
			name: 'Organisatrice',
			commune: { code: '31069', nom: 'Blagnac', dep: '31', lat: 43.6459, lng: 1.3785 }
		});
		try {
			const active = await createOpportunity(other.actorId, {
				title: `Jam active ${other.handle}`
			});
			await createOpportunity(other.actorId, {
				title: `Jam échue ${other.handle}`,
				expiresInDays: -1
			});

			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			await setCity(page);
			const me = await db.person.findUniqueOrThrow({
				where: { userId: (await requireUser(account.email)).id }
			});
			const list = page.getByRole('list', { name: 'Annonces autour de toi' });

			await test.step('1. Les annonces actives autour de moi, pas les échues', async () => {
				await page.goto('/annonces');
				await waitForAppReady(page);
				await expect(list.getByText(`Jam active ${other.handle}`)).toBeVisible();
				await expect(list.getByText(`Jam échue ${other.handle}`)).toHaveCount(0);
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
			});

			await test.step('2. Je publie une annonce : aucune XP', async () => {
				await page.getByRole('link', { name: 'Publier une annonce' }).click();
				await waitForAppReady(page);
				await page.getByLabel('Titre').fill('Groupe soul cherche basse');
				await page
					.getByLabel('Description')
					.fill('Groupe soul cherche un·e bassiste pour répéter le dimanche.');
				await page.getByRole('button', { name: 'Publier' }).click();
				await expect(page).toHaveURL(/\/annonces\/c.*publiee=1/);
				await expect(
					page.getByRole('heading', { level: 1, name: 'Groupe soul cherche basse' })
				).toBeVisible();
				expect(await db.xpTransaction.count({ where: { actorId: me.actorId } })).toBe(0);
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
			});

			await test.step('3. TL0 : une seule annonce active', async () => {
				await page.goto('/annonces/nouvelle');
				await waitForAppReady(page);
				await page.getByLabel('Titre').fill('Deuxième annonce');
				await page
					.getByLabel('Description')
					.fill('Une deuxième annonce qui ne devrait pas passer.');
				await page.getByRole('button', { name: 'Publier' }).click();
				await expect(page.getByRole('alert')).toContainText('1 annonce active');
			});

			await test.step('4. Je clôture la mienne', async () => {
				await page.goto('/annonces');
				await waitForAppReady(page);
				await page
					.getByRole('list', { name: 'Mes annonces' })
					.getByRole('link', { name: /Groupe soul cherche basse/ })
					.click();
				await page.getByRole('button', { name: 'Clôturer l’annonce'.replace('’', "'") }).click();
				await expect(page.getByText('Clôturée', { exact: true })).toBeVisible();
			});

			await test.step('5. Je signale l’annonce de l’autre', async () => {
				await page.goto(`/annonces/${active.id}`);
				await waitForAppReady(page);
				await page.getByText('Signaler cette annonce').click();
				await page.getByLabel('Motif').selectOption('SPAM');
				await page.getByRole('button', { name: 'Envoyer le signalement' }).click();
				await expect
					.poll(() =>
						db.report.count({ where: { targetType: 'OPPORTUNITY', targetId: active.id } })
					)
					.toBe(1);
			});
		} finally {
			await deleteMusicians([other]);
		}
	});
});
