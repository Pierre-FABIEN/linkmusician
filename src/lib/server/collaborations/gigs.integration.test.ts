/**
 * Concerts vérifiés (P5-06) sur la base de `.env`, schéma `e2e` : un concert
 * se confirme entre une personne qui joue dans le groupe et une personne qui
 * gère le lieu ou l'organisation. Dans un lieu non vérifié, « Premier
 * concert » est corroboré ; seule une organisation vérifiée le fait passer
 * `VERIFIED` ; trois concerts vérifiés dans trois communes en 30 jours
 * vérifient « Première tournée ». `gig.held` crédite qui organise, jamais
 * en collaboration de musicien·ne. Carte de carrière (P5-08) : l'acte V se
 * franchit au concert vérifié, pas au corroboré ; la tournée s'affiche en
 * plus ; l'hôte ne franchit rien.
 *
 * Concert déclaré par un simple membre (P1c, D75) : un membre `MEMBER` fait
 * reconnaître un concert de son groupe quand la gestion de l'hôte confirme,
 * sans gagner aucun droit de gestion ; il ne déclare pas l'étape à la main ;
 * un ancien membre ne propose pas ; un départ avant la confirmation ne donne
 * ni `gig.held` ni étape. Écrit le 19/11/2026, **non exécuté** dans la
 * session (recette globale ultérieure).
 *
 * Collaboration terminée sans concert reconnu (P1d, Q106, D79) : une
 * collaboration `GIG` terminée sans `gig.held` ne compte ni comme date
 * antérieure (bonus de première date de l'hôte) ni dans la tournée ; ses
 * gains de collaboration restent. Écrit le 19/11/2026, **non exécuté**.
 *
 * Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/collaborations/gigs
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
const { declareMilestone } = await import('../milestones/service');
const { setActorLocation } = await import('../geo/queries');
const { careerFacts, firstVerifiedGig } = await import('../career/map');
const { careerMap } = await import('#lib/career/map');

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
		// Corroboré seulement : l'acte V reste à franchir (P5-08).
		expect((await careerFacts(ids.lea)).verifiedGigs).toBe(0);
		expect(await firstVerifiedGig(ids.lea)).toBeNull();
	});

	it('seule une organisation vérifiée fait passer le concert `VERIFIED`', async () => {
		await gig('asso1', 'orga', daysAgo(20));
		expect(await milestone('FIRST_GIG')).toEqual({ proof: 'VERIFIED' });
		expect(await milestone('FIRST_TOUR')).toBeNull();
		// « La scène » franchie par les membres, pas par qui accueille (P5-08).
		for (const name of ['lea', 'malik']) {
			const act5 = careerMap(await careerFacts(ids[name])).acts[4];
			expect(act5.state).toBe('passed');
			expect(act5.bonusTrial?.done).toBe(false);
		}
		expect((await careerFacts(ids.orga)).verifiedGigs).toBe(0);
		expect(await firstVerifiedGig(ids.lea)).toMatchObject({
			bandName: `${PREFIX}Les Rats`,
			hostName: expect.stringContaining('asso1')
		});
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
		expect(careerMap(await careerFacts(ids.malik)).acts[4].bonusTrial?.done).toBe(true);
	});
	/**
	 * P1c (D75) : un groupe neuf, pour lire ses étapes sans l'historique des
	 * tests précédents. Chef le gère (`OWNER`) ; Zoé et Nina y sont `MEMBER` ;
	 * Ancien y a joué puis l'a quitté. Les hôtes sont ceux du dessus : le bar
	 * (non vérifié, géré par Patron) et asso1 (vérifiée, gérée par Orga).
	 */
	describe('P1c — concert déclaré par un simple membre (D75)', () => {
		let crew = { id: '', handle: '' };
		const c: Record<string, string> = {};

		async function join(personName: string) {
			await bands.inviteToBand(crew.id, ids.chef, { handle: PREFIX + personName, title: null });
			const invite = await db.membership.findFirstOrThrow({
				where: { orgId: crew.id, personId: ids[personName], status: 'INVITED' }
			});
			await bands.answerInvite(invite.id, ids[personName], true);
		}

		/** `who` propose un concert passé du groupe à l'hôte (proposer vaut confirmer). */
		function proposeCrewGig(who: string, conversationId: string, hostKey: string, day: string) {
			return service.proposeCollaboration(ids[who], conversationId, {
				kind: 'GIG',
				title: `Les Fourmis ${hostKey} ${day}`,
				happenedOn: day,
				performer: crew.handle,
				host: orgs[hostKey].handle
			});
		}

		const crewMilestone = (key: string) =>
			db.milestone.findUnique({
				where: { bandId_definitionId: { bandId: crew.id, definitionId: key } },
				select: { proof: true, occurredAt: true }
			});
		const roleOf = async (personName: string) =>
			(
				await db.membership.findFirst({
					where: { orgId: crew.id, personId: ids[personName], status: 'ACTIVE' },
					select: { role: true }
				})
			)?.role ?? null;
		const heldFor = (gigId: string) =>
			db.domainEvent.count({
				where: { type: 'gig.held', payload: { path: ['gigId'], equals: gigId } }
			});

		beforeAll(async () => {
			for (const name of ['chef', 'zoe', 'nina', 'ancien']) ids[name] = await person(name);
			crew = await bands.createBand(ids.chef, { name: `${PREFIX}Les Fourmis`, title: 'batterie' });
			for (const name of ['zoe', 'nina', 'ancien']) await join(name);
			// Ancien quitte le groupe avant toute proposition (Q89).
			await bands.leaveBand(crew.id, ids.ancien);
			c.zoePatron = await conversation(ids.zoe, ids.patron);
			c.zoeOrga = await conversation(ids.zoe, ids.orga);
			c.ninaPatron = await conversation(ids.nina, ids.patron);
			c.ancienOrga = await conversation(ids.ancien, ids.orga);
		}, 180_000);

		it('fixtures : Zoé et Nina sont de simples membres, Chef seul gère le groupe', async () => {
			expect(await roleOf('zoe')).toBe('MEMBER');
			expect(await roleOf('nina')).toBe('MEMBER');
			expect(await roleOf('ancien')).toBeNull();
			expect(await bands.bandManagerIds(crew.id)).toEqual([ids.chef]);
		});

		it('scénario A : un membre propose, le lieu non vérifié confirme : concert reconnu, « Premier concert » corroboré', async () => {
			const { id } = await proposeCrewGig('zoe', c.zoePatron, 'bar', daysAgo(25));
			// Rien avant la confirmation du tiers.
			expect(await crewMilestone('FIRST_GIG')).toBeNull();
			expect(await heldFor(id)).toBe(0);
			await service.respondToCollaboration(ids.patron, id, true);

			expect(
				await db.collaboration.findUniqueOrThrow({
					where: { id },
					select: { status: true, bandId: true, performerId: true }
				})
			).toEqual({ status: 'COMPLETED', bandId: crew.id, performerId: crew.id });
			expect(await crewMilestone('FIRST_GIG')).toMatchObject({ proof: 'CORROBORATED' });

			// `gig.held` : le groupe joue, Zoé confirme côté groupe, Patron organise.
			const held = await db.domainEvent.findFirstOrThrow({
				where: { type: 'gig.held', payload: { path: ['gigId'], equals: id } }
			});
			expect(held.payload).toMatchObject({
				performerIds: [crew.id],
				confirmerIds: [ids.zoe],
				organizerIds: [ids.patron],
				firstDateIds: [crew.id],
				verified: false
			});
			// L'étape est attestée et créditée aux membres présents (Zoé comprise).
			const attested = await db.domainEvent.findFirstOrThrow({
				where: {
					type: 'milestone.attested',
					actorIds: { has: crew.id },
					payload: { path: ['milestone'], equals: 'FIRST_GIG' }
				}
			});
			expect(attested.payload).toMatchObject({ milestone: 'FIRST_GIG', to: 'CORROBORATED' });
			expect((attested.payload as { memberIds: string[] }).memberIds).toEqual(
				expect.arrayContaining([ids.chef, ids.zoe])
			);

			// Progression : barème existant, rien d'autre.
			const rules = async (actorId: string) =>
				(
					await db.xpTransaction.findMany({
						where: { actorId, ruleId: { in: ['collaboration.completed', 'gig.held'] } },
						select: { ruleId: true, track: true }
					})
				).map((t) => `${t.ruleId}:${t.track}`);
			expect(await rules(ids.zoe)).toEqual(['collaboration.completed:MUSICIAN']);
			expect(await rules(ids.patron)).toContain('gig.held:PROMOTER');
			expect(await rules(ids.patron)).not.toContain('collaboration.completed:MUSICIAN');
			// Corroboré : l'acte V reste à franchir pour le membre (P5-08).
			expect((await careerFacts(ids.zoe)).verifiedGigs).toBe(0);
		});

		it('scénario A : une organisation vérifiée confirme : « Premier concert » vérifié, l’acte V franchi', async () => {
			const before = await crewMilestone('FIRST_GIG');
			const { id } = await proposeCrewGig('zoe', c.zoeOrga, 'asso1', daysAgo(20));
			await service.respondToCollaboration(ids.orga, id, true);
			const after = await crewMilestone('FIRST_GIG');
			expect(after?.proof).toBe('VERIFIED');
			// La montée de preuve garde la date du premier concert.
			expect(after?.occurredAt).toEqual(before?.occurredAt);
			expect(await crewMilestone('FIRST_TOUR')).toBeNull();
			expect(careerMap(await careerFacts(ids.zoe)).acts[4].state).toBe('passed');
			expect(await firstVerifiedGig(ids.zoe)).toMatchObject({
				bandName: `${PREFIX}Les Fourmis`
			});
		});

		it('scénario A : aucune élévation de privilèges, aucune étape personnelle (D75 §4, DC4)', async () => {
			// Reconnaître un concert ne change ni le rôle ni la gestion.
			expect(await roleOf('zoe')).toBe('MEMBER');
			expect(await bands.bandManagerIds(crew.id)).toEqual([ids.chef]);
			// Ni gestion de l'hôte : aucune adhésion de Zoé hors de son groupe.
			expect(
				await db.membership.count({
					where: { personId: ids.zoe, orgId: { not: crew.id } }
				})
			).toBe(0);
			// Un concert du groupe n'écrit pas d'étape personnelle (P8) ; le cas
			// symétrique est couvert par `solo-gigs.integration.test.ts`.
			expect(await db.milestone.count({ where: { bandId: ids.zoe } })).toBe(0);
		});

		it('scénario B : le même membre ne déclare pas l’étape à la main (403)', async () => {
			const before = await db.milestone.count({ where: { bandId: crew.id } });
			const attempt = declareMilestone(crew.id, ids.zoe, {
				key: 'FIRST_GIG',
				day: daysAgo(30),
				note: null
			});
			await expect(attempt).rejects.toThrow(/gèrent le groupe/);
			await expect(attempt).rejects.toMatchObject({ status: 403 });
			// Même pour une étape absente du parcours : c'est le droit qui manque.
			await expect(
				declareMilestone(crew.id, ids.zoe, { key: 'FIRST_REHEARSAL', day: daysAgo(30), note: null })
			).rejects.toMatchObject({ status: 403 });
			expect(await db.milestone.count({ where: { bandId: crew.id } })).toBe(before);
		});

		it('scénario C : un ancien membre ne propose pas de concert du groupe (Q89)', async () => {
			await expect(proposeCrewGig('ancien', c.ancienOrga, 'asso1', daysAgo(22))).rejects.toThrow(
				/jouer dans ce groupe/
			);
			// Ni la gestion de l'hôte avec lui : personne de la paire n'y joue.
			await expect(
				proposeCrewGig('orga', c.ancienOrga, 'asso1', daysAgo(22))
			).rejects.toMatchObject({ status: 403 });
			expect(await db.collaboration.count({ where: { conversationId: c.ancienOrga } })).toBe(0);
		});

		it('scénario D : parti avant la confirmation : collaboration terminée, ni `gig.held` ni étape', async () => {
			const { id } = await proposeCrewGig('nina', c.ninaPatron, 'bar', daysAgo(12));
			await bands.leaveBand(crew.id, ids.nina);
			const milestonesBefore = await db.milestone.findMany({
				where: { bandId: crew.id },
				select: { definitionId: true, proof: true, occurredAt: true },
				orderBy: { definitionId: 'asc' }
			});
			const attestedBefore = await db.domainEvent.count({
				where: { type: 'milestone.attested', actorIds: { has: crew.id } }
			});
			const patronHeldBefore = await db.xpTransaction.count({
				where: { actorId: ids.patron, ruleId: { startsWith: 'gig.' } }
			});
			const ninaMilestoneXpBefore = await db.xpTransaction.count({
				where: { actorId: ids.nina, ruleId: { startsWith: 'milestone.' } }
			});

			await service.respondToCollaboration(ids.patron, id, true);

			// D75 §8 : la collaboration se termine (adhésion relue à la confirmation)…
			expect(
				await db.collaboration.findUniqueOrThrow({ where: { id }, select: { status: true } })
			).toEqual({ status: 'COMPLETED' });
			// … mais le concert n'est pas reconnu : ni `gig.held`, ni étape, ni gain d'hôte.
			expect(await heldFor(id)).toBe(0);
			expect(
				await db.milestone.findMany({
					where: { bandId: crew.id },
					select: { definitionId: true, proof: true, occurredAt: true },
					orderBy: { definitionId: 'asc' }
				})
			).toEqual(milestonesBefore);
			expect(
				await db.domainEvent.count({
					where: { type: 'milestone.attested', actorIds: { has: crew.id } }
				})
			).toBe(attestedBefore);
			expect(
				await db.xpTransaction.count({
					where: { actorId: ids.patron, ruleId: { startsWith: 'gig.' } }
				})
			).toBe(patronHeldBefore);
			// Nina garde le gain de la collaboration terminée (barème existant, D75
			// §8), sans aucune part d'étape nouvelle.
			expect(
				await db.xpTransaction.count({
					where: { actorId: ids.nina, ruleId: 'collaboration.completed' }
				})
			).toBe(1);
			expect(
				await db.xpTransaction.count({
					where: { actorId: ids.nina, ruleId: { startsWith: 'milestone.' } }
				})
			).toBe(ninaMilestoneXpBefore);
		});
	});

	/**
	 * P1d (Q106, D79) : seule une date **reconnue** (`gig.held`) compte comme
	 * date antérieure et dans la tournée. Groupe neuf, Les Cigales : Cap le
	 * gère (`OWNER`), Tom et Max y sont `MEMBER`. Max propose une date à asso1
	 * (vérifiée, Toulouse) puis quitte le groupe avant la confirmation : la
	 * collaboration se termine, sans concert reconnu. Avant D79, elle privait
	 * la vraie première date de son bonus et complétait la tournée.
	 */
	describe('P1d — collaboration terminée sans concert reconnu (Q106, D79)', () => {
		let cigales = { id: '', handle: '' };
		const c: Record<string, string> = {};
		const gigIds: Record<string, string> = {};

		async function join(personName: string) {
			await bands.inviteToBand(cigales.id, ids.cap, { handle: PREFIX + personName, title: null });
			const invite = await db.membership.findFirstOrThrow({
				where: { orgId: cigales.id, personId: ids[personName], status: 'INVITED' }
			});
			await bands.answerInvite(invite.id, ids[personName], true);
		}

		/** `who` propose un concert passé des Cigales ; `hostPerson` le confirme. */
		async function cigalesGig(
			who: string,
			conv: string,
			hostKey: string,
			hostPerson: string,
			day: string
		) {
			const { id } = await service.proposeCollaboration(ids[who], conv, {
				kind: 'GIG',
				title: `Les Cigales ${hostKey} ${day}`,
				happenedOn: day,
				performer: cigales.handle,
				host: orgs[hostKey].handle
			});
			await service.respondToCollaboration(ids[hostPerson], id, true);
			return id;
		}

		const cigalesMilestone = (key: string) =>
			db.milestone.findUnique({
				where: { bandId_definitionId: { bandId: cigales.id, definitionId: key } },
				select: { proof: true, occurredAt: true }
			});
		const heldOf = (gigId: string) =>
			db.domainEvent.findFirst({
				where: { type: 'gig.held', payload: { path: ['gigId'], equals: gigId } },
				select: { payload: true }
			});
		const xpCount = (actorId: string, ruleId: string) =>
			db.xpTransaction.count({ where: { actorId, ruleId } });
		const cigalesHeld = async () =>
			(
				await db.domainEvent.findMany({
					where: { type: 'gig.held', actorIds: { has: cigales.id } },
					select: { payload: true }
				})
			).map((e) => e.payload as { performerIds: string[]; firstDateIds: string[] });

		beforeAll(async () => {
			for (const name of ['cap', 'tom', 'max']) ids[name] = await person(name);
			cigales = await bands.createBand(ids.cap, { name: `${PREFIX}Les Cigales`, title: 'chant' });
			for (const name of ['tom', 'max']) await join(name);
			c.tomPatron = await conversation(ids.tom, ids.patron);
			c.tomOrga = await conversation(ids.tom, ids.orga);
			c.maxOrga = await conversation(ids.max, ids.orga);
		}, 180_000);

		it('départ avant la confirmation : collaboration terminée, aucun concert reconnu, gain de collaboration gardé', async () => {
			const orgaGigXp = await db.xpTransaction.count({
				where: { actorId: ids.orga, ruleId: { startsWith: 'gig.' } }
			});
			const { id } = await service.proposeCollaboration(ids.max, c.maxOrga, {
				kind: 'GIG',
				title: 'Les Cigales asso1 sans Max',
				happenedOn: daysAgo(28),
				performer: cigales.handle,
				host: orgs.asso1.handle
			});
			await bands.leaveBand(cigales.id, ids.max);
			await service.respondToCollaboration(ids.orga, id, true);
			gigIds.unrecognized = id;

			expect(
				await db.collaboration.findUniqueOrThrow({ where: { id }, select: { status: true } })
			).toEqual({ status: 'COMPLETED' });
			expect(await heldOf(id)).toBeNull();
			expect(await cigalesMilestone('FIRST_GIG')).toBeNull();
			// Non-régression : la collaboration terminée rapporte à Max (D75 §8).
			expect(await xpCount(ids.max, 'collaboration.completed')).toBe(1);
			expect(
				await db.xpTransaction.count({
					where: { actorId: ids.max, ruleId: { startsWith: 'milestone.' } }
				})
			).toBe(0);
			// L'hôte ne gagne rien d'un concert non reconnu.
			expect(
				await db.xpTransaction.count({
					where: { actorId: ids.orga, ruleId: { startsWith: 'gig.' } }
				})
			).toBe(orgaGigXp);
		});

		it('lieu non vérifié : la vraie première date est reconnue comme telle, l’hôte a son bonus', async () => {
			const patronFirsts = await xpCount(ids.patron, 'gig.first_dates');
			const id = await cigalesGig('tom', c.tomPatron, 'bar', 'patron', daysAgo(26));
			gigIds.first = id;
			expect((await heldOf(id))?.payload).toMatchObject({
				performerIds: [cigales.id],
				confirmerIds: [ids.tom],
				organizerIds: [ids.patron],
				// Q106 : la collaboration de Max, non reconnue, n'est pas une date antérieure.
				firstDateIds: [cigales.id],
				verified: false
			});
			expect(await cigalesMilestone('FIRST_GIG')).toMatchObject({ proof: 'CORROBORATED' });
			expect(await xpCount(ids.patron, 'gig.first_dates')).toBe(patronFirsts + 1);
			expect(await xpCount(ids.tom, 'collaboration.completed')).toBe(1);
		});

		it('organisation vérifiée : « Premier concert » vérifié, pas de seconde première date', async () => {
			const before = await cigalesMilestone('FIRST_GIG');
			const orgaFirsts = await xpCount(ids.orga, 'gig.first_dates');
			const id = await cigalesGig('tom', c.tomOrga, 'asso2', 'orga', daysAgo(20));
			expect((await heldOf(id))?.payload).toMatchObject({ firstDateIds: [], verified: true });
			const after = await cigalesMilestone('FIRST_GIG');
			expect(after?.proof).toBe('VERIFIED');
			expect(after?.occurredAt).toEqual(before?.occurredAt);
			expect(await xpCount(ids.orga, 'gig.first_dates')).toBe(orgaFirsts);
			// Le souvenir de l'acte V nomme l'hôte du premier concert reconnu,
			// pas asso1, hôte de la collaboration non reconnue (plus ancienne).
			expect(await firstVerifiedGig(ids.tom)).toMatchObject({
				bandName: `${PREFIX}Les Cigales`,
				hostName: expect.stringContaining('asso2')
			});
		});

		it('tournée : la date non reconnue n’entre pas dans les trois communes', async () => {
			// Toulouse (non reconnue, −28), Blagnac (−20), Muret (−15) : trois
			// communes en 30 jours, mais deux dates reconnues seulement.
			await cigalesGig('tom', c.tomOrga, 'asso3', 'orga', daysAgo(15));
			expect(await cigalesMilestone('FIRST_TOUR')).toBeNull();
			// Une vraie date à Toulouse complète la tournée, à partir de Blagnac.
			await cigalesGig('tom', c.tomOrga, 'asso1', 'orga', daysAgo(10));
			const tour = await cigalesMilestone('FIRST_TOUR');
			expect(tour?.proof).toBe('VERIFIED');
			expect(tour?.occurredAt.toISOString().slice(0, 10)).toBe(daysAgo(20));
		});

		it('aucune double récompense : une seule première date, une seule tournée attestée', async () => {
			await cigalesGig('tom', c.tomOrga, 'asso2', 'orga', daysAgo(5));
			const held = (await cigalesHeld()).filter((p) => p.performerIds.includes(cigales.id));
			// bar, asso2, asso3, asso1, asso2 : cinq dates reconnues, pas celle de Max.
			expect(held).toHaveLength(5);
			expect(held.filter((p) => p.firstDateIds.length > 0)).toHaveLength(1);
			const attested = await db.domainEvent.findMany({
				where: { type: 'milestone.attested', actorIds: { has: cigales.id } },
				select: { payload: true }
			});
			const by = (key: string) =>
				attested.filter((e) => (e.payload as { milestone: string }).milestone === key);
			expect(by('FIRST_TOUR')).toHaveLength(1);
			expect(
				await db.milestone.count({
					where: { bandId: cigales.id, definitionId: { in: ['FIRST_GIG', 'FIRST_TOUR'] } }
				})
			).toBe(2);
		});

		it('séparation : aucune étape personnelle pour les membres, la collaboration de Max reste terminée', async () => {
			expect(
				await db.milestone.count({ where: { bandId: { in: [ids.cap, ids.tom, ids.max] } } })
			).toBe(0);
			expect(
				await db.collaboration.findUniqueOrThrow({
					where: { id: gigIds.unrecognized },
					select: { status: true }
				})
			).toEqual({ status: 'COMPLETED' });
			expect(await heldOf(gigIds.unrecognized)).toBeNull();
			// Max, parti, ne reçoit aucune part des étapes franchies après lui.
			expect(
				await db.xpTransaction.count({
					where: { actorId: ids.max, ruleId: { startsWith: 'milestone.' } }
				})
			).toBe(0);
		});
	});
});
