import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { makeAccount } from '../support/account';
import { db, deleteUser, requireUser } from '../support/db';
import { waitForAppReady, waitForPath } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { setCity, skipOnboarding } from '../support/linkmusician';

/**
 * P4-02 — Ingé son : une personne choisit le métier, complète son profil
 * (spécialités, mobilité, travail en écoute) et apparaît dans la recherche
 * par métier et par spécialité ; son profil public montre la carte
 * « Ingé son ». Sans spécialité, on ne la trouve pas.
 */
test.describe('LinkMusician — ingé son', () => {
	test.setTimeout(6 * 60_000);

	test('un ingé son complète son profil et apparaît dans la recherche par métier', async ({
		page,
		account,
		browser
	}) => {
		const musicianAccount = makeAccount();
		const musicianContext = await browser.newContext();
		const musicianPage = await musicianContext.newPage();
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
				await setCity(page);
			});

			const me = await db.person.findUniqueOrThrow({
				where: { userId: (await requireUser(account.email)).id },
				include: { actor: true }
			});

			await signUpAndVerify(musicianPage, musicianAccount);
			await skipOnboarding(musicianPage, musicianAccount.email);
			await setCity(musicianPage);
			const results = musicianPage.getByRole('list', { name: 'Résultats' });

			await test.step('2. Sans spécialité, la recherche par métier ne me trouve pas', async () => {
				await musicianPage.goto('/decouvrir?metier=inge-son');
				await waitForAppReady(musicianPage);
				await expect(musicianPage.getByText(me.actor.displayName)).toHaveCount(0);
			});

			await test.step('3. Je complète mon profil d’ingé son', async () => {
				await page.goto('/profil');
				await waitForAppReady(page);
				await page.getByRole('link', { name: /Mon profil d'ingé son/ }).click();
				await waitForPath(page, '/profil/son');
				await waitForAppReady(page);
				await page.getByLabel(/Mixage/).check();
				await page.getByLabel(/Façade/).check();
				await page.getByLabel(/À distance/).check();
				await page.getByLabel('Mon matériel').fill('Pro Tools\nYamaha CL5');
				await page.getByLabel('Titre').first().fill('Mix de « Nuit blanche »');
				await page.getByLabel('Lien').first().fill('soundcloud.com/e2e/nuit-blanche');
				await page.getByRole('button', { name: 'Enregistrer' }).click();
				await expect(page.getByText(/on te trouve dans la recherche/).first()).toBeVisible();
				await expectNoA11yViolations(page, ['.cartButton']);
			});

			await test.step('4. Une musicienne me trouve par métier et spécialité', async () => {
				await musicianPage.goto('/decouvrir');
				await waitForAppReady(musicianPage);
				await musicianPage.getByLabel('Métier').selectOption('inge-son');
				await musicianPage.getByLabel('Spécialité').selectOption('mixage');
				await musicianPage.getByRole('button', { name: 'Chercher' }).click();
				await expect(musicianPage).toHaveURL(/metier=inge-son/);
				const card = results.getByRole('link', { name: new RegExp(me.actor.displayName) });
				await expect(card).toBeVisible();
				await expect(card).toContainText('Ingé son');
				await expect(card).toContainText('Mixage, Façade');

				await musicianPage.goto('/decouvrir?metier=inge-son&specialite=mastering');
				await waitForAppReady(musicianPage);
				await expect(musicianPage.getByText(me.actor.displayName)).toHaveCount(0);
			});

			await test.step('5. Mon profil public montre la carte « Ingé son »', async () => {
				await musicianPage.goto(`/@${me.actor.handle}`);
				await waitForAppReady(musicianPage);
				const card = musicianPage.getByRole('heading', { name: 'Ingé son', level: 2 });
				await expect(card).toBeVisible();
				await expect(
					musicianPage.getByRole('link', { name: /Mix de « Nuit blanche »/ })
				).toHaveAttribute('href', 'https://soundcloud.com/e2e/nuit-blanche');
			});
		} finally {
			await musicianContext.close();
			await deleteUser(musicianAccount.email).catch(() => {});
		}
	});
});
