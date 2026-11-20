/**
 * Confidentialité des activités (D81, conception 23) sur la base de `.env`,
 * schéma `e2e`. Scénarios adversariaux : un pisteur cherche à savoir où va
 * Léa ; il s'inscrit partout, la garde dans son carnet, lui parle.
 *
 * Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/privacy
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

const privacy = await import('./activities');
const { whoWasThere, endorse } = await import('../jam/afterJam');
const { getJam } = await import('../jam/publicJams');
const { jamLog } = await import('../jam/log');
const { keepInTouch } = await import('../network/service');
const { exportPersonData } = await import('#lib/prisma/actors/person');

const PREFIX = 'privacy-test-';
const YEAR = 365.25 * 86_400_000;
const HOUR = 3_600_000;
// Samedi 14 novembre 2026, 18 h à Paris.
const NOW = new Date('2026-11-14T17:00:00Z');

describe.skipIf(!enabled)('confidentialité des activités (schéma e2e)', { timeout: 90_000 }, () => {
	const ids: Record<string, string> = {};
	const users: Record<string, string> = {};
	let pastJam = '';
	let liveJam = '';
	let nextJam = '';

	async function cleanup() {
		await db.venue.deleteMany({ where: { name: { startsWith: 'Privacy Test' } } });
		await db.actor.deleteMany({ where: { handle: { startsWith: PREFIX } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
	}

	async function person(name: string, age = 30) {
		const user = await db.user.create({
			data: { email: `${PREFIX}${name}@example.test`, referralCode: `${PREFIX}${name}` }
		});
		users[name] = user.id;
		ids[name] = (
			await db.actor.create({
				data: {
					kind: 'PERSON',
					handle: PREFIX + name,
					displayName: `Privacy ${name}`,
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

	const handle = (name: string) => PREFIX + name;
	const others = async (jamId: string, viewer: string) =>
		((await whoWasThere(jamId, ids[viewer], NOW))?.present ?? [])
			.filter((p) => !p.isMe)
			.map((p) => p.handle)
			.sort();
	const sees = (viewer: string, owner: string, scope: 'past' | 'future' = 'past', jamId?: string) =>
		privacy.canViewActivity(ids[viewer], ids[owner], { scope, jamId, now: NOW });

	beforeAll(async () => {
		await cleanup();
		for (const name of ['hote', 'lea', 'ami', 'pisteur', 'bloque', 'zoe']) await person(name);
		await person('mineure', 16);
		const venue = await db.venue.create({
			data: {
				name: 'Privacy Test Bar',
				nameKey: 'privacy test bar',
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
		const jam = (title: string, startsAt: Date, endsAt: Date) =>
			db.opportunity.create({
				data: {
					kind: 'JAM',
					status: 'OPEN',
					title,
					description: 'Test',
					issuerActorId: ids.hote,
					startsAt,
					endsAt,
					expiresAt: endsAt,
					venueId: venue.id
				},
				select: { id: true }
			});
		pastJam = (
			await jam('Privacy past', new Date(NOW.getTime() - 4 * HOUR), new Date(NOW.getTime() - HOUR))
		).id;
		liveJam = (
			await jam('Privacy live', new Date(NOW.getTime() - HOUR), new Date(NOW.getTime() + 2 * HOUR))
		).id;
		const guitar = await db.instrument.findFirstOrThrow({ where: { active: true } });
		nextJam = (
			await db.opportunity.create({
				data: {
					kind: 'JAM',
					status: 'OPEN',
					title: 'Privacy next',
					description: 'Test',
					issuerActorId: ids.hote,
					startsAt: new Date(NOW.getTime() + 24 * HOUR),
					endsAt: new Date(NOW.getTime() + 27 * HOUR),
					expiresAt: new Date(NOW.getTime() + 27 * HOUR),
					venueId: venue.id,
					jamSpots: { create: [{ instrumentId: guitar.id, count: 2 }] },
					jamInvites: {
						create: [{ actorId: ids.lea, instrumentId: guitar.id, status: 'ACCEPTED' }]
					}
				},
				select: { id: true }
			})
		).id;
		const present = ['lea', 'ami', 'pisteur', 'bloque', 'mineure', 'zoe'];
		await db.jamAttendance.createMany({
			data: [
				...present.map((n) => ({ opportunityId: pastJam, actorId: ids[n], attendedAt: NOW })),
				...present.map((n) => ({ opportunityId: liveJam, actorId: ids[n], attendedAt: NOW }))
			]
		});
		// Le pisteur garde Léa dans son carnet et lui parle : rien ne s'ouvre.
		await db.musicalTie.create({ data: { ownerId: ids.pisteur, contactId: ids.lea } });
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
		await db.block.create({ data: { blockerActorId: ids.lea, blockedActorId: ids.bloque } });
	});

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('privé par défaut : ni inconnu, ni carnet, ni conversation, ni organisateur', async () => {
		expect(await sees('pisteur', 'lea')).toBe(false);
		expect(await sees('hote', 'lea')).toBe(false);
		expect(await others(pastJam, 'pisteur')).toEqual([]);
		expect(await others(pastJam, 'hote')).toEqual([]);
		// L'appréciation ne teste pas la présence : même réponse que pour un inconnu.
		await expect(
			endorse(pastJam, ids.pisteur, { to: handle('lea'), quality: 'GROOVE' }, NOW)
		).rejects.toMatchObject({ status: 404, message: 'Personne inconnue.' });
		await expect(keepInTouch(ids.pisteur, handle('lea'), NOW)).rejects.toThrow(/vraiment joué/);
	});

	it('une autorisation seule ne suffit pas : il faut aussi choisir ce partage', async () => {
		await privacy.grantActivityAccess(ids.lea, handle('ami'), NOW);
		expect(await sees('ami', 'lea')).toBe(false);
		await privacy.setPrivacyModes(ids.lea, {
			past: 'SELECTED',
			future: 'PRIVATE',
			publicConsent: false
		});
		expect(await sees('ami', 'lea')).toBe(true);
		expect(await sees('pisteur', 'lea')).toBe(false);
		expect(await others(pastJam, 'ami')).toEqual([handle('lea')]);
		// L'ami peut l'apprécier, et la garder dans son carnet.
		await endorse(pastJam, ids.ami, { to: handle('lea'), quality: 'GROOVE' }, NOW);
		await keepInTouch(ids.ami, handle('lea'), NOW);
		const log = await jamLog(ids.ami, NOW);
		expect(log.entries.find((e) => e.jamId === pastJam)?.others.map((o) => o.handle)).toEqual([
			handle('lea')
		]);
	});

	it('partager le passé ne partage jamais l’avenir', async () => {
		expect(await sees('ami', 'lea', 'future')).toBe(false);
		expect((await getJam(nextJam, ids.ami, NOW))?.lineup).toEqual([]);
		await privacy.setPrivacyModes(ids.lea, {
			past: 'SELECTED',
			future: 'SELECTED',
			publicConsent: false
		});
		expect((await getJam(nextJam, ids.ami, NOW))?.lineup.map((m) => m.handle)).toEqual([
			handle('lea')
		]);
		expect((await getJam(nextJam, ids.pisteur, NOW))?.lineup).toEqual([]);
	});

	it('le public exige un consentement ; l’exclusion l’emporte, sans prévenir', async () => {
		await expect(
			privacy.setPrivacyModes(ids.lea, { past: 'PUBLIC', future: 'PRIVATE', publicConsent: true })
		).resolves.toBeUndefined();
		expect(await sees('pisteur', 'lea')).toBe(true);
		const notificationsBefore = await db.notification.count({
			where: { recipientActorId: ids.pisteur }
		});
		await privacy.excludeFromActivities(ids.lea, handle('pisteur'), NOW);
		expect(await sees('pisteur', 'lea')).toBe(false);
		expect(await others(pastJam, 'pisteur')).toEqual([]);
		expect(await db.notification.count({ where: { recipientActorId: ids.pisteur } })).toBe(
			notificationsBefore
		);
		// L'exclusion ne coupe pas la conversation existante.
		expect(await db.conversation.count({ where: { pairKey: pairKey(ids.pisteur, ids.lea) } })).toBe(
			1
		);
	});

	it('le blocage l’emporte, dans les deux sens', async () => {
		expect(await sees('bloque', 'lea')).toBe(false);
		expect(await sees('lea', 'bloque')).toBe(false);
	});

	it('la révocation a un effet immédiat', async () => {
		expect(await sees('ami', 'lea')).toBe(true);
		await privacy.setPrivacyModes(ids.lea, {
			past: 'SELECTED',
			future: 'PRIVATE',
			publicConsent: false
		});
		await privacy.revokeActivityAccess(ids.lea, ids.ami);
		expect(await sees('ami', 'lea')).toBe(false);
		expect(await others(pastJam, 'ami')).toEqual([]);
	});

	it('un·e mineur·e n’est jamais public·que', async () => {
		await expect(
			privacy.setPrivacyModes(ids.mineure, {
				past: 'PUBLIC',
				future: 'PUBLIC',
				publicConsent: true
			})
		).rejects.toMatchObject({ status: 403 });
		// Même écrit directement en base, PUBLIC vaut SELECTED pour un·e mineur·e.
		await db.activityVisibilityPreference.create({
			data: { actorId: ids.mineure, past: 'PUBLIC', future: 'PUBLIC' }
		});
		expect(await sees('pisteur', 'mineure')).toBe(false);
	});

	it('découverte sur place : réciproque, révocable, expirante, refusée aux mineur·es', async () => {
		const live = {
			id: liveJam,
			startsAt: new Date(NOW.getTime() - HOUR),
			endsAt: new Date(NOW.getTime() + 2 * HOUR)
		};
		// Seul·e, on ne voit personne : la visibilité est réciproque.
		await privacy.startDiscovery(live, ids.zoe, NOW);
		expect(await others(liveJam, 'zoe')).toEqual([]);
		expect(await others(liveJam, 'ami')).toEqual([]);
		await privacy.startDiscovery(live, ids.ami, NOW);
		expect(await others(liveJam, 'zoe')).toEqual([handle('ami')]);
		expect(await others(liveJam, 'ami')).toEqual([handle('zoe')]);
		// Pas sur une autre jam, ni à un tiers qui ne s'est pas rendu visible.
		expect(await sees('zoe', 'ami', 'past', pastJam)).toBe(false);
		expect(await others(liveJam, 'pisteur')).toEqual([]);
		// Une exclusion vaut aussi sur place.
		await privacy.excludeFromActivities(ids.ami, handle('zoe'), NOW);
		expect(await others(liveJam, 'zoe')).toEqual([]);
		await privacy.includeAgain(ids.ami, ids.zoe);
		// Se masquer : effet immédiat.
		await privacy.stopDiscovery(liveJam, ids.ami);
		expect(await others(liveJam, 'zoe')).toEqual([]);
		// Mineur·e : refusé.
		await expect(privacy.startDiscovery(live, ids.mineure, NOW)).rejects.toMatchObject({
			status: 403
		});
		// Hors de la jam : refusé ; et une session échue ne montre plus rien, puis s'efface.
		await expect(
			privacy.startDiscovery(live, ids.ami, new Date(live.endsAt.getTime() + 1))
		).rejects.toThrow(/pendant la jam/);
		await privacy.startDiscovery(live, ids.ami, NOW);
		const later = new Date(live.endsAt.getTime() + 1);
		expect(
			await privacy.canViewActivity(ids.zoe, ids.ami, { scope: 'past', jamId: liveJam, now: later })
		).toBe(false);
		expect(await privacy.purgeExpiredDiscovery(later)).toBeGreaterThanOrEqual(2);
		expect(await db.jamDiscoverySession.count({ where: { opportunityId: liveJam } })).toBe(0);
	});

	it('la découverte sur place se limite : on ne s’active pas partout', async () => {
		const live = {
			id: liveJam,
			startsAt: new Date(NOW.getTime() - HOUR),
			endsAt: new Date(NOW.getTime() + 2 * HOUR)
		};
		const attempts = [];
		for (let i = 0; i < 4; i++) {
			await privacy.stopDiscovery(liveJam, ids.pisteur);
			attempts.push(
				await privacy.startDiscovery(live, ids.pisteur, NOW).then(
					() => 'ok',
					(err) => err.status
				)
			);
		}
		expect(attempts).toEqual(['ok', 'ok', 'ok', 429]);
	});

	it('export RGPD et anonymisation couvrent les nouvelles données', async () => {
		await privacy.grantActivityAccess(ids.lea, handle('ami'), NOW);
		const data = (await exportPersonData(users.lea)) as unknown as {
			confidentialite_activites: { personnes_autorisees: unknown[]; personnes_masquees: unknown[] };
		};
		expect(data.confidentialite_activites.personnes_autorisees).toHaveLength(1);
		expect(data.confidentialite_activites.personnes_masquees).toHaveLength(1);
	});
});
