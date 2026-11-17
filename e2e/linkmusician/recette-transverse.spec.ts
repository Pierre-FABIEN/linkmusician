import type { Browser, Page } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { pageOrigin, signUpAndVerify } from '../support/admin';
import { makeAccount, makeClientIp, type Account } from '../support/account';
import { db, deleteUser, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
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

async function band(name: string, members: { personId: string; role: 'OWNER' | 'ADMIN' }[]) {
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

const representations = (artistId: string) =>
	db.representation.findMany({ where: { artistId }, select: { id: true, status: true } });

test.describe('LinkMusician — recette transverse (DASH-20a)', () => {
	test.setTimeout(6 * 60_000);

	test('premier résultat : la distance ne sort du serveur que par tranche', async ({
		page,
		account
	}) => {
		const near = await createMusician({ name: 'Voisine', commune: MONTAUBAN });
		try {
			const viewer = await person(page, account, ADULT);
			await db.$executeRawUnsafe(
				`INSERT INTO "e2e"."actor_locations" ("actorId", "communeCode", "communeName", "departmentCode", "point", "updatedAt")
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
});
