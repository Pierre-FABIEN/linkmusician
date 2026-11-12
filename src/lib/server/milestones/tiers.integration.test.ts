/**
 * Rangs de groupe et part des membres (P3-08) sur la base de `.env`, schéma
 * `e2e` : la part de 25 % va aux membres présents à la date de l'étape, pas
 * à quelqu'un arrivé après, même quand l'étape se corrobore plus tard ; le
 * rang suit la dernière étape corroborée et ignore une étape gelée.
 * Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/milestones
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createPrismaClient } from '../../../../prisma/client.js';
import dotenv from 'dotenv';
import { seedMilestones } from '../../../../prisma/seed-referentials.js';

const enabled = process.env.PROGRESSION_INTEGRATION === '1';
const url = new URL(
	dotenv.config({ quiet: true }).parsed?.DATABASE_URL ??
		process.env.DATABASE_URL ??
		'postgresql://x/y'
);
url.searchParams.set('schema', 'e2e');
const db = createPrismaClient(url.toString());

vi.mock('#lib/server', () => ({ prisma: db }));
vi.mock('#lib/server/audit-log', () => ({ logAdminAction: async () => {} }));

const milestones = await import('./service');
const proofs = await import('./proofs');
const bands = await import('#lib/server/bands/service');

const PREFIX = 'tiers-test-';
const YEAR = 365.25 * 86_400_000;

describe.skipIf(!enabled)('rangs de groupe (schéma e2e)', { timeout: 120_000 }, () => {
	const ids: Record<string, string> = {};
	let bandId = '';

	async function cleanup() {
		const actors = await db.actor.findMany({
			where: {
				OR: [
					{ handle: { startsWith: PREFIX } },
					{ displayName: { startsWith: 'Tiers Test' } },
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

	/** XP de la part des membres (`milestone.member`), par personne. */
	const share = async (actor: string) =>
		(
			await db.xpTransaction.aggregate({
				where: { actorId: actor, ruleId: { startsWith: 'milestone.member' } },
				_sum: { amount: true }
			})
		)._sum.amount ?? 0;

	async function join(handle: string) {
		await bands.inviteToBand(bandId, ids.lea, { handle: PREFIX + handle, title: null });
		const invite = await db.membership.findFirstOrThrow({
			where: { orgId: bandId, personId: ids[handle], status: 'INVITED' }
		});
		await bands.answerInvite(invite.id, ids[handle], true);
	}

	beforeAll(async () => {
		await cleanup();
		await seedMilestones(db);
		for (const name of ['lea', 'malik', 'sam']) {
			const user = await db.user.create({
				data: { email: `${PREFIX}${name}@example.test`, referralCode: `${PREFIX}${name}` }
			});
			ids[name] = (
				await db.actor.create({
					data: {
						kind: 'PERSON',
						handle: PREFIX + name,
						displayName: `Tiers Test ${name}`,
						person: {
							create: {
								userId: user.id,
								termsAcceptedAt: new Date(),
								onboardedAt: new Date(),
								birthDate: new Date(Date.now() - 30 * YEAR)
							}
						}
					}
				})
			).id;
		}
		bandId = (await bands.createBand(ids.lea, { name: 'Tiers Test Band', title: null })).id;
		await join('malik');
	}, 120_000);

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('un membre arrivé après une étape n’en reçoit pas la part, même à la corroboration', async () => {
		expect(await milestones.bandTierOf(bandId)).toEqual({ id: 'FORMATION', label: 'Projet' });
		const rehearsal = await milestones.declareMilestone(bandId, ids.lea, {
			key: 'FIRST_REHEARSAL',
			day: '2026-01-10',
			note: null
		});
		// Sam arrive ensuite.
		await join('sam');
		const [lea, malik, sam] = [await share(ids.lea), await share(ids.malik), await share(ids.sam)];
		// Malik, présent à la date, confirme : l'étape devient corroborée.
		await proofs.requestAttestation(rehearsal.id, ids.lea, PREFIX + 'malik');
		expect(await proofs.answerAttestation(rehearsal.id, ids.malik, true)).toEqual({
			corroborated: true
		});
		expect(await share(ids.lea)).toBeGreaterThan(lea);
		expect(await share(ids.malik)).toBeGreaterThan(malik);
		expect(await share(ids.sam)).toBe(sam);
		expect(await milestones.bandTierOf(bandId)).toEqual({ id: 'FIRST_REHEARSAL', label: 'Répète' });
	});

	it('une étape déclarée ne change pas le rang ; une étape gelée non plus', async () => {
		await milestones.declareMilestone(bandId, ids.lea, {
			key: 'FIRST_GIG',
			day: '2026-02-01',
			note: null
		});
		expect((await milestones.bandTierOf(bandId))?.id).toBe('FIRST_REHEARSAL');
		await db.milestone.updateMany({
			where: { bandId, definitionId: 'FIRST_REHEARSAL' },
			data: { frozenAt: new Date() }
		});
		expect((await milestones.bandTierOf(bandId))?.id).toBe('FORMATION');
	});
});
