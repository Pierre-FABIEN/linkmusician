import type { Page } from '@playwright/test';
import { stringify } from 'devalue';
import { test, expect } from '../support/fixtures';
import { pageOrigin, signUpAndVerify, sveltekitActionHeaders } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady, waitForPath } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { createMusician, deleteMusicians, horizontalOverflow } from '../support/linkmusician';

/**
 * ONB-14 (#28) — Inscription multirôle, recette transverse. Complète
 * `onboarding-metiers.spec.ts` sans le dupliquer :
 *
 * - les trois métiers « bientôt » ensemble (label, éditeur·rice,
 *   communication) : rien d'exigé, même un champ « requis » (D15) ;
 * - booker programmateur puis booker d'artistes, organisateur·rice de
 *   festival : les champs conditionnels (`when`) suivent la spécialité, et la
 *   réponse d'un champ masqué n'est pas enregistrée ;
 * - les champs du profil avancé (`stage: 'profile'`, ONB-12c3) absents de
 *   l'inscription, et intacts quand on la réenregistre ;
 * - POST forgés : métier non choisi, étape future, codes d'un autre métier,
 *   compte d'autrui ;
 * - parcours complet à 390 px, au clavier, avec axe ;
 * - règles des mineur·es : le premier résultat ne montre pas un·e mineur·e
 *   (ni un profil masqué) à un adulte inconnu (D5, D19), et un·e mineur·e
 *   organisateur·rice de scènes ouvertes ne devient pas organisateur·rice de
 *   jams (D51).
 *
 * L'assistant D47 reste couvert par `assistant-inscription.spec.ts`.
 */

const A11Y_EXCLUDE = ['.cartButton']; // Panier du boilerplate, remontée n° 14.
const MONTAUBAN = { code: '82121', nom: 'Montauban', dep: '82', lat: 44.0222, lng: 1.3639 };

async function screen(page: Page, path: string) {
	await waitForPath(page, path);
	await waitForAppReady(page);
	await expectNoA11yViolations(page, A11Y_EXCLUDE);
}

/** Qui es-tu ? Coche ces métiers (libellés), avec un principal s'il y en a plusieurs. */
async function chooseTracks(page: Page, labels: string[], primary?: string) {
	await page.goto('/qui-es-tu');
	await waitForAppReady(page);
	for (const label of labels) await specialty(page, label).check();
	if (primary)
		await page.locator(`input[type="radio"][name="primary"][value="${primary}"]`).check();
	await page.getByRole('button', { name: 'Continuer' }).click();
}

async function genresAndCity(page: Page, city = 'toulou') {
	await waitForPath(page, '/demarrer/genres');
	await waitForAppReady(page);
	await page.getByText('Funk', { exact: true }).click();
	await page.getByRole('button', { name: 'Continuer' }).click();
	await waitForPath(page, '/demarrer/ville');
	await waitForAppReady(page);
	await page.getByLabel('Ta commune').pressSequentially(city, { delay: 50 });
	await page.getByRole('option').first().getByRole('button').click();
	await page.getByRole('button', { name: 'Continuer' }).click();
}

async function finish(page: Page) {
	await screen(page, '/demarrer/recapitulatif');
	await page.getByRole('button', { name: 'Terminer mon inscription' }).click();
	await waitForPath(page, '/demarrer/resultat');
	await waitForAppReady(page);
}

/** La case d'une spécialité : son nom commence par le libellé, puis sa description. */
function specialty(page: Page, label: string) {
	const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return page.getByRole('checkbox', { name: new RegExp(`^${escaped} `) });
}

async function personOf(email: string) {
	const user = await requireUser(email);
	return db.person.findUniqueOrThrow({
		where: { userId: user.id },
		include: { tracks: { include: { specializations: true, attributes: true, intents: true } } }
	});
}

type Person = Awaited<ReturnType<typeof personOf>>;

function trackOf(person: Person, track: string) {
	return person.tracks.find((t) => t.track === track);
}

function answers(person: Person, track: string) {
	return trackOf(person, track)
		?.attributes.map((a) => `${a.field}=${a.code}`)
		.sort();
}

/**
 * Envoie un formulaire métier comme `use:enhance` (superforms, `dataType:
 * 'json'`), avec des données choisies : ce qu'un client modifié enverrait.
 */
async function forgeTrackStep(page: Page, path: string, data: Record<string, unknown>) {
	const response = await page.request.post(path, {
		form: { __superform_json: stringify(data) },
		headers: sveltekitActionHeaders(pageOrigin(page))
	});
	const body = (await response.json()) as { type: string; status?: number; location?: string };
	return body;
}

test.describe('LinkMusician — inscription multirôle (ONB-14)', () => {
	test.setTimeout(8 * 60_000);

	test('label, éditeur·rice et communication : trois métiers « bientôt », rien d’exigé', async ({
		page,
		account
	}) => {
		await signUpAndVerify(page, account);
		await chooseTracks(
			page,
			['Professionnel·le de label', 'Éditeur·rice', 'Communication musicale'],
			'LABEL_PRO'
		);
		await genresAndCity(page);

		await test.step('1. Label : A&R coché, ses champs « requis » deviennent facultatifs', async () => {
			await screen(page, '/demarrer/metier/label');
			await expect(page.getByText('Étape 4 sur 8')).toBeVisible();
			await expect(page.getByText('Ce métier arrive bientôt sur LinkMusician.')).toBeVisible();
			await expect(page.getByRole('button', { name: 'Passer cette étape' })).toBeEnabled();
			await specialty(page, 'A&R').check();
			await expect(page.getByText('A&R : artistes ciblés (facultatif)')).toBeVisible();
			await expect(page.getByText('A&R : politique de démos (facultatif)')).toBeVisible();
			await expect(page.getByText('(requis)')).toHaveCount(0);
			// Rien n'est rempli : l'étape passe quand même.
			await page.getByRole('button', { name: 'Continuer' }).click();
		});

		await test.step('2. Éditeur·rice : passée en un clic', async () => {
			await screen(page, '/demarrer/metier/edition');
			await expect(page.getByText('Étape 5 sur 8')).toBeVisible();
			await page.getByRole('button', { name: 'Passer cette étape' }).click();
		});

		await test.step('3. Communication : un champ suit la spécialité, puis disparaît', async () => {
			await screen(page, '/demarrer/metier/communication');
			await specialty(page, 'Photo').check();
			await expect(page.getByText('Photo, vidéo : formats')).toBeVisible();
			await expect(page.getByText('Journalisme : formats')).toHaveCount(0);
			await page.getByRole('checkbox', { name: 'Clips', exact: true }).check();
			await specialty(page, 'Photo').uncheck();
			await expect(page.getByText('Photo, vidéo : formats')).toHaveCount(0);
			await page.getByRole('button', { name: 'Passer cette étape' }).click();
		});

		await test.step('4. Récapitulatif : un ensemble par métier', async () => {
			await waitForPath(page, '/demarrer/recapitulatif');
			await expect(page.getByRole('region', { name: 'Professionnel·le de label' })).toContainText(
				'A&R'
			);
			await finish(page);
		});

		const person = await personOf(account.email);
		expect(person.onboardedAt).not.toBeNull();
		for (const track of ['LABEL_PRO', 'PUBLISHER', 'MUSIC_COMMS'])
			expect(trackOf(person, track)?.detailsConfirmedAt, track).not.toBeNull();
		expect(trackOf(person, 'LABEL_PRO')?.isPrimary).toBe(true);
		expect(trackOf(person, 'LABEL_PRO')?.specializations.map((s) => s.code)).toEqual(['A_AND_R']);
		expect(answers(person, 'LABEL_PRO')).toEqual([]);
		// La réponse « Clips » d'un champ masqué n'est pas gardée.
		expect(trackOf(person, 'MUSIC_COMMS')?.specializations).toEqual([]);
		expect(answers(person, 'MUSIC_COMMS')).toEqual([]);
		expect(answers(person, 'PUBLISHER')).toEqual([]);
	});

	test('booker d’artistes après la programmation, organisatrice de festival, disponibilités', async ({
		page,
		account
	}) => {
		await signUpAndVerify(page, account);
		await chooseTracks(page, ['Booker / programmateur·rice', 'Organisateur·rice'], 'BOOKER');
		await genresAndCity(page);

		await test.step('1. Booker : la programmation ouvre ses questions, sans les disponibilités', async () => {
			await screen(page, '/demarrer/metier/booker');
			await expect(page.getByText('Étape 4 sur 7')).toBeVisible();
			// Profil avancé (ONB-12c3) : jamais à l'inscription.
			await expect(page.getByText('Disponible pour un nouveau projet')).toHaveCount(0);
			await expect(page.getByText('Quand tu travailles')).toHaveCount(0);
			await specialty(page, 'Programmation de salle ou de festival').check();
			await expect(page.getByText('Programmation : jauge (requis)')).toBeVisible();
			await expect(page.getByText('Programmation : formations accueillies')).toBeVisible();
			await expect(page.getByText('Booking : artistes représentés')).toHaveCount(0);
			await page.getByRole('radio', { name: 'Plus de 1 000', exact: true }).check();
		});

		await test.step('2. Booker d’artistes à la place : d’autres champs, d’autres exigences', async () => {
			await specialty(page, 'Programmation de salle ou de festival').uncheck();
			await specialty(page, 'Booking d’artistes').check();
			await expect(page.getByText('Programmation : jauge')).toHaveCount(0);
			await expect(
				page.getByText('Booking : artistes représentés ou recherchés (requis)')
			).toBeVisible();
			await page.getByRole('radio', { name: 'Agence', exact: true }).check();
			await page.getByRole('checkbox', { name: 'National', exact: true }).check();
			const submit = page.getByRole('button', { name: 'Continuer' });
			await submit.click();
			await expect(
				page.getByText('Booking : artistes représentés ou recherchés : Ce champ est requis.')
			).toBeVisible();
			await page.getByRole('checkbox', { name: 'Confirmés', exact: true }).check();
			await submit.click();
		});

		await test.step('3. Organisatrice de festival : pas les questions des jams', async () => {
			await screen(page, '/demarrer/metier/organisateur');
			await specialty(page, 'Festival').check();
			await expect(page.getByText('Festival : jauge')).toBeVisible();
			await expect(page.getByText('Festival : scènes')).toBeVisible();
			await expect(page.getByText('Jams : format')).toHaveCount(0);
			await expect(page.getByText('Concerts : régie')).toHaveCount(0);
			await page.getByRole('radio', { name: 'Association', exact: true }).check();
			await page.getByRole('checkbox', { name: 'Régional', exact: true }).check();
			await page.getByRole('radio', { name: '500 à 2 000', exact: true }).check();
			await page.getByRole('radio', { name: 'Deux ou trois', exact: true }).check();
			await page.getByRole('button', { name: 'Continuer' }).click();
			await finish(page);
		});

		const done = await personOf(account.email);
		expect(trackOf(done, 'BOOKER')?.specializations.map((s) => s.code)).toEqual(['ARTIST_BOOKING']);
		// La jauge de programmation, cochée puis masquée, n'est pas enregistrée.
		expect(answers(done, 'BOOKER')).toEqual([
			'artist_categories=CONFIRMED',
			'structure=AGENCY',
			'territory=NATIONAL'
		]);
		expect(trackOf(done, 'PROMOTER')?.specializations.map((s) => s.code)).toEqual(['FESTIVAL']);
		expect(answers(done, 'PROMOTER')).toEqual([
			'festival_capacity=UP_TO_2000',
			'festival_stages=TWO_THREE',
			'structure=ASSOCIATION',
			'territory=REGIONAL'
		]);

		await test.step('4. Disponibilités saisies sur la page du métier', async () => {
			await page.goto('/profil/metier/booker');
			await waitForAppReady(page);
			await page.getByRole('radio', { name: 'Dès maintenant', exact: true }).check();
			await page.getByRole('checkbox', { name: 'Le week-end', exact: true }).check();
			await page.getByRole('button', { name: 'Enregistrer' }).click();
			await expect(page.getByText('Ton métier est enregistré.').first()).toBeVisible();
		});

		await test.step('5. L’étape d’inscription réenregistrée ne les efface pas', async () => {
			await page.goto('/demarrer/metier/booker');
			await waitForAppReady(page);
			await expect(page.getByText('Disponible pour un nouveau projet')).toHaveCount(0);
			await expect(page.getByRole('radio', { name: 'Agence', exact: true })).toBeChecked();
			await page.getByRole('button', { name: 'Continuer' }).click();
			await waitForPath(page, '/demarrer/metier/organisateur');
		});

		const after = await personOf(account.email);
		expect(answers(after, 'BOOKER')).toEqual([
			'artist_categories=CONFIRMED',
			'availability_rhythm=WEEKENDS',
			'availability_start=NOW',
			'structure=AGENCY',
			'territory=NATIONAL'
		]);
	});

	test('POST forgés : métier non choisi, étape future, codes d’un autre métier, autre compte', async ({
		page,
		account
	}) => {
		const other = await createMusician({ name: 'Autrui', commune: MONTAUBAN });
		try {
			await db.personTrack.create({ data: { personId: other.actorId, track: 'SOUND_ENGINEER' } });
			await signUpAndVerify(page, account);
			await chooseTracks(page, ['Ingé son']);
			await waitForPath(page, '/demarrer/genres');
			await waitForAppReady(page);
			const valid = {
				track: 'SOUND_ENGINEER',
				specializations: ['MIXING'],
				offers: [],
				needs: [],
				details: { environment: ['HOME_STUDIO'] }
			};

			await test.step('1. Inscription : métier non choisi et étape future refusés', async () => {
				const producer = await forgeTrackStep(page, '/demarrer/metier/producteur', {
					track: 'PRODUCER',
					specializations: ['BEATMAKING'],
					offers: [],
					needs: [],
					details: {}
				});
				expect(producer).toMatchObject({ type: 'redirect', location: '/demarrer/genres' });
				// L'étape « Ingé son » vient après les genres et la ville.
				const future = await forgeTrackStep(page, '/demarrer/metier/inge-son', valid);
				expect(future).toMatchObject({ type: 'redirect', location: '/demarrer/genres' });
				const person = await personOf(account.email);
				expect(person.tracks.map((t) => t.track)).toEqual(['SOUND_ENGINEER']);
				expect(trackOf(person, 'SOUND_ENGINEER')?.detailsConfirmedAt).toBeNull();
				expect(trackOf(person, 'SOUND_ENGINEER')?.specializations).toEqual([]);
			});

			// La suite vise la page du métier : inscription terminée en base.
			await db.person.update({
				where: { userId: (await requireUser(account.email)).id },
				data: { onboardedAt: new Date() }
			});

			await test.step('2. Page d’un métier non choisi : refusée', async () => {
				const producer = await forgeTrackStep(page, '/profil/metier/producteur', {
					track: 'PRODUCER',
					specializations: ['BEATMAKING'],
					offers: [],
					needs: [],
					details: {}
				});
				expect(producer).toMatchObject({ type: 'failure', status: 403 });
				expect((await personOf(account.email)).tracks.map((t) => t.track)).toEqual([
					'SOUND_ENGINEER'
				]);
			});

			await test.step('3. Codes et champs d’un autre métier : refusés côté serveur', async () => {
				// Le schéma valide avec le métier posté : le serveur revérifie avec celui de
				// l'adresse. (L'étape d'inscription, elle, renvoie d'abord vers les genres.)
				for (const path of ['/profil/metier/inge-son']) {
					const codes = await forgeTrackStep(page, path, {
						...valid,
						track: 'PRODUCER',
						specializations: ['BEATMAKING']
					});
					expect(codes, path).toMatchObject({ type: 'failure', status: 400 });
					const field = await forgeTrackStep(page, path, {
						...valid,
						details: { ...valid.details, arrangement_colors: ['BRASS'] }
					});
					expect(field, path).toMatchObject({ type: 'failure', status: 400 });
				}
				const person = await personOf(account.email);
				expect(trackOf(person, 'SOUND_ENGINEER')?.specializations).toEqual([]);
				expect(answers(person, 'SOUND_ENGINEER')).toEqual([]);
				expect(await db.personTrackAttribute.count({ where: { personId: person.actorId } })).toBe(
					0
				);
			});

			await test.step('4. Le compte visé vient de la session, jamais du formulaire', async () => {
				const saved = await forgeTrackStep(page, '/profil/metier/inge-son', {
					...valid,
					personId: other.actorId,
					actorId: other.actorId
				});
				expect(saved).toMatchObject({ type: 'success' });
				const person = await personOf(account.email);
				expect(trackOf(person, 'SOUND_ENGINEER')?.specializations.map((s) => s.code)).toEqual([
					'MIXING'
				]);
				expect(answers(person, 'SOUND_ENGINEER')).toEqual(['environment=HOME_STUDIO']);
				const victim = await db.personTrack.findUniqueOrThrow({
					where: { personId_track: { personId: other.actorId, track: 'SOUND_ENGINEER' } },
					include: { specializations: true, attributes: true }
				});
				expect(victim.specializations).toEqual([]);
				expect(victim.attributes).toEqual([]);
			});
		} finally {
			await deleteMusicians([other]);
		}
	});

	test.describe('sur un téléphone, au clavier', () => {
		test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

		async function mobileScreen(page: Page, path: string) {
			await screen(page, path);
			expect(await horizontalOverflow(page), `débordement sur ${path}`).toEqual([]);
		}

		/** Coche au clavier : focus, puis espace. */
		async function press(page: Page, name: string | RegExp, role: 'checkbox' | 'radio') {
			const box = page.getByRole(role, { name, exact: typeof name === 'string' });
			await box.focus();
			await page.keyboard.press('Space');
			await expect(box).toBeChecked();
		}

		/** Envoie au clavier. */
		async function submitWithKeyboard(page: Page, name = 'Continuer') {
			await page.getByRole('button', { name }).focus();
			await page.keyboard.press('Enter');
		}

		test('musicien·ne + ingé son, de bout en bout à 390 px', async ({ page, account }) => {
			await signUpAndVerify(page, account);

			await test.step('1. Qui es-tu ?', async () => {
				await page.goto('/qui-es-tu');
				await mobileScreen(page, '/qui-es-tu');
				await press(page, /^Musicien·ne/, 'checkbox');
				await press(page, /^Ingé son/, 'checkbox');
				await page.locator('input[type="radio"][name="primary"][value="MUSICIAN"]').focus();
				await page.keyboard.press('Space');
				await submitWithKeyboard(page);
			});

			await test.step('2. Instruments, genres, ville', async () => {
				await mobileScreen(page, '/demarrer/instruments');
				await page.getByLabel('Instrument à ajouter').selectOption({ label: 'Basse électrique' });
				await page.getByLabel('Niveau en Basse électrique').selectOption('3');
				await submitWithKeyboard(page);
				await mobileScreen(page, '/demarrer/genres');
				await press(page, 'Funk', 'checkbox');
				await submitWithKeyboard(page);
				await mobileScreen(page, '/demarrer/ville');
				await page.getByLabel('Ta commune').pressSequentially('toulou', { delay: 50 });
				await page.getByRole('option').first().getByRole('button').focus();
				await page.keyboard.press('Enter');
				await expect(page.getByRole('button', { name: 'Continuer' })).toBeEnabled();
				await submitWithKeyboard(page);
			});

			await test.step('3. Étape ingé son', async () => {
				await mobileScreen(page, '/demarrer/metier/inge-son');
				await press(page, /^Mixage/, 'checkbox');
				await press(page, 'Home studio', 'checkbox');
				await mobileScreen(page, '/demarrer/metier/inge-son');
				await submitWithKeyboard(page);
			});

			await test.step('4. Intention, récapitulatif, résultat', async () => {
				await mobileScreen(page, '/demarrer/intention');
				await press(page, /^Avec d’autres/, 'radio');
				await press(page, /^Régulier/, 'radio');
				// Sans rien dans « Je recherche », le bouton est « Juste explorer ».
				await press(page, /^Des jams/, 'checkbox');
				await submitWithKeyboard(page);
				await mobileScreen(page, '/demarrer/recapitulatif');
				await submitWithKeyboard(page, 'Terminer mon inscription');
				await mobileScreen(page, '/demarrer/resultat');
			});

			const person = await personOf(account.email);
			expect(person.onboardedAt).not.toBeNull();
			expect(trackOf(person, 'SOUND_ENGINEER')?.specializations.map((s) => s.code)).toEqual([
				'MIXING'
			]);
		});
	});

	test('premier résultat d’un adulte : ni mineur·e inconnu·e, ni profil masqué', async ({
		page,
		account
	}) => {
		const adult = await createMusician({ name: 'Adulte', commune: MONTAUBAN });
		const minor = await createMusician({
			name: 'Mineure',
			commune: MONTAUBAN,
			birthDate: `${new Date().getUTCFullYear() - 17}-01-15`
		});
		const hidden = await createMusician({ name: 'Masque', commune: MONTAUBAN });
		try {
			await db.actor.update({ where: { id: hidden.actorId }, data: { hidden: true } });
			await signUpAndVerify(page, account);
			await chooseTracks(page, ['Ingé son']);
			await genresAndCity(page, 'montau');
			await waitForPath(page, '/demarrer/metier/inge-son');
			await waitForAppReady(page);
			await specialty(page, 'Mixage').check();
			await page.getByRole('checkbox', { name: 'Home studio', exact: true }).check();
			await page.getByRole('button', { name: 'Continuer' }).click();
			await finish(page);
			await expect(page.getByText(adult.displayName)).toBeVisible();
			await expect(page.getByText(minor.displayName)).toHaveCount(0);
			await expect(page.getByText(hidden.displayName)).toHaveCount(0);

			// D82 : le carnet se remplit librement ; il ne fait donc jamais réapparaître
			// une mineure auprès d'un adulte.
			const viewer = await personOf(account.email);
			await db.savedContact.create({ data: { ownerId: viewer.actorId, contactId: minor.actorId } });
			await page.reload();
			await waitForAppReady(page);
			await expect(page.getByText(minor.displayName)).toHaveCount(0);
		} finally {
			await deleteMusicians([adult, minor, hidden]);
		}
	});

	test('mineur·e organisatrice de scènes ouvertes : pas organisatrice de jams', async ({
		page,
		account
	}) => {
		await signUpAndVerify(page, account);
		await chooseTracks(page, ['Organisateur·rice']);
		await db.person.update({
			where: { userId: (await requireUser(account.email)).id },
			data: { birthDate: new Date(`${new Date().getUTCFullYear() - 17}-01-15T00:00:00Z`) }
		});
		await genresAndCity(page);
		await screen(page, '/demarrer/metier/organisateur');
		await specialty(page, 'Scènes ouvertes').check();
		await page.getByRole('checkbox', { name: /^Des jams/ }).check();
		await page.getByRole('radio', { name: 'Association', exact: true }).check();
		await page.getByRole('checkbox', { name: 'Local', exact: true }).check();
		await page.getByRole('button', { name: 'Continuer' }).click();
		await finish(page);

		const person = await personOf(account.email);
		expect(trackOf(person, 'PROMOTER')?.specializations.map((s) => s.code)).toEqual([
			'OPEN_STAGES'
		]);
		// Déclarer des jams ne vaut pas la case D51, réservée aux adultes.
		expect(person.organizesJams).toBe(false);
		await page.goto('/jam');
		await waitForAppReady(page);
		await expect(page.locator('a[href="/jams/nouvelle"]')).toHaveCount(0);
	});
});
