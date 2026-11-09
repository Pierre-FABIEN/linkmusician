/**
 * Preuves des étapes (P3-05, D43) sur la base de `.env`, schéma `e2e` :
 * un concert ne se corrobore pas par un membre du groupe ; lien d'événement
 * et personne hors groupe TL1 le corroborent (XP différentielle) ; une
 * répétition par un autre membre présent ; une démo par un lien d'écoute
 * accepté par la modération ; RGPD. Désactivé par défaut :
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
const { verifyMusicBrainzDemoMock } = vi.hoisted(() => ({
	verifyMusicBrainzDemoMock: vi.fn()
}));

vi.mock('#lib/server', () => ({ prisma: db }));
vi.mock('#lib/server/audit-log', () => ({ logAdminAction: async () => {} }));
vi.mock('./release-verification', async (importOriginal) => ({
	...(await importOriginal<typeof import('./release-verification')>()),
	verifyMusicBrainzDemo: verifyMusicBrainzDemoMock
}));

const milestones = await import('./service');
const proofs = await import('./proofs');
const bands = await import('#lib/server/bands/service');
const { exportPersonData, personAnonymizationOps } = await import('#lib/prisma/actors/person');

const PREFIX = 'proofs-test-';
const YEAR = 365.25 * 86_400_000;

describe.skipIf(!enabled)('preuves des étapes (schéma e2e)', { timeout: 90_000 }, () => {
	const ids: Record<string, string> = {};
	const users: Record<string, string> = {};
	let bandId = '';

	async function cleanup() {
		const actors = await db.actor.findMany({
			where: {
				OR: [
					{ handle: { startsWith: PREFIX } },
					{ displayName: { startsWith: 'Proofs Test' } },
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

	/** La confiance est recalculée après chaque événement : on la fixe avant d'agir. */
	const trust = (level: number, ...names: string[]) =>
		db.actor.updateMany({
			where: { id: { in: names.map((n) => ids[n]) } },
			data: { trustLevel: level }
		});

	const proofOf = async (milestoneId: string) =>
		(await db.milestone.findUniqueOrThrow({ where: { id: milestoneId } })).proof;

	beforeAll(async () => {
		await cleanup();
		verifyMusicBrainzDemoMock.mockResolvedValue({ status: 'not_found' });
		await seedMilestones(db);
		for (const name of ['lea', 'malik', 'sam', 'neo']) {
			const user = await db.user.create({
				data: { email: `${PREFIX}${name}@example.test`, referralCode: `${PREFIX}${name}` }
			});
			users[name] = user.id;
			ids[name] = (
				await db.actor.create({
					data: {
						kind: 'PERSON',
						handle: PREFIX + name,
						displayName: `Proofs Test ${name}`,
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
		const band = await bands.createBand(ids.lea, { name: 'Proofs Test Band', title: null });
		bandId = band.id;
		await bands.inviteToBand(band.id, ids.lea, { handle: PREFIX + 'malik', title: null });
		const invite = await db.membership.findFirstOrThrow({
			where: { orgId: band.id, personId: ids.malik, status: 'INVITED' }
		});
		await bands.answerInvite(invite.id, ids.malik, true);
	}, 90_000);

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('concert : un membre ne corrobore pas ; lien d’événement et personne hors groupe, si', async () => {
		const gig = await milestones.declareMilestone(bandId, ids.lea, {
			key: 'FIRST_GIG',
			day: '2026-06-21',
			note: 'Fête de la musique'
		});
		expect(await xp(bandId)).toBe(150); // formation 100 + déclaré 50

		// Un membre du groupe : refusé, l'étape reste déclarée.
		await expect(proofs.requestAttestation(gig.id, ids.lea, PREFIX + 'malik')).rejects.toThrow(
			/extérieure/
		);
		await expect(proofs.requestAttestation(gig.id, ids.malik, PREFIX + 'sam')).rejects.toThrow(
			/gèrent/
		);
		// Un compte neuf (TL0) : pas encore.
		await trust(0, 'sam');
		await expect(proofs.requestAttestation(gig.id, ids.lea, PREFIX + 'sam')).rejects.toThrow(
			/vient d’arriver/
		);

		await trust(1, 'sam', 'neo');
		await proofs.requestAttestation(gig.id, ids.lea, `@${PREFIX}sam`);
		await proofs.requestAttestation(gig.id, ids.lea, PREFIX + 'neo');
		await expect(proofs.requestAttestation(gig.id, ids.lea, PREFIX + 'sam')).rejects.toThrow(
			/déjà demandé/
		);
		expect(
			await db.notification.count({
				where: { recipientActorId: ids.sam, type: 'MILESTONE_ATTEST' }
			})
		).toBe(1);

		// Néo n'y était pas ; Sam confirme : sans lien, rien ne change.
		await proofs.answerAttestation(gig.id, ids.neo, false);
		await trust(1, 'sam');
		expect(await proofs.answerAttestation(gig.id, ids.sam, true)).toEqual({ corroborated: false });
		expect(await proofOf(gig.id)).toBe('DECLARED');
		await expect(proofs.answerAttestation(gig.id, ids.sam, true)).rejects.toThrow(
			/Rien à confirmer/
		);
		expect(
			await db.domainEvent.count({
				where: { type: 'milestone.attestation_confirmed', actorIds: { has: ids.sam } }
			})
		).toBe(1);

		// Le lien d'événement corrobore : +350 au groupe, +88 à chaque membre.
		const [lea, malik] = [await xp(ids.lea), await xp(ids.malik)];
		await expect(proofs.addEvidence(gig.id, ids.lea, 'pas un lien')).rejects.toThrow(/valide/);
		expect(
			await proofs.addEvidence(gig.id, ids.lea, 'https://www.instagram.com/p/affiche/')
		).toEqual({
			reviewed: false,
			corroborated: true
		});
		expect(await proofOf(gig.id)).toBe('CORROBORATED');
		expect(await xp(bandId)).toBe(500);
		expect(await xp(ids.lea)).toBe(lea + 88);
		expect(await xp(ids.malik)).toBe(malik + 88);
		await expect(proofs.addEvidence(gig.id, ids.lea, 'https://bar.fr/agenda')).rejects.toThrow(
			/déjà corroborée/
		);

		const page = await proofs.attestationPage(gig.id, ids.sam);
		expect(page).toMatchObject({
			label: 'Premier concert',
			status: 'CONFIRMED',
			proof: 'CORROBORATED'
		});
		expect(await proofs.attestationPage(gig.id, ids.malik)).toBeNull();
	});

	it('répétition : un autre membre présent la confirme', async () => {
		const rehearsal = await milestones.declareMilestone(bandId, ids.lea, {
			key: 'FIRST_REHEARSAL',
			day: '2025-09-01',
			note: null
		});
		await expect(proofs.requestAttestation(rehearsal.id, ids.lea, PREFIX + 'lea')).rejects.toThrow(
			/toi/
		);
		await expect(proofs.requestAttestation(rehearsal.id, ids.lea, PREFIX + 'sam')).rejects.toThrow(
			/membre du groupe présent/
		);
		const before = await xp(bandId);
		await proofs.requestAttestation(rehearsal.id, ids.lea, PREFIX + 'malik');
		expect(await proofs.answerAttestation(rehearsal.id, ids.malik, true)).toEqual({
			corroborated: true
		});
		expect(await xp(bandId)).toBe(before + 20); // 50 − 30
	});

	it('démo publique : un lien d’écoute accepté par la modération', async () => {
		const demo = await milestones.declareMilestone(bandId, ids.lea, {
			key: 'FIRST_PUBLIC_DEMO',
			day: '2026-10-01',
			note: null
		});
		await expect(proofs.requestAttestation(demo.id, ids.lea, PREFIX + 'sam')).rejects.toThrow(
			/par un lien/
		);
		await expect(proofs.addEvidence(demo.id, ids.lea, 'https://example.com/demo')).rejects.toThrow(
			/écoute public/
		);
		expect(
			await proofs.addEvidence(demo.id, ids.lea, 'https://proofs-test.bandcamp.com/track/premier')
		).toEqual({ reviewed: true, corroborated: false });
		const queued = (await proofs.pendingEvidence()).filter(
			(e) => e.band.handle === 'proofs-test-band'
		);
		expect(queued).toHaveLength(1);
		const before = await xp(bandId);
		await proofs.reviewEvidence(queued[0].id, true, { userId: users.lea });
		expect(await proofOf(demo.id)).toBe('CORROBORATED');
		expect(await xp(bandId)).toBe(before + 250); // 300 − 50
		await expect(proofs.reviewEvidence(queued[0].id, false, { userId: users.lea })).rejects.toThrow(
			/plus en attente/
		);
	});

	it('démo liée par MusicBrainz au groupe : étape vérifiée et XP complète', async () => {
		const band = await bands.createBand(ids.lea, {
			name: 'Proofs Test Demo Verified',
			title: null
		});
		await bands.inviteToBand(band.id, ids.lea, { handle: PREFIX + 'sam', title: null });
		const invite = await db.membership.findFirstOrThrow({
			where: { orgId: band.id, personId: ids.sam, status: 'INVITED' }
		});
		await bands.answerInvite(invite.id, ids.sam, true);
		const demo = await milestones.declareMilestone(band.id, ids.lea, {
			key: 'FIRST_PUBLIC_DEMO',
			day: '2026-10-02',
			note: null
		});
		verifyMusicBrainzDemoMock.mockResolvedValueOnce({
			status: 'verified',
			title: 'Premier morceau'
		});
		const before = await xp(band.id);

		await expect(
			proofs.addEvidence(demo.id, ids.lea, 'https://open.spotify.com/track/proofs-test-demo')
		).resolves.toEqual({
			reviewed: false,
			corroborated: true,
			verified: true,
			title: 'Premier morceau'
		});
		expect(await proofOf(demo.id)).toBe('VERIFIED');
		expect(await xp(band.id)).toBe(before + 450); // 500 − 50
		expect(
			await db.milestoneEvidence.findFirstOrThrow({ where: { milestoneId: demo.id } })
		).toMatchObject({ status: 'VERIFIED', url: 'https://open.spotify.com/track/proofs-test-demo' });
	});

	it('la gestion voit ce qu’il reste à faire', async () => {
		const recording = await milestones.declareMilestone(bandId, ids.lea, {
			key: 'FIRST_RECORDING',
			day: '2026-08-01',
			note: null
		});
		await trust(1, 'neo');
		await proofs.requestAttestation(recording.id, ids.lea, PREFIX + 'neo');
		const all = await proofs.bandMilestoneProofs(bandId);
		expect(all[recording.id].checklist).toEqual([
			{ label: 'Une personne hors du groupe qui y était confirme', done: false, pending: true }
		]);
		expect(all[recording.id].attestations).toMatchObject([
			{ name: 'Proofs Test neo', role: 'OUTSIDER', status: 'REQUESTED' }
		]);
	});

	it('RGPD : confirmations exportées ; à l’anonymisation, les demandes en attente disparaissent', async () => {
		const exported = await exportPersonData(users.sam);
		expect(exported?.etapes_de_groupe_confirmations).toMatchObject([
			{ groupe: 'Proofs Test Band', etape: 'Premier concert', statut: 'CONFIRMED' }
		]);
		await db.$transaction(await personAnonymizationOps(users.neo));
		expect(
			await db.milestoneAttestation.count({ where: { attesterId: ids.neo, status: 'REQUESTED' } })
		).toBe(0);
		expect(
			await db.milestoneAttestation.count({ where: { attesterId: ids.neo, status: 'DECLINED' } })
		).toBe(1);
		await db.$transaction(await personAnonymizationOps(users.lea));
		expect(await db.milestoneAttestation.count({ where: { requestedById: ids.lea } })).toBe(0);
		expect(await db.milestoneEvidence.count({ where: { addedById: ids.lea } })).toBe(0);
	});
});
