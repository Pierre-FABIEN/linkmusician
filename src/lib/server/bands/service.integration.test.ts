/**
 * Groupes et adhésions (P3-01) sur la base de `.env`, schéma `e2e` :
 * l'historique reste juste après départs et retours, la formation rapporte
 * aux deux (et une seule fois), un groupe garde toujours un OWNER, un·e
 * mineur·e ne reçoit pas d'invitation d'un·e inconnu·e. Désactivé par
 * défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/bands
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createPrismaClient } from '../../../../prisma/client.js';
import dotenv from 'dotenv';

const enabled = process.env.PROGRESSION_INTEGRATION === '1';
const url = new URL(
	dotenv.config({ quiet: true }).parsed?.DATABASE_URL ??
		process.env.DATABASE_URL ??
		'postgresql://x/y'
);
url.searchParams.set('schema', 'e2e');
const db = createPrismaClient(url.toString());

vi.mock('#lib/server', () => ({ prisma: db }));

const service = await import('./service');
const { personAnonymizationOps } = await import('#lib/prisma/actors/person');

const PREFIX = 'bands-test-';
const YEAR = 365.25 * 86_400_000;

describe.skipIf(!enabled)('groupes et adhésions (schéma e2e)', () => {
	const ids: Record<string, string> = {};
	const users: Record<string, string> = {};
	let band = { id: '', handle: '' };

	async function cleanup() {
		const actors = await db.actor.findMany({
			where: {
				OR: [
					{ handle: { startsWith: PREFIX } },
					{ displayName: { startsWith: 'Bands Test' } },
					// Un compte anonymisé a perdu son handle : retrouvé par son email.
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

	const xp = async (actor: string, ruleId?: string) =>
		(
			await db.xpTransaction.aggregate({
				where: { actorId: actor, ...(ruleId ? { ruleId } : {}) },
				_sum: { amount: true }
			})
		)._sum.amount ?? 0;

	const rows = (person: string) =>
		db.membership.findMany({
			where: { orgId: band.id, personId: ids[person] },
			orderBy: { createdAt: 'asc' },
			select: { id: true, status: true, role: true, startedAt: true, endedAt: true }
		});

	const invitation = async (person: string) =>
		(
			await db.membership.findFirstOrThrow({
				where: { orgId: band.id, personId: ids[person], status: 'INVITED' },
				select: { id: true }
			})
		).id;

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
						displayName: name,
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

	it('créer un groupe : responsable, pas formé, aucune XP', async () => {
		band = await service.createBand(ids.lea, { name: 'Bands Test Les Rats', title: 'guitare' });
		expect(band.handle).toBe('bands-test-les-rats');
		expect(await rows('lea')).toMatchObject([{ status: 'ACTIVE', role: 'OWNER' }]);
		const org = await db.organization.findUniqueOrThrow({ where: { actorId: band.id } });
		expect(org.formedAt).toBeNull();
		expect(await xp(ids.lea)).toBe(0);
	});

	it('la 2ᵉ adhésion forme le groupe : XP pour les deux, étape « Formation » vérifiée', async () => {
		await service.inviteToBand(band.id, ids.lea, { handle: PREFIX + 'malik', title: 'batterie' });
		expect(
			await db.notification.count({ where: { recipientActorId: ids.malik, type: 'BAND_INVITE' } })
		).toBe(1);
		await expect(
			service.inviteToBand(band.id, ids.lea, { handle: PREFIX + 'malik', title: null })
		).rejects.toThrow(/déjà une invitation/);

		await service.answerInvite(await invitation('malik'), ids.malik, true);
		const org = await db.organization.findUniqueOrThrow({ where: { actorId: band.id } });
		expect(org.formedAt).not.toBeNull();
		for (const person of [ids.lea, ids.malik]) {
			expect(await xp(person, 'membership.accepted')).toBe(200);
			expect(await xp(person, 'milestone.member')).toBe(25);
		}
		expect(await xp(band.id, 'milestone.band')).toBe(100);
		expect(
			await db.notification.count({ where: { recipientActorId: ids.lea, type: 'BAND_JOINED' } })
		).toBe(1);
	}, 60_000);

	it('départ puis retour : deux périodes, le retour rapporte moitié', async () => {
		await service.leaveBand(band.id, ids.malik);
		await service.inviteToBand(band.id, ids.lea, { handle: PREFIX + 'malik', title: null });
		await service.answerInvite(await invitation('malik'), ids.malik, true);

		const history = await rows('malik');
		expect(history.map((r) => r.status)).toEqual(['LEFT', 'ACTIVE']);
		expect(history[0].endedAt).not.toBeNull();
		expect(history[1].startedAt!.getTime()).toBeGreaterThanOrEqual(history[0].endedAt!.getTime());
		expect(history[1].endedAt).toBeNull();
		// 200 puis 100 (rendements décroissants par groupe) ; formation une seule fois.
		expect(await xp(ids.malik, 'membership.accepted')).toBe(300);
		expect(await xp(band.id, 'milestone.band')).toBe(100);
	}, 60_000);

	it('un·e mineur·e ne reçoit pas d’invitation d’un·e inconnu·e, mais peut demander', async () => {
		await expect(
			service.inviteToBand(band.id, ids.lea, { handle: PREFIX + 'zoe', title: null })
		).rejects.toThrow(/ne peut pas recevoir d’invitation/);
		await service.requestToJoin(band.id, ids.zoe);
		expect(
			await db.notification.count({ where: { recipientActorId: ids.lea, type: 'BAND_REQUEST' } })
		).toBe(1);
		const request = await db.membership.findFirstOrThrow({
			where: { orgId: band.id, personId: ids.zoe, status: 'REQUESTED' }
		});
		await expect(service.answerRequest(request.id, ids.malik, true)).rejects.toThrow(/gèrent/);
		await service.answerRequest(request.id, ids.lea, true);
		expect((await rows('zoe')).map((r) => r.status)).toEqual(['ACTIVE']);
	}, 60_000);

	it('un groupe a toujours un OWNER : transmettre avant de partir', async () => {
		await expect(service.leaveBand(band.id, ids.lea)).rejects.toThrow(/Transmets/);
		const malik = (await rows('malik')).at(-1)!;
		await service.transferOwnership(malik.id, ids.lea);
		expect((await rows('malik')).at(-1)!.role).toBe('OWNER');
		expect((await rows('lea')).at(-1)!.role).toBe('ADMIN');
		await service.leaveBand(band.id, ids.lea);
		const owners = await db.membership.count({
			where: { orgId: band.id, status: 'ACTIVE', role: 'OWNER' }
		});
		expect(owners).toBe(1);
	}, 60_000);

	it('suppression du compte responsable : le groupe passe au membre suivant', async () => {
		await db.$transaction(await personAnonymizationOps(users.malik));
		expect((await rows('malik')).at(-1)).toMatchObject({ status: 'LEFT' });
		expect((await rows('zoe')).at(-1)).toMatchObject({ status: 'ACTIVE', role: 'OWNER' });
		// L'historique reste complet : Léa et Malik y figurent avec leurs dates.
		const page = await service.bandPage(band.handle, ids.zoe);
		expect(page!.past.map((m) => m.name).sort()).toEqual([
			'Compte supprimé',
			'Compte supprimé',
			'lea'
		]);
	}, 60_000);

	it('le dernier membre dissout le groupe', async () => {
		const { dissolved } = await service.leaveBand(band.id, ids.zoe);
		expect(dissolved).toBe(true);
		const org = await db.organization.findUniqueOrThrow({ where: { actorId: band.id } });
		expect(org.dissolvedAt).not.toBeNull();
		await expect(service.requestToJoin(band.id, ids.sam)).rejects.toThrow(/n’existe plus/);
	}, 60_000);
});
