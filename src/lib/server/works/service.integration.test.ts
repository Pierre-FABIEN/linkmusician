/**
 * Morceaux (P3-11, D35) sur la base de `.env`, schéma `e2e` : seul·e, composé
 * sans XP ; à plusieurs, corroboré à la 2ᵉ confirmation avec une maquette ;
 * part versée à qui confirme plus tard, une seule fois ; 4ᵉ morceau avec la
 * même personne : rien ; une idée n'est pas visible hors de son équipe.
 * Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/works
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

const enabled = process.env.PROGRESSION_INTEGRATION === '1';
const url = new URL(
	dotenv.config({ quiet: true }).parsed?.DATABASE_URL ??
		process.env.DATABASE_URL ??
		'postgresql://x/y'
);
url.searchParams.set('schema', 'e2e');
const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });

vi.mock('#lib/server', () => ({ prisma: db }));

const service = await import('./service');
const bands = await import('#lib/server/bands/service');
const { getPublishedMedia } = await import('#lib/server/media/service');
const { personAnonymizationOps } = await import('#lib/prisma/actors/person');
const { splitSheetFor } = await import('#lib/server/demarches/documents');

const PREFIX = 'works-test-';
const YEAR = 365.25 * 86_400_000;
const guitar = { kind: 'INSTRUMENT' as const, instrumentSlug: 'guitare-electrique' };
const bass = { kind: 'INSTRUMENT' as const, instrumentSlug: 'basse' };
const lyrics = { kind: 'LYRICS' as const, instrumentSlug: null };

describe.skipIf(!enabled)('morceaux (schéma e2e)', { timeout: 60_000 }, () => {
	const ids: Record<string, string> = {};
	const users: Record<string, string> = {};

	async function cleanup() {
		const actors = await db.actor.findMany({
			where: {
				OR: [
					{ handle: { startsWith: PREFIX } },
					{ displayName: { startsWith: 'Works Test' } },
					{ person: { user: { email: { startsWith: PREFIX } } } }
				]
			},
			select: { id: true }
		});
		const list = actors.map((a) => a.id);
		await db.actor.deleteMany({ where: { id: { in: list } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
		if (list.length > 0)
			await db.domainEvent.deleteMany({ where: { actorIds: { hasSome: list } } });
	}

	const xp = async (actor: string) =>
		(
			await db.xpTransaction.aggregate({
				where: { actorId: actor, ruleId: { startsWith: 'work.' } },
				_sum: { amount: true }
			})
		)._sum.amount ?? 0;

	/** La confiance est recalculée après chaque événement : on la remet avant d'agir. */
	const trust = (...names: string[]) =>
		db.actor.updateMany({
			where: { id: { in: names.map((n) => ids[n]) } },
			data: { trustLevel: 2 }
		});

	const demo = (owner: string, title = 'Maquette') =>
		db.media.create({
			data: {
				actorId: owner,
				kind: 'EXTERNAL_LINK',
				provider: 'YOUTUBE',
				externalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
				title,
				status: 'PUBLISHED',
				publishedAt: new Date()
			}
		});

	/** Morceau de Léa avec Malik confirmé, composé : corroboré. */
	async function duo(title: string) {
		await trust('lea', 'malik');
		const work = await service.createWork(ids.lea, {
			title,
			genreIds: [],
			band: null,
			roles: [guitar]
		});
		await service.creditPerson(work.id, ids.lea, { handle: PREFIX + 'malik', roles: [bass] });
		await service.confirmCredit(work.id, ids.malik);
		await service.setDemo(work.id, ids.lea, { mediaId: (await demo(ids.lea, title)).id });
		await trust('lea', 'malik');
		await service.markComposed(work.id, ids.lea);
		return work;
	}

	beforeAll(async () => {
		await cleanup();
		for (const [name, age] of [
			['lea', 30],
			['malik', 28],
			['zoe', 17],
			['sam', 35]
		] as const) {
			const user = await db.user.create({
				data: { email: `${PREFIX}${name}@example.test`, referralCode: `${PREFIX}${name}` }
			});
			users[name] = user.id;
			ids[name] = (
				await db.actor.create({
					data: {
						kind: 'PERSON',
						handle: PREFIX + name,
						displayName: `Works Test ${name}`,
						person: {
							create: {
								userId: user.id,
								termsAcceptedAt: new Date(),
								onboardedAt: new Date(),
								birthDate: new Date(Date.now() - age * YEAR)
							}
						}
					}
				})
			).id;
		}
	}, 60_000);

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('seul·e : une idée reste dans l’équipe, puis composée « déclarée » sans XP', async () => {
		const work = await service.createWork(ids.lea, {
			title: 'Works Test solo',
			genreIds: [],
			band: null,
			roles: [guitar, lyrics]
		});
		expect(await service.workPage(work.id, ids.lea)).toMatchObject({ team: true, manage: true });
		expect(await service.workPage(work.id, ids.malik)).toBeNull();
		expect(await service.workPage(work.id, null)).toBeNull();

		await expect(service.markComposed(work.id, ids.lea)).rejects.toThrow(/maquette/);
		await expect(service.markComposed(work.id, ids.malik)).rejects.toThrow(/portent/);

		await service.setDemo(work.id, ids.lea, { mediaId: (await demo(ids.lea)).id });
		await service.markComposed(work.id, ids.lea);
		const stored = await db.work.findUniqueOrThrow({ where: { id: work.id } });
		expect(stored).toMatchObject({ state: 'COMPOSED', proof: 'DECLARED' });
		expect(await xp(ids.lea)).toBe(0);

		const page = await service.workPage(work.id, null);
		expect(page?.credits.map((c) => c.roles)).toEqual([['Guitare électrique', 'Paroles']]);
		expect((await service.publicWorksOf(ids.lea)).map((w) => w.title)).toContain('Works Test solo');
	});

	it('à plusieurs : corroboré à la 2ᵉ confirmation, 150 XP chacun', async () => {
		await trust('lea', 'malik');
		const work = await service.createWork(ids.lea, {
			title: 'Works Test duo',
			genreIds: [],
			band: null,
			roles: [guitar]
		});
		await service.addOpenRole(work.id, ids.lea, bass);
		await service.creditPerson(work.id, ids.lea, { handle: PREFIX + 'malik', roles: [bass] });
		expect(
			await db.notification.count({ where: { recipientActorId: ids.malik, type: 'WORK_CREDIT' } })
		).toBe(1);
		// Le rôle à pourvoir « Basse » est pourvu, pas dupliqué.
		const page = await service.workPage(work.id, ids.malik);
		expect(page).toMatchObject({ team: true, manage: false, myCredit: { confirmed: false } });
		expect(page?.openRoles).toEqual([]);

		await service.setDemo(work.id, ids.lea, { mediaId: (await demo(ids.lea)).id });
		await service.markComposed(work.id, ids.lea);
		expect(await db.work.findUniqueOrThrow({ where: { id: work.id } })).toMatchObject({
			proof: 'DECLARED'
		});
		// Un crédit non confirmé n'apparaît pas en public.
		expect((await service.workPage(work.id, null))?.credits).toHaveLength(1);
		expect(await xp(ids.lea)).toBe(0);

		await trust('lea', 'malik');
		await service.confirmCredit(work.id, ids.malik);
		expect(await db.work.findUniqueOrThrow({ where: { id: work.id } })).toMatchObject({
			proof: 'CORROBORATED'
		});
		expect(await xp(ids.lea)).toBe(150);
		expect(await xp(ids.malik)).toBe(150);

		// Sam confirme plus tard : sa part seulement.
		await trust('lea', 'malik', 'sam');
		await service.creditPerson(work.id, ids.lea, { handle: PREFIX + 'sam', roles: [lyrics] });
		await service.confirmCredit(work.id, ids.sam);
		expect(await xp(ids.sam)).toBe(150);
		expect(await xp(ids.lea)).toBe(150);

		// Retiré puis recrédité : pas une deuxième part pour le même morceau.
		await service.leaveCredit(work.id, ids.sam);
		await trust('lea', 'malik', 'sam');
		await service.creditPerson(work.id, ids.lea, { handle: PREFIX + 'sam', roles: [lyrics] });
		await service.confirmCredit(work.id, ids.sam);
		expect(await xp(ids.sam)).toBe(150);

		// La gestion ne retire pas un crédit confirmé.
		const credit = await db.workContributor.findFirstOrThrow({
			where: { workId: work.id, personId: ids.sam }
		});
		await expect(service.withdrawCredit(work.id, ids.lea, credit.id)).rejects.toThrow(/confirmé/);
	});

	it('4ᵉ morceau avec la même personne : rien (rendements décroissants)', async () => {
		const before = await xp(ids.lea);
		await duo('Works Test 2');
		await duo('Works Test 3');
		await duo('Works Test 4');
		// Après « duo » : 150 ; puis 75, 38, et 0 au 4ᵉ.
		expect((await xp(ids.lea)) - before).toBe(75 + 38);
		expect(await xp(ids.malik)).toBe(150 + 75 + 38);
	});

	it('un·e mineur·e inconnu·e ne peut pas être crédité·e', async () => {
		const work = await service.createWork(ids.lea, {
			title: 'Works Test mineure',
			genreIds: [],
			band: null,
			roles: [guitar]
		});
		await expect(
			service.creditPerson(work.id, ids.lea, { handle: PREFIX + 'zoe', roles: [bass] })
		).rejects.toThrow(/ne peut pas recevoir de crédit/);
	});

	it('la maquette ajoutée depuis une idée reste cachée jusqu’à la composition', async () => {
		const work = await service.createWork(ids.lea, {
			title: 'Works Test secret',
			genreIds: [],
			band: null,
			roles: [guitar]
		});
		const media = await demo(ids.lea, 'Works Test secret');
		await service.setDemo(work.id, ids.lea, { mediaId: media.id });
		await db.work.update({ where: { id: work.id }, data: { demoFromWork: true } });
		expect(await getPublishedMedia(media.id)).toBeNull();
		await service.markComposed(work.id, ids.lea);
		expect(await getPublishedMedia(media.id)).not.toBeNull();
	});

	it('morceau d’un groupe : la gestion le mène, les membres le voient', async () => {
		const band = await bands.createBand(ids.lea, { name: 'Works Test Band', title: null });
		await bands.inviteToBand(band.id, ids.lea, { handle: PREFIX + 'malik', title: null });
		const invite = await db.membership.findFirstOrThrow({
			where: { orgId: band.id, personId: ids.malik, status: 'INVITED' }
		});
		await bands.answerInvite(invite.id, ids.malik, true);

		const work = await service.createWork(ids.lea, {
			title: 'Works Test du groupe',
			genreIds: [],
			band: band.handle,
			roles: [guitar]
		});
		await expect(
			service.createWork(ids.malik, {
				title: 'x',
				genreIds: [],
				band: band.handle,
				roles: [guitar]
			})
		).rejects.toThrow(/ne gères pas/);
		expect(await service.workPage(work.id, ids.malik)).toMatchObject({ team: true, manage: false });
		expect(await service.workPage(work.id, ids.sam)).toBeNull();
		await service.setDemo(work.id, ids.lea, { mediaId: (await demo(band.id)).id });
		await expect(service.markComposed(work.id, ids.malik)).rejects.toThrow(/portent/);
		await service.markComposed(work.id, ids.lea);
		expect(await service.firstComposedWork(band.id)).toMatchObject({
			title: 'Works Test du groupe'
		});
		expect((await service.publicWorksOf(band.id)).map((w) => w.title)).toEqual([
			'Works Test du groupe'
		]);
	});

	it('P4-07 : un crédit du son attend sa confirmation, puis ne compte pas comme co-autrice', async () => {
		await trust('lea', 'sam');
		const work = await service.createWork(ids.lea, {
			title: 'Works Test mixé',
			genreIds: [],
			band: null,
			roles: [guitar]
		});
		await service.setDemo(work.id, ids.lea, { mediaId: (await demo(ids.lea)).id });
		await service.markComposed(work.id, ids.lea);
		await service.creditPerson(work.id, ids.lea, {
			handle: PREFIX + 'sam',
			roles: [{ kind: 'MIXING', instrumentSlug: null }]
		});

		// En attente : nulle part en public.
		const pending = await service.workPage(work.id, null);
		expect(pending?.credits.map((c) => c.roles)).toEqual([['Guitare électrique']]);
		expect((await service.publicWorksOf(ids.sam)).map((w) => w.title)).not.toContain(
			'Works Test mixé'
		);

		await trust('lea', 'sam');
		const before = await xp(ids.sam);
		await service.confirmCredit(work.id, ids.sam);
		// Confirmé : visible, mais ni corroboration ni XP de morceau.
		expect(await db.work.findUniqueOrThrow({ where: { id: work.id } })).toMatchObject({
			proof: 'DECLARED'
		});
		expect(await xp(ids.sam)).toBe(before);
		const mine = (await service.publicWorksOf(ids.sam)).find((w) => w.title === 'Works Test mixé');
		expect(mine).toMatchObject({ roles: ['Mixage'], soundRoles: ['MIXING'] });

		// Le bulletin de partage ne liste que les auteur·rices.
		const sheet = await splitSheetFor(work.id, ids.lea);
		expect(sheet.rows.map((r) => r.name)).toEqual(['Works Test lea']);
	});

	it('RGPD : morceaux portés supprimés, crédits confirmés « Compte supprimé »', async () => {
		const owned = await service.createWork(ids.sam, {
			title: 'Works Test de Sam',
			genreIds: [],
			band: null,
			roles: [lyrics]
		});
		await db.$transaction(await personAnonymizationOps(users.sam));
		expect(await db.work.findUnique({ where: { id: owned.id } })).toBeNull();
		const duoWork = await db.work.findFirstOrThrow({ where: { title: 'Works Test duo' } });
		const page = await service.workPage(duoWork.id, ids.lea);
		expect(page?.credits.map((c) => c.name)).toContain('Compte supprimé');
	});
});
