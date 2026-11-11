/**
 * Concerts vérifiés (P5-06) sur la base de `.env`, schéma `e2e` : un concert
 * se confirme entre une personne qui joue dans le groupe et une personne qui
 * gère le lieu ou l'organisation. Dans un lieu non vérifié, « Premier
 * concert » est corroboré ; seule une organisation vérifiée le fait passer
 * `VERIFIED` ; trois concerts vérifiés dans trois communes en 30 jours
 * vérifient « Première tournée ». `gig.held` crédite qui organise, jamais
 * en collaboration de musicien·ne. Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/collaborations/gigs
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { E2E_COMMUNES } from '#lib/geo/communes-e2e';

const enabled = process.env.PROGRESSION_INTEGRATION === '1';
const url = new URL(
	dotenv.config({ quiet: true }).parsed?.DATABASE_URL ??
		process.env.DATABASE_URL ??
		'postgresql://x/y'
);
url.searchParams.set('schema', 'e2e');
if (enabled) process.env.DATABASE_URL = url.toString();
const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });

vi.mock('#lib/server', () => ({ prisma: db }));

const service = await import('./service');
const bands = await import('../bands/service');
const { setActorLocation } = await import('../geo/queries');

const PREFIX = 'gig-test-';
const YEAR = 365.25 * 86_400_000;
const commune = (nom: string) => E2E_COMMUNES.find((c) => c.nom === nom)!;
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

describe.skipIf(!enabled)('concerts vérifiés (schéma e2e)', { timeout: 120_000 }, () => {
	const ids: Record<string, string> = {};
	const orgs: Record<string, { id: string; handle: string }> = {};
	const conversations: Record<string, string> = {};
	let band = { id: '', handle: '' };

	async function cleanup() {
		const actors = await db.actor.findMany({
			where: {
				OR: [
					{ handle: { startsWith: PREFIX } },
					{ person: { user: { email: { startsWith: PREFIX } } } }
				]
			},
			select: { id: true }
		});
		const list = actors.map((a) => a.id);
		await db.conversation.deleteMany({
			where: { participants: { some: { actorId: { in: list } } } }
		});
		await db.venue.deleteMany({ where: { name: { startsWith: PREFIX } } });
		await db.actor.deleteMany({ where: { id: { in: list } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
		if (list.length > 0) {
			await db.domainEvent.deleteMany({ where: { actorIds: { hasSome: list } } });
		}
	}

	async function person(name: string) {
		const user = await db.user.create({
			data: { email: `${PREFIX}${name}@example.test`, referralCode: `${PREFIX}${name}` }
		});
		return (
			await db.actor.create({
				data: {
					kind: 'PERSON',
					handle: PREFIX + name,
					displayName: name,
					trustLevel: 1,
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

	async function org(
		key: string,
		kind: 'PROMOTER' | 'VENUE',
		managerId: string,
		verified: boolean,
		nom: string
	) {
		const handle = `${PREFIX}${key}`;
		const actor = await db.actor.create({
			data: {
				kind: 'ORGANIZATION',
				handle,
				displayName: handle,
				organization: {
					create: {
						kind,
						verifiedAt: verified ? new Date() : null,
						memberships: {
							create: {
								personId: managerId,
								role: 'OWNER',
								status: 'ACTIVE',
								startedAt: new Date()
							}
						}
					}
				}
			}
		});
		await setActorLocation(actor.id, commune(nom), { db, schema: 'e2e' });
		if (kind === 'VENUE') {
			const venue = await db.venue.create({
				data: {
					name: `${PREFIX}${key}`,
					nameKey: `${PREFIX}${key}`,
					kind: 'BAR',
					communeCode: commune(nom).code,
					communeName: nom,
					departmentCode: '31',
					lat: 43.6,
					lng: 1.44,
					createdById: managerId,
					validatedAt: new Date(),
					claimedByActorId: actor.id
				}
			});
			await db.venueClaim.create({
				data: {
					venueId: venue.id,
					requestedById: managerId,
					code: key.toUpperCase().slice(0, 8),
					status: 'APPROVED',
					orgId: actor.id
				}
			});
		}
		orgs[key] = { id: actor.id, handle };
	}

	async function conversation(a: string, b: string) {
		return (
			await db.conversation.create({
				data: {
					pairKey: [a, b].sort().join(':'),
					initiatorId: a,
					participants: {
						create: [
							{ actorId: a, state: 'ACCEPTED' },
							{ actorId: b, state: 'ACCEPTED' }
						]
					}
				},
				select: { id: true }
			})
		).id;
	}

	/** Léa propose le concert ; l'hôte accepte (c'est passé : accepter vaut confirmer). */
	async function gig(hostKey: string, hostPerson: string, day: string) {
		const { id } = await service.proposeCollaboration(ids.lea, conversations[hostPerson], {
			kind: 'GIG',
			title: `Concert ${hostKey}`,
			happenedOn: day,
			band: band.handle,
			host: orgs[hostKey].handle
		});
		await service.respondToCollaboration(ids[hostPerson], id, true);
		return id;
	}

	const milestone = (key: string) =>
		db.milestone.findUnique({
			where: { bandId_definitionId: { bandId: band.id, definitionId: key } },
			select: { proof: true }
		});

	beforeAll(async () => {
		await cleanup();
		for (const name of ['lea', 'malik', 'orga', 'patron']) ids[name] = await person(name);
		band = await bands.createBand(ids.lea, { name: `${PREFIX}Les Rats`, title: 'guitare' });
		await bands.inviteToBand(band.id, ids.lea, { handle: PREFIX + 'malik', title: null });
		const invite = await db.membership.findFirstOrThrow({
			where: { orgId: band.id, personId: ids.malik, status: 'INVITED' }
		});
		await bands.answerInvite(invite.id, ids.malik, true);
		await org('bar', 'VENUE', ids.patron, false, 'Toulouse');
		await org('asso1', 'PROMOTER', ids.orga, true, 'Toulouse');
		await org('asso2', 'PROMOTER', ids.orga, true, 'Blagnac');
		await org('asso3', 'PROMOTER', ids.orga, true, 'Muret');
		conversations.patron = await conversation(ids.lea, ids.patron);
		conversations.orga = await conversation(ids.lea, ids.orga);
		conversations.malik = await conversation(ids.lea, ids.malik);
	}, 180_000);

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('un concert se confirme entre le groupe et l’hôte, jamais entre membres', async () => {
		await expect(
			service.proposeCollaboration(ids.lea, conversations.malik, {
				kind: 'GIG',
				title: 'Concert entre nous',
				happenedOn: daysAgo(30),
				band: band.handle,
				host: orgs.bar.handle
			})
		).rejects.toThrow(/gérer ce lieu/);
		await expect(
			service.proposeCollaboration(ids.lea, conversations.patron, {
				kind: 'GIG',
				title: 'Sans hôte',
				happenedOn: daysAgo(30),
				band: band.handle
			})
		).rejects.toThrow(/lieu ou l’organisation/);
	});

	it('dans un lieu non vérifié : « Premier concert » corroboré ; l’hôte gagne l’événement, pas la collaboration', async () => {
		const id = await gig('bar', 'patron', daysAgo(25));
		expect(await milestone('FIRST_GIG')).toEqual({ proof: 'CORROBORATED' });
		const held = await db.domainEvent.findFirstOrThrow({
			where: { type: 'gig.held', actorIds: { has: band.id } }
		});
		expect(held.payload).toMatchObject({
			gigId: id,
			venueOrgId: orgs.bar.id,
			performerIds: [band.id],
			firstDateIds: [band.id],
			verified: false
		});
		const xp = async (actorId: string, ruleId: string) =>
			(
				await db.xpTransaction.findMany({
					where: { actorId, ruleId },
					select: { track: true, amount: true }
				})
			).map((t) => t.track);
		expect(await xp(ids.patron, 'gig.held')).toEqual(['PROMOTER']);
		expect(await xp(ids.patron, 'collaboration.completed')).toEqual([]);
		expect(await xp(ids.lea, 'collaboration.completed')).toEqual(['MUSICIAN']);
	});

	it('seule une organisation vérifiée fait passer le concert `VERIFIED`', async () => {
		await gig('asso1', 'orga', daysAgo(20));
		expect(await milestone('FIRST_GIG')).toEqual({ proof: 'VERIFIED' });
		expect(await milestone('FIRST_TOUR')).toBeNull();
	});

	it('trois concerts vérifiés dans trois communes en 30 jours : « Première tournée » vérifiée', async () => {
		await gig('asso2', 'orga', daysAgo(15));
		expect(await milestone('FIRST_TOUR')).toBeNull();
		await gig('asso3', 'orga', daysAgo(10));
		expect(await milestone('FIRST_TOUR')).toEqual({ proof: 'VERIFIED' });
		const events = await db.domainEvent.count({
			where: { type: 'gig.held', actorIds: { has: band.id } }
		});
		expect(events).toBe(4);
	});
});
