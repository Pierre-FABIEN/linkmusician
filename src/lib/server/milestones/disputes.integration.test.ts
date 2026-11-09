/**
 * Contestation et retrait des étapes (P3-06) sur la base de `.env`, schéma
 * `e2e` : un signalement d'une personne de confiance gèle l'étape ; une
 * contestation retenue écrit les transactions liées (`reversesId`), retire
 * l'étape et avertit qui l'a déclarée et qui l'a confirmée ; rejetée, elle
 * dégèle ; la gestion retire une étape déclarée par erreur. Désactivé par
 * défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/milestones
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { seedMilestones } from '../../../../prisma/seed-referentials.js';

const enabled = process.env.PROGRESSION_INTEGRATION === '1';
const url = new URL(
	dotenv.config({ quiet: true }).parsed?.DATABASE_URL ??
		process.env.DATABASE_URL ??
		'postgresql://x/y'
);
url.searchParams.set('schema', 'e2e');
const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });

vi.mock('#lib/server', () => ({ prisma: db }));
vi.mock('#lib/server/audit-log', () => ({ logAdminAction: async () => {} }));

const milestones = await import('./service');
const proofs = await import('./proofs');
const disputes = await import('./disputes');
const bands = await import('#lib/server/bands/service');

const PREFIX = 'disputes-test-';
const YEAR = 365.25 * 86_400_000;
const moderator = { userId: 'disputes-test-moderator' };

describe.skipIf(!enabled)('contestation des étapes (schéma e2e)', { timeout: 120_000 }, () => {
	const ids: Record<string, string> = {};
	let bandId = '';

	async function cleanup() {
		const actors = await db.actor.findMany({
			where: {
				OR: [
					{ handle: { startsWith: PREFIX } },
					{ displayName: { startsWith: 'Disputes Test' } },
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
				where: { actorId: actor, ruleId: { startsWith: 'milestone.' } },
				_sum: { amount: true }
			})
		)._sum.amount ?? 0;

	const trust = (level: number, ...names: string[]) =>
		db.actor.updateMany({
			where: { id: { in: names.map((n) => ids[n]) } },
			data: { trustLevel: level }
		});

	/** Concert déclaré puis corroboré par Sam (hors groupe) et une affiche. */
	async function corroboratedGig() {
		const gig = await milestones.declareMilestone(bandId, ids.lea, {
			key: 'FIRST_GIG',
			day: '2026-06-21',
			note: 'Fête de la musique'
		});
		await trust(1, 'sam');
		await proofs.requestAttestation(gig.id, ids.lea, PREFIX + 'sam');
		await trust(1, 'sam');
		await proofs.answerAttestation(gig.id, ids.sam, true);
		await proofs.addEvidence(gig.id, ids.lea, 'https://www.instagram.com/p/affiche-disputes/');
		return gig;
	}

	beforeAll(async () => {
		await cleanup();
		await seedMilestones(db);
		for (const name of ['lea', 'malik', 'sam', 'neo', 'ivy']) {
			const user = await db.user.create({
				data: { email: `${PREFIX}${name}@example.test`, referralCode: `${PREFIX}${name}` }
			});
			ids[name] = (
				await db.actor.create({
					data: {
						kind: 'PERSON',
						handle: PREFIX + name,
						displayName: `Disputes Test ${name}`,
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
		const band = await bands.createBand(ids.lea, { name: 'Disputes Test Band', title: null });
		bandId = band.id;
		await bands.inviteToBand(band.id, ids.lea, { handle: PREFIX + 'malik', title: null });
		const invite = await db.membership.findFirstOrThrow({
			where: { orgId: band.id, personId: ids.malik, status: 'INVITED' }
		});
		await bands.answerInvite(invite.id, ids.malik, true);
	}, 120_000);

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('contester : pas la formation, pas un membre ; un compte récent ne gèle pas', async () => {
		const gig = await corroboratedGig();
		expect(await xp(bandId)).toBe(500); // formation 100 + concert corroboré 400
		const formation = await db.milestone.findFirstOrThrow({
			where: { bandId, definitionId: 'FORMATION' }
		});
		await trust(1, 'neo');
		await expect(
			disputes.contestMilestone(ids.neo, formation.id, 'Ce groupe n’existe pas')
		).rejects.toThrow(/ne se conteste pas/);
		await expect(
			disputes.contestMilestone(ids.malik, gig.id, 'On n’a jamais joué')
		).rejects.toThrow(/gestion du groupe/);
		await expect(disputes.contestMilestone(ids.neo, gig.id, 'faux')).rejects.toThrow(
			/quelques mots/
		);

		await trust(0, 'ivy');
		expect(await disputes.contestMilestone(ids.ivy, gig.id, 'Ce concert n’a pas eu lieu')).toEqual({
			alreadyReported: false,
			frozen: false
		});
		expect((await db.milestone.findUniqueOrThrow({ where: { id: gig.id } })).frozenAt).toBeNull();
	});

	it('une personne de confiance gèle l’étape : plus de preuve, « En vérification »', async () => {
		const gig = await db.milestone.findFirstOrThrow({
			where: { bandId, definitionId: 'FIRST_GIG' }
		});
		await trust(1, 'neo');
		expect(
			await disputes.contestMilestone(ids.neo, gig.id, 'J’y étais, ce soir-là le bar était fermé')
		).toEqual({ alreadyReported: false, frozen: true });
		const listed = (await milestones.bandMilestones(bandId)).find((m) => m.key === 'FIRST_GIG');
		expect(listed?.frozen).toBe(true);
		await expect(
			milestones.updateMilestoneDetails(gig.id, ids.lea, { day: '2026-06-20', note: null })
		).rejects.toThrow(/vérification/);
		await expect(disputes.retractMilestone(gig.id, ids.lea)).rejects.toThrow(/vérification/);
		const queue = await disputes.disputeQueue();
		const entry = queue.find((q) => q.id === gig.id);
		expect(entry?.reports).toHaveLength(2);
		expect(entry?.confirmedBy.map((c) => c.handle)).toEqual([PREFIX + 'sam']);
	});

	it('retenue : transactions liées, étape retirée, déclarante et confirmateur avertis', async () => {
		const gig = await db.milestone.findFirstOrThrow({
			where: { bandId, definitionId: 'FIRST_GIG' }
		});
		await expect(disputes.upholdContest(gig.id, '  ', moderator)).rejects.toThrow(/Explique/);
		const { warned, reversals } = await disputes.upholdContest(
			gig.id,
			'Le lieu confirme qu’il n’y a pas eu de concert',
			moderator
		);
		expect(new Set(warned)).toEqual(new Set([ids.lea, ids.sam]));
		expect(await xp(bandId)).toBe(100); // il reste la formation
		// Chaque membre ne garde que sa part de la formation (25 % de 100).
		expect(await xp(ids.lea)).toBe(25);
		expect(await xp(ids.malik)).toBe(25);
		// Registre en ajout seul : chaque reprise pointe vers son gain.
		const linked = await db.xpTransaction.findMany({
			where: { id: { in: reversals.map((r) => r.id) } },
			select: { amount: true, reversesId: true }
		});
		expect(linked.length).toBeGreaterThan(0);
		expect(linked.every((r) => r.reversesId !== null && r.amount < 0)).toBe(true);
		expect(await db.milestone.count({ where: { id: gig.id } })).toBe(0);
		expect(await db.report.count({ where: { targetId: gig.id, status: 'ACTIONED' } })).toBe(2);
		for (const who of ['lea', 'sam']) {
			expect(
				await db.sanction.count({ where: { actorId: ids[who], kind: 'WARNING', liftedAt: null } })
			).toBe(1);
		}
		expect((await db.actor.findUniqueOrThrow({ where: { id: ids.sam } })).trustLevel).toBe(0);
		expect(
			await db.domainEvent.count({
				where: { type: 'milestone.revoked', actorIds: { has: bandId } }
			})
		).toBe(1);
	});

	it('rejetée : l’étape dégèle ; la gestion retire elle-même une étape déclarée par erreur', async () => {
		const rehearsal = await milestones.declareMilestone(bandId, ids.lea, {
			key: 'FIRST_REHEARSAL',
			day: '2026-05-01',
			note: null
		});
		const before = await xp(bandId);
		await trust(1, 'neo');
		await disputes.contestMilestone(ids.neo, rehearsal.id, 'Je ne crois pas à cette répétition');
		await disputes.dismissContest(rehearsal.id, 'Rien d’anormal', moderator);
		expect(
			(await db.milestone.findUniqueOrThrow({ where: { id: rehearsal.id } })).frozenAt
		).toBeNull();
		expect(await xp(bandId)).toBe(before);

		await expect(disputes.retractMilestone(rehearsal.id, ids.malik)).rejects.toThrow(/gèrent/);
		await disputes.retractMilestone(rehearsal.id, ids.lea);
		expect(await xp(bandId)).toBe(100);
		expect(await db.milestone.count({ where: { id: rehearsal.id } })).toBe(0);
		// Elle peut se redéclarer, et rapporte de nouveau.
		await milestones.declareMilestone(bandId, ids.lea, {
			key: 'FIRST_REHEARSAL',
			day: '2026-05-02',
			note: null
		});
		expect(await xp(bandId)).toBe(before);
	});
});
