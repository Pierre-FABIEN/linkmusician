import type { Browser, Page } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { pageOrigin, signUpAndVerify, sveltekitActionHeaders } from '../support/admin';
import { makeAccount, makeClientIp, type Account } from '../support/account';
import { db, deleteUser, e2eTable, requireUser } from '../support/db';
import { waitForAppReady, waitForPath } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import {
	createMusician,
	deleteMusicians,
	horizontalOverflow,
	skipOnboarding
} from '../support/linkmusician';

/**
 * DASH-20a (#50) — Recette transverse, première tranche : confidentialité et
 * parcours entre métiers. Complète `inscription-transverse.spec.ts` (ONB-14),
 * `booker.spec.ts` (P5-07) et `droit-de-candidater.spec.ts` (DASH-07a) sans
 * les dupliquer :
 *
 * - premier résultat : la distance ne sort du serveur que par tranche ;
 * - carnet de jams d'un·e mineur·e : la page et son préchargement répondent ;
 * - manager + artiste : artiste mineur·e et manager mineur·e refusé·es, POST
 *   forgés d'un tiers (répondre, terminer), confirmation à 390 px au clavier ;
 * - booker + groupe : la gestion qui répond est majeure (Q48) ; un groupe
 *   géré par des mineur·es seulement ne reçoit pas de proposition ; une
 *   organisatrice tierce ne répond pas pour le groupe.
 *
 * DASH-20b, deuxième tranche (même fichier, mêmes aides) :
 *
 * - groupe + lieu : un lieu publie une date ; non-membre, MEMBER sans gestion
 *   et co-gestionnaire mineure ne candidatent pas (POST forgés en 403) ; la
 *   co-gestion retirée pendant l'attente ôte à l'expéditeur le droit de parler
 *   pour le groupe ; acceptation à 390 px ; export, puis effacement du compte
 *   de l'expéditeur, sans perdre la candidature du groupe.
 *
 * DASH-20c, troisième tranche :
 *
 * - projet + prestataire : un·e ingé son propose une session sur le morceau
 *   **d'un groupe** à sa co-gestion majeure ; MEMBER sans gestion, tierce et
 *   co-gestionnaire mineure ne répondent pas (POST forgés) ; réponse à
 *   390 px au clavier ; deux confirmations simultanées ne créditent qu'une
 *   fois ; la co-gestion retirée pendant l'attente ne fait plus avancer le
 *   morceau du groupe.
 */

const A11Y_EXCLUDE = ['.cartButton']; // Panier du boilerplate, remontée n° 14.
const MONTAUBAN = { code: '82121', nom: 'Montauban', dep: '82', lat: 44.0222, lng: 1.3639 };
const ADULT = new Date('1990-04-04T00:00:00Z');
const minorBirth = () => new Date(`${new Date().getUTCFullYear() - 17}-01-15T00:00:00Z`);

type Who = { page: Page; account: Account; actorId: string; handle: string; name: string };

/** Compte inscrit, onboarding passé, avec sa date de naissance et ses métiers. */
async function person(
	page: Page,
	account: Account,
	birthDate: Date,
	tracks: ('MANAGER' | 'BOOKER')[] = []
): Promise<Who> {
	await signUpAndVerify(page, account);
	await skipOnboarding(page, account.email);
	const p = await db.person.update({
		where: { userId: (await requireUser(account.email)).id },
		data: { birthDate },
		include: { actor: true }
	});
	for (const track of tracks) await db.personTrack.create({ data: { personId: p.actorId, track } });
	return {
		page,
		account,
		actorId: p.actorId,
		handle: p.actor.handle,
		name: p.actor.displayName
	};
}

/** Autre navigateur, avec sa propre IP : les limiteurs d'inscription restent indépendants. */
async function newPage(browser: Browser) {
	const context = await browser.newContext({
		extraHTTPHeaders: { 'X-Forwarded-For': makeClientIp() }
	});
	return context.newPage();
}

/** POST d'un formulaire non amélioré, comme un client modifié l'enverrait. */
async function forge(page: Page, action: string, form: Record<string, string>) {
	const response = await page.request.post(`/accompagnement?/${action}`, {
		form,
		headers: { Origin: pageOrigin(page) }
	});
	return response.status();
}

async function band(
	name: string,
	members: { personId: string; role: 'OWNER' | 'ADMIN' | 'MEMBER' }[]
) {
	const suffix = Math.random().toString(36).slice(2, 8);
	const handle = `e2e-${name.toLowerCase().replace(/[^a-z]/g, '')}-${suffix}`;
	const actor = await db.actor.create({
		data: {
			kind: 'ORGANIZATION',
			handle,
			displayName: `E2E ${name} ${suffix}`,
			organization: {
				create: {
					kind: 'BAND',
					formedAt: new Date(),
					memberships: {
						create: members.map((m) => ({ ...m, status: 'ACTIVE', startedAt: new Date() }))
					}
				}
			}
		}
	});
	return { actorId: actor.id, handle, name: actor.displayName };
}

/** Propose d'accompagner `handle` depuis `/accompagnement`, par le formulaire. */
async function propose(page: Page, handle: string) {
	await page.goto(`/accompagnement?artiste=${handle}`);
	await waitForAppReady(page);
	await page.getByRole('button', { name: 'Envoyer la proposition' }).click();
}

/** POST d'une action d'annonce (plateau), comme un client modifié l'enverrait. */
async function forgeOn(page: Page, gig: string, action: string, form: Record<string, string>) {
	const response = await page.request.post(`${gig}?/${action}`, {
		form,
		headers: { Origin: pageOrigin(page) }
	});
	return response.status();
}

/** Première valeur trouvée sous `key`, à n'importe quelle profondeur de l'export. */
function findKey(value: unknown, key: string): unknown {
	if (!value || typeof value !== 'object') return undefined;
	if (key in value) return (value as Record<string, unknown>)[key];
	for (const child of Object.values(value)) {
		const found = findKey(child, key);
		if (found !== undefined) return found;
	}
	return undefined;
}

const representations = (artistId: string) =>
	db.representation.findMany({ where: { artistId }, select: { id: true, status: true } });

test.describe('LinkMusician — recette transverse (DASH-20a à DASH-20c)', () => {
	test.setTimeout(6 * 60_000);

	test('premier résultat : la distance ne sort du serveur que par tranche', async ({
		page,
		account
	}) => {
		const near = await createMusician({ name: 'Voisine', commune: MONTAUBAN });
		try {
			const viewer = await person(page, account, ADULT);
			await db.$executeRawUnsafe(
				`INSERT INTO ${e2eTable('actor_locations')} ("actorId", "communeCode", "communeName", "departmentCode", "point", "updatedAt")
				 VALUES ($1, $2, $3, $4, public.ST_SetSRID(public.ST_MakePoint($5, $6), 4326)::public.geography, now())`,
				viewer.actorId,
				MONTAUBAN.code,
				MONTAUBAN.nom,
				MONTAUBAN.dep,
				MONTAUBAN.lng + 0.01,
				MONTAUBAN.lat
			);
			// Toutes les étapes faites : le premier résultat reste accessible.
			const [instrument, genre] = await Promise.all([
				db.instrument.findFirstOrThrow({ select: { id: true } }),
				db.genre.findFirstOrThrow({ select: { id: true } })
			]);
			await db.personInstrument.create({
				data: {
					personId: viewer.actorId,
					instrumentId: instrument.id,
					declaredLevel: 2,
					isPrimary: true
				}
			});
			await db.actorGenre.create({ data: { actorId: viewer.actorId, genreId: genre.id } });
			await page.goto('/demarrer/resultat');
			await waitForAppReady(page);
			await expect(page.getByText(near.displayName)).toBeVisible();
			await expect(page.getByText('moins de 5 km · Montauban').first()).toBeVisible();
			// Ce que lit un client : les données de la page, sans les mètres.
			const data = await (await page.request.get('/demarrer/resultat/__data.json')).text();
			expect(data).toContain(near.displayName);
			expect(data).toContain('moins de 5 km');
			expect(data).not.toContain('meters');
		} finally {
			await deleteMusicians([near]);
		}
	});

	test('carnet de jams d’un·e mineur·e : la page et son préchargement répondent', async ({
		page,
		account
	}) => {
		await person(page, account, minorBirth());
		await page.goto('/jam');
		await waitForAppReady(page);
		const data = await page.request.get('/jam/carnet/__data.json');
		expect(data.status()).toBe(200);
		await page.locator('a[href="/jam/carnet"]').first().click();
		await expect(page).toHaveURL(/\/jam\/carnet$/);
		await waitForAppReady(page);
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
		await expectNoA11yViolations(page, A11Y_EXCLUDE);
	});

	test('manager + artiste : mineur·es refusé·es, POST forgés d’un tiers, 390 px', async ({
		page,
		account,
		browser
	}) => {
		const leaAccount = makeAccount();
		const theoAccount = makeAccount();
		const leaPage = await newPage(browser);
		const theoPage = await newPage(browser);
		const young = await createMusician({
			name: 'Jeune',
			commune: MONTAUBAN,
			birthDate: minorBirth().toISOString().slice(0, 10)
		});
		try {
			const nina = await person(page, account, ADULT, ['MANAGER']);
			const lea = await person(leaPage, leaAccount, ADULT);
			// Théo, 17 ans, s'est déclaré manager : la plateforme ne lui ouvre rien.
			await person(theoPage, theoAccount, minorBirth(), ['MANAGER']);

			await test.step('1. Un·e artiste mineur·e ne s’accompagne pas par la plateforme', async () => {
				await propose(page, young.handle);
				await expect(page.getByText('L’accompagnement d’un·e artiste mineur·e')).toBeVisible();
				expect(await representations(young.actorId)).toEqual([]);
			});

			await test.step('2. Un manager mineur n’a pas de formulaire, et son POST est refusé', async () => {
				await theoPage.goto('/accompagnement');
				await waitForAppReady(theoPage);
				await expect(
					theoPage.getByRole('heading', { name: /^Proposer d’accompagner/ })
				).toHaveCount(0);
				expect(await forge(theoPage, 'propose', { artist: lea.handle, kind: 'MANAGER' })).toBe(403);
				expect(await representations(lea.actorId)).toEqual([]);
			});

			const id = await test.step('3. Nina propose à Léa ; Théo forge une réponse', async () => {
				await propose(page, lea.handle);
				await expect(
					page.getByRole('region', { name: 'Les artistes que j’accompagne' })
				).toContainText('En attente de réponse');
				const [row] = await representations(lea.actorId);
				expect(row.status).toBe('PROPOSED');
				expect(await forge(theoPage, 'answer', { id: row.id, accept: '1' })).toBe(403);
				expect(await forge(theoPage, 'end', { id: row.id })).toBe(403);
				// L'agent ne confirme pas sa propre proposition.
				expect(await forge(page, 'answer', { id: row.id, accept: '1' })).toBe(403);
				expect((await representations(lea.actorId))[0].status).toBe('PROPOSED');
				return row.id;
			});

			await test.step('4. Léa confirme à 390 px, au clavier', async () => {
				await leaPage.setViewportSize({ width: 390, height: 844 });
				await leaPage.goto('/accompagnement');
				await waitForAppReady(leaPage);
				const request = leaPage.getByRole('region', { name: 'Propositions à trancher' });
				await expect(request).toContainText(nina.name);
				await expectNoA11yViolations(leaPage, A11Y_EXCLUDE);
				expect(await horizontalOverflow(leaPage)).toEqual([]);
				await request.getByRole('button', { name: 'Confirmer' }).focus();
				await leaPage.keyboard.press('Enter');
				await expect(leaPage.getByRole('region', { name: 'Qui m’accompagne' })).toContainText(
					nina.name
				);
				expect((await representations(lea.actorId))[0].status).toBe('CONFIRMED');
			});

			await test.step('5. Un tiers ne termine pas l’accompagnement ; Léa, si', async () => {
				expect(await forge(theoPage, 'end', { id })).toBe(403);
				expect((await representations(lea.actorId))[0].status).toBe('CONFIRMED');
				await leaPage
					.getByRole('region', { name: 'Qui m’accompagne' })
					.getByRole('button', { name: 'Mettre fin' })
					.click();
				await expect(leaPage.getByRole('region', { name: 'Qui m’accompagne' })).toHaveCount(0);
				expect((await representations(lea.actorId))[0].status).toBe('ENDED');
			});
		} finally {
			await leaPage.context().close();
			await theoPage.context().close();
			await deleteMusicians([young]);
			await deleteUser(leaAccount.email).catch(() => {});
			await deleteUser(theoAccount.email).catch(() => {});
		}
	});

	test('booker + groupe : seule la gestion majeure répond, jamais un tiers', async ({
		page,
		account,
		browser
	}) => {
		const leaAccount = makeAccount();
		const zoeAccount = makeAccount();
		const samAccount = makeAccount();
		const leaPage = await newPage(browser);
		const zoePage = await newPage(browser);
		const samPage = await newPage(browser);
		const handles: string[] = [];
		try {
			const nina = await person(page, account, ADULT, ['BOOKER']);
			const lea = await person(leaPage, leaAccount, ADULT);
			// Zoé, 17 ans, co-gère les deux groupes ; Sam organise des concerts.
			const zoe = await person(zoePage, zoeAccount, minorBirth());
			await person(samPage, samAccount, ADULT);
			const rats = await band('Rats', [
				{ personId: lea.actorId, role: 'OWNER' },
				{ personId: zoe.actorId, role: 'ADMIN' }
			]);
			const lycee = await band('Lycee', [{ personId: zoe.actorId, role: 'OWNER' }]);
			handles.push(rats.handle, lycee.handle);
			const notified = (actorId: string) =>
				db.notification.count({
					where: { recipientActorId: actorId, type: 'REPRESENTATION_REQUEST' }
				});

			await test.step('1. Un groupe géré par des mineur·es seulement : pas de proposition', async () => {
				await propose(page, lycee.handle);
				await expect(
					page.getByText('Impossible de proposer un accompagnement à cet artiste.')
				).toBeVisible();
				expect(await representations(lycee.actorId)).toEqual([]);
				expect(await notified(zoe.actorId)).toBe(0);
			});

			const id =
				await test.step('2. Nina propose aux Rats : seule Léa est sollicitée', async () => {
					await propose(page, rats.handle);
					await expect(
						page.getByRole('region', { name: 'Les artistes que j’accompagne' })
					).toContainText(rats.name);
					const [row] = await representations(rats.actorId);
					expect(row.status).toBe('PROPOSED');
					expect(await notified(lea.actorId)).toBe(1);
					expect(await notified(zoe.actorId)).toBe(0);
					// Zoé ne voit ni la proposition ni ses termes : elle ne peut pas répondre.
					await zoePage.goto('/accompagnement');
					await waitForAppReady(zoePage);
					await expect(
						zoePage.getByRole('region', { name: 'Propositions à trancher' })
					).toHaveCount(0);
					return row.id;
				});

			await test.step('3. POST forgés : Zoé, Sam (organisatrice) et Nina refusées', async () => {
				expect(await forge(zoePage, 'answer', { id, accept: '1' })).toBe(403);
				expect(await forge(samPage, 'answer', { id, accept: '1' })).toBe(403);
				expect(await forge(page, 'answer', { id, accept: '1' })).toBe(403);
				expect(await forge(samPage, 'end', { id })).toBe(403);
				expect((await representations(rats.actorId))[0].status).toBe('PROPOSED');
			});

			await test.step('4. Léa confirme pour le groupe, à 390 px', async () => {
				await leaPage.setViewportSize({ width: 390, height: 844 });
				await leaPage.goto('/accompagnement');
				await waitForAppReady(leaPage);
				const request = leaPage.getByRole('region', { name: 'Propositions à trancher' });
				await expect(request).toContainText(nina.name);
				await expect(request).toContainText('comme booker');
				await expectNoA11yViolations(leaPage, A11Y_EXCLUDE);
				expect(await horizontalOverflow(leaPage)).toEqual([]);
				await request.getByRole('button', { name: 'Confirmer' }).click();
				await expect(leaPage.getByRole('region', { name: 'Qui m’accompagne' })).toContainText(
					nina.name
				);
				expect((await representations(rats.actorId))[0].status).toBe('CONFIRMED');
				expect(await forge(samPage, 'end', { id })).toBe(403);
				expect((await representations(rats.actorId))[0].status).toBe('CONFIRMED');
			});
		} finally {
			for (const p of [leaPage, zoePage, samPage]) await p.context().close();
			await db.actor.deleteMany({ where: { handle: { in: handles } } });
			for (const a of [leaAccount, zoeAccount, samAccount])
				await deleteUser(a.email).catch(() => {});
		}
	});

	test('groupe + lieu : gestion retirée pendant l’attente, export et effacement', async ({
		page,
		account,
		browser
	}) => {
		const others = { lea: makeAccount(), malik: makeAccount(), zoe: makeAccount() };
		const more = { tom: makeAccount(), sam: makeAccount() };
		const pages = {
			lea: await newPage(browser),
			malik: await newPage(browser),
			zoe: await newPage(browser),
			tom: await newPage(browser),
			sam: await newPage(browser)
		};
		const suffix = Math.random().toString(36).slice(2, 8);
		const venueName = `E2E La Halle ${suffix}`;
		const handles: string[] = [];
		let venueId = '';
		let malikErased = '';
		const locate = (actorId: string) =>
			db.$executeRawUnsafe(
				`INSERT INTO ${e2eTable('actor_locations')} ("actorId", "communeCode", "communeName", "departmentCode", "point", "updatedAt")
				 VALUES ($1, $2, $3, $4, public.ST_SetSRID(public.ST_MakePoint($5, $6), 4326)::public.geography, now())`,
				actorId,
				MONTAUBAN.code,
				MONTAUBAN.nom,
				MONTAUBAN.dep,
				MONTAUBAN.lng,
				MONTAUBAN.lat
			);
		try {
			// Paul gère le lieu ; Léa (responsable), Malik (co-gestion), Zoé
			// (17 ans, co-gestion) et Tom (membre) forment les Rats ; Sam est tierce.
			const paul = await person(page, account, ADULT);
			const lea = await person(pages.lea, others.lea, ADULT);
			const malik = await person(pages.malik, others.malik, ADULT);
			const zoe = await person(pages.zoe, others.zoe, minorBirth());
			const tom = await person(pages.tom, more.tom, ADULT);
			await person(pages.sam, more.sam, ADULT);
			const rats = await band('Rats', [
				{ personId: lea.actorId, role: 'OWNER' },
				{ personId: malik.actorId, role: 'ADMIN' },
				{ personId: zoe.actorId, role: 'ADMIN' },
				{ personId: tom.actorId, role: 'MEMBER' }
			]);
			handles.push(rats.handle, `e2e-halle-${suffix}`);
			await locate(rats.actorId);
			venueId = (
				await db.venue.create({
					data: {
						name: venueName,
						nameKey: venueName.toLowerCase(),
						kind: 'BAR',
						communeCode: MONTAUBAN.code,
						communeName: MONTAUBAN.nom,
						departmentCode: MONTAUBAN.dep,
						lat: MONTAUBAN.lat,
						lng: MONTAUBAN.lng,
						createdById: paul.actorId,
						validatedAt: new Date()
					}
				})
			).id;
			const org = await db.actor.create({
				data: {
					kind: 'ORGANIZATION',
					handle: `e2e-halle-${suffix}`,
					displayName: venueName,
					organization: {
						create: {
							kind: 'VENUE',
							memberships: {
								create: {
									personId: paul.actorId,
									role: 'OWNER',
									status: 'ACTIVE',
									startedAt: new Date()
								}
							},
							venueProfile: {
								create: {
									capacity: 60,
									stage: 'Petite scène.',
									conditions: ['HAT'],
									days: [5],
									publishedAt: new Date()
								}
							}
						}
					}
				}
			});
			await db.venue.update({ where: { id: venueId }, data: { claimedByActorId: org.id } });
			await db.venueClaim.create({
				data: {
					venueId,
					requestedById: paul.actorId,
					code: `H${suffix}`.toUpperCase().slice(0, 8),
					status: 'APPROVED',
					orgId: org.id,
					reviewedAt: new Date()
				}
			});
			await locate(org.id);
			const applications = () =>
				db.application.findMany({
					where: { applicantActorId: rats.actorId },
					select: { id: true, status: true, sentById: true, conversationId: true }
				});

			const gig = await test.step('1. Paul publie une date du lieu', async () => {
				await page.goto(`/lieux/${venueId}/gerer`);
				await waitForAppReady(page);
				await page.getByRole('link', { name: 'Publier une date' }).click();
				await waitForPath(page, '/plateaux/nouveau');
				await waitForAppReady(page);
				const day = new Date(Date.now() + 11 * 86_400_000).toISOString().slice(0, 10);
				await page.getByLabel('Date').fill(day);
				await page.getByLabel('Titre').fill('Vendredi à la Halle');
				await page
					.getByLabel('Description')
					.fill('Deux groupes, chapeau et repas offerts, fin à minuit.');
				await page.getByRole('button', { name: 'Publier le plateau' }).click();
				await expect(page).toHaveURL(/\/annonces\/c/);
				return new URL(page.url()).pathname;
			});

			await test.step('2. Ni tierce, ni membre sans gestion, ni mineure : pas de candidature', async () => {
				const message = { band: rats.handle, message: 'Rock garage, set de quarante minutes.' };
				expect(await forgeOn(pages.sam, gig, 'applyBand', message)).toBe(403);
				expect(await forgeOn(pages.tom, gig, 'applyBand', message)).toBe(403);
				expect(await forgeOn(pages.zoe, gig, 'applyBand', message)).toBe(403);
				await pages.zoe.goto(gig);
				await waitForAppReady(pages.zoe);
				await expect(pages.zoe.getByText('Avant 18 ans, on ne candidate pas')).toBeVisible();
				await expect(
					pages.zoe.getByRole('button', { name: 'Envoyer la candidature du groupe' })
				).toHaveCount(0);
				expect(await applications()).toEqual([]);
			});

			const id = await test.step('3. Malik candidate au nom des Rats', async () => {
				await pages.malik.goto(gig);
				await waitForAppReady(pages.malik);
				await pages.malik
					.getByLabel(/Ton message à/)
					.fill('Rock garage, set de quarante minutes, autonomes sur le matériel.');
				await pages.malik.getByRole('button', { name: 'Envoyer la candidature du groupe' }).click();
				await expect(pages.malik.getByText(`${rats.name} : Envoyée`)).toBeVisible();
				const [row] = await applications();
				expect(row.sentById).toBe(malik.actorId);
				expect(
					await db.notification.count({
						where: { recipientActorId: paul.actorId, type: 'APPLICATION_RECEIVED' }
					})
				).toBe(1);
				// Une tierce n'accepte pas, un membre sans gestion ne retire pas.
				expect(await forgeOn(pages.sam, gig, 'accept', { applicationId: row.id })).toBe(404);
				expect(await forgeOn(pages.tom, gig, 'withdrawBand', { applicationId: row.id })).toBe(403);
				expect(await forgeOn(pages.sam, gig, 'withdrawBand', { applicationId: row.id })).toBe(403);
				expect((await applications())[0].status).toBe('SENT');
				return row.id;
			});

			await test.step('4. Léa retire la co-gestion à Malik : il ne parle plus pour le groupe', async () => {
				await pages.lea.goto(`/groupes/${rats.handle}`);
				await waitForAppReady(pages.lea);
				const tile = pages.lea
					.getByRole('list', { name: 'Membres actuels' })
					.getByRole('listitem')
					.filter({ hasText: malik.name });
				await tile.getByRole('button', { name: 'Gérer' }).click();
				await tile.getByRole('button', { name: 'Retirer la co-gestion' }).click();
				await expect(pages.lea.getByText('Co-gestion retirée.').first()).toBeVisible();
				expect(await forgeOn(pages.malik, gig, 'withdrawBand', { applicationId: id })).toBe(403);
				expect((await applications())[0].status).toBe('SENT');
				await pages.malik.goto(gig);
				await waitForAppReady(pages.malik);
				await expect(
					pages.malik.getByText('Un plateau se candidate au nom d’un groupe')
				).toBeVisible();
			});

			await test.step('5. Paul accepte à 390 px : la conversation s’ouvre avec Léa', async () => {
				await page.setViewportSize({ width: 390, height: 844 });
				await page.goto(gig);
				await waitForAppReady(page);
				const card = page.getByRole('list', { name: 'Candidatures reçues' }).getByRole('listitem');
				await expect(card).toContainText(rats.name);
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
				expect(await horizontalOverflow(page)).toEqual([]);
				await card.getByRole('button', { name: 'Accepter' }).click();
				await expect(card.getByRole('link', { name: 'Ouvrir la conversation' })).toBeVisible();
				const [row] = await applications();
				expect(row.status).toBe('ACCEPTED');
				const participants = await db.conversationParticipant.findMany({
					where: { conversationId: row.conversationId! },
					select: { actorId: true }
				});
				expect(participants.map((p) => p.actorId).sort()).toEqual(
					[paul.actorId, lea.actorId].sort()
				);
				const accepted = (actorId: string) =>
					db.notification.count({
						where: { recipientActorId: actorId, type: 'APPLICATION_ACCEPTED' }
					});
				expect(await accepted(lea.actorId)).toBe(1);
				expect(await accepted(malik.actorId)).toBe(0);
				await expect(page.locator('[data-sonner-toast]')).toHaveCount(0);
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
			});

			await test.step('6. Export puis effacement de Malik : la candidature reste au groupe', async () => {
				const response = await pages.malik.request.get('/auth/settings/donnees/export');
				expect(response.status()).toBe(200);
				const sent = findKey(await response.json(), 'candidatures_au_nom_d_un_groupe');
				expect(sent).toEqual([
					expect.objectContaining({
						groupe: rats.name,
						plateau: 'Vendredi à la Halle',
						statut: 'ACCEPTED'
					})
				]);
				const user = await requireUser(others.malik.email);
				malikErased = `deleted-${user.id}@erased.local`;
				const deleted = await pages.malik.request.post('/auth/settings/donnees?/delete', {
					form: { password: others.malik.password },
					headers: sveltekitActionHeaders(pageOrigin(pages.malik)),
					maxRedirects: 0
				});
				expect(deleted.status()).toBe(200);
				expect((await deleted.json()).type).toBe('redirect');
				const [row] = await applications();
				expect(row).toMatchObject({ status: 'ACCEPTED', sentById: null });
				await page.reload();
				await waitForAppReady(page);
				await expect(
					page.getByRole('list', { name: 'Candidatures reçues' }).getByRole('listitem')
				).toContainText(rats.name);
			});
		} finally {
			for (const p of Object.values(pages)) await p.context().close();
			if (venueId) await db.venue.deleteMany({ where: { id: venueId } });
			await db.actor.deleteMany({ where: { handle: { in: handles } } });
			for (const a of [...Object.values(others), ...Object.values(more)])
				await deleteUser(a.email).catch(() => {});
			if (malikErased) await deleteUser(malikErased).catch(() => {});
		}
	});
	test('projet + prestataire : session d’ingé son sur le morceau d’un groupe, crédit unique', async ({
		page,
		account,
		browser
	}) => {
		const others = { malik: makeAccount(), tom: makeAccount(), ines: makeAccount() };
		const more = { zoe: makeAccount(), sam: makeAccount() };
		const pages = {
			malik: await newPage(browser),
			tom: await newPage(browser),
			ines: await newPage(browser),
			zoe: await newPage(browser),
			sam: await newPage(browser)
		};
		const handles: string[] = [];
		const title = `Fausse route ${Math.random().toString(36).slice(2, 6)}`;
		const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
		/** POST d'une action de la conversation, comme un client modifié l'enverrait. */
		const forgeMsg = async (who: Page, id: string, action: string, form: Record<string, string>) =>
			(
				await who.request.post(`/messages/${id}?/${action}`, {
					form,
					headers: { Origin: pageOrigin(who) },
					maxRedirects: 0
				})
			).status();
		const conversationOf = (a: string, b: string) =>
			db.conversation.create({
				data: {
					pairKey: [a, b].sort().join(':'),
					initiatorId: a,
					participants: {
						create: [
							{ actorId: a, state: 'ACCEPTED' },
							{ actorId: b, state: 'ACCEPTED' }
						]
					}
				}
			});
		try {
			// Léa (responsable), Malik (co-gestion), Inès (17 ans, co-gestion) et
			// Tom (membre) forment les Voisins ; Sam est ingé son ; Zoé est tierce.
			const lea = await person(page, account, ADULT);
			const malik = await person(pages.malik, others.malik, ADULT);
			const tom = await person(pages.tom, others.tom, ADULT);
			const ines = await person(pages.ines, others.ines, minorBirth());
			await person(pages.zoe, more.zoe, ADULT);
			const sam = await person(pages.sam, more.sam, ADULT);
			await db.personTrack.create({
				data: { personId: sam.actorId, track: 'SOUND_ENGINEER', isPrimary: false }
			});
			await db.soundEngineerProfile.create({
				data: { personId: sam.actorId, specialties: ['RECORDING', 'MIXING'] }
			});
			const voisins = await band('Voisins', [
				{ personId: lea.actorId, role: 'OWNER' },
				{ personId: malik.actorId, role: 'ADMIN' },
				{ personId: ines.actorId, role: 'ADMIN' },
				{ personId: tom.actorId, role: 'MEMBER' }
			]);
			handles.push(voisins.handle);
			const work = await db.work.create({
				data: {
					title,
					ownerId: voisins.actorId,
					createdById: lea.actorId,
					state: 'COMPOSED',
					composedAt: new Date()
				}
			});
			const withMalik = await conversationOf(sam.actorId, malik.actorId);
			const withTom = await conversationOf(sam.actorId, tom.actorId);
			const collabs = () =>
				db.collaboration.findMany({
					where: { workId: work.id },
					orderBy: { createdAt: 'asc' },
					select: { id: true, kind: true, status: true }
				});
			const credits = () =>
				db.workContributor.findMany({
					where: { workId: work.id },
					select: { personId: true, roles: { select: { kind: true } } }
				});

			await test.step('1. Sans gestion du groupe, pas de session sur son morceau', async () => {
				// Avec Tom (membre sans gestion), le morceau n'est pas proposé…
				await pages.sam.goto(`/messages/${withTom.id}`);
				await waitForAppReady(pages.sam);
				await pages.sam.getByText(/Proposer une collaboration/).click();
				await pages.sam.getByLabel('Type').selectOption('RECORDING');
				await expect(
					pages.sam.getByLabel(/Morceau concerné/).locator(`option[value="${work.id}"]`)
				).toHaveCount(0);
				// … et ni Sam ni Tom ne le relient par un POST forgé.
				const form = {
					kind: 'RECORDING',
					provider: 'me',
					work: work.id,
					title: 'Prise batterie',
					happenedOn: inDays(3)
				};
				expect(await forgeMsg(pages.sam, withTom.id, 'proposeCollab', form)).toBe(403);
				expect(
					await forgeMsg(pages.tom, withTom.id, 'proposeCollab', { ...form, provider: 'other' })
				).toBe(403);
				// La co-gestionnaire mineure n'est pas sollicitable par Sam (D5).
				const request = await pages.sam.request.post(`/messages/nouveau?a=${ines.handle}`, {
					form: { body: 'Bonjour, une session pour les Voisins ?' },
					headers: { Origin: pageOrigin(pages.sam) },
					maxRedirects: 0
				});
				expect([400, 404]).toContain(request.status());
				expect(
					await db.conversation.count({
						where: { pairKey: [sam.actorId, ines.actorId].sort().join(':') }
					})
				).toBe(0);
				expect(await collabs()).toEqual([]);
			});

			const collabId = await test.step('2. Sam propose la prise de son à Malik', async () => {
				await pages.sam.goto(`/messages/${withMalik.id}`);
				await waitForAppReady(pages.sam);
				await pages.sam.getByText(/Proposer une collaboration/).click();
				await pages.sam.getByLabel('Type').selectOption('RECORDING');
				await pages.sam.getByLabel('Date', { exact: true }).fill(inDays(3));
				await pages.sam.getByLabel('Moi').check();
				await pages.sam.getByLabel(/Morceau concerné/).selectOption(work.id);
				await pages.sam.getByLabel('Titre').fill('Prise batterie et basse');
				await pages.sam.getByRole('button', { name: 'Proposer' }).click();
				await expect(pages.sam.getByText(`Morceau : ${title}`)).toBeVisible();
				const [row] = await collabs();
				expect(row).toMatchObject({ kind: 'RECORDING', status: 'PROPOSED' });
				// Seul Malik, son interlocuteur, est sollicité ; ni Léa ni Inès.
				const toConfirm = await db.notification.findMany({
					where: { type: 'COLLAB_TO_CONFIRM', href: `/messages/${withMalik.id}` },
					select: { recipientActorId: true }
				});
				expect(toConfirm.map((n) => n.recipientActorId)).toEqual([malik.actorId]);
				return row.id;
			});

			await test.step('3. Ni tierce, ni membre, ni mineure ne répondent pour le groupe', async () => {
				const form = { collaborationId: collabId, answer: 'yes' };
				for (const who of [pages.zoe, pages.tom, pages.ines]) {
					expect(await forgeMsg(who, withMalik.id, 'respondCollab', form)).toBe(404);
					expect(await forgeMsg(who, withMalik.id, 'confirmCollab', form)).toBe(404);
					expect(await forgeMsg(who, withMalik.id, 'cancelCollab', form)).toBe(404);
				}
				// Léa, responsable, n'est pas partie à cette conversation.
				expect(await forgeMsg(page, withMalik.id, 'respondCollab', form)).toBe(404);
				// Sam ne répond pas à sa propre proposition.
				expect(await forgeMsg(pages.sam, withMalik.id, 'respondCollab', form)).toBe(400);
				expect((await collabs())[0].status).toBe('PROPOSED');
			});

			await test.step('4. Malik accepte à 390 px, au clavier', async () => {
				const p = pages.malik;
				await p.setViewportSize({ width: 390, height: 844 });
				await p.goto(`/messages/${withMalik.id}`);
				await waitForAppReady(p);
				await expect(p.getByText(`Morceau : ${title}`)).toBeVisible();
				await expectNoA11yViolations(p, A11Y_EXCLUDE);
				expect(await horizontalOverflow(p)).toEqual([]);
				await p.getByRole('button', { name: 'Confirmer' }).focus();
				await p.keyboard.press('Enter');
				await expect(
					p.getByText('Prévue : tu pourras la confirmer une fois passée.')
				).toBeVisible();
				await expect(p.locator('[data-sonner-toast]')).toHaveCount(0);
				await expectNoA11yViolations(p, A11Y_EXCLUDE);
				expect((await collabs())[0].status).toBe('ACCEPTED');
			});

			await test.step('5. Deux confirmations simultanées : un seul crédit, une seule XP', async () => {
				// La session a eu lieu (la date passe) ; chacun·e confirme en même
				// temps, et Sam envoie deux fois (double clic, onglets).
				await db.collaboration.update({
					where: { id: collabId },
					data: { happenedOn: new Date(`${inDays(-1)}T00:00:00Z`) }
				});
				const form = { collaborationId: collabId };
				const statuses = await Promise.all([
					forgeMsg(pages.malik, withMalik.id, 'confirmCollab', form),
					forgeMsg(pages.sam, withMalik.id, 'confirmCollab', form),
					forgeMsg(pages.sam, withMalik.id, 'confirmCollab', form)
				]);
				expect(statuses[0]).toBe(200);
				expect(statuses.slice(1).sort()).toEqual([200, 400]);
				expect((await collabs())[0].status).toBe('COMPLETED');
				expect(await credits()).toEqual([
					{ personId: sam.actorId, roles: [{ kind: 'RECORDING' }] }
				]);
				const xp = await db.xpTransaction.findMany({
					where: {
						ruleId: 'collaboration.completed',
						actorId: { in: [sam.actorId, malik.actorId] }
					},
					select: { actorId: true, track: true }
				});
				expect(xp.filter((t) => t.actorId === sam.actorId)).toEqual([
					{ actorId: sam.actorId, track: 'SOUND_ENGINEER' }
				]);
				expect(xp.filter((t) => t.actorId === malik.actorId).length).toBeLessThanOrEqual(1);
				const recorded = await db.work.findUniqueOrThrow({
					where: { id: work.id },
					select: { recordedAt: true }
				});
				expect(recorded.recordedAt).not.toBeNull();
				// Un seul crédit sur la fiche du morceau.
				await page.goto(`/morceaux/${work.id}`);
				await waitForAppReady(page);
				const credited = page.getByRole('region', { name: 'Crédits' }).getByRole('listitem');
				await expect(credited).toHaveCount(1);
				await expect(credited).toContainText(`${sam.name} · Prise de son`);
			});

			await test.step('6. Co-gestion retirée pendant l’attente : le morceau n’avance pas', async () => {
				await pages.sam.goto(`/messages/${withMalik.id}`);
				await waitForAppReady(pages.sam);
				await pages.sam.getByText(/Proposer une collaboration/).click();
				await pages.sam.getByLabel('Type').selectOption('MIXING');
				await pages.sam.getByLabel('Moi').check();
				await pages.sam.getByLabel(/Morceau concerné/).selectOption(work.id);
				await pages.sam.getByLabel('Titre').fill('Mixage des prises');
				await pages.sam.getByRole('button', { name: 'Proposer' }).click();
				const listed = pages.sam
					.getByRole('list', { name: 'Collaborations', exact: true })
					.getByRole('listitem')
					.filter({ hasText: 'Mixage des prises' });
				await expect(listed).toBeVisible();
				const mixing = (await collabs()).find((c) => c.kind === 'MIXING')!;
				expect(mixing.status).toBe('PROPOSED');

				await page.goto(`/groupes/${voisins.handle}`);
				await waitForAppReady(page);
				const tile = page
					.getByRole('list', { name: 'Membres actuels' })
					.getByRole('listitem')
					.filter({ hasText: malik.name });
				await tile.getByRole('button', { name: 'Gérer' }).click();
				await tile.getByRole('button', { name: 'Retirer la co-gestion' }).click();
				await expect(page.getByText('Co-gestion retirée.').first()).toBeVisible();

				const form = { collaborationId: mixing.id, answer: 'yes' };
				expect(await forgeMsg(pages.malik, withMalik.id, 'respondCollab', form)).toBe(403);
				const after = await db.work.findUniqueOrThrow({
					where: { id: work.id },
					select: { mixedAt: true }
				});
				expect(after.mixedAt).toBeNull();
				expect(await credits()).toEqual([
					{ personId: sam.actorId, roles: [{ kind: 'RECORDING' }] }
				]);
				// Sam annule ; une tierce ne l'aurait pas pu.
				expect(
					await forgeMsg(pages.zoe, withMalik.id, 'cancelCollab', { collaborationId: mixing.id })
				).toBe(404);
				await pages.sam.reload();
				await waitForAppReady(pages.sam);
				await listed.getByRole('button', { name: 'Annuler', exact: true }).click();
				await expect(listed).toHaveCount(0);
				expect((await collabs()).find((c) => c.kind === 'MIXING')!.status).toBe('CANCELLED');
			});
		} finally {
			for (const p of Object.values(pages)) await p.context().close();
			await db.work.deleteMany({ where: { owner: { handle: { in: handles } } } });
			await db.actor.deleteMany({ where: { handle: { in: handles } } });
			for (const a of [...Object.values(others), ...Object.values(more)])
				await deleteUser(a.email).catch(() => {});
		}
	});
});
