/**
 * LINKMUSICIAN (P2-10) : détection nocturne des cercles fermés
 * (`/api/jobs/collusion`, noyau `progression/core/collusion.ts`).
 *
 * - Graphe : collaborations confirmées (`collaboration.completed`) et
 *   appréciations non reprises (`endorsement.received` moins
 *   `endorsement.revoked`) des 180 derniers jours, morceaux composés à
 *   plusieurs et étapes de groupe confirmées (P3-05).
 * - Empreinte d'appareil : adresses IP des sessions (boilerplate,
 *   `auth_sessions.ipAddress`) communes à plusieurs membres. Elle fait
 *   remonter le cas dans la file, elle ne décide rien.
 * - Un cas ouvert est mis à jour ; un cas déjà tranché (rien d'anormal ou
 *   confirmé) n'est pas rouvert pour le même groupe. **Aucune sanction
 *   automatique** : la modération décide.
 *
 * Base passée par l'appelant, aucun import de SvelteKit (test d'intégration).
 */
import type { PrismaClient } from '@prisma/client';
import {
	COLLUSION_WINDOW_DAYS,
	findClosedCircles,
	sharedIpCount,
	type Interaction
} from '../progression/core/collusion';

const DAY_MS = 86_400_000;

type Payload = Record<string, unknown>;

/** Interactions confirmées de la fenêtre, lues dans les événements de domaine. */
export async function interactionsSince(db: PrismaClient, since: Date): Promise<Interaction[]> {
	const events = await db.domainEvent.findMany({
		where: {
			type: {
				in: [
					'collaboration.completed',
					'endorsement.received',
					'endorsement.revoked',
					// Morceaux composés à plusieurs (P3-11) : crédits confirmés.
					'work.composed',
					'work.credit_confirmed',
					// Étapes de groupe confirmées (P3-05) : qui confirme et qui l'a demandé.
					'milestone.attestation_confirmed'
				]
			},
			occurredAt: { gte: since }
		},
		select: { id: true, type: true, payload: true }
	});
	const revoked = new Set(
		events
			.filter((e) => e.type === 'endorsement.revoked')
			.map((e) => String((e.payload as Payload).endorsementEventId))
	);
	const result: Interaction[] = [];
	for (const e of events) {
		const p = e.payload as Payload;
		if (e.type === 'collaboration.completed' && Array.isArray(p.participantIds)) {
			const ids = [...new Set(p.participantIds.map(String))];
			for (let i = 0; i < ids.length; i++) {
				for (let j = i + 1; j < ids.length; j++) result.push({ a: ids[i], b: ids[j] });
			}
		}
		if (e.type === 'work.composed' && Array.isArray(p.contributorIds)) {
			const ids = [...new Set(p.contributorIds.map(String))];
			for (let i = 0; i < ids.length; i++) {
				for (let j = i + 1; j < ids.length; j++) result.push({ a: ids[i], b: ids[j] });
			}
		}
		if (e.type === 'work.credit_confirmed' && Array.isArray(p.otherIds)) {
			for (const other of new Set(p.otherIds.map(String))) {
				result.push({ a: String(p.personId), b: other });
			}
		}
		if (e.type === 'milestone.attestation_confirmed' && p.requesterId) {
			result.push({ a: String(p.attesterId), b: String(p.requesterId) });
		}
		if (e.type === 'endorsement.received' && !revoked.has(e.id)) {
			result.push({ a: String(p.actorId), b: String(p.endorserId) });
		}
	}
	return result;
}

/** Adresses IP de session de chaque membre. */
async function ipsOf(db: PrismaClient, actorIds: string[]) {
	const persons = await db.person.findMany({
		where: { actorId: { in: actorIds } },
		select: { actorId: true, user: { select: { authSessions: { select: { ipAddress: true } } } } }
	});
	return new Map(
		persons.map((p) => [
			p.actorId,
			new Set(p.user.authSessions.flatMap((s) => (s.ipAddress ? [s.ipAddress] : [])))
		])
	);
}

export async function runCollusionJob({ db, now = new Date() }: { db: PrismaClient; now?: Date }) {
	const since = new Date(now.getTime() - COLLUSION_WINDOW_DAYS * DAY_MS);
	const candidates = findClosedCircles(await interactionsSince(db, since));
	let opened = 0;
	let updated = 0;
	for (const c of candidates) {
		const sharedIps = sharedIpCount(await ipsOf(db, c.memberIds));
		const existing = await db.collusionCase.findUnique({
			where: { memberKey: c.memberKey },
			select: { status: true }
		});
		const metrics = {
			interactions: c.interactions,
			density: c.density,
			sharedIps,
			lastSeenAt: now
		};
		if (!existing) {
			await db.collusionCase.create({
				data: { memberIds: c.memberIds, memberKey: c.memberKey, detectedAt: now, ...metrics }
			});
			opened += 1;
		} else if (existing.status === 'OPEN') {
			await db.collusionCase.update({ where: { memberKey: c.memberKey }, data: metrics });
			updated += 1;
		}
	}
	return { candidates: candidates.length, opened, updated };
}
