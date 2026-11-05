import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { skipOnboarding } from '../support/linkmusician';
import type { Page } from '@playwright/test';

/**
 * P0-07 — Mobile d'abord : sur un écran de téléphone, l'espace a sa barre
 * d'onglets en bas, et aucune page ne déborde en largeur.
 */
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

/** Éléments visibles qui dépassent à droite de l'écran (hors zones défilantes). */
async function horizontalOverflow(page: Page) {
	return page.evaluate(() => {
		const width = window.innerWidth;
		const offenders: string[] = [];
		for (const el of document.querySelectorAll<HTMLElement>('body *')) {
			const rect = el.getBoundingClientRect();
			if (rect.width === 0 || rect.height === 0 || rect.right <= width + 1) continue;
			// Une zone qui défile en largeur (onglets, tableaux) a le droit de dépasser.
			let parent = el.parentElement;
			let clipped = false;
			while (parent) {
				const style = getComputedStyle(parent);
				if (['auto', 'scroll', 'hidden', 'clip'].includes(style.overflowX)) {
					if (parent.getBoundingClientRect().right <= width + 1) clipped = true;
					break;
				}
				parent = parent.parentElement;
			}
			if (clipped) continue;
			const label = `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}.${[...el.classList].slice(0, 3).join('.')}`;
			offenders.push(`${label} (${Math.round(rect.right)} px)`);
		}
		return offenders.slice(0, 10);
	});
}

async function visit(page: Page, path: string, shot: string) {
	await page.goto(path);
	await waitForAppReady(page);
	if (process.env.E2E_SHOTS) {
		await page.screenshot({ path: `${process.env.E2E_SHOTS}/mobile-${shot}.png` });
	}
	expect(await horizontalOverflow(page), `débordement sur ${path}`).toEqual([]);
}

test.describe('LinkMusician — mobile', () => {
	test.setTimeout(6 * 60_000);

	test('accueil et espace sur un téléphone', async ({ page, account }) => {
		await test.step('1. Accueil public', async () => {
			await visit(page, '/accueil', 'accueil');
		});

		await signUpAndVerify(page, account);
		await skipOnboarding(page, account.email);
		const user = await requireUser(account.email);
		const person = await db.person.findUniqueOrThrow({
			where: { userId: user.id },
			include: { actor: true }
		});

		await test.step('2. Barre d’onglets en bas, pas d’onglets en haut', async () => {
			await visit(page, '/espace', 'espace');
			const bottom = page.getByRole('navigation', { name: 'Espace (mobile)' });
			await expect(bottom.getByRole('link')).toHaveCount(5);
			await expect(bottom).toBeInViewport();
			await expect(page.getByRole('navigation', { name: 'Espace', exact: true })).toBeHidden();
			await expect(page.getByRole('button', { name: 'Ouvrir le menu du compte' })).toBeVisible();
			// Bouton panier du boilerplate (boutique active en e2e), remontée n° 14.
			await expectNoA11yViolations(page, ['.cartButton']);
		});

		await test.step('3. Navigation au doigt', async () => {
			await page
				.getByRole('navigation', { name: 'Espace (mobile)' })
				.getByRole('link', { name: 'Découvrir' })
				.tap();
			await expect(page).toHaveURL(/\/decouvrir$/);
			await expect(page.getByRole('heading', { level: 1, name: 'Découvrir' })).toBeVisible();
		});

		await test.step('4. Les pages de l’espace tiennent dans l’écran', async () => {
			for (const [path, shot] of [
				['/jouer', 'jouer'],
				['/jam', 'jam'],
				['/decouvrir', 'decouvrir'],
				['/messages', 'messages'],
				['/annonces', 'annonces'],
				['/annonces/nouvelle', 'annonce-nouvelle'],
				['/profil', 'profil'],
				['/profil/musical', 'profil-musical'],
				['/profil/medias', 'medias'],
				['/reglages', 'reglages'],
				[`/@${person.actor.handle}`, 'profil-public']
			] as const) {
				await visit(page, path, shot);
			}
		});
	});
});
