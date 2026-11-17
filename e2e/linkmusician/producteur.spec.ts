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
				// D62 (ONB-13a) : une spécialité ne suffit pas, il faut une offre cochée.
				await expect(page.getByText(/Coche ce que tu proposes/).first()).toBeVisible();
				await expect(page.getByTestId('completude')).toContainText('Ce que tu proposes');
				// L'écran du métier est couvert par onboarding-metiers.spec.ts : l'offre en base.
				await db.personTrackIntent.create({
					data: { personId: me.actorId, track: 'PRODUCER', direction: 'OFFER', code: 'BEATS' }
				});
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

			await test.step('4. Mon profil public : carte et rang ; tarifs privés par défaut', async () => {
				const rate = musicianPage.getByText('À partir de 150 € le titre');
				await musicianPage.goto(`/@${me.actor.handle}`);
				await waitForAppReady(musicianPage);
				await expect(
					musicianPage.getByRole('heading', { name: 'Producteur·rice', level: 2 })
				).toBeVisible();
				await expect(musicianPage.getByText('Home studio').first()).toBeVisible();
				// ONB-12c2 (D61, Q70) : les tarifs suivent le bloc « Conditions », privé par défaut.
				await expect(rate).toHaveCount(0);
				// Précisions (membres) : présentes, dans le volet « Logiciels » replié.
				await expect(musicianPage.getByText('Ableton Live')).toBeAttached();
			});

			await test.step('4 bis. Je rends mes conditions publiques depuis la note', async () => {
				await page.setViewportSize({ width: 390, height: 844 });
				await page.goto('/profil/production');
				await waitForAppReady(page);
				const note = page.getByTestId('qui-voit-fiche');
				await expect(note).toContainText('Conditions (tarifs indicatifs) : Moi seulement');
				expect(
					await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
				).toBe(true);
				await expectNoA11yViolations(page, ['.cartButton']);
				// Au clavier : le lien mène aux réglages du métier.
				const link = note.getByRole('link', { name: 'Changer qui voit quoi' });
				await link.focus();
				await expect(link).toBeFocused();
				await page.keyboard.press('Enter');
				await waitForPath(page, '/profil/metier/producteur');
				await waitForAppReady(page);
				const form = page.getByTestId('reglages-metier');
				await form
					.getByRole('group', { name: 'Conditions' })
					.getByRole('button', { name: 'Tout le monde' })
					.click();
				await form.getByRole('button', { name: 'Appliquer ces réglages' }).click();
				await expect(page.getByTestId('reglages-metier').getByRole('status')).toBeVisible();
				await musicianPage.reload();
				await waitForAppReady(musicianPage);
				await expect(musicianPage.getByText('À partir de 150 € le titre')).toBeVisible();
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
