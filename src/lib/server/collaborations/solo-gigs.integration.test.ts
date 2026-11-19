/**
 * Artiste solo sur scène (P8, D77) sur la base de `.env`, schéma `e2e` : une
 * personne joue **en son nom**, sans groupe, et l'hôte confirme. Le concert
 * franchit ses étapes de scène personnelles, jamais celles d'un groupe ; un
 * concert de son groupe ne franchit jamais les siennes (DC4). Aucun barème
 * nouveau : la collaboration terminée rapporte, l'étape personnelle non.
 *
 * Écrit le 19/11/2026, **non exécuté** dans la session (recette globale
 * ultérieure). P1d (Q106, D79) : un concert en son nom terminé sans
 * `gig.held` ne compte ni comme date antérieure ni dans la tournée
 * personnelle ; un concert de groupe que l'on confirme n'est pas une date en
 * son nom. Écrit le 19/11/2026, non exécuté. Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npm run test:unit -- --run src/lib/server/collaborations/solo-gigs
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

const service = await import('./service');
const bands = await import('../bands/service');
const { setActorLocation } = await import('../geo/queries');
const { careerFacts, firstVerifiedGig } = await import('../career/map');
const { readRealisations } = await import('../career/realisations');
const { contestMilestone } = await import('../milestones/disputes');
const { exportPersonData, personAnonymizationOps } = await import('#lib/prisma/actors/person');
const { careerMap } = await import('#lib/career/map');

const PREFIX = 'solo-gig-test-';
const YEAR = 365.25 * 86_400_000;
const commune = (nom: string) => E2E_COMMUNES.find((c) => c.nom === nom)!;
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

describe.skipIf(!enabled)('artiste solo sur scène (schéma e2e)', { timeout: 180_000 }, () => {
	const ids: Record<string, string> = {};
	const users: Record<string, string> = {};
	const orgs: Record<string, { id: string; handle: string }> = {};
	const conv: Record<string, string> = {};
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

	async function person(name: string, opts: { musician?: boolean; age?: number } = {}) {
		const user = await db.user.create({
			data: { email: `${PREFIX}${name}@example.test`, referralCode: `${PREFIX}${name}` }
		});
		users[name] = user.id;
		const actor = await db.actor.create({
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
						birthDate: new Date(Date.now() - (opts.age ?? 30) * YEAR)
					}
				}
			}
		});
		if (opts.musician) {
			await db.personTrack.create({
				data: { personId: actor.id, track: 'MUSICIAN', isPrimary: true }
			});
		}
		return actor.id;
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

	/** `who` propose un concert passé en son nom (proposer vaut confirmer). */
	function proposeSolo(who: string, conversationId: string, hostKey: string, day: string) {
		return service.proposeCollaboration(ids[who], conversationId, {
			kind: 'GIG',
			title: `Solo ${hostKey} ${day}`,
			happenedOn: day,
			performer: PREFIX + who,
			host: orgs[hostKey].handle
		});
	}

	const personal = (actorId: string, key: string) =>
		db.milestone.findUnique({
			where: { bandId_definitionId: { bandId: actorId, definitionId: key } },
			select: { proof: true, occurredAt: true }
		});
	const xpRules = async (actorId: string) =>
		(
			await db.xpTransaction.findMany({
				where: { actorId },
				select: { ruleId: true, track: true, amount: true }
			})
		).map((t) => `${t.ruleId}:${t.track}`);

	beforeAll(async () => {
		await cleanup();
		ids.camille = await person('camille', { musician: true });
		ids.malik = await person('malik', { musician: true });
		ids.sacha = await person('sacha');
		ids.lou = await person('lou', { musician: true, age: 16 });
		ids.ancien = await person('ancien', { musician: true });
		ids.patron = await person('patron');
		ids.orga = await person('orga');
		await org('bar', 'VENUE', ids.patron, false, 'Toulouse');
		await org('asso1', 'PROMOTER', ids.orga, true, 'Toulouse');
		await org('asso2', 'PROMOTER', ids.orga, true, 'Blagnac');
		await org('asso3', 'PROMOTER', ids.orga, true, 'Muret');
		// Camille gère aussi un bar : jouer et s'accueillir ne prouve rien.
		await org('chez-camille', 'VENUE', ids.camille, false, 'Toulouse');
		conv.camillePatron = await conversation(ids.camille, ids.patron);
		conv.camilleOrga = await conversation(ids.camille, ids.orga);
		conv.camilleMalik = await conversation(ids.camille, ids.malik);
		conv.malikOrga = await conversation(ids.malik, ids.orga);
		conv.sachaPatron = await conversation(ids.sacha, ids.patron);
		// Une mineure dans une conversation qu'elle a ouverte (D5 inchangée).
		conv.louPatron = await conversation(ids.lou, ids.patron);
		conv.ancienOrga = await conversation(ids.ancien, ids.orga);
		// Le groupe de Malik et Camille naît plus loin (sa formation rapporte de
		// l'XP aux membres) : les premiers tests lisent un registre vide.
	}, 240_000);

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('la personne interprète est proposée sans groupe ; un groupe reste possible', async () => {
		const parties = await service.gigPartiesOfPair(ids.camille, ids.patron);
		expect(parties.soloists.map((p) => p.id)).toEqual([ids.camille]);
		const form = await service.collabFormContext(ids.patron, conv.camillePatron);
		expect(form?.gig.soloists).toEqual([
			expect.objectContaining({ handle: PREFIX + 'camille', me: false })
		]);
		// Aucun identifiant interne n'est envoyé au navigateur.
		expect(JSON.stringify(form?.gig)).not.toContain(ids.camille);
	});

	it('refus : sans métier musicien·ne, sans hôte distinct, ou en s’accueillant soi-même', async () => {
		await expect(proposeSolo('sacha', conv.sachaPatron, 'bar', daysAgo(5))).rejects.toThrow(
			/en son nom/
		);
		await expect(
			proposeSolo('camille', conv.camilleMalik, 'chez-camille', daysAgo(5))
		).rejects.toThrow(/On ne s’accueille pas soi-même/);
		// Un groupe et une personne à la fois : refusé avant toute lecture.
		await expect(
			service.proposeCollaboration(ids.camille, conv.camillePatron, {
				kind: 'GIG',
				title: 'Les deux',
				happenedOn: daysAgo(5),
				performer: PREFIX + 'camille',
				band: band.handle,
				host: orgs.bar.handle
			})
		).rejects.toThrow(/une seule/);
		expect(await db.collaboration.count({ where: { performerId: ids.sacha } })).toBe(0);
	});

	it('aucun gain unilatéral : proposé seul·e, rien n’est franchi ni versé', async () => {
		const { id } = await proposeSolo('camille', conv.camillePatron, 'bar', daysAgo(40));
		const row = await db.collaboration.findUniqueOrThrow({
			where: { id },
			select: { performerId: true, bandId: true, status: true }
		});
		expect(row).toEqual({ performerId: ids.camille, bandId: null, status: 'PROPOSED' });
		expect(await personal(ids.camille, 'FIRST_GIG')).toBeNull();
		expect(await xpRules(ids.camille)).toEqual([]);
		// Refusé par l'hôte : annulé, toujours rien.
		await service.respondToCollaboration(ids.patron, id, false);
		expect(await personal(ids.camille, 'FIRST_GIG')).toBeNull();
		expect(await xpRules(ids.camille)).toEqual([]);
	});

	it('annulé avant confirmation : rien', async () => {
		const { id } = await proposeSolo('camille', conv.camillePatron, 'bar', daysAgo(38));
		await service.cancelCollaboration(ids.camille, id);
		await expect(service.respondToCollaboration(ids.patron, id, true)).rejects.toThrow();
		expect(await personal(ids.camille, 'FIRST_GIG')).toBeNull();
	});

	it('confirmé par un lieu non vérifié : premier concert personnel corroboré, aucune étape de groupe', async () => {
		const day = daysAgo(30);
		const { id } = await proposeSolo('camille', conv.camillePatron, 'bar', day);
		await service.respondToCollaboration(ids.patron, id, true);
		expect(await personal(ids.camille, 'FIRST_GIG')).toMatchObject({ proof: 'CORROBORATED' });
		// Aucune étape de groupe n'a été écrite par ce concert.
		expect(
			await db.milestone.count({
				where: {
					definitionId: 'FIRST_GIG',
					band: { kind: 'ORGANIZATION', handle: { startsWith: PREFIX } }
				}
			})
		).toBe(0);
		// Aucune attestation d'étape : ni XP de groupe, ni part de membre.
		expect(
			await db.domainEvent.count({
				where: { type: 'milestone.attested', actorIds: { has: ids.camille } }
			})
		).toBe(0);
		const rules = await xpRules(ids.camille);
		expect(rules).toContain('collaboration.completed:MUSICIAN');
		expect(rules.some((r) => r.startsWith('milestone.'))).toBe(false);
		expect(rules.some((r) => r.endsWith(':BAND'))).toBe(false);
		// L'hôte gagne l'événement tenu, la personne interprète rien de plus.
		const held = await db.domainEvent.findFirstOrThrow({
			where: { type: 'gig.held', actorIds: { has: ids.camille } }
		});
		expect(held.payload).toMatchObject({
			gigId: id,
			performerIds: [ids.camille],
			firstDateIds: [ids.camille],
			verified: false
		});
		expect(await xpRules(ids.patron)).toContain('gig.held:PROMOTER');
		// Corroboré : « La scène » reste à franchir, et elle est à portée.
		expect((await careerFacts(ids.camille)).verifiedGigs).toBe(0);
		expect(await firstVerifiedGig(ids.camille)).toBeNull();
	});

	it('confirmé par une organisation vérifiée : vérifié, date d’origine gardée, « La scène » franchie seule', async () => {
		const before = await personal(ids.camille, 'FIRST_GIG');
		const { id } = await proposeSolo('camille', conv.camilleOrga, 'asso1', daysAgo(20));
		await service.respondToCollaboration(ids.orga, id, true);
		const after = await personal(ids.camille, 'FIRST_GIG');
		expect(after?.proof).toBe('VERIFIED');
		expect(after?.occurredAt).toEqual(before?.occurredAt);
		// Plus une toute première date : `firstDateIds` vide.
		const held = await db.domainEvent.findFirstOrThrow({
			where: { type: 'gig.held', payload: { path: ['gigId'], equals: id } }
		});
		expect(held.payload).toMatchObject({ firstDateIds: [], verified: true });
		const act5 = careerMap(await careerFacts(ids.camille)).acts.find((a) => a.number === 5)!;
		expect(act5.state).toBe('passed');
		expect(await firstVerifiedGig(ids.camille)).toMatchObject({ solo: true });
		// Malik, l'autre musicien, ne franchit rien par le concert de Camille.
		expect((await careerFacts(ids.malik)).verifiedGigs).toBe(0);
		expect(await personal(ids.malik, 'FIRST_GIG')).toBeNull();
		// La réalisation est lue « en son nom », une seule fois.
		const { realisations } = await readRealisations(ids.camille);
		const gigs = realisations.filter(
			(r) => r.object.type === 'MILESTONE' && r.object.definitionId === 'FIRST_GIG'
		);
		expect(gigs).toHaveLength(1);
		expect(gigs[0].roles).toEqual(['PERFORMER']);
	});

	it('un concert du groupe ne franchit pas les étapes personnelles de ses membres', async () => {
		// Groupe de Malik et Camille (DC4).
		band = await bands.createBand(ids.malik, { name: `${PREFIX}Les Rats`, title: 'basse' });
		await bands.inviteToBand(band.id, ids.malik, { handle: PREFIX + 'camille', title: null });
		const invite = await db.membership.findFirstOrThrow({
			where: { orgId: band.id, personId: ids.camille, status: 'INVITED' }
		});
		await bands.answerInvite(invite.id, ids.camille, true);
		const camilleBefore = await personal(ids.camille, 'FIRST_GIG');
		const { id } = await service.proposeCollaboration(ids.malik, conv.malikOrga, {
			kind: 'GIG',
			title: 'Les Rats à l’asso',
			happenedOn: daysAgo(18),
			performer: band.handle,
			host: orgs.asso1.handle
		});
		await service.respondToCollaboration(ids.orga, id, true);
		expect(
			await db.collaboration.findUniqueOrThrow({
				where: { id },
				select: { performerId: true, bandId: true }
			})
		).toEqual({ performerId: band.id, bandId: band.id });
		expect(
			await db.milestone.findUnique({
				where: { bandId_definitionId: { bandId: band.id, definitionId: 'FIRST_GIG' } },
				select: { proof: true }
			})
		).toEqual({ proof: 'VERIFIED' });
		// Malik : l'étape du groupe, pas d'étape personnelle.
		expect(await personal(ids.malik, 'FIRST_GIG')).toBeNull();
		// L'étape personnelle de Camille n'a pas bougé.
		expect(await personal(ids.camille, 'FIRST_GIG')).toEqual(camilleBefore);
		expect((await careerFacts(ids.malik)).verifiedGigs).toBe(1);
		// Camille : deux faits distincts (le sien et celui du groupe), aucun doublon.
		expect((await careerFacts(ids.camille)).verifiedGigs).toBe(2);
	});

	it('trois concerts vérifiés en son nom dans trois communes en 30 jours : tournée personnelle', async () => {
		expect(await personal(ids.camille, 'FIRST_TOUR')).toBeNull();
		for (const [key, day] of [
			['asso2', daysAgo(15)],
			['asso3', daysAgo(10)]
		] as const) {
			const { id } = await proposeSolo('camille', conv.camilleOrga, key, day);
			await service.respondToCollaboration(ids.orga, id, true);
		}
		expect(await personal(ids.camille, 'FIRST_TOUR')).toMatchObject({ proof: 'VERIFIED' });
		// Les concerts en son nom ne comptent pas dans la tournée du groupe.
		expect(
			await db.milestone.count({ where: { bandId: band.id, definitionId: 'FIRST_TOUR' } })
		).toBe(0);
		expect(careerMap(await careerFacts(ids.camille)).acts[4].bonusTrial?.done).toBe(true);
	});

	it('confirmation concurrente : une seule réponse compte, une seule date', async () => {
		const { id } = await proposeSolo('camille', conv.camillePatron, 'bar', daysAgo(8));
		const results = await Promise.allSettled([
			service.respondToCollaboration(ids.patron, id, true),
			service.respondToCollaboration(ids.patron, id, true)
		]);
		expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
		expect(
			await db.domainEvent.count({
				where: { type: 'gig.held', payload: { path: ['gigId'], equals: id } }
			})
		).toBe(1);
		expect(
			await db.milestone.count({ where: { bandId: ids.camille, definitionId: 'FIRST_GIG' } })
		).toBe(1);
	});

	it('mineure dans une conversation qu’elle a ouverte : même règle de preuve (Q101)', async () => {
		const { id } = await proposeSolo('lou', conv.louPatron, 'bar', daysAgo(12));
		await service.respondToCollaboration(ids.patron, id, true);
		expect(await personal(ids.lou, 'FIRST_GIG')).toMatchObject({ proof: 'CORROBORATED' });
		// Aucun accompagnement, aucun booker : `booker` refusé sans mandat.
		await expect(
			service.proposeCollaboration(ids.lou, conv.louPatron, {
				kind: 'GIG',
				title: 'Avec booker',
				happenedOn: daysAgo(11),
				performer: PREFIX + 'lou',
				host: orgs.bar.handle,
				booker: PREFIX + 'patron'
			})
		).rejects.toThrow(/booker/);
	});

	it('concert d’avant P8 sans interprète recopié : le chemin du groupe est inchangé', async () => {
		const old = await bands.createBand(ids.ancien, { name: `${PREFIX}Les Anciens`, title: null });
		// Ligne telle qu'avant la migration : `bandId` sans `performerId`.
		const legacy = await db.collaboration.create({
			data: {
				kind: 'GIG',
				title: 'Concert d’avant',
				happenedOn: new Date(`${daysAgo(25)}T00:00:00Z`),
				proposedById: ids.ancien,
				conversationId: conv.ancienOrga,
				bandId: old.id,
				hostOrgId: orgs.asso1.id,
				participants: {
					create: [
						{ actorId: ids.ancien, acceptedAt: new Date(), confirmedCompletionAt: new Date() },
						{ actorId: ids.orga }
					]
				}
			},
			select: { id: true }
		});
		await service.respondToCollaboration(ids.orga, legacy.id, true);
		// Groupe d'une seule personne : pas formé, pas d'étape ; rien de personnel non plus.
		expect(await personal(ids.ancien, 'FIRST_GIG')).toBeNull();
		expect(
			await db.domainEvent.count({
				where: { type: 'gig.held', payload: { path: ['gigId'], equals: legacy.id } }
			})
		).toBe(1);
	});

	it('une étape personnelle ne passe pas par la contestation des étapes de groupe (Q102)', async () => {
		const row = await db.milestone.findUniqueOrThrow({
			where: { bandId_definitionId: { bandId: ids.camille, definitionId: 'FIRST_GIG' } },
			select: { id: true }
		});
		await expect(
			contestMilestone(ids.sacha, row.id, 'Je ne crois pas à ce concert, vraiment.')
		).rejects.toThrow(/modération/);
		expect(
			await db.milestone.findUniqueOrThrow({ where: { id: row.id }, select: { frozenAt: true } })
		).toEqual({ frozenAt: null });
	});

	it('RGPD : export des étapes personnelles et de l’interprète, effacement à l’anonymisation', async () => {
		const data = await exportPersonData(users.camille);
		expect(data?.etapes_de_scene_personnelles).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ etape: 'Premier concert', preuve: 'VERIFIED' }),
				expect.objectContaining({ etape: 'Première tournée', preuve: 'VERIFIED' })
			])
		);
		const collabs = data?.collaborations ?? [];
		expect(collabs.some((c) => c.type === 'GIG' && c.interprete === 'moi')).toBe(true);
		expect(collabs.some((c) => c.type === 'GIG' && c.interprete === `${PREFIX}Les Rats`)).toBe(
			true
		);
		await db.$transaction(await personAnonymizationOps(users.lou));
		expect(await db.milestone.count({ where: { bandId: ids.lou } })).toBe(0);
		// Le registre d'XP reste (ajout seul).
		expect(await db.xpTransaction.count({ where: { actorId: ids.lou } })).toBeGreaterThan(0);
	});

	/**
	 * P1d (Q106, D79), en son nom : Éva joue seule. Relais gère « relais »
	 * (vérifiée, Toulouse) et la quitte avant de confirmer la première date
	 * d'Éva : la collaboration se termine sans gestion de l'hôte, donc sans
	 * `gig.held`. Les autres hôtes sont ceux du dessus.
	 */
	describe('P1d — concert en son nom terminé sans concert reconnu (Q106, D79)', () => {
		const held = async (performerId: string) =>
			(
				await db.domainEvent.findMany({
					where: { type: 'gig.held', actorIds: { has: performerId } },
					select: { payload: true }
				})
			)
				.map((e) => e.payload as { gigId: string; performerIds: string[]; firstDateIds: string[] })
				.filter((p) => p.performerIds.includes(performerId));
		const firstDates = (actorId: string) =>
			db.xpTransaction.count({ where: { actorId, ruleId: 'gig.first_dates' } });

		beforeAll(async () => {
			ids.eva = await person('eva', { musician: true });
			ids.relais = await person('relais');
			await org('relais', 'PROMOTER', ids.relais, true, 'Toulouse');
			conv.evaRelais = await conversation(ids.eva, ids.relais);
			conv.evaPatron = await conversation(ids.eva, ids.patron);
			conv.evaOrga = await conversation(ids.eva, ids.orga);
			conv.malikPatron = await conversation(ids.malik, ids.patron);
		}, 120_000);

		it('gestion de l’hôte partie avant la confirmation : terminée, rien de reconnu, gain de collaboration gardé', async () => {
			const { id } = await proposeSolo('eva', conv.evaRelais, 'relais', daysAgo(28));
			// Relais n'administre plus l'organisation au moment de confirmer.
			await db.membership.updateMany({
				where: { orgId: orgs.relais.id, personId: ids.relais },
				data: { status: 'LEFT' }
			});
			await service.respondToCollaboration(ids.relais, id, true);
			expect(
				await db.collaboration.findUniqueOrThrow({ where: { id }, select: { status: true } })
			).toEqual({ status: 'COMPLETED' });
			expect(await held(ids.eva)).toEqual([]);
			expect(await personal(ids.eva, 'FIRST_GIG')).toBeNull();
			// Non-régression : la collaboration terminée rapporte à Éva.
			expect(await xpRules(ids.eva)).toContain('collaboration.completed:MUSICIAN');
		});

		it('lieu non vérifié : la vraie première date en son nom est reconnue, l’hôte a son bonus', async () => {
			const before = await firstDates(ids.patron);
			const { id } = await proposeSolo('eva', conv.evaPatron, 'bar', daysAgo(26));
			await service.respondToCollaboration(ids.patron, id, true);
			const [first] = await held(ids.eva);
			expect(first).toMatchObject({ gigId: id, firstDateIds: [ids.eva], verified: false });
			expect(await personal(ids.eva, 'FIRST_GIG')).toMatchObject({ proof: 'CORROBORATED' });
			expect(await firstDates(ids.patron)).toBe(before + 1);
		});

		it('tournée personnelle : la date non reconnue n’entre pas, aucune double première date', async () => {
			const orgaFirsts = await firstDates(ids.orga);
			// Toulouse (non reconnue, −28), Blagnac (−20), Muret (−15) : pas de tournée.
			for (const [key, day] of [
				['asso2', daysAgo(20)],
				['asso3', daysAgo(15)]
			] as const) {
				const { id } = await proposeSolo('eva', conv.evaOrga, key, day);
				await service.respondToCollaboration(ids.orga, id, true);
			}
			expect(await personal(ids.eva, 'FIRST_GIG')).toMatchObject({ proof: 'VERIFIED' });
			expect(await personal(ids.eva, 'FIRST_TOUR')).toBeNull();
			// Une vraie date à Toulouse complète la tournée, à partir de Blagnac.
			const { id } = await proposeSolo('eva', conv.evaOrga, 'asso1', daysAgo(10));
			await service.respondToCollaboration(ids.orga, id, true);
			const tour = await personal(ids.eva, 'FIRST_TOUR');
			expect(tour?.proof).toBe('VERIFIED');
			expect(tour?.occurredAt.toISOString().slice(0, 10)).toBe(daysAgo(20));
			const all = await held(ids.eva);
			expect(all).toHaveLength(4);
			expect(all.filter((p) => p.firstDateIds.length > 0)).toHaveLength(1);
			expect(await firstDates(ids.orga)).toBe(orgaFirsts);
			// Le souvenir de l'acte V nomme l'hôte du premier concert reconnu
			// chez une organisation vérifiée, pas « relais ».
			expect(await firstVerifiedGig(ids.eva)).toMatchObject({
				solo: true,
				hostName: expect.stringContaining('asso2')
			});
			// Deux étapes personnelles, aucune autre ligne à son nom.
			expect(await db.milestone.count({ where: { bandId: ids.eva } })).toBe(2);
		});

		it('séparation : un concert de groupe que l’on confirme n’est pas une date en son nom', async () => {
			// Malik a confirmé le concert des Rats (interprète : le groupe), il est
			// donc nommé dans ce `gig.held`, sans y être interprète.
			expect(
				await db.domainEvent.count({ where: { type: 'gig.held', actorIds: { has: ids.malik } } })
			).toBeGreaterThan(0);
			expect(await held(ids.malik)).toEqual([]);
			const bandBefore = await db.milestone.findMany({
				where: { bandId: band.id },
				select: { definitionId: true, proof: true },
				orderBy: { definitionId: 'asc' }
			});
			const { id } = await proposeSolo('malik', conv.malikPatron, 'bar', daysAgo(6));
			await service.respondToCollaboration(ids.patron, id, true);
			// Sa première date en son nom, malgré le concert de groupe déjà reconnu.
			const [first] = await held(ids.malik);
			expect(first).toMatchObject({ gigId: id, firstDateIds: [ids.malik] });
			expect(await personal(ids.malik, 'FIRST_GIG')).toMatchObject({ proof: 'CORROBORATED' });
			// Les étapes du groupe n'ont pas bougé.
			expect(
				await db.milestone.findMany({
					where: { bandId: band.id },
					select: { definitionId: true, proof: true },
					orderBy: { definitionId: 'asc' }
				})
			).toEqual(bandBefore);
		});
	});
});
