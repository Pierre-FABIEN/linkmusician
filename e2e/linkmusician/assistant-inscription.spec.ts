import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady, waitForPath } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';

/**
 * P3-17 (D47) — Assistant d'inscription, avec le fournisseur factice et
 * déterministe des e2e (`ONBOARDING_ASSISTANT_FAKE=1`, aucun appel à une IA) :
 * je décris ma situation, je retire une proposition, j'utilise les autres ;
 * chaque écran est pré-rempli mais c'est moi qui choisis le niveau, la
 * commune dans la liste, et qui envoie chaque formulaire. Rien n'est
 * enregistré avant ; seul le nombre d'analyses l'est.
 */
test.describe('LinkMusician — assistant d’inscription', () => {
	test.setTimeout(6 * 60_000);
	const A11Y_EXCLUDE = ['.cartButton'];

	test('je décris ma situation, je vérifie chaque écran', async ({ page, account }) => {
		await signUpAndVerify(page, account);
		const person = async () =>
			db.person.findUniqueOrThrow({
				where: { userId: (await requireUser(account.email)).id },
				select: {
					assistantRuns: true,
					lookingFor: true,
					onboardedAt: true,
					instruments: { select: { declaredLevel: true } }
				}
			});

		await test.step('1. Je décris ma situation et relis les propositions', async () => {
			await page.goto('/espace');
			await waitForPath(page, '/qui-es-tu');
			await waitForAppReady(page);
			await page.getByText('Décris ta situation avec tes mots').click();
			await expect(page.getByRole('button', { name: 'Préparer des propositions' })).toBeDisabled();
			await page.getByLabel('J’ai compris, je veux essayer l’aide.').check();
			await page
				.getByLabel('Ta situation')
				.fill(
					'Je joue de la basse depuis des années, plutôt rock et un peu de jazz. Je suis à Toulouse, je cherche un groupe et des jams. Mon mail : moi@example.test'
				);
			await page.getByRole('button', { name: 'Préparer des propositions' }).click();
			await expect(page.getByText('Voici ce que l’aide propose.')).toBeVisible();
			await expect(page.getByText('Des coordonnées (email, téléphone, adresse…)')).toBeVisible();
			await expect(page.getByText('Basse électrique · niveau à choisir')).toBeVisible();
			await expectNoA11yViolations(page, A11Y_EXCLUDE);
			// Je retire « Jazz », puis j'utilise le reste.
			await page.getByRole('button', { name: 'Retirer Jazz' }).click();
			await page.getByRole('button', { name: 'Utiliser ces propositions' }).click();
			await expect(page.getByLabel('Musicien·ne')).toBeChecked();
			const before = await person();
			expect(before.assistantRuns).toBe(1);
			expect(before.instruments).toEqual([]);
			await page.getByRole('button', { name: 'Continuer' }).click();
		});

		await test.step('2. Instruments : pré-rempli, je choisis le niveau', async () => {
			await waitForPath(page, '/demarrer/instruments');
			await waitForAppReady(page);
			await expect(page.getByText('Pré-rempli d’après ta description')).toBeVisible();
			await expect(page.getByRole('button', { name: 'Continuer' })).toBeDisabled();
			await page.getByLabel('Niveau en Basse électrique').selectOption('3');
			await expectNoA11yViolations(page, A11Y_EXCLUDE);
			await page.getByRole('button', { name: 'Continuer' }).click();
		});

		await test.step('3. Genres : Rock, sans Jazz', async () => {
			await waitForPath(page, '/demarrer/genres');
			await waitForAppReady(page);
			await expect(page.getByText('Pré-rempli d’après ta description')).toBeVisible();
			await expect(page.getByRole('checkbox', { name: 'Rock', exact: true })).toBeChecked();
			await expect(page.getByRole('checkbox', { name: 'Jazz', exact: true })).not.toBeChecked();
			await page.getByRole('button', { name: 'Continuer' }).click();
		});

		await test.step('4. Ville : je choisis la commune dans la liste', async () => {
			await waitForPath(page, '/demarrer/ville');
			await waitForAppReady(page);
			await expect(page.getByLabel('Ta commune')).toHaveValue('Toulouse');
			await expect(page.getByRole('button', { name: 'Continuer' })).toBeDisabled();
			await page.getByRole('option').first().getByRole('button').click();
			await page.getByRole('button', { name: 'Continuer' }).click();
		});

		await test.step('5. Intention : pré-remplie, j’envoie', async () => {
			await waitForPath(page, '/demarrer/intention');
			await waitForAppReady(page);
			await expect(page.getByText('Pré-rempli d’après ta description')).toBeVisible();
			await page.getByRole('radio', { name: /^Avec d’autres/ }).check();
			await page.getByRole('radio', { name: /^Régulier/ }).check();
			await page.getByRole('button', { name: 'Voir qui est près de moi' }).click();
			await waitForPath(page, '/demarrer/resultat');
		});

		const after = await person();
		expect(after.onboardedAt).not.toBeNull();
		expect(after.instruments).toEqual([{ declaredLevel: 3 }]);
		expect([...after.lookingFor].sort()).toEqual(['BAND', 'JAMS']);
		expect(after.assistantRuns).toBe(1);
	});
});
