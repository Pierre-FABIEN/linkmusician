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
 * N4 — « Plus tard » et « Pas pour moi » (#72, conception 21 §8.6) : je
 * dis « Pas pour moi » au mixage de mon morceau ; la suggestion disparaît,
 * même après rechargement ; je la réactive dans « Ce que Melokiva me
 * propose » et elle revient, puisque le morceau attend toujours son mixage.
 * « Plus tard » la reporte ; une demande (crédit à confirmer) n'a aucun de
 * ces boutons. Clavier, 390 px, axe.
 */
test.describe('LinkMusician — ce que Melokiva me propose', () => {
	test.setTimeout(3 * 60_000);
	const toulouse = { code: '31555', nom: 'Toulouse', dep: '31', lat: 43.6007, lng: 1.4328 };

	test('écarter, retrouver, réactiver, reporter', async ({ page, account }) => {
		const created: Awaited<ReturnType<typeof createMusician>>[] = [];
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
			const lea = await createMusician({ name: 'Lea', commune: toulouse });
			created.push(lea);
			await db.work.create({
				data: {
					ownerId: me.actorId,
					createdById: me.actorId,
					title: 'Aube',
					state: 'COMPOSED',
					proof: 'DECLARED',
					composedAt: new Date(Date.now() - 20 * 86_400_000),
					recordedAt: new Date(Date.now() - 5 * 86_400_000)
				}
			});
			// Une demande (rang 2) : jamais de « Plus tard » ni de « Pas pour moi ».
			const nuit = await db.work.create({
				data: { ownerId: lea.actorId, createdById: lea.actorId, title: 'Nuit blanche' }
			});
			await db.workContributor.create({ data: { workId: nuit.id, personId: me.actorId } });

			await page.setViewportSize({ width: 390, height: 844 });
			const next = page.getByRole('region', { name: 'À faire maintenant' });
			const list = next.getByRole('list', { name: 'Prochaines actions' });
			const mix = list.getByRole('listitem').filter({ hasText: 'place au mixage' });

			await test.step('1. Une demande sans bouton, un besoin avec ses deux gestes', async () => {
				await page.goto('/espace');
				await waitForAppReady(page);
				const cookieNotice = page.getByRole('button', { name: 'Compris', exact: true });
				if (await cookieNotice.isVisible()) await cookieNotice.click();
				// La demande (rang 2) est le héros (UX-1, D74) : aucun bouton de choix.
				const credit = page.getByTestId('action-hero');
				await expect(credit).toContainText('Nuit blanche');
				await expect(credit.getByRole('button')).toHaveCount(0);
				await expect(mix.getByRole('button', { name: /^Plus tard/ })).toBeVisible();
				await expect(mix.getByRole('button', { name: /^Pas pour moi/ })).toBeVisible();
				expect(await horizontalOverflow(page)).toEqual([]);
				await expectNoA11yViolations(page, ['.cartButton']);
			});

			await test.step('2. « Pas pour moi » au clavier : la suggestion disparaît', async () => {
				const button = mix.getByRole('button', { name: /^Pas pour moi/ });
				await button.focus();
				await page.keyboard.press('Enter');
				await expect(page.getByText(/ne te sera plus proposé/)).toBeVisible();
				await expect(page.getByText('place au mixage')).toHaveCount(0);
				await expect(page.getByTestId('action-hero')).toContainText('Nuit blanche');
			});

			await test.step('3. Après rechargement, toujours écartée', async () => {
				await page.reload();
				await waitForAppReady(page);
				await expect(page.getByTestId('action-hero')).toContainText('Nuit blanche');
				await expect(page.getByText('place au mixage')).toHaveCount(0);
			});

			await test.step('4. Je la retrouve et la réactive dans mes choix', async () => {
				// U0 : l'entrée vit dans le pivot « repères ».
				await page
					.getByRole('navigation', { name: 'Mode carrière' })
					.getByRole('link', { name: /^Ce que Melokiva me propose/ })
					.click();
				await waitForPath(page, '/espace/propositions');
				await waitForAppReady(page);
				const declined = page.getByRole('list', { name: 'Suggestions écartées' });
				await expect(declined).toContainText('Trouver qui mixe un morceau');
				// On comprend que rien n'est retiré.
				await expect(page.getByText(/Écarter une suggestion ne retire rien/)).toBeVisible();
				expect(await horizontalOverflow(page)).toEqual([]);
				await expectNoA11yViolations(page, ['.cartButton']);
				const reactivate = declined.getByRole('button', {
					name: 'Réactiver : Trouver qui mixe un morceau'
				});
				await reactivate.focus();
				await page.keyboard.press('Enter');
				await expect(page.getByText(/Réactivé/)).toBeVisible();
				await expect(declined).toHaveCount(0);
			});

			await test.step('5. Le morceau attend toujours son mixage : la suggestion revient', async () => {
				await page.goto('/espace');
				await waitForAppReady(page);
				await expect(mix).toBeVisible();
			});

			await test.step('6. « Plus tard » la reporte, avec sa date dans mes choix', async () => {
				await mix.getByRole('button', { name: /^Plus tard/ }).click();
				await expect(page.getByText(/revient dans 30 jours/)).toBeVisible();
				await expect(list.getByText('place au mixage')).toHaveCount(0);
				await page.goto('/espace/propositions');
				await waitForAppReady(page);
				await expect(page.getByRole('list', { name: 'Suggestions reportées' })).toContainText(
					/Trouver qui mixe un morceau · jusqu’au/
				);
			});
		} finally {
			await db.suggestionChoice.deleteMany({
				where: { owner: { person: { user: { email: account.email } } } }
			});
			await deleteMusicians(created);
		}
	});
});
