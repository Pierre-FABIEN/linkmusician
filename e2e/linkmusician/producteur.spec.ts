import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { makeAccount } from '../support/account';
import { db, deleteUser, requireUser } from '../support/db';
import { waitForAppReady, waitForPath } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { setCity, skipOnboarding } from '../support/linkmusician';

/**
 * P4-04 — Producteur·rice : une productrice choisit le métier, complète son
 * profil (spécialité, style produit, tarifs indicatifs, production en
 * écoute) ; une musicienne la trouve par métier, spécialité et style ; son
 * profil public montre la carte « Producteur·rice » et son rang.
 */
test.describe('LinkMusician — producteur·rice', () => {
	test.setTimeout(6 * 60_000);

	test('une productrice complète son profil', async ({ page, account, browser }) => {
		const musicianAccount = makeAccount();
		const musicianContext = await browser.newContext();
		const musicianPage = await musicianContext.newPage();
		try {
			await test.step('1. Je choisis le métier « Producteur·rice »', async () => {
				await signUpAndVerify(page, account);
				await page.goto('/qui-es-tu');
				await waitForAppReady(page);
				await page.getByLabel('Producteur·rice').check();
				await page.getByRole('button', { name: 'Continuer' }).click();
				await page.waitForURL(/\/demarrer/);
				const user = await requireUser(account.email);
				await db.person.update({ where: { userId: user.id }, data: { onboardedAt: new Date() } });
				await setCity(page);
			});

			const me = await db.person.findUniqueOrThrow({
				where: { userId: (await requireUser(account.email)).id },
				include: { actor: true }
			});

			await test.step('2. Je complète mon profil de producteur·rice', async () => {
				await page.goto('/profil');
				await waitForAppReady(page);
				await page.getByRole('link', { name: /Mon profil de producteur·rice/ }).click();
				await waitForPath(page, '/profil/production');
				await waitForAppReady(page);
				await page.getByLabel(/Beatmaking/).check();
				await page.getByLabel('Funk', { exact: true }).check();
				await page.getByLabel('Mes logiciels').fill('Ableton Live');
				await page.getByLabel('Mes tarifs indicatifs').fill('À partir de 150 € le titre');
				await page.getByLabel('Titre', { exact: true }).first().fill('« Lumière »');
				await page.getByLabel('Lien', { exact: true }).first().fill('soundcloud.com/e2e/lumiere');
				await page.getByRole('button', { name: 'Enregistrer' }).click();
				await expect(page.getByText(/on te trouve dans la recherche/).first()).toBeVisible();
				await expectNoA11yViolations(page, ['.cartButton']);
			});

			await test.step('3. Une musicienne me trouve par métier, spécialité et style', async () => {
				await signUpAndVerify(musicianPage, musicianAccount);
				await skipOnboarding(musicianPage, musicianAccount.email);
				await setCity(musicianPage);
				await musicianPage.goto('/decouvrir?metier=producteur&specialite=beatmaking&genre=funk');
				await waitForAppReady(musicianPage);
				const card = musicianPage
					.getByRole('list', { name: 'Résultats' })
					.getByRole('link', { name: new RegExp(me.actor.displayName) });
				await expect(card).toContainText('Producteur·rice');
				await expect(card).toContainText('Beatmaking');

				await musicianPage.goto('/decouvrir?metier=producteur&specialite=arrangement');
				await waitForAppReady(musicianPage);
				await expect(musicianPage.getByText(me.actor.displayName)).toHaveCount(0);
			});

			await test.step('4. Mon profil public : carte, tarifs indicatifs, rang', async () => {
				await musicianPage.goto(`/@${me.actor.handle}`);
				await waitForAppReady(musicianPage);
				await expect(
					musicianPage.getByRole('heading', { name: 'Producteur·rice', level: 2 })
				).toBeVisible();
				await expect(musicianPage.getByText('À partir de 150 € le titre')).toBeVisible();
				await expect(musicianPage.getByText('Home studio').first()).toBeVisible();
			});

			await test.step('5. Mes objectifs de producteur·rice, sans ceux de musicien·ne', async () => {
				await page.goto('/espace/objectifs');
				await waitForAppReady(page);
				const section = page.getByRole('region', { name: /Producteur·rice/ });
				await expect(section.getByText('Termine une première production')).toBeVisible();
				await expect(section.getByText('Signe un premier arrangement')).toHaveCount(0);
				await expect(page.getByText('Ajoute ton premier instrument')).toHaveCount(0);
			});
		} finally {
			await musicianContext.close();
			await deleteUser(musicianAccount.email).catch(() => {});
		}
	});
});
