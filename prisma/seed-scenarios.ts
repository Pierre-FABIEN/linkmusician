// LINKMUSICIAN : scénarios de démonstration, joués par `npm run seed:demo`
// après la création des musicien·nes. Chaque scénario fait vivre une
// fonctionnalité, pour voir des profils intéressants en se connectant avec
// un compte de démo (ou avec le sien, `--avec-moi`).
//
// | Scénario                                   | Où le voir                                         |
// | ------------------------------------------ | -------------------------------------------------- |
// | Les Rats du Mardi : groupe formé, effectif | `/@les-rats-du-mardi`, `/groupes/les-rats-du-mardi` |
// |   passé, étapes déclarées, corroborées,    |   (malik-batterie : « Prouver », demandes)         |
// |   une confirmation demandée, une démo à    | `/etapes/…` (samir-son), `/moderation` (démo)      |
// |   vérifier, morceau à plusieurs, annonce   | `/annonces` (« Les Rats cherchent… »)              |
// | Néon Lagune : groupe en formation, idée    | `/groupes` (hugo-dj : invitation), `/morceaux`     |
// |   de morceau, rôle à pourvoir              |   (nora-prod)                                      |
// | Deux jams passées (une tardive, un atelier | `/jam/carnet`, `/jams/…/presents`, profils         |
// |   à la MJC avec une mineure), appréciations|   (appréciations, succès Noctambule)               |
// | Jams de démo réparties sur le mois restant | `/jam` (plusieurs jours marqués)                    |
// | Deux jams à venir, formation, matériel     | `/jam` (clara-guitare : lead ; ines-chant : invitée)|
// | « Je suis dispo »                          | `/jam` (zoe, kevin, hugo)                          |
// | Collaborations confirmées et à confirmer   | `/espace`, conversations (ines, clara, kevin)      |
// | Contacts et groupes de contacts            | `/messages/contacts` (malik, awa)                  |
// | Messagerie à trois messages                | hugo-dj (3 envoyés), manon-ukulele (à répondre)    |
//
// Toute la progression passe par le vrai moteur (`emitAndProcess`) : aucune
// XP, aucun niveau, aucune confiance écrits à la main. Rejouable : rien ne
// se refait si le groupe « Les Rats du Mardi » existe déjà.
import type { PrismaClient, Prisma } from '@prisma/client';
import type { Commune } from '../src/lib/geo/fuzz';
import { setActorLocation } from '../src/lib/server/geo/queries';
import { emitAndProcess } from '../src/lib/server/progression/processor';
import type { NewDomainEvent } from '../src/lib/server/progression/events';
import { venueNameKey } from '../src/lib/venues/rules';
import { JAM_QUALITY_LABELS } from '../src/lib/jam/afterJam';
import { COLLAB_QUALITY_LABELS } from '../src/lib/collaborations/endorse';
import { pairKey } from '../src/lib/messaging/rules';
import { demoJamStartsThisMonth } from '../src/lib/jam/demoJamDates';

export const DAY = 24 * 60 * 60 * 1000;
const BAND = 'les-rats-du-mardi';

/** Il y a `days` jours, à `hour` h (UTC) ; jamais dans le futur pour un passé. */
export function ago(days: number, hour = 12, minute = 0) {
	const now = Date.now();
	const d = new Date(now - days * DAY);
	d.setUTCHours(hour, minute, 0, 0);
	if (days >= 0 && d.getTime() > now) return new Date(now - 60 * 60 * 1000);
	return d;
}
export const inDays = (days: number, hour = 12, minute = 0) => ago(-days, hour, minute);

export type Ctx = {
	prisma: PrismaClient;
	commune: Commune;
	/** Acteur de chaque personnage, par handle. */
	who: Map<string, string>;
	/** Instrument principal de chaque personnage. */
	plays: Map<string, string>;
	me: { actorId: string; displayName: string } | null;
};

export async function emit(prisma: PrismaClient, event: NewDomainEvent) {
	return prisma.$transaction((tx) => emitAndProcess(tx, event), { timeout: 30_000 });
}

export function id(ctx: Ctx, handle: string) {
	const actorId = ctx.who.get(handle);
	if (!actorId) throw new Error(`Personnage absent : ${handle}`);
	return actorId;
}

export async function instrumentId(prisma: PrismaClient, slug: string) {
	return (await prisma.instrument.findUniqueOrThrow({ where: { slug }, select: { id: true } })).id;
}

// ─── Lieux ───────────────────────────────────────────────────────────────

export async function venue(
	ctx: Ctx,
	name: string,
	kind: Prisma.VenueCreateInput['kind'],
	by: string
) {
	const { commune } = ctx;
	const { lat, lng } = commune.centre;
	const data = {
		name,
		nameKey: venueNameKey(name),
		kind,
		communeCode: commune.code,
		communeName: commune.nom,
		departmentCode: commune.codeDepartement,
		lat,
		lng,
		createdById: id(ctx, by),
		validatedAt: new Date(),
		backline:
			kind === 'BAR'
				? (['DRUMS', 'BASS_AMP', 'GUITAR_AMP', 'PA_MICS'] as (
						'DRUMS' | 'BASS_AMP' | 'GUITAR_AMP' | 'PA_MICS'
					)[])
				: []
	};
	return ctx.prisma.venue.upsert({
		where: { communeCode_nameKey: { communeCode: commune.code, nameKey: data.nameKey } },
		create: data,
		update: {},
		select: { id: true }
	});
}

// ─── Jams ────────────────────────────────────────────────────────────────

export type JamSpec = {
	issuer: string;
	lead?: string;
	venueId: string;
	title: string;
	description: string;
	genre: string;
	startsAt: Date;
	endsAt: Date;
	spots: [slug: string, count: number][];
	backline: ('DRUMS' | 'BASS_AMP' | 'GUITAR_AMP' | 'KEYBOARD' | 'PA_MICS' | 'CABLES')[];
};

export async function jam(ctx: Ctx, spec: JamSpec) {
	const { prisma } = ctx;
	const spots = await Promise.all(
		spec.spots.map(async ([slug, count]) => ({
			instrumentId: await instrumentId(prisma, slug),
			count
		}))
	);
	return prisma.opportunity.create({
		data: {
			issuerActorId: id(ctx, spec.issuer),
			postedById: id(ctx, spec.issuer),
			leadActorId: spec.lead ? id(ctx, spec.lead) : null,
			kind: 'JAM',
			status: 'OPEN',
			title: spec.title,
			description: spec.description,
			genreSlug: spec.genre,
			startsAt: spec.startsAt,
			endsAt: spec.endsAt,
			expiresAt: spec.endsAt,
			venueId: spec.venueId,
			backline: spec.backline,
			slots: spec.spots.reduce((n, [, c]) => n + c, 0),
			createdAt: new Date(spec.startsAt.getTime() - 7 * DAY),
			jamSpots: { create: spots }
		},
		select: { id: true, startsAt: true, endsAt: true }
	});
}

async function seedMonthlyJams(
	ctx: Ctx,
	venues: { barId: string; mjcId: string; studioId: string }
) {
	const starts = demoJamStartsThisMonth(new Date());
	const templates: Omit<JamSpec, 'startsAt' | 'endsAt'>[] = [
		{
			issuer: 'malik-batterie',
			lead: 'malik-batterie',
			venueId: venues.barId,
			title: 'Bœuf funk de quartier',
			description: 'Jam de démonstration ouverte : funk, soul et improvisation.',
			genre: 'funk',
			spots: [
				['basse', 1],
				['chant', 1],
				['saxophone-tenor', 1]
			],
			backline: ['DRUMS', 'BASS_AMP', 'GUITAR_AMP', 'PA_MICS']
		},
		{
			issuer: 'awa-clavier',
			lead: 'awa-clavier',
			venueId: venues.mjcId,
			title: 'Atelier pop à la MJC',
			description: 'Jam de démonstration tous niveaux, dans une ambiance détendue.',
			genre: 'pop',
			spots: [
				['batterie', 1],
				['guitare-acoustique', 1],
				['chant', 1]
			],
			backline: ['DRUMS', 'KEYBOARD', 'PA_MICS']
		},
		{
			issuer: 'samir-son',
			lead: 'samir-son',
			venueId: venues.studioId,
			title: 'Jam rock au studio',
			description:
				'Jam de démonstration rock : viens jouer et rencontrer les musicien·nes du coin.',
			genre: 'rock',
			spots: [
				['batterie', 1],
				['basse', 1],
				['guitare-acoustique', 1]
			],
			backline: ['DRUMS', 'GUITAR_AMP', 'CABLES']
		}
	];
	let created = 0;

	for (const [index, startsAt] of starts.entries()) {
		const template = templates[index % templates.length];
		const title = `${template.title} · Démo ${String(index + 1).padStart(2, '0')}`;
		const issuerActorId = id(ctx, template.issuer);
		const existing = await ctx.prisma.opportunity.findFirst({
			where: {
				kind: 'JAM',
				issuerActorId,
				venueId: template.venueId,
				title,
				startsAt
			},
			select: { id: true }
		});
		if (existing) continue;

		await jam(ctx, {
			...template,
			title,
			startsAt,
			endsAt: new Date(startsAt.getTime() + 2 * 60 * 60 * 1000)
		});
		created += 1;
	}

	console.log(
		`  · jams de démo du mois : ${created} créée(s), ${starts.length} au total autour de ${ctx.commune.nom}`
	);
}

/** « J'y étais » : présence, puis l'événement (succès fun, sans XP). */
export async function attended(
	ctx: Ctx,
	jamRow: { id: string; endsAt: Date | null },
	actorId: string,
	slug: string,
	lateNight: boolean
) {
	const at = new Date((jamRow.endsAt ?? new Date()).getTime() + 2 * 60 * 60 * 1000);
	await ctx.prisma.jamAttendance.create({
		data: {
			opportunityId: jamRow.id,
			actorId,
			instrumentId: await instrumentId(ctx.prisma, slug),
			attendedAt: at,
			createdAt: new Date(at.getTime() - 3 * DAY)
		}
	});
	const instruments = await ctx.prisma.jamAttendance.findMany({
		where: { actorId, attendedAt: { not: null }, removedAt: null, instrumentId: { not: null } },
		distinct: ['instrumentId'],
		select: { instrumentId: true }
	});
	await emit(ctx.prisma, {
		type: 'jam.attended',
		actorId,
		jamId: jamRow.id,
		lateNight,
		distinctInstruments: instruments.length,
		ledFullLineup: false,
		occurredAt: at
	});
}

/** Appréciation après une jam (≈ 40 XP, par le moteur). */
export async function appreciate(
	ctx: Ctx,
	jamId: string,
	from: string,
	to: string,
	quality: keyof typeof JAM_QUALITY_LABELS,
	at: Date
) {
	const row = await ctx.prisma.jamEndorsement.create({
		data: { opportunityId: jamId, fromActorId: from, toActorId: to, quality, createdAt: at }
	});
	const result = await emit(ctx.prisma, {
		type: 'endorsement.received',
		actorId: to,
		endorserId: from,
		skill: JAM_QUALITY_LABELS[quality],
		jamId,
		occurredAt: at
	});
	await ctx.prisma.jamEndorsement.update({
		where: { id: row.id },
		data: { eventId: result.eventId }
	});
}

export async function keep(ctx: Ctx, owner: string, contact: string, at: Date) {
	// Carnet de contacts (D82).
	await ctx.prisma.savedContact.upsert({
		where: { ownerId_contactId: { ownerId: owner, contactId: contact } },
		create: { ownerId: owner, contactId: contact, createdAt: at },
		update: {}
	});
}

// ─── Conversations ───────────────────────────────────────────────────────

/**
 * Une conversation à deux. `answered` : l'autre a répondu (ouverte des deux
 * côtés) ; sinon c'est un premier contact en attente (D44).
 */
export async function talk(
	ctx: Ctx,
	from: string,
	to: string,
	lines: [sender: 'from' | 'to', body: string][],
	start: Date
) {
	const answered = lines.some(([s]) => s === 'to');
	const at = (i: number) => new Date(start.getTime() + i * 47 * 60 * 1000);
	const firstReply = lines.findIndex(([s]) => s === 'to');
	const conversation = await ctx.prisma.conversation.create({
		data: {
			pairKey: pairKey(from, to),
			initiatorId: from,
			createdAt: start,
			lastMessageAt: at(lines.length - 1),
			reciprocatedAt: answered ? at(firstReply) : null,
			participants: {
				create: [
					{ actorId: from, state: 'ACCEPTED', lastReadAt: at(lines.length - 1) },
					{
						actorId: to,
						state: answered ? 'ACCEPTED' : 'REQUEST',
						lastReadAt: answered ? at(lines.length - 1) : null
					}
				]
			},
			messages: {
				create: lines.map(([s, body], i) => ({
					senderActorId: s === 'from' ? from : to,
					body,
					createdAt: at(i)
				}))
			}
		},
		select: { id: true }
	});
	if (answered) {
		for (const [a, b] of [
			[from, to],
			[to, from]
		]) {
			await emit(ctx.prisma, {
				type: 'conversation.reciprocated',
				actorId: a,
				counterpartId: b,
				fromOpportunity: false,
				occurredAt: at(firstReply)
			});
		}
	} else {
		await ctx.prisma.notification.create({
			data: {
				recipientActorId: to,
				type: 'CONTACT_REQUEST',
				fromActorId: from,
				href: `/messages/${conversation.id}`,
				createdAt: start
			}
		});
	}
	return conversation;
}

/** Théo et Samir préparent l'enregistrement (exporté pour compléter une base déjà semée). */
export async function theoSamir(ctx: Ctx, start: Date) {
	return talk(
		ctx,
		id(ctx, 'theo-basse'),
		id(ctx, 'samir-son'),
		[
			['from', 'Salut Samir, tu pourrais nous enregistrer une démo trois titres à La Cave ?'],
			['to', 'Avec plaisir, je bloque le samedi. Venez à 14 h.']
		],
		start
	);
}

// ─── Collaborations ──────────────────────────────────────────────────────

async function collaboration(
	ctx: Ctx,
	spec: {
		a: string;
		b: string;
		kind: 'REHEARSAL' | 'SESSION_WORK' | 'RECORDING' | 'GIG';
		title: string;
		day: Date;
		conversationId: string;
		completed: boolean;
	}
) {
	const confirmedAt = new Date(spec.day.getTime() + DAY);
	const collab = await ctx.prisma.collaboration.create({
		data: {
			kind: spec.kind,
			status: spec.completed ? 'COMPLETED' : 'PROPOSED',
			title: spec.title,
			happenedOn: spec.day,
			proposedById: spec.a,
			conversationId: spec.conversationId,
			completedAt: spec.completed ? confirmedAt : null,
			createdAt: spec.day,
			participants: {
				create: [
					{ actorId: spec.a, acceptedAt: spec.day, confirmedCompletionAt: spec.day },
					{
						actorId: spec.b,
						acceptedAt: spec.completed ? spec.day : null,
						confirmedCompletionAt: spec.completed ? confirmedAt : null
					}
				]
			}
		},
		select: { id: true }
	});
	if (spec.completed) {
		await emit(ctx.prisma, {
			type: 'collaboration.completed',
			collaborationId: collab.id,
			participantIds: [spec.a, spec.b],
			occurredAt: confirmedAt
		});
	} else {
		await ctx.prisma.notification.create({
			data: {
				recipientActorId: spec.b,
				type: 'COLLAB_TO_CONFIRM',
				fromActorId: spec.a,
				href: `/messages/${spec.conversationId}`,
				title: spec.title,
				createdAt: spec.day
			}
		});
	}
	return collab;
}

async function appreciateCollab(
	ctx: Ctx,
	collaborationId: string,
	from: string,
	to: string,
	quality: keyof typeof COLLAB_QUALITY_LABELS,
	at: Date
) {
	const row = await ctx.prisma.collabEndorsement.create({
		data: { collaborationId, fromActorId: from, toActorId: to, quality, createdAt: at }
	});
	const result = await emit(ctx.prisma, {
		type: 'endorsement.received',
		actorId: to,
		endorserId: from,
		skill: COLLAB_QUALITY_LABELS[quality],
		collaborationId,
		occurredAt: at
	});
	await ctx.prisma.collabEndorsement.update({
		where: { id: row.id },
		data: { eventId: result.eventId }
	});
}

// ─── Groupes ─────────────────────────────────────────────────────────────

async function band(
	ctx: Ctx,
	spec: { handle: string; name: string; bio: string; genres: string[]; createdAt: Date }
) {
	const genres = await ctx.prisma.genre.findMany({ where: { slug: { in: spec.genres } } });
	const actor = await ctx.prisma.actor.create({
		data: {
			kind: 'ORGANIZATION',
			handle: spec.handle,
			displayName: spec.name,
			bio: spec.bio,
			createdAt: spec.createdAt,
			organization: { create: { kind: 'BAND', createdAt: spec.createdAt } },
			genres: { create: genres.map((g) => ({ genreId: g.id })) }
		},
		select: { id: true }
	});
	await setActorLocation(actor.id, ctx.commune, { db: ctx.prisma });
	return actor.id;
}

async function definitionVersion(prisma: PrismaClient, key: string) {
	const def = await prisma.milestoneDefinition.findUnique({ where: { id: key } });
	if (!def) throw new Error('Référentiel des étapes absent : lance `npm run seed:referentiels`.');
	return def.version;
}

/** Une étape : la ligne, puis l'XP par le moteur (déclarée, puis renforcée). */
async function milestone(
	ctx: Ctx,
	spec: {
		bandId: string;
		key:
			| 'FORMATION'
			| 'FIRST_REHEARSAL'
			| 'FIRST_COMPOSITION'
			| 'FIRST_RECORDING'
			| 'FIRST_PUBLIC_DEMO'
			| 'FIRST_GIG';
		occurredAt: Date;
		note?: string;
		declaredBy?: string;
		workId?: string;
		/** Niveaux successifs : `['DECLARED', 'CORROBORATED']`, `['VERIFIED']`… */
		steps: ('DECLARED' | 'CORROBORATED' | 'VERIFIED')[];
		memberIds: string[];
		/** Date de chaque passage (par défaut : la date de l'étape). */
		at?: Date[];
	}
) {
	const row = await ctx.prisma.milestone.create({
		data: {
			definitionId: spec.key,
			bandId: spec.bandId,
			proof: spec.steps[spec.steps.length - 1],
			occurredAt: spec.occurredAt,
			note: spec.note ?? null,
			declaredById: spec.declaredBy ?? null,
			workId: spec.workId ?? null,
			definitionVersion: await definitionVersion(ctx.prisma, spec.key),
			createdAt: spec.occurredAt
		},
		select: { id: true }
	});
	let from: 'DECLARED' | 'CORROBORATED' | 'VERIFIED' | null = null;
	for (const [i, to] of spec.steps.entries()) {
		await emit(ctx.prisma, {
			type: 'milestone.attested',
			bandId: spec.bandId,
			milestone: spec.key,
			from,
			to,
			memberIds: spec.memberIds,
			occurredAt: spec.at?.[i] ?? spec.occurredAt
		});
		from = to;
	}
	return row.id;
}

// ─── Les scénarios ───────────────────────────────────────────────────────

/** Contexte des scénarios : chaque personnage de démo, son acteur et son instrument. */
export async function demoContext(
	prisma: PrismaClient,
	commune: Commune,
	me: { actorId: string; displayName: string } | null,
	demoHandles: ReadonlyMap<string, string> = new Map()
): Promise<Ctx> {
	const cast = await prisma.actor.findMany({
		where: { person: { user: { email: { endsWith: '@demo.linkmusician.test' } } } },
		select: {
			id: true,
			handle: true,
			person: {
				select: {
					instruments: {
						where: { isPrimary: true },
						select: { instrument: { select: { slug: true } } }
					}
				}
			}
		}
	});
	return {
		prisma,
		commune,
		who: new Map(cast.map((a) => [demoHandles.get(a.handle) ?? a.handle, a.id])),
		plays: new Map(
			cast.map((a) => [
				demoHandles.get(a.handle) ?? a.handle,
				a.person?.instruments[0]?.instrument.slug ?? ''
			])
		),
		me
	};
}

export async function seedScenarios(
	prisma: PrismaClient,
	commune: Commune,
	me: { actorId: string; displayName: string } | null,
	demoHandles: ReadonlyMap<string, string> = new Map()
) {
	const ctx = await demoContext(prisma, commune, me, demoHandles);
	const P = (h: string) => id(ctx, h);
	const play = (h: string) => ctx.plays.get(h) || 'chant';

	// D82 : Zoé enregistre Samir sans conversation ni collaboration préalable.
	// Ajouter au carnet ne crée aucun autre lien et ne prévient personne.
	await keep(ctx, P('zoe-violon'), P('samir-son'), ago(1, 12));

	// DASH-05m : scénario fictif dédié et rejouable, sans convertir les crédits existants.
	const creditDemoWork = 'demo-manual-credit-history';
	await prisma.work.upsert({
		where: { id: creditDemoWork },
		update: {},
		create: {
			id: creditDemoWork,
			ownerId: P('clara-guitare'),
			title: 'Démo : actes de crédits manuels'
		}
	});
	for (const [index, kind] of (
		['ASSIGNED', 'DECLINED', 'ASSIGNED', 'CONFIRMED', 'LEFT'] as const
	).entries()) {
		await prisma.workCreditAct.upsert({
			where: { id: `demo-manual-credit-${index}` },
			update: {},
			create: {
				id: `demo-manual-credit-${index}`,
				workId: creditDemoWork,
				periodId: `demo-manual-credit-period-${index < 2 ? 1 : 2}`,
				personId: P('ines-chant'),
				authorId: P(kind === 'ASSIGNED' ? 'clara-guitare' : 'ines-chant'),
				kind,
				occurredAt: ago(7 - index)
			}
		});
	}

	async function seedCollaborationDecisions(conversationId: string) {
		// DASH-05l : cycle fictif dédié, jamais déduit des appréciations existantes.
		const appreciationId = 'demo-collab-appreciations';
		await ctx.prisma.collaboration.upsert({
			where: { id: appreciationId },
			update: {},
			create: {
				id: appreciationId,
				kind: 'REHEARSAL',
				status: 'COMPLETED',
				title: 'Appréciations après la répétition',
				happenedOn: ago(9),
				completedAt: ago(8),
				proposedById: P('clara-guitare'),
				conversationId,
				participants: {
					create: [
						{ actorId: P('clara-guitare'), acceptedAt: ago(10), confirmedCompletionAt: ago(8) },
						{ actorId: P('ines-chant'), acceptedAt: ago(10), confirmedCompletionAt: ago(8) }
					]
				}
			}
		});
		for (const [index, kind] of (['GIVEN', 'REVOKED', 'GIVEN', 'REVOKED'] as const).entries()) {
			const actId = `demo-collab-appreciation-${index}`;
			await ctx.prisma.collaborationAppreciationAct.upsert({
				where: { id: actId },
				update: {},
				create: {
					id: actId,
					collaborationId: appreciationId,
					authorId: P('clara-guitare'),
					kind,
					occurredAt: ago(7 - index)
				}
			});
		}

		// DASH-05k : deux situations fictives explicites, sans convertir d’anciens états.
		for (const cancel of [false, true]) {
			const id = `demo-collab-decision-${cancel ? 'cancelled' : 'declined'}`;
			await ctx.prisma.collaboration.upsert({
				where: { id },
				update: {},
				create: {
					id,
					kind: 'REHEARSAL',
					status: 'CANCELLED',
					title: cancel ? 'Répétition annulée par Clara' : 'Proposition refusée par Inès',
					happenedOn: ago(10),
					proposedById: P('clara-guitare'),
					conversationId,
					participants: {
						create: [
							{
								actorId: P('clara-guitare'),
								acceptedAt: ago(15),
								cancelledAt: cancel ? ago(12) : null
							},
							{ actorId: P('ines-chant'), declinedAt: cancel ? null : ago(13) }
						]
					}
				}
			});
		}
	}

	// 1. Lieux de jam (validés).
	const bar = await venue(ctx, 'Le Bœuf du Mardi', 'BAR', 'malik-batterie');
	const mjc = await venue(ctx, 'MJC des Arts', 'MJC', 'awa-clavier');
	const studio = await venue(ctx, 'Studio La Cave', 'REHEARSAL_SPACE', 'samir-son');
	console.log('  · lieux : Le Bœuf du Mardi, MJC des Arts, Studio La Cave');
	await seedMonthlyJams(ctx, { barId: bar.id, mjcId: mjc.id, studioId: studio.id });
	if (await prisma.actor.findUnique({ where: { handle: BAND }, select: { id: true } })) {
		const conversation = await prisma.conversation.findUnique({
			where: { pairKey: pairKey(P('clara-guitare'), P('ines-chant')) },
			select: { id: true }
		});
		if (conversation) await seedCollaborationDecisions(conversation.id);
		console.log('Scénarios déjà en place (groupe « Les Rats du Mardi ») : rien d’autre à refaire.');
		return;
	}

	// 2. Jam tardive passée (21 h – 0 h 30) : appréciations, Noctambule.
	const late = await jam(ctx, {
		issuer: 'malik-batterie',
		lead: 'malik-batterie',
		venueId: bar.id,
		title: 'Bœuf funk du mardi',
		description: 'Le bœuf du mardi : funk, soul, on monte le son. Viens avec ton instrument.',
		genre: 'funk',
		startsAt: ago(12, 20),
		endsAt: ago(11, 23, 30),
		spots: [
			['basse', 1],
			['chant', 1],
			['saxophone-tenor', 1]
		],
		backline: ['DRUMS', 'BASS_AMP', 'GUITAR_AMP', 'PA_MICS']
	});
	const lateCrew = ['malik-batterie', 'theo-basse', 'zoe-violon', 'lucas-sax', 'kevin-metal'];
	for (const h of lateCrew) await attended(ctx, late, P(h), play(h), true);
	if (me) await attended(ctx, late, me.actorId, 'guitare-electrique', true);
	const afterLate = ago(10, 10);
	await appreciate(ctx, late.id, P('zoe-violon'), P('malik-batterie'), 'GROOVE', afterLate);
	await appreciate(ctx, late.id, P('malik-batterie'), P('zoe-violon'), 'IMPRO', afterLate);
	await appreciate(ctx, late.id, P('theo-basse'), P('lucas-sax'), 'LISTENING', afterLate);
	await appreciate(ctx, late.id, P('lucas-sax'), P('kevin-metal'), 'RELIABLE', afterLate);
	await appreciate(ctx, late.id, P('kevin-metal'), P('theo-basse'), 'GROOVE', afterLate);
	if (me) {
		await appreciate(ctx, late.id, P('zoe-violon'), me.actorId, 'GROOVE', afterLate);
		await appreciate(ctx, late.id, P('malik-batterie'), me.actorId, 'LISTENING', afterLate);
	}
	await keep(ctx, P('malik-batterie'), P('zoe-violon'), afterLate);
	await keep(ctx, P('malik-batterie'), P('lucas-sax'), afterLate);
	await keep(ctx, P('zoe-violon'), P('malik-batterie'), afterLate);
	await keep(ctx, P('theo-basse'), P('lucas-sax'), afterLate);
	if (me) {
		await keep(ctx, me.actorId, P('malik-batterie'), afterLate);
		await keep(ctx, me.actorId, P('zoe-violon'), afterLate);
		await keep(ctx, P('malik-batterie'), me.actorId, afterLate);
	}
	console.log('  · jam passée « Bœuf funk du mardi » : présences, appréciations, contacts');

	// 3. Atelier jam à la MJC (18 h – 20 h 30), avec une mineure.
	const workshop = await jam(ctx, {
		issuer: 'awa-clavier',
		lead: 'awa-clavier',
		venueId: mjc.id,
		title: 'Atelier jam de la MJC',
		description: 'Atelier ouvert à tous les niveaux, fini avant 21 h. On apprend à jouer ensemble.',
		genre: 'pop',
		startsAt: ago(5, 17),
		endsAt: ago(5, 19, 30),
		spots: [
			['batterie', 1],
			['ukulele', 2]
		],
		backline: ['DRUMS', 'KEYBOARD', 'PA_MICS']
	});
	const workshopCrew = [
		'awa-clavier',
		'manon-ukulele',
		'zoe-violon',
		'jade-batterie',
		'clara-guitare'
	];
	for (const h of workshopCrew) await attended(ctx, workshop, P(h), play(h), false);
	const afterWorkshop = ago(4, 10);
	await appreciate(
		ctx,
		workshop.id,
		P('manon-ukulele'),
		P('jade-batterie'),
		'GROOVE',
		afterWorkshop
	);
	await appreciate(
		ctx,
		workshop.id,
		P('awa-clavier'),
		P('manon-ukulele'),
		'LISTENING',
		afterWorkshop
	);
	await appreciate(ctx, workshop.id, P('clara-guitare'), P('zoe-violon'), 'IMPRO', afterWorkshop);
	await keep(ctx, P('awa-clavier'), P('manon-ukulele'), afterWorkshop);
	await keep(ctx, P('awa-clavier'), P('clara-guitare'), afterWorkshop);
	console.log('  · atelier jam passé à la MJC (avec jade-batterie, 16 ans)');

	// 4. Jams à venir : formation, invitation, « Je viens ».
	const next = await jam(ctx, {
		issuer: 'malik-batterie',
		lead: 'clara-guitare',
		venueId: bar.id,
		title: 'Bœuf funk du mardi',
		description: 'On remet ça ! Il manque une voix et un clavier.',
		genre: 'funk',
		startsAt: inDays(3, 19),
		endsAt: inDays(3, 22),
		spots: [
			['chant', 1],
			['piano-electrique', 1],
			['basse', 1]
		],
		backline: ['DRUMS', 'BASS_AMP', 'GUITAR_AMP', 'PA_MICS']
	});
	await prisma.jamInvite.create({
		data: {
			opportunityId: next.id,
			actorId: P('ines-chant'),
			instrumentId: await instrumentId(prisma, 'chant'),
			createdAt: ago(1)
		}
	});
	await prisma.notification.create({
		data: {
			recipientActorId: P('ines-chant'),
			type: 'JAM_INVITE',
			fromActorId: P('clara-guitare'),
			href: `/jams/${next.id}`,
			title: 'Bœuf funk du mardi',
			createdAt: ago(1)
		}
	});
	for (const h of ['theo-basse', 'lucas-sax']) {
		await prisma.jamAttendance.create({
			data: {
				opportunityId: next.id,
				actorId: P(h),
				instrumentId: await instrumentId(prisma, play(h))
			}
		});
	}
	await jam(ctx, {
		issuer: 'awa-clavier',
		lead: 'awa-clavier',
		venueId: mjc.id,
		title: 'Atelier jam de la MJC',
		description: 'Tous niveaux, fini avant 21 h : parfait pour une première jam.',
		genre: 'pop',
		startsAt: inDays(6, 16),
		endsAt: inDays(6, 18, 30),
		spots: [
			['guitare-acoustique', 2],
			['chant', 2]
		],
		backline: ['KEYBOARD', 'PA_MICS']
	});
	console.log('  · deux jams à venir (formation, invitation, « Je viens »)');

	// 5. « Je suis dispo ».
	const now = new Date();
	await prisma.availability.createMany({
		data: [
			{
				actorId: P('zoe-violon'),
				slot: 'TONIGHT',
				startsAt: now,
				endsAt: new Date(now.getTime() + 6 * 60 * 60 * 1000),
				note: 'Envie de jazz manouche ce soir'
			},
			{
				actorId: P('kevin-metal'),
				slot: 'WEEKEND',
				startsAt: now,
				endsAt: inDays(4, 22),
				note: 'Riffs lourds, ampli dans le coffre'
			},
			{ actorId: P('hugo-dj'), slot: 'TOMORROW', startsAt: inDays(1, 6), endsAt: inDays(1, 22) }
		],
		skipDuplicates: true
	});
	console.log('  · « Je suis dispo » : zoe, kevin, hugo');

	// 6. Conversations et collaborations.
	const inesClara = await talk(
		ctx,
		P('clara-guitare'),
		P('ines-chant'),
		[
			['from', 'Salut Inès ! Je cherche une voix pour une session acoustique au Café Plum.'],
			['to', 'Avec plaisir ! C’est quel répertoire ?'],
			['from', 'Folk et quelques reprises soul. Samedi 18 h ?'],
			['to', 'Parfait, à samedi !']
		],
		ago(26, 9)
	);
	const session = await collaboration(ctx, {
		a: P('clara-guitare'),
		b: P('ines-chant'),
		kind: 'SESSION_WORK',
		title: 'Session acoustique au Café Plum',
		day: ago(20, 17),
		conversationId: inesClara.id,
		completed: true
	});
	await seedCollaborationDecisions(inesClara.id);
	await appreciateCollab(ctx, session.id, P('clara-guitare'), P('ines-chant'), 'PREPARED', ago(19));
	await appreciateCollab(
		ctx,
		session.id,
		P('ines-chant'),
		P('clara-guitare'),
		'GOOD_VIBE',
		ago(19)
	);
	const theoAwa = await talk(
		ctx,
		P('theo-basse'),
		P('awa-clavier'),
		[
			['from', 'Hello Awa, une répète groove jeudi au Studio La Cave ?'],
			['to', 'Oui ! J’apporte mon Rhodes.']
		],
		ago(45, 18)
	);
	await collaboration(ctx, {
		a: P('theo-basse'),
		b: P('awa-clavier'),
		kind: 'REHEARSAL',
		title: 'Répète groove au Studio La Cave',
		day: ago(40, 19),
		conversationId: theoAwa.id,
		completed: true
	});
	const lucasKevin = await talk(
		ctx,
		P('lucas-sax'),
		P('kevin-metal'),
		[
			['from', 'Kevin, ça te dirait un projet ska-punk ?'],
			['to', 'Grave ! On fait une première répète ?']
		],
		ago(6, 20)
	);
	await collaboration(ctx, {
		a: P('lucas-sax'),
		b: P('kevin-metal'),
		kind: 'REHEARSAL',
		title: 'Première répète ska-punk',
		day: ago(2, 19),
		conversationId: lucasKevin.id,
		completed: false
	});
	await talk(
		ctx,
		P('malik-batterie'),
		P('zoe-violon'),
		[
			['from', 'Super jam mardi ! Ton impro sur le dernier morceau, waouh.'],
			['to', 'Merci ! On rejoue ensemble bientôt ?'],
			['from', 'Carrément, je t’ai mise dans mon groupe « Projet jazz-funk ».']
		],
		ago(10, 14)
	);
	// Samir (ingé son) a échangé avec Théo : confiance TL1, il pourra
	// confirmer le premier enregistrement des Rats.
	await theoSamir(ctx, ago(15, 10));
	// D44 : Hugo a envoyé 3 messages à Manon, qui n'a pas encore répondu.
	await talk(
		ctx,
		P('hugo-dj'),
		P('manon-ukulele'),
		[
			['from', 'Salut Manon ! J’ai vu ta vidéo au ukulélé, super.'],
			['from', 'Je mixe de l’électro-folk, ça t’irait d’essayer un morceau ensemble ?'],
			['from', 'Je suis dispo demain si tu veux en parler.']
		],
		ago(1, 16)
	);
	await talk(
		ctx,
		P('kevin-metal'),
		P('ines-chant'),
		[['from', 'Salut Inès, tu chanterais sur un morceau metal-prog ?']],
		ago(0, 8)
	);
	console.log(
		'  · conversations, collaborations (confirmées, à confirmer), trois messages en attente'
	);

	// 7. Les Rats du Mardi : groupe formé, effectif passé, étapes, morceau.
	const rats = await band(ctx, {
		handle: BAND,
		name: 'Les Rats du Mardi',
		bio: 'Funk-rock toulousain né d’un bœuf du mardi. On répète au Studio La Cave.',
		genres: ['funk', 'rock'],
		createdAt: ago(80)
	});
	const formedAt = ago(75);
	await prisma.organization.update({ where: { actorId: rats }, data: { formedAt } });
	const join = async (
		h: string,
		role: 'OWNER' | 'ADMIN' | 'MEMBER',
		startedAt: Date,
		title: string,
		endedAt?: Date
	) =>
		prisma.membership.create({
			data: {
				orgId: rats,
				personId: P(h),
				role,
				title,
				status: endedAt ? 'LEFT' : 'ACTIVE',
				startedAt,
				endedAt: endedAt ?? null,
				createdAt: startedAt
			}
		});
	await join('malik-batterie', 'OWNER', ago(80), 'batterie');
	await join('theo-basse', 'ADMIN', formedAt, 'basse');
	await join('lucas-sax', 'MEMBER', ago(70), 'saxophone', ago(30));
	await join('ines-chant', 'MEMBER', ago(60), 'chant');
	await join('clara-guitare', 'MEMBER', ago(40), 'guitare');
	// Formation : adhésions et étape vérifiée (comme `afterJoin`).
	for (const h of ['malik-batterie', 'theo-basse']) {
		await emit(prisma, {
			type: 'membership.accepted',
			personId: P(h),
			bandId: rats,
			occurredAt: formedAt
		});
	}
	await milestone(ctx, {
		bandId: rats,
		key: 'FORMATION',
		occurredAt: formedAt,
		steps: ['VERIFIED'],
		memberIds: [P('malik-batterie'), P('theo-basse')]
	});
	for (const [h, at] of [
		['lucas-sax', ago(70)],
		['ines-chant', ago(60)],
		['clara-guitare', ago(40)]
	] as const) {
		await emit(prisma, {
			type: 'membership.accepted',
			personId: P(h),
			bandId: rats,
			occurredAt: at
		});
	}

	// Première répétition : déclarée, confirmée par Théo (membre présent).
	const rehearsal = await milestone(ctx, {
		bandId: rats,
		key: 'FIRST_REHEARSAL',
		occurredAt: ago(72, 18),
		note: 'Au Studio La Cave',
		declaredBy: P('malik-batterie'),
		steps: ['DECLARED', 'CORROBORATED'],
		at: [ago(71), ago(70)],
		memberIds: [P('malik-batterie'), P('theo-basse')]
	});
	await prisma.milestoneAttestation.create({
		data: {
			milestoneId: rehearsal,
			attesterId: P('theo-basse'),
			requestedById: P('malik-batterie'),
			role: 'MEMBER',
			status: 'CONFIRMED',
			createdAt: ago(71),
			answeredAt: ago(70)
		}
	});
	await emit(prisma, {
		type: 'milestone.attestation_confirmed',
		bandId: rats,
		milestoneId: rehearsal,
		attesterId: P('theo-basse'),
		requesterId: P('malik-batterie'),
		occurredAt: ago(70)
	});

	// Morceau « Mardi soir », composé à trois : corroboré, et « Première composition ».
	const demoMedia = await prisma.media.create({
		data: {
			actorId: rats,
			kind: 'EXTERNAL_LINK',
			status: 'PUBLISHED',
			provider: 'YOUTUBE',
			externalUrl: 'https://www.youtube.com/watch?v=3GwjfUFyY6M',
			title: 'Mardi soir (maquette)',
			isDemo: false,
			publishedAt: ago(50)
		}
	});
	const work = await prisma.work.create({
		data: {
			ownerId: rats,
			createdById: P('malik-batterie'),
			title: 'Mardi soir',
			state: 'COMPOSED',
			proof: 'CORROBORATED',
			demoMediaId: demoMedia.id,
			composedAt: ago(50),
			createdAt: ago(58),
			genres: {
				create: [
					{ genreId: (await prisma.genre.findUniqueOrThrow({ where: { slug: 'funk' } })).id }
				]
			}
		}
	});
	for (const [h, kind, slug] of [
		['malik-batterie', 'INSTRUMENT', 'batterie'],
		['theo-basse', 'INSTRUMENT', 'basse'],
		['ines-chant', 'LYRICS', null]
	] as const) {
		const contributor = await prisma.workContributor.create({
			data: {
				workId: work.id,
				personId: P(h),
				invitedById: h === 'malik-batterie' ? null : P('malik-batterie'),
				confirmedAt: ago(51)
			}
		});
		await prisma.workRole.create({
			data: {
				workId: work.id,
				kind,
				instrumentId: slug ? await instrumentId(prisma, slug) : null,
				contributorId: contributor.id
			}
		});
	}
	await emit(prisma, {
		type: 'work.composed',
		workId: work.id,
		contributorIds: [P('malik-batterie'), P('theo-basse'), P('ines-chant')],
		occurredAt: ago(50)
	});
	await milestone(ctx, {
		bandId: rats,
		key: 'FIRST_COMPOSITION',
		occurredAt: ago(50),
		workId: work.id,
		steps: ['CORROBORATED'],
		memberIds: [P('malik-batterie'), P('theo-basse'), P('lucas-sax'), P('ines-chant')]
	});

	// Premier concert : lien de l'événement et confirmation d'Awa (hors groupe).
	const gig = await milestone(ctx, {
		bandId: rats,
		key: 'FIRST_GIG',
		occurredAt: ago(25, 20),
		note: 'Au Bœuf du Mardi, en première partie',
		declaredBy: P('malik-batterie'),
		steps: ['DECLARED', 'CORROBORATED'],
		at: [ago(24), ago(22)],
		memberIds: [P('malik-batterie'), P('theo-basse'), P('ines-chant'), P('clara-guitare')]
	});
	await prisma.milestoneEvidence.create({
		data: {
			milestoneId: gig,
			kind: 'EVENT',
			url: 'https://www.instagram.com/p/les-rats-du-mardi-premiere-partie/',
			addedById: P('malik-batterie'),
			status: 'ACCEPTED',
			createdAt: ago(24)
		}
	});
	await prisma.milestoneAttestation.create({
		data: {
			milestoneId: gig,
			attesterId: P('awa-clavier'),
			requestedById: P('malik-batterie'),
			role: 'OUTSIDER',
			status: 'CONFIRMED',
			createdAt: ago(24),
			answeredAt: ago(22)
		}
	});
	await emit(prisma, {
		type: 'milestone.attestation_confirmed',
		bandId: rats,
		milestoneId: gig,
		attesterId: P('awa-clavier'),
		requesterId: P('malik-batterie'),
		occurredAt: ago(22)
	});

	// Premier enregistrement : déclaré, confirmation demandée (en attente).
	const recording = await milestone(ctx, {
		bandId: rats,
		key: 'FIRST_RECORDING',
		occurredAt: ago(10, 15),
		note: 'Démo trois titres au Studio La Cave',
		declaredBy: P('theo-basse'),
		steps: ['DECLARED'],
		memberIds: [P('malik-batterie'), P('theo-basse'), P('ines-chant'), P('clara-guitare')]
	});
	const askers = [P('samir-son'), ...(me ? [me.actorId] : [])];
	for (const attesterId of askers) {
		await prisma.milestoneAttestation.create({
			data: {
				milestoneId: recording,
				attesterId,
				requestedById: P('theo-basse'),
				role: 'OUTSIDER',
				createdAt: ago(2)
			}
		});
		await prisma.notification.create({
			data: {
				recipientActorId: attesterId,
				type: 'MILESTONE_ATTEST',
				fromActorId: P('theo-basse'),
				href: `/etapes/${recording}`,
				title: 'Premier enregistrement de Les Rats du Mardi',
				createdAt: ago(2)
			}
		});
	}

	// Première démo publique : lien d'écoute en attente de modération.
	const demo = await milestone(ctx, {
		bandId: rats,
		key: 'FIRST_PUBLIC_DEMO',
		occurredAt: ago(5),
		note: 'Sur Bandcamp',
		declaredBy: P('malik-batterie'),
		steps: ['DECLARED'],
		memberIds: [P('malik-batterie'), P('theo-basse'), P('ines-chant'), P('clara-guitare')]
	});
	await prisma.milestoneEvidence.create({
		data: {
			milestoneId: demo,
			kind: 'LISTEN',
			url: 'https://lesratsdumardi.bandcamp.com/track/mardi-soir',
			addedById: P('malik-batterie'),
			status: 'PENDING',
			createdAt: ago(4)
		}
	});

	// Le groupe recrute un clavier ; Awa a postulé.
	const recruit = await prisma.opportunity.create({
		data: {
			issuerActorId: rats,
			postedById: P('malik-batterie'),
			kind: 'RECRUIT_MEMBER',
			title: 'Les Rats du Mardi cherchent un·e claviériste',
			description: 'Funk-rock, répètes le jeudi soir au Studio La Cave, concerts en vue.',
			instrumentId: await instrumentId(prisma, 'piano-electrique'),
			minLevel: 3,
			genreSlug: 'funk',
			expiresAt: inDays(20),
			createdAt: ago(3)
		}
	});
	await prisma.application.create({
		data: {
			opportunityId: recruit.id,
			applicantActorId: P('awa-clavier'),
			message:
				'Bonjour ! Je joue du Rhodes depuis 8 ans, j’ai confirmé votre premier concert : j’adore votre son.',
			createdAt: ago(2)
		}
	});
	await prisma.notification.create({
		data: {
			recipientActorId: P('malik-batterie'),
			type: 'APPLICATION_RECEIVED',
			fromActorId: P('awa-clavier'),
			href: `/annonces/${recruit.id}`,
			title: recruit.title,
			createdAt: ago(2)
		}
	});
	if (me) {
		await prisma.membership.create({
			data: {
				orgId: rats,
				personId: me.actorId,
				status: 'INVITED',
				invitedById: P('malik-batterie'),
				title: 'guitare',
				createdAt: ago(1)
			}
		});
		await prisma.notification.create({
			data: {
				recipientActorId: me.actorId,
				type: 'BAND_INVITE',
				fromActorId: P('malik-batterie'),
				href: `/groupes/${BAND}`,
				title: 'Les Rats du Mardi',
				createdAt: ago(1)
			}
		});
	}
	console.log(
		'  · Les Rats du Mardi : effectif, étapes (vérifiée, corroborées, en attente), morceau, annonce'
	);

	// 8. Néon Lagune : en formation, invitation, idée de morceau.
	const neon = await band(ctx, {
		handle: 'neon-lagune',
		name: 'Néon Lagune',
		bio: 'Électro-pop rêveuse. On cherche une voix.',
		genres: ['electro-pop', 'electro'],
		createdAt: ago(9)
	});
	await prisma.membership.create({
		data: {
			orgId: neon,
			personId: P('nora-prod'),
			role: 'OWNER',
			status: 'ACTIVE',
			title: 'production',
			startedAt: ago(9),
			createdAt: ago(9)
		}
	});
	await prisma.membership.create({
		data: {
			orgId: neon,
			personId: P('hugo-dj'),
			status: 'INVITED',
			invitedById: P('nora-prod'),
			title: 'DJ, machines',
			createdAt: ago(2)
		}
	});
	await prisma.notification.create({
		data: {
			recipientActorId: P('hugo-dj'),
			type: 'BAND_INVITE',
			fromActorId: P('nora-prod'),
			href: '/groupes/neon-lagune',
			title: 'Néon Lagune',
			createdAt: ago(2)
		}
	});
	const idea = await prisma.work.create({
		data: {
			ownerId: neon,
			createdById: P('nora-prod'),
			title: 'Lagune',
			state: 'IDEA',
			createdAt: ago(7)
		}
	});
	const noraCredit = await prisma.workContributor.create({
		data: { workId: idea.id, personId: P('nora-prod'), confirmedAt: ago(7) }
	});
	await prisma.workRole.create({
		data: { workId: idea.id, kind: 'COMPOSITION', contributorId: noraCredit.id }
	});
	await prisma.workRole.create({
		data: { workId: idea.id, kind: 'INSTRUMENT', instrumentId: await instrumentId(prisma, 'chant') }
	});
	console.log(
		'  · Néon Lagune : en formation, hugo invité, idée « Lagune » avec une voix à pourvoir'
	);

	// 9. Groupes de contacts.
	const jazzFunk = await prisma.contactGroup.create({
		data: { ownerId: P('malik-batterie'), name: 'Projet jazz-funk', createdAt: ago(9) }
	});
	await prisma.contactGroupMember.createMany({
		data: [
			{ groupId: jazzFunk.id, contactId: P('zoe-violon') },
			{ groupId: jazzFunk.id, contactId: P('lucas-sax') }
		]
	});
	const subs = await prisma.contactGroup.create({
		data: { ownerId: P('awa-clavier'), name: 'Remplaçant·es', createdAt: ago(3) }
	});
	await prisma.contactGroupMember.createMany({
		data: [
			{ groupId: subs.id, contactId: P('manon-ukulele') },
			{ groupId: subs.id, contactId: P('clara-guitare') }
		]
	});
	if (me) {
		const funk = await prisma.contactGroup.create({
			data: { ownerId: me.actorId, name: 'Projet funk' }
		});
		await prisma.contactGroupMember.createMany({
			data: [
				{ groupId: funk.id, contactId: P('malik-batterie') },
				{ groupId: funk.id, contactId: P('zoe-violon') }
			]
		});
		// Zoé t'écrit (premier contact, à toi de répondre).
		await talk(
			ctx,
			P('zoe-violon'),
			me.actorId,
			[
				['from', `Coucou ${me.displayName.split(' ')[0]} ! C’était top mardi.`],
				['from', 'Tu serais partant·e pour une session violon-guitare ?']
			],
			ago(0, 9)
		);
	}
	console.log('  · groupes de contacts : « Projet jazz-funk » (malik), « Remplaçant·es » (awa)');
	if (me)
		console.log(
			`  · avec toi (${me.displayName}) : jam, appréciations, contacts, invitation, confirmation demandée, message`
		);
}
