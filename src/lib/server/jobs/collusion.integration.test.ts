/**
 * Détection de collusion (P2-10), sur la base de `.env`, schéma `e2e`.
 * Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/jobs/collusion
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { runCollusionJob } from './collusion';

const enabled = process.env.PROGRESSION_INTEGRATION === '1';
const PREFIX = 'collusion-test-';

describe.skipIf(!enabled)('détection de collusion (schéma e2e)', () => {
	let db: PrismaClient;
	const ids: Record<string, string> = {};

	async function cleanup() {
		const actors = await db.actor.findMany({
			where: { handle: { startsWith: PREFIX } },
			select: { id: true }
		});
		const actorIds = actors.map((a) => a.id);
		if (actorIds.length) {
			await db.collusionCase.deleteMany({ where: { memberIds: { hasSome: actorIds } } });
			await db.domainEvent.deleteMany({ where: { actorIds: { hasSome: actorIds } } });
		}
		await db.actor.deleteMany({ where: { id: { in: actorIds } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
	}

	async function person(key: string, ip: string) {
		const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
		const user = await db.user.create({
			data: {
				email: `${PREFIX}${key}-${stamp}@example.test`,
				emailVerified: true,
				referralCode: `C${stamp}`.slice(0, 12)
			}
		});
		const actor = await db.actor.create({
			data: { kind: 'PERSON', handle: `${PREFIX}${key}`, displayName: key }
		});
		await db.person.create({
			data: { actorId: actor.id, userId: user.id, termsAcceptedAt: new Date() }
		});
		await db.authSession.create({
			data: {
				token: `${PREFIX}${stamp}`,
				userId: user.id,
				ipAddress: ip,
				expiresAt: new Date(Date.now() + 86_400_000)
			}
		});
		ids[key] = actor.id;
	}

	const collab = (a: string, b: string) =>
		db.domainEvent.create({
			data: {
				type: 'collaboration.completed',
				payload: {
					collaborationId: `${PREFIX}${a}-${b}-${Math.random()}`,
					participantIds: [ids[a], ids[b]]
				},
				actorIds: [ids[a], ids[b]],
				processedAt: new Date()
			}
		});

	const caseOf = (keys: string[]) =>
		db.collusionCase.findUnique({
			where: {
				memberKey: keys
					.map((k) => ids[k])
					.sort()
					.join('|')
			}
		});

	beforeAll(async () => {
		const url = new URL(
			dotenv.config({ quiet: true }).parsed?.DATABASE_URL ?? process.env.DATABASE_URL ?? ''
		);
		url.searchParams.set('schema', 'e2e');
		db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
		await cleanup();
		// Clique : trois comptes, deux sur la même connexion.
		await person('a', '10.0.0.1');
		await person('b', '10.0.0.1');
		await person('c', '10.0.0.2');
		// Scène : un trio actif, mais relié au reste.
		for (const k of ['d', 'e', 'f', 'g', 'h']) await person(k, `10.1.0.${k.charCodeAt(0)}`);
		for (const [x, y] of [
			['a', 'b'],
			['b', 'c'],
			['a', 'c']
		]) {
			await collab(x, y);
			await collab(x, y);
		}
		for (const [x, y] of [
			['d', 'e'],
			['e', 'f'],
			['f', 'g'],
			['g', 'h'],
			['d', 'f']
		]) {
			await collab(x, y);
		}
	}, 120_000);

	afterAll(async () => {
		await cleanup();
		await db?.$disconnect();
	}, 120_000);

	it('la clique apparaît dans la file de revue, avec la connexion partagée', async () => {
		await runCollusionJob({ db });
		expect(await caseOf(['a', 'b', 'c'])).toMatchObject({
			status: 'OPEN',
			interactions: 6,
			density: 1,
			sharedIps: 1
		});
		expect(await caseOf(['d', 'e', 'f', 'g', 'h'])).toBeNull();
	}, 120_000);

	it('aucune sanction automatique', async () => {
		const members = ['a', 'b', 'c'].map((k) => ids[k]);
		expect(await db.sanction.count({ where: { actorId: { in: members } } })).toBe(0);
	}, 120_000);

	it('un cas classé n’est pas rouvert pour le même groupe', async () => {
		const c = (await caseOf(['a', 'b', 'c']))!;
		await db.collusionCase.update({ where: { id: c.id }, data: { status: 'DISMISSED' } });
		await runCollusionJob({ db });
		expect((await caseOf(['a', 'b', 'c']))?.status).toBe('DISMISSED');
	}, 120_000);
});
