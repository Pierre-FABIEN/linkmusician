/**
 * Plateaux (P5-05a) sur la base de `.env`, schéma `e2e` : un·e
 * organisateur·rice publie une date dans un lieu validé ; un groupe hors
 * conditions ne peut pas candidater ; un groupe éligible candidate par une
 * personne qui le gère, et l'acceptation ouvre la conversation avec elle.
 * Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/opportunities/gigSlots
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
// Le SQL brut (villes, PostGIS) lit son schéma dans l'URL de connexion.
if (enabled) process.env.DATABASE_URL = url.toString();
const db = createPrismaClient(url.toString());

vi.mock('#lib/server', () => ({ prisma: db }));

const bands = await import('../bands/service');
const { createOpportunity } = await import('./service');
const { applyTo, decideApplication, listForIssuer, listMyApplications } =
	await import('./applications');
const { applyAsBand, bandOptionsFor, createGigSlot } = await import('./gigSlots');
const { getPromoterProgress } = await import('../progression/crafts');
const { setActorLocation } = await import('../geo/queries');

const PREFIX = 'plateau-test-';
const YEAR = 365.25 * 86_400_000;
const toulouse = E2E_COMMUNES.find((c) => c.nom === 'Toulouse')!;
const inTenDays = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);

describe.skipIf(!enabled)('plateaux d’un·e organisateur·rice (schéma e2e)', () => {
	const ids: Record<string, string> = {};
	let rock = { id: '', handle: '' };
	let jazz = { id: '', handle: '' };
	let kids = { id: '', handle: '' };
	let venueId = '';
	let pendingVenueId = '';
	let gigId = '';

	async function cleanup() {
		const actors = await db.actor.findMany({
			where: {
				OR: [
					{ handle: { startsWith: PREFIX } },
					{ displayName: { startsWith: PREFIX } },
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

	const form = () => ({
		venueId,
		day: inTenDays,
		start: '20:30',
		title: 'Plateau rock du vendredi',
		description: 'Trois groupes, sets de quarante minutes, chapeau et repas.',
		slots: 2,
		genre: 'rock',
		minBandTier: 'FIRST_GIG' as const,
		radiusKm: 50
	});

	async function person(name: string, opts: { minor?: boolean; promoter?: boolean } = {}) {
		const user = await db.user.create({
			data: { email: `${PREFIX}${name}@example.test`, referralCode: `${PREFIX}${name}` }
		});
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
						birthDate: new Date(Date.now() - (opts.minor ? 16 : 30) * YEAR),
						tracks: {
							create: [
								{ track: 'MUSICIAN', isPrimary: !opts.promoter },
								...(opts.promoter ? [{ track: 'PROMOTER' as const, isPrimary: true }] : [])
							]
						}
					}
				}
			}
		});
		await setActorLocation(actor.id, toulouse, { db, schema: 'e2e' });
		return actor.id;
	}

	async function band(managerId: string, name: string, genre: string) {
		const created = await bands.createBand(managerId, { name: PREFIX + name, title: 'guitare' });
		await setActorLocation(created.id, toulouse, { db, schema: 'e2e' });
		const g = await db.genre.findUniqueOrThrow({ where: { slug: genre } });
		await db.actorGenre.create({ data: { actorId: created.id, genreId: g.id } });
		return created;
	}

	beforeAll(async () => {
		await cleanup();
		ids.orga = await person('orga', { promoter: true });
		ids.lea = await person('lea');
		ids.jo = await person('jo');
		ids.kid = await person('kid', { minor: true });
		rock = await band(ids.lea, 'Les Rats', 'rock');
		jazz = await band(ids.jo, 'Swing Trio', 'jazz');
		kids = await band(ids.kid, 'Les Minots', 'rock');
		// Les Rats ont un premier concert corroboré : rang « Live ».
		const def = await db.milestoneDefinition.findUniqueOrThrow({ where: { id: 'FIRST_GIG' } });
		for (const b of [rock.id, kids.id]) {
			await db.milestone.create({
				data: {
					bandId: b,
					definitionId: 'FIRST_GIG',
					definitionVersion: def.version,
					proof: 'CORROBORATED',
					occurredAt: new Date('2026-06-21T12:00:00Z')
				}
			});
		}
		const venue = (name: string, validated: boolean) =>
			db.venue.create({
				data: {
					name: PREFIX + name,
					nameKey: (PREFIX + name).toLowerCase(),
					kind: 'BAR',
					communeCode: '31555',
					communeName: 'Toulouse',
					departmentCode: '31',
					lat: 43.6,
					lng: 1.44,
					createdById: ids.orga,
					validatedAt: validated ? new Date() : null
				}
			});
		venueId = (await venue('Le Saint-Des-Seins', true)).id;
		pendingVenueId = (await venue('Bar en attente', false)).id;
	}, 120_000);

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('seul·e un·e organisateur·rice publie, dans un lieu validé, sans passer par le formulaire général', async () => {
		await expect(createGigSlot(ids.lea, form())).rejects.toThrow(/Organisateur·rice/);
		await expect(createGigSlot(ids.orga, { ...form(), venueId: pendingVenueId })).rejects.toThrow(
			/annuaire validé/
		);
		await expect(
			createOpportunity(ids.orga, {
				kind: 'GIG_SLOT',
				title: 'Plateau',
				description: 'Un plateau publié par le mauvais chemin.',
				radiusKm: 25,
				durationDays: 14,
				slots: 1
			})
		).rejects.toThrow(/Publier un plateau/);
		gigId = (await createGigSlot(ids.orga, form())).id;
		const row = await db.opportunity.findUniqueOrThrow({ where: { id: gigId } });
		expect(row).toMatchObject({
			kind: 'GIG_SLOT',
			venueId,
			minBandTier: 'FIRST_GIG',
			genreSlug: 'rock'
		});
		// Les candidatures ferment au début du plateau. Aucune XP à la publication.
		expect(row.expiresAt.getTime()).toBe(row.startsAt!.getTime());
		expect(await db.xpTransaction.count({ where: { actorId: ids.orga } })).toBe(0);
	}, 60_000);

	it('un groupe hors conditions ne peut pas candidater', async () => {
		const [option] = await bandOptionsFor(ids.jo, gigId);
		expect(option.unmet).toHaveLength(2); // rang et genre
		await expect(
			applyAsBand(ids.jo, gigId, jazz.handle, 'Trio de jazz, on joue aussi du rock !')
		).rejects.toThrow(/ne peut pas candidater/);
		expect(await db.application.count({ where: { opportunityId: gigId } })).toBe(0);
	}, 60_000);

	it('un groupe se candidate par une personne majeure qui le gère, jamais à titre personnel', async () => {
		await expect(applyTo(ids.lea, gigId, 'Je candidate seule, sans le groupe.')).rejects.toThrow(
			/au nom d’un groupe/
		);
		await expect(
			applyAsBand(ids.kid, gigId, kids.handle, 'On a 16 ans et on joue du rock.')
		).rejects.toThrow(/18 ans/);
		await expect(
			applyAsBand(ids.jo, gigId, rock.handle, 'Je ne gère pas ce groupe.')
		).rejects.toThrow(/gèrent le groupe/);
		await applyAsBand(ids.lea, gigId, rock.handle, 'Rock garage, set de 40 minutes, autonomes.');
		const app = await db.application.findFirstOrThrow({ where: { opportunityId: gigId } });
		expect(app).toMatchObject({ applicantActorId: rock.id, sentById: ids.lea });
		expect(
			await db.notification.count({
				where: { recipientActorId: ids.orga, type: 'APPLICATION_RECEIVED' }
			})
		).toBe(1);
		await expect(
			applyAsBand(ids.lea, gigId, rock.handle, 'Une seconde fois, au cas où.')
		).rejects.toThrow(/déjà candidaté/);
		expect((await listMyApplications(ids.lea)).map((a) => a.band)).toEqual([`${PREFIX}Les Rats`]);
	}, 60_000);

	it('accepter ouvre la conversation avec la personne qui a candidaté', async () => {
		const [app] = await listForIssuer(ids.orga, gigId);
		expect(app.applicant).toMatchObject({ isBand: true, bandTier: 'Live' });
		const { conversationId } = await decideApplication(ids.orga, app.id, 'accept');
		const participants = await db.conversationParticipant.findMany({
			where: { conversationId: conversationId! },
			select: { actorId: true }
		});
		expect(participants.map((p) => p.actorId).sort()).toEqual([ids.orga, ids.lea].sort());
		expect(
			await db.notification.count({
				where: { recipientActorId: ids.lea, type: 'APPLICATION_ACCEPTED' }
			})
		).toBe(1);
	}, 60_000);

	it('les objectifs avancent : plateau publié, premier groupe programmé ; pas encore de rang', async () => {
		const progress = await getPromoterProgress(ids.orga, db);
		expect(progress.tier).toBeNull();
		expect(progress.objectives.map((o) => o.id)).toEqual([
			'promoter.profile',
			'promoter.event.first',
			'promoter.newcomers'
		]);
		expect(progress.questProgress).toEqual({ done: 3, total: 7 });
	}, 60_000);

	// ONB-13b (#27, D63) : conditions d'annonce, bloquantes seulement si le
	// profil ou la fiche du groupe dit explicitement le contraire.
	it('scénario 3 : un duo pour une date rémunérée, jamais un solo', async () => {
		const duo = (
			await createGigSlot(ids.orga, {
				...form(),
				title: 'Duo acoustique au bar',
				genre: '',
				minBandTier: undefined,
				pay: 'PAID',
				payMin: 150,
				payMax: 300,
				formation: 'DUO'
			})
		).id;
		expect(await db.opportunity.findUniqueOrThrow({ where: { id: duo } })).toMatchObject({
			pay: 'PAID',
			payMinEuros: 150,
			payMaxEuros: 300,
			formation: 'DUO',
			repertoire: null,
			commitment: null
		});
		// Fiche du groupe sans formation : non précisé, pas exclu.
		let [option] = await bandOptionsFor(ids.lea, duo);
		expect(option.unmet).toEqual([]);
		expect(option.unknown).toEqual(['la formation du groupe n’est pas précisée']);
		await db.bandProfile.create({ data: { orgId: rock.id, formation: 'SOLO' } });
		[option] = await bandOptionsFor(ids.lea, duo);
		expect(option.unmet).toEqual(['la formation du groupe n’est pas celle recherchée']);
		await expect(
			applyAsBand(ids.lea, duo, rock.handle, 'On joue en solo, mais on aimerait venir.')
		).rejects.toThrow(/formation du groupe/);
		await db.bandProfile.update({ where: { orgId: rock.id }, data: { formation: 'DUO' } });
		await applyAsBand(ids.lea, duo, rock.handle, 'Duo guitare-voix, set acoustique de 45 min.');
		expect(await db.application.count({ where: { opportunityId: duo } })).toBe(1);
	}, 60_000);

	it('scénario 4 : groupe de reprises avec cachet ; « les deux » convient', async () => {
		const covers = (
			await createGigSlot(ids.orga, {
				...form(),
				title: 'Soirée reprises',
				genre: '',
				minBandTier: undefined,
				pay: 'VOLUNTEER',
				payMin: 50,
				repertoire: 'COVERS',
				formation: 'BAND'
			})
		).id;
		// Une fourchette n'a de sens que pour « rémunéré » ou « défrayé » ; un
		// plateau n'a pas d'engagement : rien de fantôme n'est gardé.
		expect(await db.opportunity.findUniqueOrThrow({ where: { id: covers } })).toMatchObject({
			pay: 'VOLUNTEER',
			payMinEuros: null,
			repertoire: 'COVERS',
			commitment: null
		});
		await db.bandProfile.create({ data: { orgId: jazz.id, repertoire: 'ORIGINALS' } });
		await expect(
			applyAsBand(ids.jo, covers, jazz.handle, 'Nos compositions jazz, et quelques standards.')
		).rejects.toThrow(/répertoire du groupe/);
		await db.bandProfile.update({ where: { orgId: jazz.id }, data: { repertoire: 'BOTH' } });
		const [option] = await bandOptionsFor(ids.jo, covers);
		expect(option.unmet).toEqual([]);
		expect(option.unknown).toEqual(['la formation du groupe n’est pas précisée']);
		await applyAsBand(ids.jo, covers, jazz.handle, 'Reprises et compositions, trois sets.');
		await expect(
			createGigSlot(ids.orga, { ...form(), pay: 'PAID', payMin: 300, payMax: 100 })
		).rejects.toThrow(/fourchette/);
	}, 60_000);

	it('scénario 1 : batteur régulier ; « de temps en temps » écarté, l’inconnu jamais', async () => {
		const { id } = await createOpportunity(ids.lea, {
			kind: 'RECRUIT_MEMBER',
			title: 'Batteur rock régulier',
			description: 'Groupe de rock à Toulouse, répète chaque semaine, cherche batteur.',
			radiusKm: 25,
			durationDays: 14,
			slots: 1,
			commitment: 'REGULAR',
			presence: 'REMOTE'
		});
		// La présence ne s'applique pas à une annonce de musicien·nes.
		expect(await db.opportunity.findUniqueOrThrow({ where: { id } })).toMatchObject({
			commitment: 'REGULAR',
			presence: null
		});
		await db.musicianProfile.create({ data: { personId: ids.jo, commitment: 'OCCASIONAL' } });
		await expect(applyTo(ids.jo, id, 'Je joue de temps en temps, ça peut aller ?')).rejects.toThrow(
			/engagement régulier/
		);
		await db.musicianProfile.update({
			where: { personId: ids.jo },
			data: { commitment: 'REGULAR' }
		});
		await applyTo(ids.jo, id, 'Batteur, je répète chaque semaine, dispo le mardi.');
		// Sans engagement déclaré : on peut postuler.
		await applyTo(ids.orga, id, 'Je n’ai rien précisé, mais je suis motivé.');
		expect(await db.application.count({ where: { opportunityId: id } })).toBe(2);
		// Revérifié sous verrou : une annonce clôturée refuse, rien n'est créé.
		await db.opportunity.update({ where: { id }, data: { status: 'CLOSED' } });
		await expect(applyTo(ids.kid, id, 'Je postule après la clôture.')).rejects.toThrow(
			/plus ouverte/
		);
		expect(await db.application.count({ where: { opportunityId: id } })).toBe(2);
	}, 60_000);
});
