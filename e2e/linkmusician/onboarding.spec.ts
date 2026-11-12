import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady, waitForPath } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';

/**
 * P1-10, ONB-12a — Onboarding : de la vérification de l'email au tableau de
 * bord en 7 écrans (dont le récapitulatif) ; une reprise après fermeture
 * ramène à la bonne étape ; une correction depuis le récapitulatif y ramène
 * sans rien perdre ; chaque écran passe le contrôle d'accessibilité (axe).
 */
test.describe('LinkMusician — onboarding', () => {
	test.setTimeout(8 * 60_000);

	test('parcours complet, reprise et accessibilité', async ({ page, account, browser }) => {
		await signUpAndVerify(page, account);
		const screens: string[] = [];
		const visit = async (path: string) => {
			await waitForPath(page, path);
			await waitForAppReady(page);
			screens.push(path);
			// Bouton panier du boilerplate (boutique active en e2e, en veille dans
			// LinkMusician) : son compteur n'est pas repris dans son nom accessible.
			// Signalé en amont (docs/plan/remontees-boilerplate.md, n° 14).
			await expectNoA11yViolations(page, ['.cartButton']);
		};

		await test.step('1. Qui es-tu ?', async () => {
			await page.goto('/espace');
			await visit('/qui-es-tu');
			await page.getByLabel('Musicien·ne').check();
			await page.getByRole('button', { name: 'Continuer' }).click();
		});

		await test.step('2. Instruments', async () => {
			await visit('/demarrer/instruments');
			await page.getByLabel('Instrument à ajouter').selectOption({ label: 'Basse électrique' });
			await page.getByLabel('Niveau en Basse électrique').selectOption('4');
			await page.getByRole('button', { name: 'Continuer' }).click();
		});

		await test.step('3. Genres, puis fermeture et reprise', async () => {
			await visit('/demarrer/genres');
			// Fermeture du navigateur : un nouveau contexte avec la même session
			// reprend à l'étape « Genres », déduite du profil.
			const cookies = await page.context().cookies();
			const other = await browser.newContext();
			await other.addCookies(cookies);
			const resumed = await other.newPage();
			await resumed.goto('/espace');
			await waitForPath(resumed, '/demarrer/genres');
			await other.close();

			await page.getByText('Funk', { exact: true }).click();
			await page.getByRole('button', { name: 'Continuer' }).click();
		});

		await test.step('4. Ville', async () => {
			await visit('/demarrer/ville');
			await page.getByLabel('Ta commune').pressSequentially('toulou', { delay: 50 });
			await page.getByRole('option').first().getByRole('button').click();
			await page.getByRole('button', { name: 'Continuer' }).click();
		});

		await test.step('5. Intention', async () => {
			await visit('/demarrer/intention');
			await page.getByRole('radio', { name: /^Avec d’autres/ }).check();
			await page.getByRole('radio', { name: /^Régulier/ }).check();
			await page.getByText('Des jams').click();
			await page.getByRole('button', { name: 'Continuer' }).click();
		});

		await test.step('6. Récapitulatif : une correction y ramène, sans perte', async () => {
			await visit('/demarrer/recapitulatif');
			const genres = page.getByRole('region', { name: 'Genres' });
			await expect(genres).toContainText('Funk');
			await expect(page.getByRole('region', { name: 'Ville' })).toContainText('Toulouse');
			await expect(page.getByRole('region', { name: 'Musicien·ne' })).toContainText(
				'Avec d’autres'
			);

			await page.getByRole('link', { name: 'Modifier : Genres' }).click();
			await waitForPath(page, '/demarrer/genres');
			await waitForAppReady(page);
			// « Rock » est un genre parent, avec une légende cachée du même nom : on vise l'étiquette.
			await page
				.locator('label')
				.filter({ has: page.getByRole('checkbox', { name: 'Rock', exact: true }) })
				.click();
			await page.getByRole('button', { name: 'Continuer' }).click();

			// Retour direct au récapitulatif, l'intention n'est pas redemandée.
			await waitForPath(page, '/demarrer/recapitulatif');
			await waitForAppReady(page);
			await expect(genres).toContainText('Funk');
			await expect(genres).toContainText('Rock');
			await expect(page.getByRole('region', { name: 'Musicien·ne' })).toContainText('Régulier');
			await page.getByRole('button', { name: 'Terminer mon inscription' }).click();
		});

		await test.step('7. Premier résultat, puis le menu du jeu', async () => {
			await visit('/demarrer/resultat');
			await page.getByRole('link', { name: 'C’est parti !'.replace('’', "'") }).click();
			// Le menu du jeu est le point d'entrée de l'espace (P2-12b).
			await waitForPath(page, '/jouer');
		});

		expect(screens).toHaveLength(7);
		const user = await requireUser(account.email);
		const person = await db.person.findUniqueOrThrow({ where: { userId: user.id } });
		expect(person.onboardedAt).not.toBeNull();
		expect(person.lookingFor).toEqual(['JAMS']);
		expect(person.travelRadiusKm).toBe(25);
	});
});
