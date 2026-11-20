/**
 * Annuler une jam (#91a, RV-01) sur la base de `.env`, schéma `e2e` :
 * l'hôte seul annule, jusqu'à la fin ; inscrit·es et invité·es sont
 * prévenu·es sans expéditeur (même une personne bloquée par l'hôte) ; la
 * trace reste ; la page d'annulation n'est visible que des participant·es ;
 * la clôture d'annonce ne contourne plus l'annulation. Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/jam/cancel
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

const { cancelJam, cancelledJamFor } = await import('./cancel');
const { closeOpportunity } = await import('../opportunities/service');

const PREFIX = 'cancel-test-';
const YEAR = 365.25 * 86_400_000;
const HOUR = 3_600_000;
const NOW = new Date('2026-11-14T17:00:00Z');

describe.skipIf(!enabled)('annuler une jam (schéma e2e)', { timeout: 60_000 }, () => {
	const ids: Record<string, string> = {};
	let venueId = '';
	let guitarId = '';

	async function cleanup() {
		await db.venue.deleteMany({ where: { name: { startsWith: 'Cancel Test' } } });
		await db.actor.deleteMany({ where: { handle: { startsWith: PREFIX } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
	}

	async function person(name: string) {
		const user = await db.user.create({
			data: { email: `${PREFIX}${name}@example.test`, referralCode: `${PREFIX}${name}` }
		});
		ids[name] = (
			await db.actor.create({
				data: {
					kind: 'PERSON',
					handle: PREFIX + name,
					displayName: `Cancel ${name}`,
					person: {
						create: {
							userId: user.id,
							termsAcceptedAt: NOW,
							onboardedAt: NOW,
							birthDate: new Date(NOW.getTime() - 30 * YEAR)
						}
					}
				}
			})
		).id;
	}

	async function jam(startsIn: number, endsIn: number) {
		return (
			await db.opportunity.create({
				data: {
					kind: 'JAM',
					status: 'OPEN',
					title: 'Cancel jam',
					description: 'Test',
					issuerActorId: ids.hote,
					startsAt: new Date(NOW.getTime() + startsIn),
					endsAt: new Date(NOW.getTime() + endsIn),
					expiresAt: new Date(NOW.getTime() + endsIn),
					venueId,
					jamSpots: { create: [{ instrumentId: guitarId, count: 2 }] },
					attendances: { create: [{ actorId: ids.vient }, { actorId: ids.bloque }] },
					jamInvites: { create: [{ actorId: ids.invite, instrumentId: guitarId }] }
				},
				select: { id: true }
			})
		).id;
	}

	const cancellations = (actorId: string) =>
		db.notification.findMany({
			where: { recipientActorId: actorId, type: 'JAM_CANCELLED' },
			select: { fromActorId: true, href: true }
		});

	beforeAll(async () => {
		await cleanup();
		for (const name of ['hote', 'vient', 'invite', 'bloque', 'passant']) await person(name);
		guitarId = (await db.instrument.findFirstOrThrow({ where: { active: true } })).id;
		venueId = (
			await db.venue.create({
				data: {
					name: 'Cancel Test Bar',
					nameKey: 'cancel test bar',
					kind: 'BAR',
					communeCode: '31555',
					communeName: 'Toulouse',
					departmentCode: '31',
					lat: 43.6,
					lng: 1.43,
					createdById: ids.hote,
					validatedAt: NOW
				}
			})
		).id;
		await db.block.create({ data: { blockerActorId: ids.hote, blockedActorId: ids.bloque } });
	});

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('seul·e l’hôte annule ; même réponse pour une jam inconnue', async () => {
		const id = await jam(24 * HOUR, 27 * HOUR);
		for (const [jamId, who] of [
			[id, 'vient'],
			[id, 'passant'],
			['inconnue0000000000000', 'passant']
		]) {
			await expect(cancelJam(jamId, ids[who], '', NOW)).rejects.toMatchObject({ status: 403 });
		}
	});

	it('l’hôte annule : trace gardée, tout le monde prévenu sans expéditeur', async () => {
		const id = await jam(24 * HOUR, 27 * HOUR);
		await cancelJam(id, ids.hote, '  Le bar   ferme ce soir  ', NOW);
		const row = await db.opportunity.findUniqueOrThrow({ where: { id } });
		expect(row).toMatchObject({
			status: 'CLOSED',
			cancelReason: 'Le bar ferme ce soir',
			cancelledById: ids.hote
		});
		expect(row.cancelledAt).not.toBeNull();
		// Rien n'est effacé.
		expect(await db.jamAttendance.count({ where: { opportunityId: id } })).toBe(2);
		expect(await db.jamInvite.count({ where: { opportunityId: id } })).toBe(1);
		// Même la personne bloquée par l'hôte est prévenue, sans voir qui annule.
		for (const who of ['vient', 'invite', 'bloque']) {
			expect(await cancellations(ids[who])).toContainEqual({
				fromActorId: null,
				href: `/jams/${id}`
			});
		}
		expect(await cancellations(ids.hote)).toEqual([]);
		// Idempotent : pas de seconde annulation, pas de seconde notification.
		await expect(cancelJam(id, ids.hote, '', NOW)).rejects.toThrow(/déjà annulée/);
		expect(
			await db.notification.count({ where: { type: 'JAM_CANCELLED', href: `/jams/${id}` } })
		).toBe(3);
	});

	it('la page d’annulation est réservée aux participant·es et à l’hôte', async () => {
		const id = (
			await db.opportunity.findFirstOrThrow({
				where: { issuerActorId: ids.hote, cancelledAt: { not: null } },
				select: { id: true }
			})
		).id;
		expect((await cancelledJamFor(id, ids.vient))?.reason).toBe('Le bar ferme ce soir');
		expect(await cancelledJamFor(id, ids.hote)).not.toBeNull();
		expect(await cancelledJamFor(id, ids.passant)).toBeNull();
	});

	it('une jam terminée ne s’annule plus ; une jam en cours, si', async () => {
		const ended = await jam(-4 * HOUR, -HOUR);
		await expect(cancelJam(ended, ids.hote, '', NOW)).rejects.toThrow(/terminée/);
		const live = await jam(-HOUR, 2 * HOUR);
		await cancelJam(live, ids.hote, '', NOW);
		expect(
			(await db.opportunity.findUniqueOrThrow({ where: { id: live } })).cancelReason
		).toBeNull();
	});

	it('la clôture d’annonce ne contourne plus l’annulation', async () => {
		const id = await jam(48 * HOUR, 51 * HOUR);
		await expect(closeOpportunity(ids.hote, id)).rejects.toThrow(/Annule la jam depuis sa fiche/);
		expect((await db.opportunity.findUniqueOrThrow({ where: { id } })).status).toBe('OPEN');
	});
});
