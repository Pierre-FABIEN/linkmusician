/**
 * Animateur·rices d'un lieu (P5-04b) sur la base de `.env`, schéma `e2e` :
 * suggestions (prêt·es à organiser des jams, à moins de 30 km, triées par
 * appréciations, sans mineur·e, ni personne bloquée, ni profil lointain),
 * invitation notifiée, acceptation, lead par défaut copié sur les jams à
 * venir et les suivantes, départ, export RGPD. Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/jam/venueHosts
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createPrismaClient } from '../../../../prisma/client.js';
import dotenv from 'dotenv';
import { setActorLocation } from '../geo/queries';

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

const series = await import('./series');
const hosts = await import('./venueHosts');
const { exportPersonData } = await import('#lib/prisma/actors/person');

const PREFIX = 'hosts-test-';
const YEAR = 365.25 * 86_400_000;
const HOUR = 3_600_000;
// Mercredi 11 novembre 2026, midi à Paris : le premier jeudi est le 12.
const NOW = new Date('2026-11-11T11:00:00Z');

const commune = (nom: string, code: string, lat: number, lng: number) => ({
	code,
	nom,
	codeDepartement: code.slice(0, 2),
	codesPostaux: [],
	centre: { lat, lng }
});
const TOULOUSE = commune('Toulouse', '31555', 43.6045, 1.444);
const BLAGNAC = commune('Blagnac', '31069', 43.6364, 1.3906);
const PARIS = commune('Paris', '75056', 48.8566, 2.3522);

describe.skipIf(!enabled)('animateur·rices d’un lieu (schéma e2e)', { timeout: 120_000 }, () => {
	const ids: Record<string, string> = {};
	const users: Record<string, string> = {};
	let venueId = '';
	let orgId = '';
	let seriesId = '';

	async function cleanup() {
		await db.venue.deleteMany({ where: { name: { startsWith: 'Hosts Test' } } });
		await db.actor.deleteMany({ where: { handle: { startsWith: PREFIX } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
	}

	beforeAll(async () => {
		await cleanup();
		// [nom, âge, prêt·e à organiser des jams, commune]
		for (const [name, age, organizes, where] of [
			['patron', 45, false, TOULOUSE],
			['lea', 30, true, TOULOUSE],
			['malik', 28, true, BLAGNAC],
			['zoe', 33, true, TOULOUSE],
			['loin', 40, true, PARIS],
			['ado', 16, true, TOULOUSE],
			['public', 35, false, TOULOUSE]
		] as const) {
			const user = await db.user.create({
				data: { email: `${PREFIX}${name}@example.test`, referralCode: `${PREFIX}${name}` }
			});
			users[name] = user.id;
			ids[name] = (
				await db.actor.create({
					data: {
						kind: 'PERSON',
						handle: PREFIX + name,
						displayName: `Hosts Test ${name}`,
						trustLevel: 2,
						person: {
							create: {
								userId: user.id,
								termsAcceptedAt: new Date(),
								onboardedAt: new Date(),
								organizesJams: organizes,
								birthDate: new Date(Date.now() - age * YEAR)
							}
						}
					}
				})
			).id;
			await setActorLocation(ids[name], where, { db, schema: 'e2e' });
		}
		orgId = (
			await db.actor.create({
				data: {
					kind: 'ORGANIZATION',
					handle: `${PREFIX}comptoir`,
					displayName: 'Hosts Test Le Comptoir',
					organization: {
						create: {
							kind: 'VENUE',
							memberships: {
								create: [{ personId: ids.patron, role: 'OWNER', status: 'ACTIVE' }]
							},
							venueProfile: {
								create: {
									capacity: 60,
									stage: 'Petite scène',
									days: [4],
									ageRule: 'ALL_AGES',
									publishedAt: new Date()
								}
							}
						}
					}
				}
			})
		).id;
		await setActorLocation(orgId, TOULOUSE, { db, schema: 'e2e' });
		venueId = (
			await db.venue.create({
				data: {
					name: 'Hosts Test Le Comptoir',
					nameKey: 'hosts test le comptoir',
					kind: 'BAR',
					communeCode: TOULOUSE.code,
					communeName: TOULOUSE.nom,
					departmentCode: '31',
					lat: TOULOUSE.centre.lat,
					lng: TOULOUSE.centre.lng,
					createdById: ids.patron,
					validatedAt: new Date(),
					claimedByActorId: orgId
				}
			})
		).id;
		({ id: seriesId } = await series.createJamSeries(
			ids.patron,
			venueId,
			{
				weekday: 4,
				start: '20:00',
				end: '23:00',
				title: 'Scène ouverte du jeudi',
				description: '',
				genre: undefined,
				spots: []
			},
			NOW
		));
		// Léa a été appréciée par deux personnes après la première soirée ; Zoé bloque le patron.
		const first = await db.opportunity.findFirstOrThrow({
			where: { seriesId },
			orderBy: { startsAt: 'asc' }
		});
		await db.jamEndorsement.createMany({
			data: [
				{ opportunityId: first.id, fromActorId: ids.malik, toActorId: ids.lea, quality: 'GROOVE' },
				{ opportunityId: first.id, fromActorId: ids.public, toActorId: ids.lea, quality: 'IMPRO' }
			]
		});
		await db.block.create({ data: { blockerActorId: ids.zoe, blockedActorId: ids.patron } });
	});

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('suggère les personnes prêtes à animer autour, les plus appréciées d’abord', async () => {
		const suggestions = await hosts.suggestJamLeads(venueId, ids.patron, NOW);
		// Ni Zoé (blocage), ni le profil parisien, ni l'ado, ni qui n'organise pas de jams.
		expect(suggestions.map((s) => s.handle)).toEqual([`${PREFIX}lea`, `${PREFIX}malik`]);
		expect(suggestions[0]).toMatchObject({
			facts: 'Appréciations de 2 personnes',
			distance: 'moins de 5 km'
		});
		// La distance est toujours une tranche.
		expect(suggestions[1].distance).toMatch(/km$/);
	});

	it('seule la gestion du lieu voit les suggestions et invite', async () => {
		await expect(hosts.suggestJamLeads(venueId, ids.lea, NOW)).rejects.toThrow(/gèrent le lieu/);
		await expect(hosts.inviteVenueHost(venueId, ids.lea, `${PREFIX}malik`, NOW)).rejects.toThrow(
			/gèrent le lieu/
		);
	});

	it('invite une animatrice : une notification, pas de doublon, qui n’organise pas refusé·e', async () => {
		await expect(
			hosts.inviteVenueHost(venueId, ids.patron, `${PREFIX}public`, NOW)
		).rejects.toThrow(/prête à organiser/);
		await expect(hosts.inviteVenueHost(venueId, ids.patron, `${PREFIX}zoe`, NOW)).rejects.toThrow(
			/Impossible/
		);
		expect(await hosts.inviteVenueHost(venueId, ids.patron, `@${PREFIX}lea`, NOW)).toBe(
			'Hosts Test lea'
		);
		await expect(hosts.inviteVenueHost(venueId, ids.patron, `${PREFIX}lea`, NOW)).rejects.toThrow(
			/déjà invité/
		);
		expect(
			await db.notification.count({
				where: { recipientActorId: ids.lea, type: 'VENUE_HOST_INVITE' }
			})
		).toBe(1);
		// Invitée : elle sort des suggestions.
		const suggestions = await hosts.suggestJamLeads(venueId, ids.patron, NOW);
		expect(suggestions.map((s) => s.handle)).toEqual([`${PREFIX}malik`]);
	});

	it('elle accepte, devient lead du prochain jeudi et des suivants', async () => {
		const [invite] = await hosts.myVenueHostInvites(ids.lea);
		expect(invite).toMatchObject({ venueId, venue: 'Hosts Test Le Comptoir' });
		// Personne d'autre ne répond à sa place.
		await expect(hosts.answerVenueHostInvite(invite.hostId, ids.malik, true, NOW)).rejects.toThrow(
			/plus valable/
		);
		// Tant qu'elle n'a pas accepté, Léa ne peut pas être lead par défaut.
		await expect(series.setSeriesLead(ids.patron, seriesId, `${PREFIX}lea`, NOW)).rejects.toThrow(
			/anime au lieu/
		);
		await hosts.answerVenueHostInvite(invite.hostId, ids.lea, true, NOW);
		expect(await hosts.myVenueHostings(ids.lea)).toEqual([
			expect.objectContaining({ venueId, leads: [] })
		]);
		// Une soirée précise a déjà son lead : elle le garde.
		const upcoming = await db.opportunity.findMany({
			where: { seriesId },
			orderBy: { startsAt: 'asc' }
		});
		await db.opportunity.update({
			where: { id: upcoming[2].id },
			data: { leadActorId: ids.malik }
		});
		await series.setSeriesLead(ids.patron, seriesId, `${PREFIX}lea`, NOW);
		const after = await db.opportunity.findMany({
			where: { seriesId },
			orderBy: { startsAt: 'asc' },
			select: { leadActorId: true }
		});
		// (Le job d'un autre fichier de test peut avoir ajouté une soirée : on ne compte pas.)
		expect(after[2].leadActorId).toBe(ids.malik);
		expect(after.filter((_, k) => k !== 2).every((j) => j.leadActorId === ids.lea)).toBe(true);
		// La semaine suivante, la nouvelle soirée est menée par Léa.
		await series.generateSeriesJams(new Date(NOW.getTime() + 7 * 24 * HOUR));
		const latest = await db.opportunity.findFirstOrThrow({
			where: { seriesId },
			orderBy: { startsAt: 'desc' }
		});
		expect(latest.leadActorId).toBe(ids.lea);
		expect((await hosts.myVenueHostings(ids.lea))[0].leads).toEqual(['Scène ouverte du jeudi']);
		// Le lead ne gagne rien à être choisi (D27).
		expect(await db.xpTransaction.count({ where: { actorId: ids.lea } })).toBe(0);
	});

	it('l’export RGPD cite le lieu animé ; en partant, elle n’est plus lead', async () => {
		const data = await exportPersonData(users.lea);
		expect(data?.lieux_ou_j_anime).toEqual([
			expect.objectContaining({ lieu: 'Hosts Test Le Comptoir', statut: 'anime' })
		]);
		const [hosting] = await hosts.myVenueHostings(ids.lea);
		await expect(hosts.removeVenueHost(hosting.hostId, ids.malik, NOW)).rejects.toThrow(
			/gèrent le lieu/
		);
		await hosts.removeVenueHost(hosting.hostId, ids.lea, NOW);
		expect((await db.jamSeries.findUniqueOrThrow({ where: { id: seriesId } })).leadId).toBeNull();
		expect(await db.opportunity.count({ where: { seriesId, leadActorId: ids.lea } })).toBe(0);
		expect(await hosts.myVenueHostings(ids.lea)).toEqual([]);
	});
});
