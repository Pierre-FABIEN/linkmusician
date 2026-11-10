import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { skipOnboarding } from '../support/linkmusician';

/**
 * P3-15a — Guide des démarches (D42, conception 09) : mon morceau est
 * composé, la fiche du morceau m'annonce « Protéger ce morceau » ; je lis la
 * fiche (en bref, ce que ça coûte, sources, date de vérification), puis
 * « J'ai compris » la masque pour de bon. Le guide est public.
 */
test.describe('LinkMusician — démarches', () => {
	test.setTimeout(3 * 60_000);
	const A11Y_EXCLUDE = ['.cartButton'];

	test('le guide est public et liste les fiches par moment', async ({ browser }) => {
		const visitor = await browser.newContext();
		const page = await visitor.newPage();
		try {
			await page.goto('/demarches');
			await waitForAppReady(page);
			await expect(page.getByRole('heading', { level: 1, name: 'Démarches' })).toBeVisible();
			for (const moment of ['Créer un morceau', 'Publier', 'Jouer en concert', 'Le groupe']) {
				await expect(page.getByRole('heading', { level: 2, name: moment })).toBeVisible();
			}
			await expect(page.locator('a[href^="/demarches/"]')).toHaveCount(8);
			await expectNoA11yViolations(page, A11Y_EXCLUDE);
			await page.getByRole('link', { name: /Être payé·e pour un concert/ }).click();
			await expect(
				page.getByRole('heading', { level: 1, name: 'Être payé·e pour un concert' })
			).toBeVisible();
			await expect(page.getByText('relecture par un·e professionnel·le en cours')).toBeVisible();
			await expectNoA11yViolations(page, A11Y_EXCLUDE);
		} finally {
			await visitor.close();
		}
	});

	test('mon morceau composé m’annonce la démarche, une fois', async ({ page, account }) => {
		await signUpAndVerify(page, account);
		await skipOnboarding(page, account.email);
		const me = await db.person.findUniqueOrThrow({
			where: { userId: (await requireUser(account.email)).id }
		});
		const work = await db.work.create({
			data: {
				ownerId: me.actorId,
				createdById: me.actorId,
				title: `E2E Démarche ${Math.random().toString(36).slice(2, 7)}`,
				state: 'COMPOSED',
				composedAt: new Date(),
				contributors: { create: { personId: me.actorId, confirmedAt: new Date() } }
			}
		});

		await test.step('1. La fiche du morceau annonce « Protéger un morceau »', async () => {
			await page.goto(`/morceaux/${work.id}`);
			await waitForAppReady(page);
			const card = page.getByTestId('demarche');
			await expect(card).toContainText('Garde de quoi prouver sa date');
			await expectNoA11yViolations(page, A11Y_EXCLUDE);
			await card.getByRole('link', { name: 'Protéger un morceau' }).click();
		});

		await test.step('2. La fiche : en bref, ce que ça coûte, sources, date', async () => {
			await expect(page).toHaveURL(/\/demarches\/proteger-un-morceau$/);
			await expect(
				page.getByRole('heading', { level: 1, name: 'Protéger un morceau' })
			).toBeVisible();
			await expect(page.getByLabel('En bref')).toBeVisible();
			await expect(page.getByRole('heading', { name: 'Ce que ça coûte' })).toBeVisible();
			await expect(page.getByRole('heading', { name: 'Sources' })).toBeVisible();
			await expect(page.getByRole('link', { name: /INPI : déposer une e-Soleau/ })).toBeVisible();
			await expect(page.getByText(/Vérifiée le \d+/)).toBeVisible();
		});

		await test.step('3. « J’ai compris » : la démarche ne revient plus', async () => {
			await page.goto(`/morceaux/${work.id}`);
			await waitForAppReady(page);
			const card = page.getByTestId('demarche');
			await card.getByRole('button', { name: 'J’ai compris' }).click();
			await expect(card).toBeHidden();
			await expect
				.poll(
					async () =>
						(await db.person.findUniqueOrThrow({ where: { actorId: me.actorId } })).tipsDismissed
				)
				.toContain('demarche-morceau-proteger');
			await page.reload();
			await waitForAppReady(page);
			await expect(page.getByTestId('demarche')).toHaveCount(0);
		});
	});
});
