import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { waitForAppReady, waitForPath } from '../support/flows';
import { skipOnboarding } from '../support/linkmusician';

/**
 * T11 (WCAG 2.1.1) : la touche Espace active un bouton natif et un
 * `<summary>`, alors que `smooth-scrollbar` la traduisait en défilement
 * (`preventDefault`). Hors contrôle, Espace fait toujours défiler la page.
 */
test.describe('LinkMusician — Espace au clavier (T11)', () => {
	test.setTimeout(3 * 60_000);

	test('Espace active un bouton et un résumé, et fait défiler ailleurs', async ({
		page,
		account
	}) => {
		await signUpAndVerify(page, account);
		await skipOnboarding(page, account.email);
		await page.goto('/projets/nouveau');
		await waitForPath(page, '/projets/nouveau');
		await waitForAppReady(page);

		await test.step('Un bouton de choix s’active à l’Espace', async () => {
			const ep = page
				.getByRole('group', { name: 'Type de projet' })
				.getByRole('button', { name: 'EP', exact: true });
			await ep.focus();
			await page.keyboard.press('Space');
			await expect(ep).toHaveAttribute('aria-pressed', 'true');
			const album = page
				.getByRole('group', { name: 'Type de projet' })
				.getByRole('button', { name: 'Album', exact: true });
			await album.focus();
			await page.keyboard.press(' ');
			await expect(album).toHaveAttribute('aria-pressed', 'true');
			await expect(ep).toHaveAttribute('aria-pressed', 'false');
		});

		await test.step('Un résumé repliable s’ouvre à l’Espace', async () => {
			const summary = page.locator('#main-content summary').first();
			const details = page.locator('#main-content details').first();
			await expect(details).not.toHaveAttribute('open');
			await summary.focus();
			await page.keyboard.press('Space');
			await expect(details).toHaveAttribute('open', '');
		});

		await test.step('Hors contrôle, Espace fait encore défiler la page', async () => {
			await page.setViewportSize({ width: 390, height: 400 });
			const offset = () =>
				page.evaluate(() => {
					const el = document.querySelector('#smoothScoller .scroll-content') as HTMLElement | null;
					return el ? el.style.transform : '';
				});
			await page.locator('#main-content h1').click();
			const before = await offset();
			await page.keyboard.press('Space');
			await expect.poll(offset).not.toBe(before);
		});
	});
});
