import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { skipOnboarding } from '../support/linkmusician';

/**
 * P2-17 — Conseils en contexte : un conseil par écran clé, masquable ; un
 * conseil masqué ne revient pas, le suivant prend sa place.
 */
test.describe('LinkMusician — conseils en contexte', () => {
	test.setTimeout(4 * 60_000);
	// Bouton panier du boilerplate (boutique active en e2e), remontée n° 14.
	const A11Y_EXCLUDE = ['.cartButton'];

	test('un conseil masqué ne revient pas', async ({ page, account }) => {
		await signUpAndVerify(page, account);
		await skipOnboarding(page, account.email);
		const tip = page.getByRole('complementary', { name: 'Conseil' });

		await test.step('1. Un seul conseil sur l’écran des annonces', async () => {
			await page.goto('/annonces');
			await waitForAppReady(page);
			await expect(tip).toHaveCount(1);
			await expect(tip).toContainText('Publie une annonce');
			await expectNoA11yViolations(page, A11Y_EXCLUDE);
		});

		await test.step('2. « J’ai compris » : il disparaît et ne revient pas', async () => {
			await tip.getByRole('button', { name: 'J’ai compris' }).click();
			await expect(tip).toHaveCount(0);
			await expect
				.poll(
					async () =>
						(
							await db.person.findUniqueOrThrow({
								where: { userId: (await requireUser(account.email)).id }
							})
						).tipsDismissed
				)
				.toContain('annonces-publier');
			await page.reload();
			await waitForAppReady(page);
			await expect(page.getByText('Publie une annonce')).toHaveCount(0);
			// Le conseil suivant de l'écran prend la place, un seul à la fois.
			await expect(tip).toHaveCount(1);
			await expect(tip).toContainText('Une annonce claire');
		});

		await test.step('3. Pas de conseil sur un écran guidé par « Ta prochaine étape »', async () => {
			await page.goto('/espace');
			await waitForAppReady(page);
			await expect(page.getByText('Ta prochaine étape')).toBeVisible();
			await expect(tip).toHaveCount(0);
		});
	});
});
