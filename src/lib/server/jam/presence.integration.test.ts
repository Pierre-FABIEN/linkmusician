/**
 * Présence personnelle et confidentialité des activités (RV-01, #92, D81),
 * sur la base de `.env`, schéma `e2e`. Scénario adversarial : un « pisteur »
 * s'inscrit partout et tente de savoir où se trouve Léa.
 *
 * - « J'y étais » est une déclaration libre, que seule la personne pose ou
 *   retire ; « Je ne viens plus » ne l'efface pas ; aucune API de retrait.
 * - Les activités sont privées par défaut : ni liste, ni appréciation, ni
 *   carnet, ni contacts, ni formation ne révèlent la présence d'autrui, même
 *   à quelqu'un qui l'a ajoutée à son carnet ou lui parle déjà.
 *
 * Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/jam/presence
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createPrismaClient } from '../../../../prisma/client.js';
import dotenv from 'dotenv';
import { pairKey } from '#lib/messaging/rules';

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

const afterJam = await import('./afterJam');
const { whoWasThere, iWasThere, notThere, endorse, crossedJams } = afterJam;
const { notComingToJam, getJam, comeToJam } = await import('./publicJams');
const { jamLog } = await import('./log');
const { keepInTouch, playedTogether, myNetwork } = await import('../network/service');

const PREFIX = 'presence-test-';
const YEAR = 365.25 * 86_400_000;
const HOUR = 3_600_000;
// Samedi 14 novembre 2026, 18 h à Paris : la jam de 14 h à 17 h est finie avant 22 h.
const NOW = new Date('2026-11-14T17:00:00Z');

describe.skipIf(!enabled)(
	'présence personnelle et pistage (schéma e2e)',
	{ timeout: 90_000 },
	() => {
		const ids: Record<string, string> = {};
		let jamId = '';
		let nextJamId = '';

		async function cleanup() {
			await db.venue.deleteMany({ where: { name: { startsWith: 'Presence Test' } } });
			await db.actor.deleteMany({ where: { handle: { startsWith: PREFIX } } });
			await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
		}

		async function person(name: string, age = 30) {
			const user = await db.user.create({
				data: { email: `${PREFIX}${name}@example.test`, referralCode: `${PREFIX}${name}` }
			});
			ids[name] = (
				await db.actor.create({
					data: {
						kind: 'PERSON',
						handle: PREFIX + name,
						displayName: `Presence ${name}`,
						trustLevel: 1,
						person: {
							create: {
								userId: user.id,
								termsAcceptedAt: NOW,
								onboardedAt: NOW,
								birthDate: new Date(NOW.getTime() - age * YEAR)
							}
						}
					}
				})
			).id;
		}

		const others = (data: Awaited<ReturnType<typeof whoWasThere>>, me: string) =>
			data!.present.filter((p) => p.handle !== PREFIX + me).map((p) => p.handle);

		beforeAll(async () => {
			await cleanup();
			for (const name of ['hote', 'lea', 'malik', 'pisteur']) await person(name);
			await person('mineure', 16);
			const venue = await db.venue.create({
				data: {
					name: 'Presence Test Bar',
					nameKey: 'presence test bar',
					kind: 'BAR',
					communeCode: '31555',
					communeName: 'Toulouse',
					departmentCode: '31',
					lat: 43.6,
					lng: 1.43,
					createdById: ids.hote,
					validatedAt: NOW
				}
			});
			const endsAt = new Date(NOW.getTime() - HOUR);
			jamId = (
				await db.opportunity.create({
					data: {
						kind: 'JAM',
						status: 'OPEN',
						title: 'Presence jam',
						description: 'Test',
						issuerActorId: ids.hote,
						startsAt: new Date(NOW.getTime() - 4 * HOUR),
						endsAt,
						expiresAt: endsAt,
						venueId: venue.id
					}
				})
			).id;
			await db.jamAttendance.createMany({
				data: [
					{ opportunityId: jamId, actorId: ids.lea, attendedAt: NOW },
					{ opportunityId: jamId, actorId: ids.mineure, attendedAt: NOW },
					// Malik a dit « Je viens », sans déclarer sa présence.
					{ opportunityId: jamId, actorId: ids.malik }
				]
			});
			// Le pisteur parle déjà à Léa (conversation acceptée) et l'a gardée dans son
			// réseau : aucune de ces relations n'ouvre ses activités.
			await db.conversation.create({
				data: {
					pairKey: pairKey(ids.pisteur, ids.lea),
					initiatorId: ids.pisteur,
					participants: {
						create: [
							{ actorId: ids.pisteur, state: 'ACCEPTED' },
							{ actorId: ids.lea, state: 'ACCEPTED' }
						]
					}
				}
			});
			await db.savedContact.create({ data: { ownerId: ids.pisteur, contactId: ids.lea } });
			// Une jam à venir : Léa est dans la formation.
			const guitar = await db.instrument.findFirstOrThrow({ where: { active: true } });
			const nextStart = new Date(NOW.getTime() + 24 * HOUR);
			nextJamId = (
				await db.opportunity.create({
					data: {
						kind: 'JAM',
						status: 'OPEN',
						title: 'Presence next',
						description: 'Test',
						issuerActorId: ids.hote,
						startsAt: nextStart,
						endsAt: new Date(nextStart.getTime() + 3 * HOUR),
						expiresAt: new Date(nextStart.getTime() + 3 * HOUR),
						venueId: venue.id,
						jamSpots: { create: [{ instrumentId: guitar.id, count: 2 }] },
						jamInvites: {
							create: [{ actorId: ids.lea, instrumentId: guitar.id, status: 'ACCEPTED' }]
						}
					}
				})
			).id;
		});

		afterAll(async () => {
			await cleanup();
			await db.$disconnect();
		});

		it('hors participant·es, « Qui était là ? » est fermé', async () => {
			const data = await whoWasThere(jamId, ids.pisteur, NOW);
			expect(data?.participant).toBe(false);
			expect(data?.present).toEqual([]);
		});

		it('« J’y étais » partout ne révèle personne, ni ne rapporte d’XP', async () => {
			await iWasThere(jamId, ids.pisteur, NOW);
			const data = await whoWasThere(jamId, ids.pisteur, NOW);
			expect(data?.participant).toBe(true);
			expect(others(data, 'pisteur')).toEqual([]);
			expect(await db.xpTransaction.count({ where: { actorId: ids.pisteur } })).toBe(0);
			// Pas plus l'hôte ni une participante : chacun·e ne voit que soi.
			expect(others(await whoWasThere(jamId, ids.hote, NOW), 'hote')).toEqual([]);
			expect(others(await whoWasThere(jamId, ids.lea, NOW), 'lea')).toEqual([]);
		});

		it('l’appréciation ne sert pas de test de présence : même réponse partout', async () => {
			for (const to of ['lea', 'malik', 'mineure']) {
				await expect(
					endorse(jamId, ids.pisteur, { to: `${PREFIX}${to}`, quality: 'GROOVE' }, NOW)
				).rejects.toMatchObject({ status: 404, message: 'Personne inconnue.' });
			}
		});

		it('carnet, croisé·es, réseau et contacts ne révèlent rien', async () => {
			const log = await jamLog(ids.pisteur, NOW);
			expect(log.entries.find((e) => e.jamId === jamId)?.others).toEqual([]);
			const crossed = (await crossedJams(ids.pisteur, NOW)).find((j) => j.id === jamId);
			expect(crossed).toMatchObject({ attended: true, others: 0, given: 0 });
			expect((await myNetwork(ids.pisteur, NOW))[0]).toMatchObject({ jamsTogether: 0 });
			// Une présence commune ne prouve plus qu'on a joué ensemble.
			expect(await playedTogether(ids.pisteur, ids.lea)).toBe(false);
			// Garder le contact ne dépend plus d'une présence (D82) : il ne la teste donc pas.
			await expect(keepInTouch(ids.pisteur, `${PREFIX}malik`, NOW)).resolves.toMatchObject({
				displayName: 'Presence malik'
			});
			expect(
				(await myNetwork(ids.pisteur, NOW)).find((n) => n.handle === `${PREFIX}malik`)
			).toMatchObject({ jamsTogether: 0 });
		});

		it('la formation et les compteurs d’une jam à venir ne nomment ni ne comptent personne', async () => {
			const stranger = await getJam(nextJamId, ids.pisteur, NOW);
			expect(stranger?.lineup).toEqual([]);
			expect(stranger?.lineupHidden).toBe(1);
			expect(stranger?.comingCount).toBeNull();
			expect(stranger?.coming).toBe('Quelques musicien·nes viennent');
			// Une personne de plus ne change pas la tranche : pas de déduction par différence.
			await comeToJam(nextJamId, ids.malik, null, NOW);
			expect((await getJam(nextJamId, ids.pisteur, NOW))?.coming).toBe(
				'Quelques musicien·nes viennent'
			);
			// Léa se voit dans la formation ; l'hôte, gestion, voit tout et le nombre exact.
			expect((await getJam(nextJamId, ids.lea, NOW))?.lineup.map((m) => m.handle)).toEqual([
				`${PREFIX}lea`
			]);
			const host = await getJam(nextJamId, ids.hote, NOW);
			expect(host?.lineupHidden).toBe(0);
			expect(host?.comingCount).toBe(2);
		});

		it('« Je ne viens plus » n’efface pas un « J’y étais » déclaré', async () => {
			await expect(notComingToJam(jamId, ids.lea)).rejects.toMatchObject({ status: 409 });
			const lea = await db.jamAttendance.findUniqueOrThrow({
				where: { opportunityId_actorId: { opportunityId: jamId, actorId: ids.lea } }
			});
			expect(lea.attendedAt).not.toBeNull();
			// Une simple intention, elle, se retire.
			await notComingToJam(jamId, ids.malik);
			expect(
				await db.jamAttendance.count({ where: { opportunityId: jamId, actorId: ids.malik } })
			).toBe(0);
		});

		it('seule la personne retire sa présence ; l’hôte n’a aucune API pour le faire', async () => {
			expect(afterJam).not.toHaveProperty('removeFromJam');
			await notThere(jamId, ids.pisteur, NOW);
			const mine = await db.jamAttendance.findUniqueOrThrow({
				where: { opportunityId_actorId: { opportunityId: jamId, actorId: ids.pisteur } }
			});
			expect(mine.attendedAt).toBeNull();
		});
	}
);
