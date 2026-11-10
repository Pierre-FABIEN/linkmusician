import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { makeAccount } from '../support/account';
import { db, deleteUser, requireUser } from '../support/db';
import { waitForAppReady, waitForPath } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { skipOnboarding } from '../support/linkmusician';

/**
 * P4-03a — Studio : un ingé son ouvre la fiche de son studio, la remplit
 * (ville, service, salle et tarif, matériel, horaires) et la publie ; le
 * studio est « Ouvert » et sa page publique se lit sans adresse. Une
 * musicienne sans métier du son ne peut pas ouvrir de studio.
 */
test.describe('LinkMusician — studio', () => {
	test.setTimeout(6 * 60_000);

	test('je crée la fiche de mon studio', async ({ page, account, browser }) => {
		const musicianAccount = makeAccount();
		const musicianContext = await browser.newContext();
		const musicianPage = await musicianContext.newPage();
		const studioName = `Studio E2E ${Date.now().toString(36)}`;
		let studioHandle = '';
		try {
			await test.step('1. Je choisis le métier « Ingé son »', async () => {
				await signUpAndVerify(page, account);
				await page.goto('/qui-es-tu');
				await waitForAppReady(page);
				await page.getByLabel('Ingé son').check();
				await page.getByRole('button', { name: 'Continuer' }).click();
				await page.waitForURL(/\/demarrer/);
				const user = await requireUser(account.email);
				await db.person.update({ where: { userId: user.id }, data: { onboardedAt: new Date() } });
			});

			await test.step('2. J’ouvre la fiche de mon studio depuis mon profil', async () => {
				await page.goto('/profil');
				await waitForAppReady(page);
				await page.getByRole('link', { name: /Mes studios/ }).click();
				await waitForPath(page, '/studios');
				await waitForAppReady(page);
				await page.getByLabel('Nom du studio').fill(studioName);
				await page.getByRole('button', { name: 'Créer la fiche' }).click();
				await page.waitForURL(/\/studios\/[^/?]+\?cree=1/);
				studioHandle = new URL(page.url()).pathname.split('/').pop()!;
				await waitForAppReady(page);
				await expect(
					page.getByText('Brouillon : la fiche n’est visible que de toi.')
				).toBeVisible();
				await expect(page.getByText('au moins une salle')).toBeVisible();
			});

			await test.step('3. Une fiche brouillon n’est pas publique', async () => {
				const response = await musicianPage.goto(`/@${studioHandle}`);
				expect(response?.status()).toBe(404);
			});

			await test.step('4. Je remplis la fiche et je la publie', async () => {
				await page.getByLabel('Ville', { exact: true }).pressSequentially('toulou', { delay: 50 });
				await page.getByRole('option').first().getByRole('button').click();
				await page.getByLabel(/Enregistrement/).check();
				await page.getByLabel('Salle', { exact: true }).fill('Salle de prise');
				await page.getByLabel('Tarif à l’heure').fill('35');
				await page.getByLabel('Matériel').fill('Console Audient\nMicros Neumann U87');
				await page.getByLabel('Lundi', { exact: true }).check();
				// Le bandeau cookies recouvre le bouton collé en bas de l'écran.
				await page.getByRole('button', { name: 'Compris' }).click();
				await page.getByRole('button', { name: 'Enregistrer la fiche' }).click();
				await expect(page.getByText('Fiche enregistrée.').first()).toBeVisible();

				await page.getByRole('button', { name: 'Publier la fiche' }).click();
				await expect(page.getByText(/Ta fiche est publiée/).first()).toBeVisible();
				await expect(page.getByRole('region', { name: 'Statut de la fiche' })).toContainText(
					'Ouvert'
				);
				// Contraste mesuré pendant l'animation des toasts : on attend qu'ils partent.
				await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, { timeout: 15_000 });
				await expectNoA11yViolations(page, ['.cartButton']);
			});

			await test.step('5. Tout le monde lit la page du studio, sans adresse', async () => {
				await signUpAndVerify(musicianPage, musicianAccount);
				await skipOnboarding(musicianPage, musicianAccount.email);
				await musicianPage.goto(`/@${studioHandle}`);
				await waitForAppReady(musicianPage);
				await expect(
					musicianPage.getByRole('heading', { name: studioName, level: 1 })
				).toBeVisible();
				// Badge de rang : préfixe « Rang du studio : » lu par les lecteurs d'écran.
				await expect(
					musicianPage.locator('span:has(> span.sr-only)').filter({ hasText: 'Rang du studio' })
				).toContainText('Ouvert');
				await expect(musicianPage.getByText('Toulouse').first()).toBeVisible();
				await expect(musicianPage.getByText('Salle de prise')).toBeVisible();
				await expect(musicianPage.getByText('35 €')).toBeVisible();
				await expect(musicianPage.getByText('Micros Neumann U87')).toBeVisible();
				await expect(musicianPage.getByText('10 h à 19 h')).toBeVisible();
				await expect(
					musicianPage.getByRole('heading', { name: 'Pour réserver', level: 2 })
				).toBeVisible();
				await expectNoA11yViolations(musicianPage, ['.cartButton']);
			});

			await test.step('6. Sans métier du son, pas de studio', async () => {
				await musicianPage.goto('/studios');
				await waitForAppReady(musicianPage);
				await expect(
					musicianPage.getByText('Un studio se gère avec un métier du son')
				).toBeVisible();
				await expect(musicianPage.getByLabel('Nom du studio')).toHaveCount(0);
			});
		} finally {
			await musicianContext.close();
			if (studioHandle) await db.actor.deleteMany({ where: { handle: studioHandle } });
			await deleteUser(musicianAccount.email);
		}
	});
});
