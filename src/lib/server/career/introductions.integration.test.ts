/**
 * Parrainage (P4-13b) sur la base de `.env`, schéma `e2e` : une présentation
 * sans collaboration ne débloque rien ; la collaboration terminée ensuite
 * entre les deux personnes présentées donne _Passeur_ à qui les a
 * présentées, une fois, sans XP. Les garde-fous : palier, réseau, mineur·e,
 * déjà joué ensemble, doublon. Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/career/introductions
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
if (enabled) process.env.DATABASE_URL = url.toString();
const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });

vi.mock('#lib/server', () => ({ prisma: db }));

/** Pilier local sans des mois de données : le palier lu dans les faits, plus celui-ci. */
const pillars = new Set<string>();
vi.mock('#lib/server/progression/read', async (importOriginal) => {
	const original = await importOriginal<typeof import('#lib/server/progression/read')>();
	return {
		...original,
		getMusicianTier: async (...args: Parameters<typeof original.getMusicianTier>) => {
			const tier = await original.getMusicianTier(...args);
			return pillars.has(args[0]) ? { ...tier, reached: [...tier.reached, 'LOCAL_PILLAR'] } : tier;
		}
	};
});

const { introduce, introducibleContacts, myIntroductions } = await import('./introductions');
const collaborations = await import('#lib/server/collaborations/service');

const PREFIX = 'intro-test-';
const YEAR = 365.25 * 86_400_000;
const DAY = 86_400_000;
const day = (offset: number) => new Date(Date.now() + offset * DAY).toISOString().slice(0, 10);

describe.skipIf(!enabled)('parrainage et Passeur (schéma e2e)', { timeout: 60_000 }, () => {
	const ids: Record<string, string> = {};

	async function cleanup() {
		const actors = await db.actor.findMany({
			where: { person: { user: { email: { startsWith: PREFIX } } } },
			select: { id: true }
		});
		const list = actors.map((a) => a.id);
		if (list.length > 0) {
			await db.collaboration.deleteMany({ where: { proposedById: { in: list } } });
			await db.conversation.deleteMany({
				where: { participants: { some: { actorId: { in: list } } } }
			});
		}
		await db.actor.deleteMany({ where: { id: { in: list } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
		if (list.length > 0)
			await db.domainEvent.deleteMany({ where: { actorIds: { hasSome: list } } });
	}

	const handle = (key: string) => `${PREFIX}${key}`;
	const passeur = (key: string) =>
		db.actorAchievement.count({ where: { actorId: ids[key], achievementId: 'passeur' } });

	/** Conversation acceptée, puis collaboration passée confirmée des deux côtés. */
	async function collaborate(a: string, b: string, daysAgo = 1) {
		const pairKey = [ids[a], ids[b]].sort().join(':');
		const conversation =
			(await db.conversation.findUnique({ where: { pairKey } })) ??
			(await db.conversation.create({
				data: {
					pairKey,
					initiatorId: ids[a],
					participants: {
						create: [
							{ actorId: ids[a], state: 'ACCEPTED' },
							{ actorId: ids[b], state: 'ACCEPTED' }
						]
					}
				}
			}));
		const { id } = await collaborations.proposeCollaboration(ids[a], conversation.id, {
			kind: 'REHEARSAL',
			title: 'Répète',
			happenedOn: day(-daysAgo)
		});
		await collaborations.respondToCollaboration(ids[b], id, true);
		return db.collaboration.findUniqueOrThrow({ where: { id } });
	}

	beforeAll(async () => {
		await cleanup();
		for (const [key, age] of [
			['parrain', 40],
			['lea', 25],
			['jo', 28],
			['mino', 17],
			['inconnu', 30],
			['autre', 33]
		] as const) {
			const user = await db.user.create({
				data: { email: `${PREFIX}${key}@example.test`, referralCode: `${PREFIX}${key}` }
			});
			const actor = await db.actor.create({
				data: {
					kind: 'PERSON',
					handle: handle(key),
					displayName: `${key[0].toUpperCase()}${key.slice(1)} Intro`,
					trustLevel: 2,
					person: {
						create: {
							userId: user.id,
							termsAcceptedAt: new Date(),
							onboardedAt: new Date(),
							birthDate: new Date(Date.now() - age * YEAR)
						}
					}
				}
			});
			ids[key] = actor.id;
		}
		pillars.add(ids.parrain);
		// Réseau du parrain : Léa, Jo, la mineure et « autre » ; pas l'inconnu.
		for (const key of ['lea', 'jo', 'mino', 'autre']) {
			await db.musicalTie.create({ data: { ownerId: ids.parrain, contactId: ids[key] } });
		}
	}, 120_000);

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('n’offre que des personnes majeures de son réseau', async () => {
		const contacts = (await introducibleContacts(ids.parrain)).map((c) => c.handle);
		expect(contacts.sort()).toEqual([handle('autre'), handle('jo'), handle('lea')]);
	});

	it('refuse hors palier, hors réseau, une mineure, et des gens qui ont déjà joué ensemble', async () => {
		await expect(
			introduce(ids.lea, { first: handle('jo'), second: handle('autre'), note: '' })
		).rejects.toThrow(/Pilier local/);
		await expect(
			introduce(ids.parrain, { first: handle('lea'), second: handle('inconnu'), note: '' })
		).rejects.toThrow(/réseau musical/);
		await expect(
			introduce(ids.parrain, { first: handle('lea'), second: handle('mino'), note: '' })
		).rejects.toThrow(/réseau musical/);
		await collaborate('jo', 'autre');
		await expect(
			introduce(ids.parrain, { first: handle('jo'), second: handle('autre'), note: '' })
		).rejects.toThrow(/déjà joué/);
	});

	it('une présentation sans collaboration ne débloque rien', async () => {
		const result = await introduce(ids.parrain, {
			first: handle('lea'),
			second: `@${handle('jo')}`,
			note: '  Vous aimez   le funk tous les deux '
		});
		expect(result).toEqual({ first: 'Lea Intro', second: 'Jo Intro' });
		const intro = await db.introduction.findFirstOrThrow({ where: { introducerId: ids.parrain } });
		expect(intro.note).toBe('Vous aimez le funk tous les deux');
		expect(intro.succeededAt).toBeNull();
		expect(await passeur('parrain')).toBe(0);
		// Chacune est prévenue, avec le profil de l'autre.
		const notes = await db.notification.findMany({
			where: { type: 'INTRODUCTION', fromActorId: ids.parrain },
			select: { recipientActorId: true, href: true }
		});
		expect(notes).toHaveLength(2);
		expect(notes).toContainEqual({ recipientActorId: ids.lea, href: `/@${handle('jo')}` });
		await expect(
			introduce(ids.parrain, { first: handle('jo'), second: handle('lea'), note: '' })
		).rejects.toThrow(/déjà présentées/);
	});

	it('elles collaborent ensuite : Passeur pour le parrain, une fois, sans XP', async () => {
		const collab = await collaborate('lea', 'jo');
		expect(collab.status).toBe('COMPLETED');
		expect(await passeur('parrain')).toBe(1);
		const [intro] = await myIntroductions(ids.parrain);
		expect(intro.succeededAt).not.toBeNull();
		expect(
			await db.xpTransaction.count({
				where: { actorId: ids.parrain, sourceEvent: { type: 'introduction.succeeded' } }
			})
		).toBe(0);
		// Une 2ᵉ collaboration ne refait rien.
		await collaborate('jo', 'lea', 2);
		expect(await passeur('parrain')).toBe(1);
		expect(
			await db.domainEvent.count({
				where: { type: 'introduction.succeeded', actorIds: { has: ids.parrain } }
			})
		).toBe(1);
	});
});
