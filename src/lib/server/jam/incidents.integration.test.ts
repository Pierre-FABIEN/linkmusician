/**
 * Jams signalées et restriction d'organiser (#91b, RV-01) sur la base de
 * `.env`, schéma `e2e`. Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/jam/incidents
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
if (enabled) process.env.DATABASE_URL = url.toString();
const db = createPrismaClient(url.toString());

vi.mock('#lib/server', () => ({ prisma: db }));

const incidents = await import('./incidents');
const { createJam, isJamOrganizer, comeToJam } = await import('./publicJams');

const PREFIX = 'incident-test-';
const YEAR = 365.25 * 86_400_000;
const HOUR = 3_600_000;
const NOW = new Date('2026-11-14T20:00:00Z');
const report = { reason: 'NO_JAM' as const, wentThere: true as const, details: '' };

describe.skipIf(!enabled)('jams signalées (schéma e2e)', { timeout: 90_000 }, () => {
	const ids: Record<string, string> = {};
	let moderatorUserId = '';
	let venueId = '';
	let jamId = '';
	let otherJamId = '';

	async function cleanup() {
		await db.venue.deleteMany({ where: { name: { startsWith: 'Incident Test' } } });
		await db.actor.deleteMany({ where: { handle: { startsWith: PREFIX } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
	}

	async function person(name: string, accountAgeDays = 60) {
		const createdAt = new Date(NOW.getTime() - accountAgeDays * 86_400_000);
		const user = await db.user.create({
			data: { email: `${PREFIX}${name}@example.test`, referralCode: `${PREFIX}${name}` }
		});
		ids[name] = (
			await db.actor.create({
				data: {
					kind: 'PERSON',
					handle: PREFIX + name,
					displayName: `Incident ${name}`,
					createdAt,
					person: {
						create: {
							userId: user.id,
							termsAcceptedAt: NOW,
							onboardedAt: NOW,
							organizesJams: name === 'hote',
							birthDate: new Date(NOW.getTime() - 30 * YEAR)
						}
					}
				}
			})
		).id;
		return user.id;
	}

	const notified = (name: string, type: string) =>
		db.notification.findMany({
			where: { recipientActorId: ids[name], type: type as never },
			select: { fromActorId: true }
		});

	beforeAll(async () => {
		await cleanup();
		await person('hote');
		for (const name of ['lea', 'malik', 'zoe', 'tard', 'passant']) await person(name);
		await person('nouveau', 2);
		moderatorUserId = (
			await db.user.create({
				data: {
					email: `${PREFIX}modo@example.test`,
					referralCode: `${PREFIX}modo`,
					role: 'MODERATOR'
				}
			})
		).id;
		venueId = (
			await db.venue.create({
				data: {
					name: 'Incident Test Bar',
					nameKey: 'incident test bar',
					kind: 'BAR',
					communeCode: '31555',
					communeName: 'Toulouse',
					departmentCode: '31',
					lat: 43.6,
					lng: 1.43,
					createdById: ids.passant,
					validatedAt: NOW
				}
			})
		).id;
		const startsAt = new Date(NOW.getTime() - HOUR);
		const before = new Date(startsAt.getTime() - 24 * HOUR);
		const jam = (title: string) =>
			db.opportunity.create({
				data: {
					kind: 'JAM',
					status: 'OPEN',
					title,
					description: 'Test',
					issuerActorId: ids.hote,
					startsAt,
					endsAt: new Date(NOW.getTime() + 2 * HOUR),
					expiresAt: new Date(NOW.getTime() + 2 * HOUR),
					venueId
				},
				select: { id: true }
			});
		jamId = (await jam('Incident fausse jam')).id;
		otherJamId = (await jam('Incident autre jam')).id;
		await db.jamAttendance.createMany({
			data: [
				{ opportunityId: jamId, actorId: ids.lea, createdAt: before },
				{ opportunityId: jamId, actorId: ids.malik, createdAt: before },
				{ opportunityId: jamId, actorId: ids.zoe, createdAt: before },
				{ opportunityId: jamId, actorId: ids.nouveau, createdAt: before },
				// Inscrit après le début : ne peut pas signaler.
				{ opportunityId: jamId, actorId: ids.tard, createdAt: NOW }
			]
		});
	});

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('seul·e une personne inscrite avant le début signale, pendant la fenêtre', async () => {
		for (const who of ['tard', 'passant']) {
			await expect(incidents.reportJam(jamId, ids[who], report, NOW)).rejects.toMatchObject({
				status: 403
			});
		}
		await expect(incidents.reportJam(jamId, ids.hote, report, NOW)).rejects.toThrow(/organises/);
		const tooEarly = new Date(NOW.getTime() - 2 * HOUR);
		await expect(incidents.reportJam(jamId, ids.lea, report, tooEarly)).rejects.toThrow(/du début/);
		const tooLate = new Date(NOW.getTime() + 27 * HOUR);
		await expect(incidents.reportJam(jamId, ids.lea, report, tooLate)).rejects.toThrow(/du début/);
	});

	it('premier signalement : organisation prévenue, inscrit·es averti·es, sans nom', async () => {
		expect(await incidents.reportJam(jamId, ids.lea, report, NOW)).toBe(true);
		expect(await notified('hote', 'JAM_REPORTED')).toEqual([{ fromActorId: null }]);
		for (const who of ['malik', 'zoe', 'tard']) {
			expect(await notified(who, 'JAM_ALERT')).toEqual([{ fromActorId: null }]);
		}
		expect(await notified('lea', 'JAM_ALERT')).toEqual([]);
		// Ni présence ni XP nées du signalement.
		const lea = await db.jamAttendance.findUniqueOrThrow({
			where: { opportunityId_actorId: { opportunityId: jamId, actorId: ids.lea } }
		});
		expect(lea.attendedAt).toBeNull();
		expect(await db.xpTransaction.count({ where: { actorId: ids.lea } })).toBe(0);
	});

	it('un signalement par personne ; les suivants priorisent sans sanctionner ni réalerter', async () => {
		expect(
			await incidents.reportJam(jamId, ids.lea, { ...report, reason: 'VENUE_CLOSED' }, NOW)
		).toBe(false);
		await incidents.reportJam(jamId, ids.nouveau, report, NOW);
		const incident = await db.jamIncident.findUniqueOrThrow({
			where: { opportunityId: jamId },
			include: { reports: true }
		});
		expect(incident.reports).toHaveLength(2);
		expect(incident.reports.find((r) => r.reporterId === ids.lea)?.reason).toBe('VENUE_CLOSED');
		expect(await notified('malik', 'JAM_ALERT')).toHaveLength(1);
		expect(await db.jamOrganizingRestriction.count({ where: { actorId: ids.hote } })).toBe(0);
		const [item] = (await incidents.jamIncidentQueue(NOW)).filter((i) => i.jam.id === jamId);
		expect(item.priority).toBe(true);
		expect(item.reports.map((r) => r.recentAccount).sort()).toEqual([false, true]);
	});

	it('l’organisation répond ; personne d’autre ; la page ne lui dit pas qui', async () => {
		await expect(
			incidents.respondToIncident(jamId, ids.passant, 'Pas moi', NOW)
		).rejects.toMatchObject({ status: 403 });
		await incidents.respondToIncident(jamId, ids.hote, 'Le bar a fermé sans prévenir.', NOW);
		const state = await incidents.reportState(jamId, ids.hote, NOW);
		expect(state?.incident).toEqual({ status: 'OPEN', response: 'Le bar a fermé sans prévenir.' });
		expect(JSON.stringify(state)).not.toContain(PREFIX + 'lea');
	});

	it('confirmé avec interdiction : l’organisation seule est restreinte, le reste permis', async () => {
		const [item] = (await incidents.jamIncidentQueue(NOW)).filter((i) => i.jam.id === jamId);
		await incidents.decideIncident(
			item.id,
			{ decision: 'confirm', sanction: 'restrict7', note: 'Jam fictive confirmée' },
			{ userId: moderatorUserId },
			NOW
		);
		expect(await isJamOrganizer(ids.hote, NOW)).toBe(false);
		await expect(
			createJam(
				ids.hote,
				{
					venueId,
					day: '2026-11-20',
					start: '20:00',
					end: '23:00',
					title: 'Nouvelle jam',
					description: '',
					spots: []
				},
				NOW
			)
		).rejects.toThrow(/retiré la possibilité d’organiser/);
		// La préférence n'est pas écrasée, et venir à une autre jam reste permis.
		expect(
			(await db.person.findUniqueOrThrow({ where: { actorId: ids.hote } })).organizesJams
		).toBe(true);
		await db.opportunity.update({
			where: { id: otherJamId },
			data: { issuerActorId: ids.passant }
		});
		await comeToJam(otherJamId, ids.hote, null, NOW);
		expect(
			await db.jamAttendance.count({ where: { opportunityId: otherJamId, actorId: ids.hote } })
		).toBe(1);
		for (const who of ['malik', 'lea', 'nouveau']) {
			expect(await notified(who, 'JAM_INCIDENT_CLOSED')).toHaveLength(1);
		}
		expect(
			await db.adminAuditLog.count({
				where: { actorId: moderatorUserId, action: { startsWith: 'moderation.jam_' } }
			})
		).toBe(2);
		// Déjà décidé : pas de seconde décision.
		await expect(
			incidents.decideIncident(
				item.id,
				{ decision: 'dismiss', sanction: 'none', note: 'Re' },
				{ userId: moderatorUserId },
				NOW
			)
		).rejects.toMatchObject({ status: 404 });
	});

	it('levée tracée : l’organisation redevient possible ; l’interdiction expire seule', async () => {
		const [r] = await incidents.activeRestrictions(NOW);
		await incidents.liftRestriction(r.id, 'Recours accepté', { userId: moderatorUserId }, NOW);
		expect(await isJamOrganizer(ids.hote, NOW)).toBe(true);
		const expired = await db.jamOrganizingRestriction.create({
			data: {
				actorId: ids.hote,
				reason: 'Ancienne',
				until: new Date(NOW.getTime() - HOUR),
				createdByUserId: moderatorUserId
			}
		});
		expect(await isJamOrganizer(ids.hote, NOW)).toBe(true);
		await db.jamOrganizingRestriction.delete({ where: { id: expired.id } });
	});

	it('conservation : un dossier décidé depuis plus de 12 mois est effacé', async () => {
		const later = new Date(NOW.getTime() + 366 * 86_400_000);
		expect(await incidents.purgeOldIncidents(later)).toBeGreaterThanOrEqual(1);
		expect(await db.jamIncident.count({ where: { opportunityId: jamId } })).toBe(0);
	});
});
