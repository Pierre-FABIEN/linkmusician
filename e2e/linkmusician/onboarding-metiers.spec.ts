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

/** Récapitulatif (ONB-12a) : accessible, puis il termine et mène au premier résultat. */
async function finish(page: Page) {
	await screen(page, '/demarrer/recapitulatif');
	await page.getByRole('button', { name: 'Terminer mon inscription' }).click();
	await screen(page, '/demarrer/resultat');
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

/** Un seul métier ouvert, sans instrument : genres, ville, puis son étape. */
async function soloTrackUntilStep(page: Page, label: string, slug: string) {
	await page.goto('/qui-es-tu');
	await waitForAppReady(page);
	// La case du métier : son nom commence par le libellé (puis sa description).
	const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	await page.getByRole('checkbox', { name: new RegExp(`^${escaped} `) }).check();
	await page.getByRole('button', { name: 'Continuer' }).click();
	await screen(page, '/demarrer/genres');
	await expect(page.getByText('Étape 2 sur 6')).toBeVisible();
	await pickGenre(page);
	await waitForPath(page, '/demarrer/ville');
	await pickCity(page);
	await screen(page, `/demarrer/metier/${slug}`);
}

function answers(track: { attributes: { field: string; code: string }[] } | undefined) {
	return track?.attributes.map((a) => `${a.field}=${a.code}`).sort();
}

async function personOf(email: string) {
	const user = await requireUser(email);
	return db.person.findUniqueOrThrow({
		where: { userId: user.id },
		include: {
			tracks: { include: { specializations: true, attributes: true, intents: true } },
			instruments: true
		}
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
			await expect(page.getByText('Étape 2 sur 6')).toBeVisible();
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

			await page.getByRole('checkbox', { name: /^Mixage/ }).check();
			await page.getByRole('checkbox', { name: /^Façade/ }).check();
			// Champs propres (D59) : un bloc par spécialité cochée, sans doublon.
			await expect(page.getByText('Mixage : formats')).toBeVisible();
			await expect(page.getByText('Live : types de scène')).toBeVisible();
			await expect(page.getByText('Mastering : destinations')).toHaveCount(0);
			// « Où tu travailles » est requis : refusé, avec un message.
			await submit.click();
			await expect(page.getByText('Où tu travailles : Ce champ est requis.')).toBeVisible();
			await page.getByRole('checkbox', { name: 'Home studio', exact: true }).check();
			await page.getByRole('checkbox', { name: 'En live', exact: true }).check();
			await page.getByRole('radio', { name: '100 à 500', exact: true }).check();
			await submit.click();
		});

		await test.step('5. Récapitulatif, premier résultat, puis le menu du jeu', async () => {
			await finish(page);
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
		expect(sound?.attributes.map((a) => `${a.field}=${a.code}`).sort()).toEqual([
			'environment=HOME_STUDIO',
			'environment=LIVE',
			'live_capacity=UP_TO_500'
		]);
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
			await expect(page.getByText('Étape 2 sur 8')).toBeVisible();
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
			await expect(page.getByText('Étape 5 sur 9')).toBeVisible();
		});

		await test.step('4. Producteur·rice, puis booker', async () => {
			await page.getByRole('checkbox', { name: /^Beatmaking/ }).check();
			await page.getByRole('checkbox', { name: /^Réalisation artistique/ }).check();
			await page.getByRole('checkbox', { name: 'À distance', exact: true }).check();
			await page.getByRole('button', { name: 'Continuer' }).click();
			await screen(page, '/demarrer/metier/booker');
			await page.getByRole('checkbox', { name: /^Booking de tournée/ }).check();
			// Un booker répond aux questions du booking, pas à celles de la programmation.
			await expect(page.getByText('Programmation : jauge')).toHaveCount(0);
			await page.getByRole('radio', { name: 'Indépendant·e', exact: true }).check();
			await page.getByRole('checkbox', { name: 'Régional', exact: true }).check();
			await page.getByRole('checkbox', { name: 'Émergents', exact: true }).check();
			await page.getByRole('button', { name: 'Continuer' }).click();
		});

		await test.step('5. Intention de musicien·ne, puis résultat', async () => {
			await screen(page, '/demarrer/intention');
			await page.getByRole('radio', { name: /^Avec d’autres/ }).check();
			await page.getByRole('radio', { name: /^Régulier/ }).check();
			await page.getByText('Des jams').click();
			await page.getByRole('button', { name: 'Continuer' }).click();
		});

		await test.step('6. Récapitulatif : trois métiers, trois ensembles distincts', async () => {
			await screen(page, '/demarrer/recapitulatif');
			const producer = page.getByRole('region', { name: 'Producteur·rice' });
			await expect(producer).toContainText('Beatmaking');
			await expect(producer).toContainText('À distance');
			await expect(page.getByRole('region', { name: 'Booker / programmateur·rice' })).toContainText(
				'Émergents'
			);
			await expect(page.getByRole('region', { name: 'Musicien·ne' })).not.toContainText(
				'Beatmaking'
			);
			await expect(page.getByRole('region', { name: 'Instruments' })).toContainText(
				'Basse électrique'
			);
			await page.getByRole('button', { name: 'Terminer mon inscription' }).click();
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

	test('métier « bientôt » passé en un clic, puis complété sur sa page', async ({
		page,
		account
	}) => {
		await signUpAndVerify(page, account);
		await page.goto('/qui-es-tu');
		await waitForAppReady(page);
		await page.getByLabel('Éditeur·rice').check();
		await page.getByRole('button', { name: 'Continuer' }).click();
		await waitForPath(page, '/demarrer/genres');
		await waitForAppReady(page);
		await pickGenre(page);
		await waitForPath(page, '/demarrer/ville');
		await pickCity(page);

		await test.step('1. Rien d’exigé : « Passer cette étape »', async () => {
			await screen(page, '/demarrer/metier/edition');
			await page.getByRole('button', { name: 'Passer cette étape' }).click();
			await finish(page);
		});

		await test.step('2. Page du métier : la synchro ouvre ses questions', async () => {
			await page.goto('/profil/metier/edition');
			await waitForAppReady(page);
			await expectNoA11yViolations(page, ['.cartButton']);
			await expect(page.getByText('Synchro : supports')).toHaveCount(0);
			await page.getByRole('checkbox', { name: /^Synchronisation/ }).check();
			await page.getByRole('checkbox', { name: 'Jeux vidéo', exact: true }).check();
			await page.getByRole('checkbox', { name: /^Des œuvres/ }).check();
			await expect(page.getByText('Soumissions d’œuvres')).toBeVisible();
			await page.getByRole('button', { name: 'Enregistrer' }).click();
			await expect(page.getByText('Ton métier est enregistré.').first()).toBeVisible();
		});

		const person = await personOf(account.email);
		const publisher = person.tracks.find((t) => t.track === 'PUBLISHER');
		expect(person.onboardedAt).not.toBeNull();
		expect(publisher?.specializations.map((s) => s.code)).toEqual(['SYNC']);
		expect(publisher?.attributes.map((a) => `${a.field}=${a.code}`)).toEqual([
			'sync_media=VIDEO_GAMES'
		]);
	});

	test('manager en tour management : aucun artiste à recruter exigé', async ({ page, account }) => {
		await signUpAndVerify(page, account);
		await soloTrackUntilStep(page, 'Manager', 'manager');

		await test.step('1. Tour management, sans besoin d’artistes', async () => {
			await page.getByRole('checkbox', { name: /^Tour management/ }).check();
			await expect(page.getByText('Tournée : ce que tu prends en charge')).toBeVisible();
			// Le stade ciblé n'apparaît que si l'on cherche des artistes.
			await page.getByRole('checkbox', { name: /^Des bookers/ }).check();
			await expect(page.getByText('Stade des artistes que tu cherches')).toHaveCount(0);
			await page.getByRole('checkbox', { name: /^Des groupes/ }).check();
			await expect(page.getByText('Stade des artistes que tu cherches')).toBeVisible();
			await page.getByRole('checkbox', { name: /^Des groupes/ }).uncheck();
			await expect(page.getByText('Stade des artistes que tu cherches')).toHaveCount(0);
		});

		await test.step('2. Statut, territoire, nouveaux projets', async () => {
			await page.getByRole('radio', { name: 'Indépendant·e', exact: true }).check();
			await page.getByRole('checkbox', { name: 'National', exact: true }).check();
			await page.getByRole('radio', { name: 'Oui', exact: true }).check();
			await page.getByRole('checkbox', { name: 'Logistique', exact: true }).check();
			await page.getByRole('button', { name: 'Continuer' }).click();
			await finish(page);
		});

		const person = await personOf(account.email);
		const manager = person.tracks.find((t) => t.track === 'MANAGER');
		expect(person.onboardedAt).not.toBeNull();
		expect(person.instruments).toEqual([]);
		expect(manager?.specializations.map((s) => s.code)).toEqual(['TOUR_MANAGEMENT']);
		expect(manager?.intents.map((i) => `${i.direction}=${i.code}`)).toEqual(['NEED=FIND_BOOKERS']);
		expect(answers(manager)).toEqual([
			'accepts_projects=YES',
			'status=INDEPENDENT',
			'territory=NATIONAL',
			'tour_scope=LOGISTICS'
		]);
	});

	test('organisateur·rice seul·e : sans instrument, aucune fiche d’événement', async ({
		page,
		account
	}) => {
		await signUpAndVerify(page, account);
		await soloTrackUntilStep(page, 'Organisateur·rice', 'organisateur');

		await test.step('1. Scènes ouvertes : le bloc jams', async () => {
			const submit = page.getByRole('button', { name: 'Continuer' });
			await expect(submit).toBeDisabled();
			await page.getByRole('checkbox', { name: /^Scènes ouvertes/ }).check();
			await expect(page.getByText('Jams : format')).toBeVisible();
			await expect(page.getByText('Festival : jauge')).toHaveCount(0);
			await page.getByRole('radio', { name: 'Association', exact: true }).check();
			await page.getByRole('checkbox', { name: 'Local', exact: true }).check();
			await page.getByRole('checkbox', { name: 'Scène ouverte', exact: true }).check();
			await page.getByRole('radio', { name: 'Tous niveaux', exact: true }).check();
			await submit.click();
			await finish(page);
		});

		const person = await personOf(account.email);
		const promoter = person.tracks.find((t) => t.track === 'PROMOTER');
		expect(person.onboardedAt).not.toBeNull();
		expect(person.instruments).toEqual([]);
		expect(promoter?.detailsConfirmedAt).not.toBeNull();
		expect(promoter?.specializations.map((s) => s.code)).toEqual(['OPEN_STAGES']);
		expect(answers(promoter)).toEqual([
			'jam_format=OPEN_STAGE',
			'jam_level=ALL',
			'structure=ASSOCIATION',
			'territory=LOCAL'
		]);
	});

	test('producteur·rice : deux spécialités et deux intentions persistées', async ({
		page,
		account
	}) => {
		await signUpAndVerify(page, account);
		await soloTrackUntilStep(page, 'Producteur·rice', 'producteur');

		await test.step('1. Spécialités, une offre, un besoin', async () => {
			await page.getByRole('checkbox', { name: /^Beatmaking/ }).check();
			await page.getByRole('checkbox', { name: /^Arrangement/ }).check();
			await expect(page.getByText('Beatmaking : ce que tu souhaites')).toBeVisible();
			await expect(page.getByText('Arrangement : ce que tu arranges')).toBeVisible();
			await page.getByRole('checkbox', { name: /^Des beats/ }).check();
			await page.getByRole('checkbox', { name: /^Des voix, des topliners/ }).check();
			await page.getByRole('checkbox', { name: 'Home studio', exact: true }).check();
			await page.getByRole('checkbox', { name: 'Cuivres', exact: true }).check();
			await page.getByRole('button', { name: 'Continuer' }).click();
			await finish(page);
		});

		const person = await personOf(account.email);
		const producer = person.tracks.find((t) => t.track === 'PRODUCER');
		expect(producer?.specializations.map((s) => s.code).sort()).toEqual([
			'ARRANGEMENT',
			'BEATMAKING'
		]);
		expect(producer?.intents.map((i) => `${i.direction}=${i.code}`).sort()).toEqual([
			'NEED=FIND_TOPLINERS',
			'OFFER=BEATS'
		]);
		expect(answers(producer)).toEqual(['arrangement_colors=BRASS', 'environment=HOME_STUDIO']);
	});
});
