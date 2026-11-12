import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady, waitForPath } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';

/**
 * ONB-02 — Onboarding adaptatif : un·e ingé son seul·e termine sans
 * instrument ; musicien·ne + producteur·rice remplit deux étapes séparées ;
 * retour arrière, rafraîchissement, reprise, accès direct à une étape future
 * refusé, métier ajouté en cours de route. Le parcours musicien·ne seul·e
 * reste couvert par `onboarding.spec.ts`.
 */

async function screen(page: Page, path: string) {
	await waitForPath(page, path);
	await waitForAppReady(page);
	// Bouton panier du boilerplate (voir onboarding.spec.ts).
	await expectNoA11yViolations(page, ['.cartButton']);
}

async function pickGenre(page: Page) {
	await page.getByText('Funk', { exact: true }).click();
	await page.getByRole('button', { name: 'Continuer' }).click();
}

async function pickCity(page: Page) {
	await page.getByLabel('Ta commune').pressSequentially('toulou', { delay: 50 });
	await page.getByRole('option').first().getByRole('button').click();
	await page.getByRole('button', { name: 'Continuer' }).click();
}

async function personOf(email: string) {
	const user = await requireUser(email);
	return db.person.findUniqueOrThrow({
		where: { userId: user.id },
		include: { tracks: { include: { specializations: true } }, instruments: true }
	});
}

test.describe('LinkMusician — onboarding selon les métiers', () => {
	test.setTimeout(8 * 60_000);

	test('ingé son seul·e : sans instrument, une étape métier', async ({
		page,
		account,
		browser
	}) => {
		await signUpAndVerify(page, account);

		await test.step('1. Qui es-tu ? Ingé son', async () => {
			await page.goto('/espace');
			await screen(page, '/qui-es-tu');
			await page.getByLabel('Ingé son').check();
			await page.getByRole('button', { name: 'Continuer' }).click();
		});

		await test.step('2. Genres directement, sans écran « Instruments »', async () => {
			await screen(page, '/demarrer/genres');
			await expect(page.getByText('Étape 2 sur 5')).toBeVisible();
			// Étape absente du parcours, puis étape future : renvoi à l'étape à faire.
			await page.goto('/demarrer/instruments');
			await waitForPath(page, '/demarrer/genres');
			await page.goto('/demarrer/metier/inge-son');
			await waitForPath(page, '/demarrer/genres');
			await pickGenre(page);
		});

		await test.step('3. Ville, puis retour arrière et rafraîchissement', async () => {
			await screen(page, '/demarrer/ville');
			await page.getByRole('link', { name: 'Retour' }).click();
			await waitForPath(page, '/demarrer/genres');
			await page.reload();
			await waitForPath(page, '/demarrer/genres');
			// Les genres sont gardés : on repart vers la ville.
			await page.getByRole('button', { name: 'Continuer' }).click();
			await waitForPath(page, '/demarrer/ville');
			await pickCity(page);
		});

		await test.step('4. Étape « Ingé son » : une spécialité exigée', async () => {
			await screen(page, '/demarrer/metier/inge-son');
			const submit = page.getByRole('button', { name: 'Continuer' });
			await expect(submit).toBeDisabled();

			// Reprise dans un nouveau contexte : même étape.
			const other = await browser.newContext();
			await other.addCookies(await page.context().cookies());
			const resumed = await other.newPage();
			await resumed.goto('/espace');
			await waitForPath(resumed, '/demarrer/metier/inge-son');
			await other.close();

			await page.getByLabel('Mixage').check();
			await page.getByLabel('Façade').check();
			await submit.click();
		});

		await test.step('5. Premier résultat, puis le menu du jeu', async () => {
			await screen(page, '/demarrer/resultat');
			await page.getByRole('link', { name: 'C’est parti !'.replace('’', "'") }).click();
			await waitForPath(page, '/jouer');
		});

		const person = await personOf(account.email);
		expect(person.onboardedAt).not.toBeNull();
		expect(person.instruments).toEqual([]);
		const sound = person.tracks.find((t) => t.track === 'SOUND_ENGINEER');
		expect(sound?.detailsConfirmedAt).not.toBeNull();
		expect(sound?.specializations.map((s) => s.code).sort()).toEqual(['LIVE_FOH', 'MIXING']);
		// Le profil historique suit : on la trouve dans la recherche par métier.
		const profile = await db.soundEngineerProfile.findUnique({
			where: { personId: person.actorId }
		});
		expect(profile?.specialties).toEqual(['MIXING', 'LIVE_FOH']);
	});

	test('musicien·ne + producteur·rice, puis un métier ajouté en route', async ({
		page,
		account
	}) => {
		await signUpAndVerify(page, account);

		await test.step('1. Deux métiers', async () => {
			await page.goto('/qui-es-tu');
			await waitForAppReady(page);
			await page.getByLabel('Musicien·ne').check();
			await page.getByLabel('Producteur·rice').check();
			await page.locator('input[type="radio"][name="primary"][value="MUSICIAN"]').check();
			await page.getByRole('button', { name: 'Continuer' }).click();
		});

		await test.step('2. Instruments, genres, ville : une seule fois', async () => {
			await screen(page, '/demarrer/instruments');
			await expect(page.getByText('Étape 2 sur 7')).toBeVisible();
			await page.getByLabel('Instrument à ajouter').selectOption({ label: 'Basse électrique' });
			await page.getByLabel('Niveau en Basse électrique').selectOption('3');
			await page.getByRole('button', { name: 'Continuer' }).click();
			await waitForPath(page, '/demarrer/genres');
			await pickGenre(page);
			await waitForPath(page, '/demarrer/ville');
			await pickCity(page);
		});

		await test.step('3. Un métier ajouté en route : une étape de plus', async () => {
			await screen(page, '/demarrer/metier/producteur');
			await page.goto('/qui-es-tu');
			await waitForAppReady(page);
			await page.getByLabel('Booker / programmateur·rice').check();
			await page.getByRole('button', { name: 'Continuer' }).click();
			// Instruments, genres et ville sont faits : on reprend à la première étape métier.
			await waitForPath(page, '/demarrer/metier/producteur');
			await expect(page.getByText('Étape 5 sur 8')).toBeVisible();
		});

		await test.step('4. Producteur·rice, puis booker', async () => {
			await page.getByLabel('Beatmaking').check();
			await page.getByLabel('Réalisation artistique').check();
			await page.getByRole('button', { name: 'Continuer' }).click();
			await screen(page, '/demarrer/metier/booker');
			await page.getByLabel('Booking de tournée').check();
			await page.getByRole('button', { name: 'Continuer' }).click();
		});

		await test.step('5. Intention de musicien·ne, puis résultat', async () => {
			await screen(page, '/demarrer/intention');
			await page.getByText('Des jams').click();
			await page.getByRole('button', { name: 'Voir qui est près de moi' }).click();
			await screen(page, '/demarrer/resultat');
		});

		const person = await personOf(account.email);
		expect(person.onboardedAt).not.toBeNull();
		const codes = Object.fromEntries(
			person.tracks.map((t) => [t.track, t.specializations.map((s) => s.code).sort()])
		);
		expect(codes).toEqual({
			MUSICIAN: [],
			PRODUCER: ['BEATMAKING', 'RECORD_PRODUCTION'],
			BOOKER: ['TOUR_BOOKING']
		});
		expect(person.instruments).toHaveLength(1);
	});
});
