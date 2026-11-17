/**
 * Accompagnement par un·e manager ou un·e booker (P5-07) sur la base de
 * `.env`, schéma `e2e`. Critère de fin du lot : **un accompagnement non
 * confirmé ne rapporte rien** (ni XP, ni rang, ni affichage public, ni
 * date bookée). Confirmé, il rapporte 200 au manager, rien au booker ; les
 * dates bookées créditent le booker (`gig.held`), et trois dates dans trois
 * communes en 30 jours, la tournée (`tour.booked`). Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/representation
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createPrismaClient } from '../../../../prisma/client.js';
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
const db = createPrismaClient(url.toString());

vi.mock('#lib/server', () => ({ prisma: db }));

const reps = await import('./service');
const collabs = await import('../collaborations/service');
const bands = await import('../bands/service');
const { setActorLocation } = await import('../geo/queries');
const { getAgentProfile, saveAgentProfile } = await import('#lib/prisma/crafts/agentProfile');
const { exportPersonData, personAnonymizationOps } = await import('#lib/prisma/actors/person');

const PREFIX = 'rep-test-';
const YEAR = 365.25 * 86_400_000;
const commune = (nom: string) => E2E_COMMUNES.find((c) => c.nom === nom)!;
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

describe.skipIf(!enabled)(
	'accompagnement manager et booker (schéma e2e)',
	{ timeout: 120_000 },
	() => {
		const ids: Record<string, string> = {};
		const orgs: Record<string, string> = {};
		let band = { id: '', handle: '' };
		let conversation = '';

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
			await db.actor.deleteMany({ where: { id: { in: list } } });
			await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
			if (list.length > 0) {
				await db.domainEvent.deleteMany({ where: { actorIds: { hasSome: list } } });
			}
		}

		async function person(
			name: string,
			tracks: ('MUSICIAN' | 'MANAGER' | 'BOOKER' | 'PROMOTER')[],
			age = 30
		) {
			const user = await db.user.create({
				data: { email: `${PREFIX}${name}@example.test`, referralCode: `${PREFIX}${name}` }
			});
			return (
				await db.actor.create({
					data: {
						kind: 'PERSON',
						handle: PREFIX + name,
						displayName: name,
						trustLevel: 2,
						person: {
							create: {
								userId: user.id,
								termsAcceptedAt: new Date(),
								onboardedAt: new Date(),
								birthDate: new Date(Date.now() - age * YEAR),
								tracks: {
									create: tracks.map((track, i) => ({ track, isPrimary: i === 0 }))
								}
							}
						}
					}
				})
			).id;
		}

		async function promoterOrg(key: string, nom: string) {
			const actor = await db.actor.create({
				data: {
					kind: 'ORGANIZATION',
					handle: PREFIX + key,
					displayName: PREFIX + key,
					organization: {
						create: {
							kind: 'PROMOTER',
							verifiedAt: new Date(),
							memberships: {
								create: {
									personId: ids.orga,
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
			orgs[key] = actor.handle;
		}

		const gig = async (hostKey: string, day: string, booker?: string) => {
			const { id } = await collabs.proposeCollaboration(ids.lea, conversation, {
				kind: 'GIG',
				title: `Concert ${hostKey}`,
				happenedOn: day,
				band: band.handle,
				host: orgs[hostKey],
				...(booker ? { booker } : {})
			});
			await collabs.respondToCollaboration(ids.orga, id, true);
			return id;
		};

		const gains = async (actorId: string) =>
			db.xpTransaction.findMany({
				where: { actorId },
				select: { ruleId: true, track: true, amount: true }
			});

		const pendingOf = async (agentId: string) =>
			db.representation.findFirstOrThrow({
				where: { agentId, status: 'PROPOSED' },
				select: { id: true }
			});

		beforeAll(async () => {
			await cleanup();
			ids.lea = await person('lea', ['MUSICIAN']);
			ids.malik = await person('malik', ['MUSICIAN']);
			ids.mgr = await person('mgr', ['MANAGER']);
			ids.bk = await person('bk', ['BOOKER']);
			ids.orga = await person('orga', ['PROMOTER']);
			ids.solo = await person('solo', ['MUSICIAN']);
			ids.jeune = await person('jeune', ['MUSICIAN'], 16);
			band = await bands.createBand(ids.lea, { name: `${PREFIX}Les Pistons`, title: 'guitare' });
			await bands.inviteToBand(band.id, ids.lea, { handle: PREFIX + 'malik', title: null });
			const invite = await db.membership.findFirstOrThrow({
				where: { orgId: band.id, personId: ids.malik, status: 'INVITED' }
			});
			await bands.answerInvite(invite.id, ids.malik, true);
			await promoterOrg('asso1', 'Toulouse');
			await promoterOrg('asso2', 'Blagnac');
			await promoterOrg('asso3', 'Muret');
			conversation = (
				await db.conversation.create({
					data: {
						pairKey: [ids.lea, ids.orga].sort().join(':'),
						initiatorId: ids.lea,
						participants: {
							create: [
								{ actorId: ids.lea, state: 'ACCEPTED' },
								{ actorId: ids.orga, state: 'ACCEPTED' }
							]
						}
					},
					select: { id: true }
				})
			).id;
		}, 180_000);

		afterAll(async () => {
			await cleanup();
			await db.$disconnect();
		});

		it('proposer demande le métier, un artiste majeur et de ne pas être du groupe', async () => {
			const propose = (agent: string, artist: string, kind: 'MANAGER' | 'BOOKER') =>
				reps.proposeRepresentation(ids[agent], { artist: PREFIX + artist, kind });
			await expect(propose('lea', 'solo', 'MANAGER')).rejects.toThrow(/métier/);
			await expect(propose('mgr', 'jeune', 'MANAGER')).rejects.toThrow(/mineur/);
			await expect(propose('mgr', 'mgr', 'MANAGER')).rejects.toThrow(/soi-même/);
			await db.personTrack.create({ data: { personId: ids.malik, track: 'MANAGER' } });
			await expect(
				reps.proposeRepresentation(ids.malik, { artist: band.handle, kind: 'MANAGER' })
			).rejects.toThrow(/fais partie/);
		});

		it('un accompagnement non confirmé ne rapporte rien', async () => {
			await reps.proposeRepresentation(ids.mgr, { artist: band.handle, kind: 'MANAGER' });
			await reps.proposeRepresentation(ids.bk, { artist: band.handle, kind: 'BOOKER' });
			// La gestion du groupe est notifiée.
			expect(
				await db.notification.count({
					where: { recipientActorId: ids.lea, type: 'REPRESENTATION_REQUEST' }
				})
			).toBe(2);
			expect(await gains(ids.mgr)).toEqual([]);
			expect(
				await db.domainEvent.count({
					where: { type: 'management.confirmed', actorIds: { has: ids.mgr } }
				})
			).toBe(0);
			expect(await reps.getAgentTier(ids.mgr)).toBeNull();
			expect(await reps.confirmedArtistsOf(ids.mgr)).toEqual([]);
			// Pas de « Booké par » tant que le groupe n'a pas confirmé.
			const form = await collabs.collabFormContext(ids.lea, conversation);
			expect(form?.gig.bands[0].bookers).toEqual([]);
			await expect(gig('asso1', daysAgo(40), PREFIX + 'bk')).rejects.toThrow(/booker du groupe/);
		});

		it('seule la gestion du groupe confirme ; le manager gagne 200, le booker rien', async () => {
			const manager = await pendingOf(ids.mgr);
			await expect(reps.answerRepresentation(manager.id, ids.malik, true)).rejects.toThrow(
				/gestion/
			);
			await reps.answerRepresentation(manager.id, ids.lea, true);
			// 200 × poids de la confiance de qui confirme (un compte neuf pèse peu).
			const [gain, ...rest] = await gains(ids.mgr);
			expect(rest).toEqual([]);
			expect(gain).toMatchObject({ ruleId: 'management.confirmed', track: 'MANAGER' });
			expect(gain.amount).toBeGreaterThan(0);
			expect(gain.amount).toBeLessThanOrEqual(200);
			expect((await reps.getAgentTier(ids.mgr))?.id).toBe('FIRST_ARTIST');
			expect(await reps.confirmedArtistsOf(ids.mgr)).toMatchObject([
				{ kind: 'MANAGER', handle: band.handle, isBand: true }
			]);
			await expect(
				reps.proposeRepresentation(ids.mgr, { artist: band.handle, kind: 'MANAGER' })
			).rejects.toThrow(/déjà/);

			await reps.answerRepresentation((await pendingOf(ids.bk)).id, ids.lea, true);
			expect(await gains(ids.bk)).toEqual([]);
			expect((await reps.getAgentTier(ids.bk))?.id).toBe('FIRST_ARTIST');
		});

		it('les dates bookées créditent le booker, puis la tournée une fois', async () => {
			const form = await collabs.collabFormContext(ids.lea, conversation);
			expect(form?.gig.bands[0].bookers).toEqual([{ handle: PREFIX + 'bk', name: 'bk' }]);
			await gig('asso1', daysAgo(30), PREFIX + 'bk');
			await gig('asso2', daysAgo(25), PREFIX + 'bk');
			let booker = await gains(ids.bk);
			expect(booker.filter((g) => g.ruleId === 'gig.held')).toHaveLength(2);
			expect(booker.every((g) => g.track === 'BOOKER')).toBe(true);
			expect(booker.some((g) => g.ruleId === 'tour.booked')).toBe(false);
			await gig('asso3', daysAgo(20), PREFIX + 'bk');
			booker = await gains(ids.bk);
			const tours = booker.filter((g) => g.ruleId === 'tour.booked');
			expect(tours).toHaveLength(1);
			expect(tours[0].track).toBe('BOOKER');
			expect(tours[0].amount).toBeGreaterThan(0);
			expect(tours[0].amount).toBeLessThanOrEqual(400);
			// Une quatrième date ne refait pas la même tournée.
			await gig('asso1', daysAgo(15), PREFIX + 'bk');
			expect((await gains(ids.bk)).filter((g) => g.ruleId === 'tour.booked')).toHaveLength(1);
			// Le manager ne gagne rien aux dates qu'il n'a pas bookées.
			expect((await gains(ids.mgr)).map((g) => g.ruleId)).toEqual(['management.confirmed']);
		});

		it('terminé, l’accompagnement compte pour le rang mais ne permet plus de booker', async () => {
			const row = await db.representation.findFirstOrThrow({
				where: { agentId: ids.bk, status: 'CONFIRMED' },
				select: { id: true }
			});
			await expect(reps.endRepresentation(row.id, ids.solo)).rejects.toThrow(/deux parties/);
			await reps.endRepresentation(row.id, ids.lea);
			expect((await reps.getAgentTier(ids.bk))?.id).toBe('FIRST_ARTIST');
			await expect(gig('asso2', daysAgo(10), PREFIX + 'bk')).rejects.toThrow(/booker du groupe/);
		});

		it('décliner conserve la décision sans rien rapporter', async () => {
			await reps.proposeRepresentation(ids.mgr, { artist: PREFIX + 'solo', kind: 'MANAGER' });
			const row = await pendingOf(ids.mgr);
			await reps.answerRepresentation(row.id, ids.solo, false);
			expect(await db.representation.findUnique({ where: { id: row.id } })).toMatchObject({
				status: 'DECLINED',
				endedById: ids.solo,
				message: null,
				allowedActions: []
			});
			expect((await gains(ids.mgr)).map((g) => g.ruleId)).toEqual(['management.confirmed']);
		});

		it('mandat borné : date, territoire, fin et actions sont refusés côté serveur', async () => {
			const now = new Date();
			const start = new Date(now.getTime() - 2 * 86_400_000).toISOString().slice(0, 10);
			const finish = new Date(now.getTime() + 10 * 86_400_000).toISOString().slice(0, 10);
			await reps.proposeRepresentation(ids.bk, { artist: band.handle, kind: 'BOOKER' }, now, {
				startsOn: start,
				expiresOn: finish,
				departmentCodes: ['31'],
				allowedActions: ['BOOKING_CREDIT']
			});
			const row = await pendingOf(ids.bk);
			await reps.answerRepresentation(row.id, ids.lea, true, now);
			const lookup = (on: Date, departmentCode: string | null) =>
				reps.confirmedBookerOf(db, band.id, PREFIX + 'bk', { on, departmentCode }, now);
			expect(await lookup(now, '31')).toBe(ids.bk);
			expect(await lookup(now, '32')).toBeNull();
			expect(await lookup(now, null)).toBeNull();
			expect(await lookup(new Date(finish), '31')).toBeNull();
			expect(await lookup(new Date('2000-01-01'), '31')).toBeNull();
			await expect(
				reps.proposeRepresentation(ids.bk, { artist: PREFIX + 'solo', kind: 'BOOKER' }, now, {
					departmentCodes: [],
					allowedActions: ['CAREER_SUPPORT']
				})
			).rejects.toThrow(/activité/);
			// La fin est immédiate, les termes et l’auteur sont conservés.
			await reps.endRepresentation(row.id, ids.lea, now);
			expect(await lookup(now, '31')).toBeNull();
			expect(await db.representation.findUnique({ where: { id: row.id } })).toMatchObject({
				status: 'ENDED',
				endedById: ids.lea,
				departmentCodes: ['31'],
				allowedActions: ['BOOKING_CREDIT']
			});
		});

		it('plusieurs bookers peuvent être confirmés sans se déléguer leurs droits', async () => {
			const other = await person('bk2', ['BOOKER']);
			for (const agent of [ids.bk, other]) {
				await reps.proposeRepresentation(agent, { artist: band.handle, kind: 'BOOKER' });
				await reps.answerRepresentation((await pendingOf(agent)).id, ids.lea, true);
			}
			expect((await reps.confirmedBookersOf([band.id])).get(band.id)).toHaveLength(2);
			const first = await db.representation.findFirstOrThrow({
				where: { agentId: ids.bk, artistId: band.id, status: 'CONFIRMED' }
			});
			await expect(reps.endRepresentation(first.id, other)).rejects.toThrow(/deux parties/);
			await reps.endRepresentation(first.id, ids.bk);
			expect((await reps.confirmedBookersOf([band.id])).get(band.id)).toEqual([
				{ handle: PREFIX + 'bk2', name: 'bk2' }
			]);
			const second = await db.representation.findFirstOrThrow({
				where: { agentId: other, artistId: band.id, status: 'CONFIRMED' }
			});
			await reps.endRepresentation(second.id, ids.lea);
		});

		it('une proposition expirée ou un agent sans métier ne se confirme pas', async () => {
			const now = new Date();
			await reps.proposeRepresentation(ids.bk, { artist: PREFIX + 'solo', kind: 'BOOKER' }, now, {
				expiresOn: new Date(now.getTime() + 2 * 86_400_000).toISOString().slice(0, 10),
				departmentCodes: [],
				allowedActions: ['BOOKING_CREDIT']
			});
			const row = await pendingOf(ids.bk);
			await expect(
				reps.answerRepresentation(row.id, ids.solo, true, new Date(now.getTime() + 3 * 86_400_000))
			).rejects.toThrow(/expiré/);
			await db.personTrack.deleteMany({ where: { personId: ids.bk, track: 'BOOKER' } });
			try {
				await expect(reps.answerRepresentation(row.id, ids.solo, true, now)).rejects.toThrow(
					/métier/
				);
			} finally {
				await db.personTrack.create({ data: { personId: ids.bk, track: 'BOOKER' } });
			}
			await reps.endRepresentation(row.id, ids.bk);
		});

		it.each([true, false])(
			'la réponse (accord : %s) attend le verrou puis refuse une gestion révoquée',
			async (accept) => {
				await reps.proposeRepresentation(ids.bk, { artist: band.handle, kind: 'BOOKER' });
				const row = await pendingOf(ids.bk);
				let release!: () => void;
				let ready!: () => void;
				const held = new Promise<void>((r) => {
					ready = r;
				});
				const gate = new Promise<void>((r) => {
					release = r;
				});
				const revoke = db.$transaction(
					async (tx) => {
						await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`band:${band.id}`}))`;
						await tx.membership.updateMany({
							where: { personId: ids.lea, orgId: band.id },
							data: { role: 'MEMBER' }
						});
						ready();
						await gate;
					},
					{ timeout: 20_000 }
				);
				await held;
				const answer = reps.answerRepresentation(row.id, ids.lea, accept).then(
					() => null,
					(error: unknown) => error
				);
				try {
					await vi.waitFor(
						async () => {
							const [lock] = await db.$queryRaw<
								{ waiting: boolean }[]
							>`SELECT EXISTS (SELECT 1 FROM pg_locks WHERE locktype = 'advisory' AND NOT granted AND objid = hashtext(${`band:${band.id}`})::oid) AS waiting`;
							expect(lock.waiting).toBe(true);
						},
						{ timeout: 5000, interval: 50 }
					);
				} finally {
					release();
					await revoke;
				}
				try {
					expect(await answer).toMatchObject({ status: 403 });
				} finally {
					await db.membership.updateMany({
						where: { personId: ids.lea, orgId: band.id },
						data: { role: 'OWNER' }
					});
					await reps.endRepresentation(row.id, ids.bk);
				}
			}
		);

		it('seule la gestion majeure est sollicitée (Q48, DASH-20a)', async () => {
			const zoe = await person('zoe', ['MUSICIAN'], 17);
			const adulte = await person('adulte', ['MUSICIAN']);
			const bandOf = async (key: string, members: [string, 'OWNER' | 'ADMIN'][]) =>
				(
					await db.actor.create({
						data: {
							kind: 'ORGANIZATION',
							handle: PREFIX + key,
							displayName: PREFIX + key,
							organization: {
								create: {
									kind: 'BAND',
									formedAt: new Date(),
									memberships: {
										create: members.map(([personId, role]) => ({
											personId,
											role,
											status: 'ACTIVE',
											startedAt: new Date()
										}))
									}
								}
							}
						}
					})
				).id;
			const lycee = await bandOf('lycee', [[zoe, 'OWNER']]);
			const mixte = await bandOf('mixte', [
				[adulte, 'OWNER'],
				[zoe, 'ADMIN']
			]);
			const requests = (actorId: string) =>
				db.notification.count({
					where: { recipientActorId: actorId, type: 'REPRESENTATION_REQUEST' }
				});
			// Géré par une mineure seulement : personne ne peut confirmer.
			await expect(
				reps.proposeRepresentation(ids.mgr, { artist: PREFIX + 'lycee', kind: 'MANAGER' })
			).rejects.toThrow(/Impossible de proposer/);
			expect(await db.representation.count({ where: { artistId: lycee } })).toBe(0);
			// Gestion mixte : seule l'adulte est notifiée, voit et compte la proposition.
			await reps.proposeRepresentation(ids.mgr, { artist: PREFIX + 'mixte', kind: 'MANAGER' });
			expect(await requests(adulte)).toBe(1);
			expect(await requests(zoe)).toBe(0);
			expect(await reps.pendingRepresentationCount(adulte)).toBe(1);
			expect(await reps.pendingRepresentationCount(zoe)).toBe(0);
			expect(await reps.representationsForMe(zoe)).toEqual([]);
			const { id } = await db.representation.findFirstOrThrow({ where: { artistId: mixte } });
			await expect(reps.answerRepresentation(id, zoe, true)).rejects.toThrow(/majeure/);
			await reps.answerRepresentation(id, adulte, true);
			// Confirmé, l'accompagnement du groupe est visible de Zoé, qui peut y mettre fin.
			expect(await reps.representationsForMe(zoe)).toMatchObject([
				{ id, status: 'CONFIRMED', message: null }
			]);
			await reps.endRepresentation(id, zoe);
			expect(await db.representation.findUniqueOrThrow({ where: { id } })).toMatchObject({
				status: 'ENDED',
				endedById: zoe
			});
		});

		it('RGPD : fiche et accompagnements exportés ; après l’anonymisation, la fiche part et l’accompagnement se termine', async () => {
			const rock = (
				await db.genre.findFirstOrThrow({ where: { active: true }, select: { id: true } })
			).id;
			await saveAgentProfile(ids.mgr, { genreIds: [rock], pitch: 'Je cherche des groupes rock.' });
			const { userId } = await db.person.findUniqueOrThrow({
				where: { actorId: ids.mgr },
				select: { userId: true }
			});
			const exported = await exportPersonData(userId);
			expect(exported?.profil_manager_booker?.ce_que_je_cherche).toBe(
				'Je cherche des groupes rock.'
			);
			expect(exported?.accompagnements?.filter((r) => r.statut === 'CONFIRMED')).toMatchObject([
				{
					role: 'agent',
					metier: 'MANAGER',
					statut: 'CONFIRMED',
					actions_autorisees: ['CAREER_SUPPORT'],
					departements: []
				}
			]);

			await db.$transaction(await personAnonymizationOps(userId));
			expect(await getAgentProfile(ids.mgr)).toBeNull();
			expect(await db.agentGenre.count({ where: { personId: ids.mgr } })).toBe(0);
			const rows = await db.representation.findMany({
				where: { agentId: ids.mgr },
				select: { status: true, message: true }
			});
			expect(rows).toEqual(
				expect.arrayContaining([
					{ status: 'ENDED', message: null },
					{ status: 'DECLINED', message: null }
				])
			);
		});
	}
);
