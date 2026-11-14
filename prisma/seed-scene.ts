// LINKMUSICIAN : vie pro et scène (phases 4 et 5), jouée par `npm run seed:demo`
// après les scénarios et la vie de jam. Elle fait vivre les métiers du son et
// de la production, le studio, les organisateur·rices et leurs organisations,
// les lieux revendiqués, les plateaux, les concerts vérifiés et la tournée.
// Le détail de chaque situation, et où la voir, est dans
// `docs/demo/README.md`.
//
// Comme les autres seeds : écriture directe en base (les services de l'app
// dépendent de SvelteKit), mais **toute la progression passe par le vrai
// moteur** (`emitAndProcess`) : aucune XP, aucun niveau, aucune confiance,
// aucun rang écrits à la main. Les règles métier sont reproduites telles
// que les services les appliquent (rappelées en commentaire).
//
// Rejouable : rien ne se refait si l'organisation « asso-bruit-rose » existe.
import type { PrismaClient } from '@prisma/client';
import type { Commune } from '../src/lib/geo/fuzz';
import { setActorLocation } from '../src/lib/server/geo/queries';
import { venueNameKey } from '../src/lib/venues/rules';
import { pairKey } from '../src/lib/messaging/rules';
import { isUpgrade } from '../src/lib/milestones/rules';
import { upcomingSeriesWindows } from '../src/lib/jam/series';
import { jamWindow } from '../src/lib/jam/publicJam';
import { parisDay } from '../src/lib/metrics/indicators';
import { ago, DAY, demoContext, emit, id, inDays, talk, type Ctx } from './seed-scenarios';

const MARKER = 'asso-bruit-rose';

type Proof = 'DECLARED' | 'CORROBORATED' | 'VERIFIED';
type MilestoneKey =
	| 'FORMATION'
	| 'FIRST_REHEARSAL'
	| 'FIRST_COMPOSITION'
	| 'FIRST_RECORDING'
	| 'FIRST_PUBLIC_DEMO'
	| 'FIRST_GIG'
	| 'FIRST_TOUR';

const dayOf = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Prochain jour de la semaine voulu (0 = dimanche … 6 = samedi), à au moins
 * `minDays` jours : « Jeudi jazz » tombe un jeudi, « vendredi » un vendredi.
 */
export function nextWeekday(weekday: number, minDays: number, hour: number, minute = 0) {
	const d = inDays(minDays, hour, minute);
	while (d.getUTCDay() !== weekday) d.setUTCDate(d.getUTCDate() + 1);
	return d;
}
const day = (d: Date) => new Date(`${dayOf(d)}T00:00:00Z`);

// ─── Outils ──────────────────────────────────────────────────────────────

/** Une commune voisine (la liste de `seed-demo`), sinon la commune de référence. */
const near = (communes: Commune[], i: number) => communes[i % communes.length] ?? communes[0];

async function definitionVersion(prisma: PrismaClient, key: MilestoneKey) {
	const def = await prisma.milestoneDefinition.findUnique({ where: { id: key } });
	if (!def) throw new Error('Référentiel des étapes absent : lance `npm run seed:referentiels`.');
	return def.version;
}

/** Membres actifs d'un groupe (pour créditer une étape). */
async function activeMembers(prisma: PrismaClient, bandId: string) {
	return (
		await prisma.membership.findMany({
			where: { orgId: bandId, status: 'ACTIVE' },
			select: { personId: true }
		})
	).map((m) => m.personId);
}

/**
 * Monte une étape du groupe jusqu'à `to` (création ou renforcement), comme
 * `raiseMilestone` (P5-06) : rien si elle est déjà à ce niveau ou au-dessus.
 */
async function raise(
	ctx: Ctx,
	bandId: string,
	key: MilestoneKey,
	to: Proof,
	occurredAt: Date,
	note?: string
) {
	const existing = await ctx.prisma.milestone.findUnique({
		where: { bandId_definitionId: { bandId, definitionId: key } },
		select: { id: true, proof: true }
	});
	if (existing && !isUpgrade(existing.proof, to)) return;
	if (existing) {
		await ctx.prisma.milestone.update({ where: { id: existing.id }, data: { proof: to } });
	} else {
		await ctx.prisma.milestone.create({
			data: {
				definitionId: key,
				bandId,
				proof: to,
				occurredAt: day(occurredAt),
				note: note ?? null,
				definitionVersion: await definitionVersion(ctx.prisma, key),
				createdAt: occurredAt
			}
		});
	}
	await emit(ctx.prisma, {
		type: 'milestone.attested',
		bandId,
		milestone: key,
		from: existing?.proof ?? null,
		to,
		memberIds: await activeMembers(ctx.prisma, bandId),
		occurredAt
	});
}

/** Un groupe formé (deux membres ou plus) : adhésions, formation vérifiée. */
async function formedBand(
	ctx: Ctx,
	spec: {
		handle: string;
		name: string;
		bio: string;
		genres: string[];
		commune: Commune;
		createdAt: Date;
		members: [handle: string, role: 'OWNER' | 'ADMIN' | 'MEMBER', title: string][];
	}
) {
	const genres = await ctx.prisma.genre.findMany({ where: { slug: { in: spec.genres } } });
	const formedAt = new Date(spec.createdAt.getTime() + 2 * DAY);
	const actor = await ctx.prisma.actor.create({
		data: {
			kind: 'ORGANIZATION',
			handle: spec.handle,
			displayName: spec.name,
			bio: spec.bio,
			createdAt: spec.createdAt,
			organization: { create: { kind: 'BAND', createdAt: spec.createdAt, formedAt } },
			genres: { create: genres.map((g) => ({ genreId: g.id })) }
		},
		select: { id: true }
	});
	await setActorLocation(actor.id, spec.commune, { db: ctx.prisma });
	for (const [h, role, title] of spec.members) {
		await ctx.prisma.membership.create({
			data: {
				orgId: actor.id,
				personId: id(ctx, h),
				role,
				title,
				status: 'ACTIVE',
				startedAt: formedAt,
				createdAt: formedAt
			}
		});
		await emit(ctx.prisma, {
			type: 'membership.accepted',
			personId: id(ctx, h),
			bandId: actor.id,
			occurredAt: formedAt
		});
	}
	await raise(ctx, actor.id, 'FORMATION', 'VERIFIED', formedAt);
	return actor.id;
}

/** Une organisation (studio, organisateur·rices, lieu) et sa gestion. */
async function org(
	ctx: Ctx,
	spec: {
		handle: string;
		name: string;
		bio?: string;
		kind: 'STUDIO' | 'PROMOTER' | 'VENUE';
		commune: Commune;
		createdAt: Date;
		verified?: boolean;
		genres?: string[];
		managers: [handle: string, role: 'OWNER' | 'ADMIN'][];
	}
) {
	const genres = spec.genres
		? await ctx.prisma.genre.findMany({ where: { slug: { in: spec.genres } } })
		: [];
	const actor = await ctx.prisma.actor.create({
		data: {
			kind: 'ORGANIZATION',
			handle: spec.handle,
			displayName: spec.name,
			bio: spec.bio ?? null,
			createdAt: spec.createdAt,
			organization: {
				create: {
					kind: spec.kind,
					createdAt: spec.createdAt,
					verifiedAt: spec.verified ? new Date(spec.createdAt.getTime() + 3 * DAY) : null
				}
			},
			genres: { create: genres.map((g) => ({ genreId: g.id })) }
		},
		select: { id: true }
	});
	await setActorLocation(actor.id, spec.commune, { db: ctx.prisma });
	for (const [h, role] of spec.managers) {
		await ctx.prisma.membership.create({
			data: {
				orgId: actor.id,
				personId: id(ctx, h),
				role,
				status: 'ACTIVE',
				startedAt: spec.createdAt,
				createdAt: spec.createdAt
			}
		});
	}
	return actor.id;
}

/** Demande de vérification (P3-09, P5-02) : accordée ou en attente. */
async function verification(
	ctx: Ctx,
	orgId: string,
	by: string,
	spec: { siret: string; url: string; foundName: string; naf: string; approved: boolean; at: Date }
) {
	await ctx.prisma.organizationVerification.create({
		data: {
			orgId,
			requestedById: id(ctx, by),
			siret: spec.siret,
			officialUrl: spec.url,
			status: spec.approved ? 'APPROVED' : 'PENDING',
			foundName: spec.foundName,
			naf: spec.naf,
			createdAt: spec.at,
			reviewedAt: spec.approved ? new Date(spec.at.getTime() + DAY) : null
		}
	});
}

/** Invitation en attente à la co-gestion (ORG_INVITE ou STUDIO_INVITE). */
async function invite(
	ctx: Ctx,
	orgId: string,
	orgName: string,
	from: string,
	to: string,
	type: 'ORG_INVITE' | 'STUDIO_INVITE',
	href: string,
	at: Date
) {
	await ctx.prisma.membership.create({
		data: {
			orgId,
			personId: id(ctx, to),
			role: 'ADMIN',
			status: 'INVITED',
			invitedById: id(ctx, from),
			createdAt: at
		}
	});
	await ctx.prisma.notification.create({
		data: {
			recipientActorId: id(ctx, to),
			type,
			fromActorId: id(ctx, from),
			href,
			title: orgName,
			createdAt: at
		}
	});
}

/** Un lieu de l'annuaire dans une commune donnée (validé). */
async function venueIn(
	ctx: Ctx,
	name: string,
	kind: 'BAR' | 'CAFE_CONCERT' | 'CONCERT_HALL',
	commune: Commune,
	by: string
) {
	const data = {
		name,
		nameKey: venueNameKey(name),
		kind,
		communeCode: commune.code,
		communeName: commune.nom,
		departmentCode: commune.codeDepartement,
		lat: commune.centre.lat,
		lng: commune.centre.lng,
		createdById: id(ctx, by),
		validatedAt: new Date(),
		backline: ['DRUMS', 'BASS_AMP', 'PA_MICS'] as ('DRUMS' | 'BASS_AMP' | 'PA_MICS')[]
	};
	return ctx.prisma.venue.upsert({
		where: { communeCode_nameKey: { communeCode: commune.code, nameKey: data.nameKey } },
		create: data,
		update: {},
		select: { id: true, name: true }
	});
}

/** Une conversation ouverte des deux côtés, réutilisée si la paire en a déjà une. */
async function chat(
	ctx: Ctx,
	from: string,
	to: string,
	lines: [sender: 'from' | 'to', body: string][],
	start: Date,
	opportunityId?: string
) {
	const a = id(ctx, from);
	const b = id(ctx, to);
	const existing = await ctx.prisma.conversation.findUnique({
		where: { pairKey: pairKey(a, b) },
		select: { id: true }
	});
	const conversation = existing ?? (await talk(ctx, a, b, lines, start));
	if (opportunityId) {
		await ctx.prisma.conversation.update({
			where: { id: conversation.id },
			data: { opportunityId }
		});
	}
	return conversation.id;
}

/**
 * Une collaboration entre deux personnes, comme `proposeCollaboration` puis
 * `settle` : terminée, elle émet `collaboration.completed` (avec les
 * prestations du son et le côté hôte d'un concert) ; sinon une notification
 * « à confirmer ».
 */
async function collab(
	ctx: Ctx,
	spec: {
		a: string;
		b: string;
		kind: 'REHEARSAL' | 'RECORDING' | 'MIXING' | 'MASTERING' | 'PRODUCTION' | 'LIVE_SOUND' | 'GIG';
		title: string;
		when: Date;
		conversationId: string;
		completed: boolean;
		/** Prestation du son assurée par `a` ou `b`. */
		service?: { by: 'a' | 'b'; kind: 'RECORDING' | 'MIXING' | 'PRODUCTION' | 'LIVE_SOUND' };
		workId?: string;
		studioId?: string;
		gig?: { bandId: string; hostOrgId: string; communeCode: string; hostSide: 'a' | 'b' };
	}
) {
	const A = id(ctx, spec.a);
	const B = id(ctx, spec.b);
	const confirmedAt = new Date(spec.when.getTime() + DAY);
	const serviceOf = (side: 'a' | 'b') => (spec.service?.by === side ? spec.service.kind : null);
	const row = await ctx.prisma.collaboration.create({
		data: {
			kind: spec.kind,
			status: spec.completed ? 'COMPLETED' : 'ACCEPTED',
			title: spec.title,
			happenedOn: day(spec.when),
			proposedById: A,
			conversationId: spec.conversationId,
			workId: spec.workId ?? null,
			studioId: spec.studioId ?? null,
			bandId: spec.gig?.bandId ?? null,
			hostOrgId: spec.gig?.hostOrgId ?? null,
			communeCode: spec.gig?.communeCode ?? null,
			completedAt: spec.completed ? confirmedAt : null,
			createdAt: spec.when,
			participants: {
				create: [
					{
						actorId: A,
						acceptedAt: spec.when,
						confirmedCompletionAt: spec.when,
						service: serviceOf('a')
					},
					{
						actorId: B,
						acceptedAt: spec.when,
						confirmedCompletionAt: spec.completed ? confirmedAt : null,
						service: serviceOf('b')
					}
				]
			}
		},
		select: { id: true }
	});
	if (!spec.completed) {
		await ctx.prisma.notification.create({
			data: {
				recipientActorId: B,
				type: 'COLLAB_TO_CONFIRM',
				fromActorId: A,
				href: `/messages/${spec.conversationId}`,
				title: spec.title,
				createdAt: spec.when
			}
		});
		return row.id;
	}
	const services = spec.service ? { [spec.service.by === 'a' ? A : B]: spec.service.kind } : {};
	const hostIds = spec.gig ? [spec.gig.hostSide === 'a' ? A : B] : [];
	await emit(ctx.prisma, {
		type: 'collaboration.completed',
		collaborationId: row.id,
		participantIds: [A, B],
		...(spec.service ? { services } : {}),
		...(hostIds.length ? { hostIds } : {}),
		occurredAt: confirmedAt
	});
	return row.id;
}

/**
 * Concert terminé (P5-06, `verifyGigFromCollaboration`) : `gig.held` pour qui
 * organise, puis « Premier concert » vérifié (hôte vérifié) ou corroboré.
 */
async function gigHeld(
	ctx: Ctx,
	spec: {
		collaborationId: string;
		bandId: string;
		hostOrgId: string;
		hostIsVenue: boolean;
		verified: boolean;
		organizer: string;
		player: string;
		when: Date;
		firstDate: boolean;
	}
) {
	const at = new Date(spec.when.getTime() + DAY);
	await emit(ctx.prisma, {
		type: 'gig.held',
		gigId: spec.collaborationId,
		organizerIds: [id(ctx, spec.organizer)],
		bookerIds: [],
		performerIds: [spec.bandId],
		confirmerIds: [id(ctx, spec.player)],
		...(spec.hostIsVenue ? { venueOrgId: spec.hostOrgId } : {}),
		firstDateIds: spec.firstDate ? [spec.bandId] : [],
		verified: spec.verified,
		occurredAt: at
	});
	await raise(ctx, spec.bandId, 'FIRST_GIG', spec.verified ? 'VERIFIED' : 'CORROBORATED', at);
}

/** Un plateau (P5-05a) : une date dans un lieu, des groupes cherchés, des conditions. */
async function plateau(
	ctx: Ctx,
	spec: {
		issuerId: string;
		postedBy?: string;
		venueId: string;
		title: string;
		description: string;
		startsAt: Date;
		slots: number;
		genre?: string;
		minBandTier?: MilestoneKey;
		radiusKm?: number;
		createdAt: Date;
		status?: 'OPEN' | 'FILLED' | 'CLOSED';
	}
) {
	return (
		await ctx.prisma.opportunity.create({
			data: {
				issuerActorId: spec.issuerId,
				postedById: spec.postedBy ? id(ctx, spec.postedBy) : null,
				kind: 'GIG_SLOT',
				status: spec.status ?? 'OPEN',
				title: spec.title,
				description: spec.description,
				venueId: spec.venueId,
				startsAt: spec.startsAt,
				slots: spec.slots,
				genreSlug: spec.genre ?? null,
				minBandTier: spec.minBandTier ?? null,
				radiusKm: spec.radiusKm ?? 50,
				expiresAt: spec.startsAt,
				createdAt: spec.createdAt
			},
			select: { id: true }
		})
	).id;
}

/** Candidature d'un groupe à un plateau, envoyée par une personne qui le gère. */
async function apply(
	ctx: Ctx,
	spec: {
		opportunityId: string;
		bandId: string;
		sentBy: string;
		message: string;
		status: 'SENT' | 'SEEN' | 'SHORTLISTED' | 'ACCEPTED' | 'DECLINED';
		at: Date;
		notify: string[];
		conversationId?: string;
		title: string;
	}
) {
	await ctx.prisma.application.create({
		data: {
			opportunityId: spec.opportunityId,
			applicantActorId: spec.bandId,
			sentById: id(ctx, spec.sentBy),
			message: spec.message,
			status: spec.status,
			conversationId: spec.conversationId ?? null,
			decidedAt: spec.status === 'ACCEPTED' || spec.status === 'DECLINED' ? spec.at : null,
			createdAt: spec.at
		}
	});
	for (const h of spec.notify) {
		await ctx.prisma.notification.create({
			data: {
				recipientActorId: id(ctx, h),
				type: 'APPLICATION_RECEIVED',
				fromActorId: spec.bandId,
				href: `/annonces/${spec.opportunityId}`,
				title: spec.title,
				createdAt: spec.at,
				readAt: spec.status === 'SENT' ? null : spec.at
			}
		});
	}
}

/** Travaux en écoute d'un profil de métier. */
async function references(
	ctx: Ctx,
	h: string,
	track: 'SOUND_ENGINEER' | 'PRODUCER' | 'PROMOTER',
	list: [title: string, url: string][]
) {
	await ctx.prisma.craftReference.createMany({
		data: list.map(([title, url], position) => ({
			personId: id(ctx, h),
			track,
			title,
			url,
			position
		}))
	});
}

async function genreIds(ctx: Ctx, slugs: string[]) {
	return (await ctx.prisma.genre.findMany({ where: { slug: { in: slugs } } })).map((g) => g.id);
}

/** Un morceau composé, porté par un groupe. */
async function work(ctx: Ctx, bandId: string, by: string, title: string, at: Date) {
	return (
		await ctx.prisma.work.create({
			data: {
				ownerId: bandId,
				createdById: id(ctx, by),
				title,
				state: 'COMPOSED',
				composedAt: at,
				createdAt: at
			},
			select: { id: true }
		})
	).id;
}

/** Crédit confirmé d'une prestation du son sur un morceau (`creditFromCollaboration`). */
async function credit(
	ctx: Ctx,
	workId: string,
	h: string,
	kind: 'RECORDING' | 'MIXING' | 'PRODUCTION',
	at: Date
) {
	const contributor = await ctx.prisma.workContributor.upsert({
		where: { workId_personId: { workId, personId: id(ctx, h) } },
		create: { workId, personId: id(ctx, h), confirmedAt: at, createdAt: at },
		update: {},
		select: { id: true }
	});
	await ctx.prisma.workRole.create({ data: { workId, kind, contributorId: contributor.id } });
}

/**
 * Scène ouverte récurrente (P5-04a), bloc rejouable à part : « Bœuf jazz du
 * mercredi », publiée par Sophie au nom du Comptoir Jazz. Les jams des 4
 * semaines à venir existent (comme après le job quotidien) ; celle de
 * mercredi dernier a été tenue (4 « J'y étais ») : 50 XP × confiance pour
 * Sophie, une date pour le rang du lieu. Rien si la série existe déjà.
 */
export async function seedOpenStage(
	prisma: PrismaClient,
	communes: Commune[],
	demoHandles: ReadonlyMap<string, string> = new Map()
) {
	const org = await prisma.actor.findUnique({
		where: { handle: 'le-comptoir-jazz' },
		select: { id: true, venuesClaimed: { select: { id: true }, take: 1 } }
	});
	const venueId = org?.venuesClaimed[0]?.id;
	if (!org || !venueId) return;
	if (await prisma.jamSeries.findFirst({ where: { issuerActorId: org.id } })) {
		console.log('Scène ouverte du Comptoir Jazz déjà en place : rien à refaire.');
		return;
	}
	const orgId = org.id;
	const ctx = await demoContext(prisma, communes[0], null, demoHandles);
	const P = (h: string) => id(ctx, h);
	const boeufSpots = [
		{
			instrumentId: (await prisma.instrument.findUniqueOrThrow({ where: { slug: 'batterie' } })).id,
			count: 1
		},
		{
			instrumentId: (await prisma.instrument.findUniqueOrThrow({ where: { slug: 'contrebasse' } }))
				.id,
			count: 1
		}
	];
	const boeuf = await prisma.jamSeries.create({
		data: {
			issuerActorId: orgId,
			postedById: P('sophie-bar'),
			venueId: venueId,
			weekday: 3,
			startTime: '20:30',
			endTime: '23:30',
			title: 'Bœuf jazz du mercredi',
			description:
				'Batterie et contrebasse sur place. Standards et compos bienvenus, on tourne au fil de la soirée.',
			genreSlug: 'jazz',
			spots: boeufSpots,
			createdAt: ago(21)
		}
	});
	const lastWednesday = ago(1);
	while (lastWednesday.getUTCDay() !== 3) lastWednesday.setUTCDate(lastWednesday.getUTCDate() - 1);
	const windows = [
		jamWindow(parisDay(lastWednesday), '20:30', '23:30'),
		...upcomingSeriesWindows({ weekday: 3, startTime: '20:30', endTime: '23:30' }, new Date())
	];
	const boeufJams: string[] = [];
	for (const w of windows) {
		const jam = await prisma.opportunity.create({
			data: {
				issuerActorId: orgId,
				postedById: P('sophie-bar'),
				kind: 'JAM',
				title: 'Bœuf jazz du mercredi',
				description: boeuf.description,
				genreSlug: 'jazz',
				startsAt: w.startsAt,
				endsAt: w.endsAt,
				expiresAt: w.endsAt,
				status: w.endsAt < new Date() ? 'EXPIRED' : 'OPEN',
				venueId: venueId,
				backline: ['DRUMS', 'PA_MICS'],
				seriesId: boeuf.id,
				slots: 2,
				jamSpots: { create: boeufSpots },
				createdAt: ago(21)
			}
		});
		boeufJams.push(jam.id);
	}
	const heldJam = boeufJams[0];
	const heldAt = new Date(windows[0].endsAt.getTime() - 30 * 60_000);
	const present = ['lucas-sax', 'theo-basse', 'zoe-violon', 'ines-chant'];
	for (const h of present) {
		await prisma.jamAttendance.create({
			data: { opportunityId: heldJam, actorId: P(h), attendedAt: heldAt, createdAt: ago(8) }
		});
	}
	await prisma.opportunity.update({ where: { id: heldJam }, data: { heldAt } });
	await emit(prisma, {
		type: 'jam.held',
		jamId: heldJam,
		organizerIds: [P('sophie-bar')],
		confirmerIds: present.map(P),
		venueOrgId: orgId,
		occurredAt: heldAt
	});
	// Théo dit « Je viens » au prochain bœuf.
	await prisma.jamAttendance.create({
		data: { opportunityId: boeufJams[1], actorId: P('theo-basse'), createdAt: ago(1) }
	});
	console.log(
		'  · scène ouverte : Bœuf jazz du mercredi au Comptoir Jazz (une soirée tenue, 4 à venir)'
	);
}

/**
 * Animateur·rices du Comptoir Jazz (P5-04b) : Lucas anime et mène le « Bœuf
 * jazz du mercredi » par défaut (la soirée tenue comprise) ; Clara est
 * invitée à animer (notification, réponse dans « Mes jams »). Rien si le
 * lieu a déjà des animateur·rices.
 */
export async function seedVenueHosts(
	prisma: PrismaClient,
	communes: Commune[],
	demoHandles: ReadonlyMap<string, string> = new Map()
) {
	const org = await prisma.actor.findUnique({
		where: { handle: 'le-comptoir-jazz' },
		select: { id: true, displayName: true }
	});
	if (!org) return;
	if (await prisma.venueHost.findFirst({ where: { orgId: org.id } })) {
		console.log('Animateur·rices du Comptoir Jazz déjà en place : rien à refaire.');
		return;
	}
	const ctx = await demoContext(prisma, communes[0], null, demoHandles);
	const P = (h: string) => id(ctx, h);
	await prisma.person.updateMany({
		where: { actorId: { in: [P('lucas-sax'), P('clara-guitare')] } },
		data: { organizesJams: true }
	});
	await prisma.venueHost.createMany({
		data: [
			{
				orgId: org.id,
				personId: P('lucas-sax'),
				status: 'ACTIVE',
				invitedById: P('sophie-bar'),
				since: ago(20),
				createdAt: ago(21)
			},
			{
				orgId: org.id,
				personId: P('clara-guitare'),
				invitedById: P('sophie-bar'),
				createdAt: ago(1)
			}
		]
	});
	await prisma.notification.create({
		data: {
			recipientActorId: P('clara-guitare'),
			type: 'VENUE_HOST_INVITE',
			fromActorId: P('sophie-bar'),
			href: '/jam/mes-jams',
			title: org.displayName,
			createdAt: ago(1)
		}
	});
	const boeuf = await prisma.jamSeries.findFirst({
		where: { issuerActorId: org.id, stoppedAt: null },
		select: { id: true }
	});
	if (boeuf) {
		await prisma.jamSeries.update({ where: { id: boeuf.id }, data: { leadId: P('lucas-sax') } });
		await prisma.opportunity.updateMany({
			where: { seriesId: boeuf.id, leadActorId: null },
			data: { leadActorId: P('lucas-sax') }
		});
	}
	console.log('  · animation : Lucas mène le Bœuf jazz du mercredi, Clara invitée à animer');
}

/**
 * Manager et booker (P5-07) : Élise est booker de Fanfare Pirate (confirmé
 * par Lucas) et a booké l'apéro-concert des Coteaux, à confirmer par Yanis :
 * sa confirmation crédite Élise (vrai service). Sa proposition aux Lucioles
 * attend Zoé. Marc manage Les Rats du Mardi depuis leurs débuts (confirmé
 * par Malik) : 200 points, et le groupe a passé des rangs depuis. Rien si
 * un accompagnement existe déjà.
 */
export async function seedRepresentations(
	prisma: PrismaClient,
	communes: Commune[],
	demoHandles: ReadonlyMap<string, string> = new Map()
) {
	if (await prisma.representation.findFirst({ select: { id: true } })) {
		console.log('Accompagnements déjà en place : rien à refaire.');
		return;
	}
	const ctx = await demoContext(prisma, communes[0], null, demoHandles);
	const P = (h: string) => id(ctx, h);
	const band = async (handle: string) =>
		(await prisma.actor.findUnique({ where: { handle }, select: { id: true } }))?.id ?? null;
	const [fanfare, rats, lucioles] = await Promise.all([
		band('fanfare-pirate'),
		band('les-rats-du-mardi'),
		band('les-lucioles')
	]);
	if (!fanfare || !rats || !lucioles) return;
	const genres = async (slugs: string[]) =>
		(await prisma.genre.findMany({ where: { slug: { in: slugs } }, select: { id: true } })).map(
			(g) => ({ genreId: g.id })
		);
	await prisma.agentProfile.create({
		data: {
			personId: P('elise-booker'),
			pitch:
				'Fanfares, jazz et funk : je cherche des dates en Occitanie, salles de 80 à 400 places.',
			genres: { create: await genres(['jazz', 'funk']) }
		}
	});
	await prisma.agentProfile.create({
		data: {
			personId: P('marc-manager'),
			pitch: 'J’accompagne des groupes rock et soul qui veulent passer à la scène.',
			genres: { create: await genres(['rock', 'soul']) }
		}
	});
	// Les confirmations passent par le moteur : `management.confirmed`.
	const confirm = async (
		agent: string,
		artistId: string,
		kind: 'MANAGER' | 'BOOKER',
		by: string,
		at: Date
	) => {
		await prisma.representation.create({
			data: {
				agentId: P(agent),
				artistId,
				kind,
				allowedActions: [kind === 'BOOKER' ? 'BOOKING_CREDIT' : 'CAREER_SUPPORT'],
				status: 'CONFIRMED',
				confirmedAt: at,
				confirmedById: P(by),
				createdAt: new Date(at.getTime() - DAY)
			}
		});
		await emit(prisma, {
			type: 'management.confirmed',
			managerId: P(agent),
			artistId,
			confirmedById: P(by),
			kind,
			occurredAt: at
		});
	};
	const ratsFormed = (
		await prisma.organization.findUniqueOrThrow({
			where: { actorId: rats },
			select: { formedAt: true }
		})
	).formedAt;
	await confirm('marc-manager', rats, 'MANAGER', 'malik-batterie', ratsFormed ?? ago(70));
	await confirm('elise-booker', fanfare, 'BOOKER', 'lucas-sax', ago(40));
	// Le concert des Coteaux, à confirmer par Yanis, a été booké par Élise.
	await prisma.collaboration.updateMany({
		where: { bandId: fanfare, status: { not: 'COMPLETED' }, kind: 'GIG' },
		data: { bookedById: P('elise-booker') }
	});
	// Une proposition en attente, que Zoé tranche pour Les Lucioles.
	await prisma.representation.create({
		data: {
			agentId: P('elise-booker'),
			artistId: lucioles,
			allowedActions: ['BOOKING_CREDIT'],
			departmentCodes: ['31', '32'],
			startsAt: ago(1),
			expiresAt: new Date(Date.now() + 90 * DAY),
			kind: 'BOOKER',
			message: 'Votre scène découverte m’a plu : je peux vous trouver quelques dates cet hiver.',
			createdAt: ago(1)
		}
	});
	await prisma.notification.create({
		data: {
			recipientActorId: P('zoe-violon'),
			type: 'REPRESENTATION_REQUEST',
			fromActorId: P('elise-booker'),
			href: '/accompagnement',
			title: 'Les Lucioles, comme booker',
			createdAt: ago(1)
		}
	});
	console.log(
		'  · accompagnement : Marc manage Les Rats, Élise booke Fanfare Pirate (concert des Coteaux booké), proposition aux Lucioles'
	);
}

/** DASH-05c : décisions fictives explicites, seulement entre comptes de démonstration. */
export async function seedRepresentationDecisions(
	prisma: PrismaClient,
	communes: Commune[],
	demoHandles: ReadonlyMap<string, string>
) {
	const ctx = await demoContext(prisma, communes[0], null, demoHandles);
	const agentId = id(ctx, 'elise-booker');
	const byId = id(ctx, 'zoe-violon');
	const artist = await prisma.actor.findUnique({
		where: { handle: 'les-lucioles' },
		select: { id: true }
	});
	if (!artist || !agentId || !byId) return;
	if (
		(await prisma.person.count({
			where: {
				actorId: { in: [agentId, byId] },
				user: { email: { endsWith: '@demo.linkmusician.test' } }
			}
		})) !== 2
	)
		return;
	for (const status of ['DECLINED', 'WITHDRAWN'] as const) {
		await prisma.representation.upsert({
			where: { id: `demo-proposition-${status.toLowerCase()}` },
			update: {},
			create: {
				id: `demo-proposition-${status.toLowerCase()}`,
				agentId,
				artistId: artist.id,
				kind: 'BOOKER',
				status,
				createdAt: ago(5),
				endedAt: ago(4),
				endedById: status === 'DECLINED' ? byId : agentId
			}
		});
	}
}

/**
 * École (P5-11) : Théo ouvre l'« École de musique du Faubourg » ; Manon et
 * Jade (16 ans) en sont élèves. Deux ateliers jam à la MJC des Arts : celui
 * de 17 h 30 (Manon vient), et celui de 20 h qui finit à 22 h 30, que Jade
 * ne voit pas (D5). Un lien d'invitation actif est affiché en fin de seed
 * (seul son hachage est en base). Rien si l'école existe déjà.
 */
export async function seedSchool(
	prisma: PrismaClient,
	communes: Commune[],
	demoHandles: ReadonlyMap<string, string> = new Map()
): Promise<string | null> {
	const HANDLE = 'ecole-du-faubourg';
	if (await prisma.actor.findUnique({ where: { handle: HANDLE }, select: { id: true } })) {
		console.log('École du Faubourg déjà en place : rien à refaire.');
		return null;
	}
	const ctx = await demoContext(prisma, communes[0], null, demoHandles);
	const P = (h: string) => id(ctx, h);
	const mjc = await prisma.venue.findFirst({
		where: { name: 'MJC des Arts', removedAt: null },
		select: { id: true }
	});
	if (!mjc) return null;
	const school = await prisma.actor.create({
		data: {
			kind: 'ORGANIZATION',
			handle: HANDLE,
			displayName: 'École de musique du Faubourg',
			bio: 'Cours de musiques actuelles et ateliers jam tous niveaux.',
			organization: { create: { kind: 'SCHOOL', school: { create: { kind: 'MUSIC_SCHOOL' } } } }
		},
		select: { id: true }
	});
	await prisma.membership.createMany({
		data: [
			{
				orgId: school.id,
				personId: P('theo-basse'),
				role: 'OWNER',
				status: 'ACTIVE',
				startedAt: ago(30)
			},
			{
				orgId: school.id,
				personId: P('manon-ukulele'),
				role: 'MEMBER',
				status: 'ACTIVE',
				startedAt: ago(20)
			},
			{
				orgId: school.id,
				personId: P('jade-batterie'),
				role: 'MEMBER',
				status: 'ACTIVE',
				startedAt: ago(12)
			}
		]
	});
	// Le lien : comme `createSchoolInvite`, le jeton n'est jamais stocké.
	const { createHash, randomBytes } = await import('node:crypto');
	const token = randomBytes(24).toString('base64url');
	await prisma.schoolInvite.create({
		data: {
			orgId: school.id,
			tokenHash: createHash('sha256').update(token).digest('hex'),
			createdById: P('theo-basse'),
			maxUses: 30,
			uses: 2,
			expiresAt: inDays(25),
			createdAt: ago(5)
		}
	});
	const workshop = (title: string, start: Date, hours: number) =>
		prisma.opportunity.create({
			data: {
				issuerActorId: school.id,
				postedById: P('theo-basse'),
				leadActorId: P('theo-basse'),
				audience: 'SCHOOL',
				kind: 'JAM',
				title,
				description: 'Atelier des élèves : on travaille un morceau, puis on improvise ensemble.',
				venueId: mjc.id,
				startsAt: start,
				endsAt: new Date(start.getTime() + hours * 3_600_000),
				expiresAt: new Date(start.getTime() + hours * 3_600_000),
				createdAt: ago(3)
			},
			select: { id: true }
		});
	// Heures UTC : 17 h 30 et 20 h à Paris (heure d'hiver).
	const early = await workshop('Atelier jam du mercredi', nextWeekday(3, 2, 16, 30), 2);
	await workshop('Atelier jam du soir (adultes)', nextWeekday(4, 2, 19, 0), 2.5);
	await prisma.jamAttendance.create({
		data: { opportunityId: early.id, actorId: P('manon-ukulele'), createdAt: ago(1) }
	});
	console.log(
		'  · école : Théo et l’École du Faubourg, Manon et Jade élèves, deux ateliers (Jade ne voit que le premier)'
	);
	return `/ecole/${token}`;
}

// ─── Le scénario ─────────────────────────────────────────────────────────

export async function seedScene(
	prisma: PrismaClient,
	communes: Commune[],
	demoHandles: ReadonlyMap<string, string> = new Map()
) {
	if (await prisma.actor.findUnique({ where: { handle: MARKER }, select: { id: true } })) {
		console.log('Vie pro et scène déjà en place (« Asso Bruit Rose ») : rien à refaire.');
		return;
	}
	const ctx = await demoContext(prisma, communes[0], null, demoHandles);
	const P = (h: string) => id(ctx, h);
	const home = communes[0];
	console.log('\nVie pro et scène :');

	// ── 1. Profils des métiers du son et de la production (P4-02, P4-04) ──
	await prisma.soundEngineerProfile.create({
		data: {
			personId: P('samir-son'),
			specialties: ['RECORDING', 'MIXING', 'MASTERING', 'LIVE_FOH'],
			mobility: ['OWN_PLACE', 'ON_SITE', 'REMOTE'],
			gear: 'Console Audient ASP8024\nMicros Neumann U87, Shure SM7B\nPréamplis Neve 1073'
		}
	});
	await references(ctx, 'samir-son', 'SOUND_ENGINEER', [
		['Orbital — « Gravité » (prise et mix)', 'https://soundcloud.com/demo-linkmusician/gravite'],
		['Live à la Fête de la musique (façade)', 'https://www.youtube.com/watch?v=demo-facade']
	]);
	await prisma.soundEngineerProfile.create({
		data: {
			personId: P('theo-basse'),
			specialties: ['RECORDING', 'LIVE_MONITORS'],
			mobility: ['OWN_PLACE'],
			gear: 'Home studio : interface RME, deux micros statiques, cabine traitée.'
		}
	});
	await prisma.producerProfile.create({
		data: {
			personId: P('nora-prod'),
			specialties: ['PRODUCTION', 'BEATMAKING', 'ARRANGEMENT'],
			mobility: ['OWN_PLACE', 'REMOTE'],
			software: 'Ableton Live\nFL Studio\nSerum',
			rate: 'À partir de 150 € le titre',
			genres: {
				create: (await genreIds(ctx, ['rap-francais', 'rnb', 'electro-pop'])).map((genreId) => ({
					genreId
				}))
			}
		}
	});
	await references(ctx, 'nora-prod', 'PRODUCER', [
		['Inès — « Lumière » (production)', 'https://soundcloud.com/demo-linkmusician/lumiere'],
		['Instru — nuit blanche', 'https://soundcloud.com/demo-linkmusician/nuit-blanche']
	]);
	console.log('  · profils : ingé son (Samir, Théo), productrice (Nora)');

	// ── 2. Profils d'organisateur·rices (P5-05a) ──
	for (const [h, kinds, slugs, capacity] of [
		['hugo-dj', ['CLUB_NIGHTS'], ['electro', 'disco'], 250],
		['yanis-orga', ['CONCERTS', 'FESTIVAL'], ['rock', 'jazz', 'folk'], 400],
		['lina-orga', ['CONCERTS', 'OPEN_STAGES'], ['folk', 'pop-inde', 'soul'], 120]
	] as const) {
		await prisma.promoterProfile.create({
			data: {
				personId: P(h),
				eventKinds: [...kinds],
				capacity,
				genres: { create: (await genreIds(ctx, [...slugs])).map((genreId) => ({ genreId })) }
			}
		});
	}
	await references(ctx, 'yanis-orga', 'PROMOTER', [
		['Festival des Coteaux 2025 (programme)', 'https://www.facebook.com/events/demo-coteaux-2025'],
		['Plateau rock du printemps', 'https://www.instagram.com/p/demo-bruit-rose-printemps/']
	]);
	console.log('  · profils : organisateur·rices (Hugo, Yanis, Lina)');

	// ── 2 bis. Spécialités par métier et « Je propose » (ONB-01, ONB-13a, D62) ──
	// La recherche par métier ne trouve que qui propose quelque chose.
	for (const [h, track, specializations, offers] of [
		[
			'samir-son',
			'SOUND_ENGINEER',
			['RECORDING', 'MIXING', 'MASTERING', 'LIVE_FOH'],
			['RECORDING_SERVICE', 'MIXING_SERVICE', 'MASTERING_SERVICE', 'LIVE_FOH_SERVICE']
		],
		[
			'theo-basse',
			'SOUND_ENGINEER',
			['RECORDING', 'LIVE_MONITORS'],
			['RECORDING_SERVICE', 'LIVE_MONITORS_SERVICE']
		],
		['nora-prod', 'PRODUCER', ['PRODUCTION', 'BEATMAKING', 'ARRANGEMENT'], ['BEATS', 'ARRANGING']],
		['hugo-dj', 'PROMOTER', ['CLUB_NIGHTS'], ['CONCERT_DATES']],
		['yanis-orga', 'PROMOTER', ['CONCERTS', 'FESTIVAL'], ['LINEUPS', 'CONCERT_DATES']],
		['lina-orga', 'PROMOTER', ['CONCERTS', 'OPEN_STAGES'], ['HOST_JAMS', 'CONCERT_DATES']],
		['marc-manager', 'MANAGER', [], ['DEVELOPMENT']]
	] as const) {
		const personId = P(h);
		await prisma.personTrackSpecialization.createMany({
			data: specializations.map((code) => ({ personId, track, code })),
			skipDuplicates: true
		});
		await prisma.personTrackIntent.createMany({
			data: offers.map((code) => ({ personId, track, direction: 'OFFER' as const, code })),
			skipDuplicates: true
		});
	}
	console.log('  · « Je propose » des métiers (D62)');

	// ── 3. Groupes de la scène ──
	const fanfare = await formedBand(ctx, {
		handle: 'fanfare-pirate',
		name: 'Fanfare Pirate',
		bio: 'Cuivres, groove et marinières : la fanfare qui fait danser les places de village.',
		genres: ['jazz', 'funk'],
		commune: home,
		createdAt: ago(90),
		members: [
			['lucas-sax', 'OWNER', 'saxophone'],
			['awa-clavier', 'ADMIN', 'claviers'],
			['malik-batterie', 'MEMBER', 'batterie']
		]
	});
	await raise(ctx, fanfare, 'FIRST_REHEARSAL', 'CORROBORATED', ago(85));
	const orbital = await formedBand(ctx, {
		handle: 'orbital-prog',
		name: 'Orbital',
		bio: 'Metal progressif, riffs en 7/8 et longues montées. Une batteuse de 16 ans derrière les fûts.',
		genres: ['metal', 'metal-progressif'],
		commune: near(communes, 5),
		createdAt: ago(70),
		members: [
			['kevin-metal', 'OWNER', 'guitare'],
			['jade-batterie', 'MEMBER', 'batterie']
		]
	});
	await raise(ctx, orbital, 'FIRST_REHEARSAL', 'CORROBORATED', ago(66));
	const lucioles = await formedBand(ctx, {
		handle: 'les-lucioles',
		name: 'Les Lucioles',
		bio: 'Duo folk violon-ukulélé, chansons douces et harmonies. Tout juste formé.',
		genres: ['folk', 'pop'],
		commune: near(communes, 2),
		createdAt: ago(9),
		members: [
			['zoe-violon', 'OWNER', 'violon'],
			['manon-ukulele', 'MEMBER', 'ukulélé, chant']
		]
	});
	console.log('  · groupes : Fanfare Pirate, Orbital (avec une mineure), Les Lucioles');

	// ── 4. Studio La Cave (P4-03) : fiche publiée, co-gestion, sessions ──
	const studio = await org(ctx, {
		handle: 'la-cave-studio',
		name: 'La Cave Studio',
		bio: 'Studio d’enregistrement et de répétition en sous-sol, ambiance chaleureuse.',
		kind: 'STUDIO',
		commune: near(communes, 3),
		createdAt: ago(100),
		verified: true,
		managers: [
			['samir-son', 'OWNER'],
			['theo-basse', 'ADMIN']
		]
	});
	await prisma.studioProfile.create({
		data: {
			orgId: studio,
			services: ['REHEARSAL', 'RECORDING', 'MIXING', 'MASTERING'],
			gear: 'Console Audient\nBatterie Gretsch\nAmplis Fender, Marshall, Ampeg',
			pricingNotes: 'Ingé son compris pour l’enregistrement. Acompte de 30 %.',
			byAppointment: true,
			publishedAt: ago(95),
			rooms: {
				create: [
					{ name: 'Salle de prise', description: '25 m², traitée', hourlyRate: 35, position: 0 },
					{ name: 'Salle de répète', description: 'Backline complet', hourlyRate: 15, position: 1 }
				]
			},
			hours: {
				create: [2, 3, 4, 5, 6].map((weekday) => ({
					weekday,
					opensAt: 14 * 60,
					closesAt: 23 * 60
				}))
			}
		}
	});
	await verification(ctx, studio, 'samir-son', {
		siret: '90000000000011',
		url: 'https://www.lacave-studio.example',
		foundName: 'LA CAVE STUDIO',
		naf: '59.20Z',
		approved: true,
		at: ago(97)
	});
	await invite(
		ctx,
		studio,
		'La Cave Studio',
		'samir-son',
		'nora-prod',
		'STUDIO_INVITE',
		'/studios',
		ago(2)
	);

	// Enregistrement d'Orbital avec Samir au studio : session, crédit,
	// « Premier enregistrement » vérifié (P4-09).
	const gravite = await work(ctx, orbital, 'kevin-metal', 'Gravité', ago(50));
	const kevinSamir = await chat(
		ctx,
		'kevin-metal',
		'samir-son',
		[
			['from', 'Salut Samir, on voudrait enregistrer « Gravité » à La Cave, c’est possible ?'],
			['to', 'Carrément, samedi 14 h. Venez avec vos sons réglés.']
		],
		ago(40)
	);
	await collab(ctx, {
		a: 'kevin-metal',
		b: 'samir-son',
		kind: 'RECORDING',
		title: 'Enregistrement de « Gravité »',
		when: ago(34, 14),
		conversationId: kevinSamir,
		completed: true,
		service: { by: 'b', kind: 'RECORDING' },
		workId: gravite,
		studioId: studio
	});
	await prisma.work.update({ where: { id: gravite }, data: { recordedAt: ago(33) } });
	await credit(ctx, gravite, 'samir-son', 'RECORDING', ago(33));
	await raise(ctx, orbital, 'FIRST_RECORDING', 'VERIFIED', ago(33), 'À La Cave Studio');
	// Mixage par Samir : à confirmer par Kévin.
	await collab(ctx, {
		a: 'samir-son',
		b: 'kevin-metal',
		kind: 'MIXING',
		title: 'Mixage de « Gravité »',
		when: ago(6, 15),
		conversationId: kevinSamir,
		completed: false,
		service: { by: 'a', kind: 'MIXING' },
		workId: gravite,
		studioId: studio
	});
	// Répétition des Lucioles au studio : une session confirmée par la cliente.
	const zoeTheo = await chat(
		ctx,
		'zoe-violon',
		'theo-basse',
		[
			['from', 'Bonjour Théo, on pourrait répéter à La Cave samedi ?'],
			['to', 'Oui, la salle de répète est libre de 15 h à 18 h.']
		],
		ago(8)
	);
	await collab(ctx, {
		a: 'zoe-violon',
		b: 'theo-basse',
		kind: 'REHEARSAL',
		title: 'Répète des Lucioles à La Cave',
		when: ago(5, 15),
		conversationId: zoeTheo,
		completed: true,
		studioId: studio
	});
	await raise(ctx, lucioles, 'FIRST_REHEARSAL', 'DECLARED', ago(5));
	console.log('  · studio La Cave : fiche publiée et vérifiée, 2 salles, sessions, invitation');

	// ── 5. Production (P4-06) : Nora produit le titre d'Inès ──
	const lumiere = await prisma.work.create({
		data: {
			ownerId: P('ines-chant'),
			createdById: P('ines-chant'),
			title: 'Lumière',
			state: 'COMPOSED',
			composedAt: ago(45),
			createdAt: ago(45)
		},
		select: { id: true }
	});
	const inesNora = await chat(
		ctx,
		'ines-chant',
		'nora-prod',
		[
			['from', 'Nora, j’ai une chanson soul, tu voudrais la produire ?'],
			['to', 'Envoie la maquette, j’ai déjà une idée de beat.']
		],
		ago(42)
	);
	await collab(ctx, {
		a: 'ines-chant',
		b: 'nora-prod',
		kind: 'PRODUCTION',
		title: 'Production de « Lumière »',
		when: ago(28, 16),
		conversationId: inesNora,
		completed: true,
		service: { by: 'b', kind: 'PRODUCTION' },
		workId: lumiere.id
	});
	await prisma.work.update({ where: { id: lumiere.id }, data: { producedAt: ago(27) } });
	await credit(ctx, lumiere.id, 'nora-prod', 'PRODUCTION', ago(27));
	console.log('  · production : « Lumière » d’Inès, produite par Nora');

	// ── 6. Organisations d'organisateur·rices (P5-05b) ──
	const bruitRose = await org(ctx, {
		handle: MARKER,
		name: 'Asso Bruit Rose',
		bio: 'Association qui programme la scène rock et folk locale, un plateau par mois.',
		kind: 'PROMOTER',
		commune: home,
		createdAt: ago(80),
		verified: true,
		genres: ['rock', 'folk', 'pop-inde'],
		managers: [
			['yanis-orga', 'OWNER'],
			['lina-orga', 'ADMIN']
		]
	});
	await prisma.promoterOrgProfile.create({
		data: { orgId: bruitRose, eventKinds: ['CONCERTS', 'OPEN_STAGES'], capacity: 300 }
	});
	await verification(ctx, bruitRose, 'yanis-orga', {
		siret: '90000000000029',
		url: 'https://www.instagram.com/asso.bruitrose',
		foundName: 'ASSOCIATION BRUIT ROSE',
		naf: '90.01Z',
		approved: true,
		at: ago(78)
	});
	await invite(
		ctx,
		bruitRose,
		'Asso Bruit Rose',
		'yanis-orga',
		'hugo-dj',
		'ORG_INVITE',
		'/organisations',
		ago(1)
	);
	const coteaux = await org(ctx, {
		handle: 'festival-des-coteaux',
		name: 'Festival des Coteaux',
		bio: 'Deux jours de concerts en plein air, chaque été.',
		kind: 'PROMOTER',
		commune: near(communes, 4),
		createdAt: ago(200),
		verified: true,
		genres: ['jazz', 'folk', 'funk'],
		managers: [['yanis-orga', 'OWNER']]
	});
	await prisma.promoterOrgProfile.create({
		data: { orgId: coteaux, eventKinds: ['FESTIVAL'], capacity: 1500 }
	});
	const nuitsCourtes = await org(ctx, {
		handle: 'collectif-nuits-courtes',
		name: 'Collectif Nuits Courtes',
		bio: 'Concerts dans les bars de la ville voisine, le samedi.',
		kind: 'PROMOTER',
		commune: near(communes, 2),
		createdAt: ago(120),
		verified: true,
		genres: ['jazz', 'soul'],
		managers: [['lina-orga', 'OWNER']]
	});
	await prisma.promoterOrgProfile.create({
		data: { orgId: nuitsCourtes, eventKinds: ['CONCERTS'], capacity: 90 }
	});
	const disco = await org(ctx, {
		handle: 'soirees-disco-club',
		name: 'Soirées Disco Club',
		bio: 'Soirées disco et house avec des musicien·nes live.',
		kind: 'PROMOTER',
		commune: near(communes, 6),
		createdAt: ago(20),
		verified: false,
		genres: ['disco', 'electro'],
		managers: [['hugo-dj', 'OWNER']]
	});
	await prisma.promoterOrgProfile.create({
		data: { orgId: disco, eventKinds: ['CLUB_NIGHTS'], capacity: 250 }
	});
	await verification(ctx, disco, 'hugo-dj', {
		siret: '90000000000037',
		url: 'https://www.instagram.com/soirees.discoclub',
		foundName: 'SOIREES DISCO CLUB',
		naf: '90.01Z',
		approved: false,
		at: ago(3)
	});
	console.log(
		'  · organisations : Bruit Rose, Festival des Coteaux, Nuits Courtes (vérifiées), Disco Club (vérification en attente)'
	);

	// ── 7. Lieux revendiqués (P5-03a, P5-03b) ──
	const comptoir = await venueIn(ctx, 'Le Comptoir Jazz', 'BAR', home, 'lucas-sax');
	const comptoirOrg = await org(ctx, {
		handle: 'le-comptoir-jazz',
		name: 'Le Comptoir Jazz',
		kind: 'VENUE',
		commune: home,
		createdAt: ago(60),
		verified: true,
		genres: ['jazz', 'soul', 'funk'],
		managers: [['sophie-bar', 'OWNER']]
	});
	await prisma.venue.update({
		where: { id: comptoir.id },
		data: { claimedByActorId: comptoirOrg }
	});
	await prisma.venueClaim.create({
		data: {
			venueId: comptoir.id,
			requestedById: P('sophie-bar'),
			code: 'LMCOMPTO',
			proofUrl: 'https://www.instagram.com/lecomptoirjazz',
			status: 'APPROVED',
			orgId: comptoirOrg,
			createdAt: ago(63),
			submittedAt: ago(62),
			reviewedAt: ago(60)
		}
	});
	await prisma.notification.create({
		data: {
			recipientActorId: P('sophie-bar'),
			type: 'VENUE_CLAIM',
			href: `/lieux/${comptoir.id}`,
			title: 'Le Comptoir Jazz',
			createdAt: ago(60),
			readAt: ago(59)
		}
	});
	await prisma.venueProfile.create({
		data: {
			orgId: comptoirOrg,
			capacity: 80,
			stage: 'Petite scène de 4 m × 3, sono 2 × 500 W, deux retours, éclairage simple.',
			conditions: ['HAT', 'EXPENSES'],
			days: [4, 5, 6],
			ageRule: 'DAYTIME_MINORS',
			publishedAt: ago(58)
		}
	});
	await verification(ctx, comptoirOrg, 'sophie-bar', {
		siret: '90000000000045',
		url: 'https://www.lecomptoirjazz.example',
		foundName: 'LE COMPTOIR JAZZ',
		naf: '56.30Z',
		approved: true,
		at: ago(57)
	});
	await invite(
		ctx,
		comptoirOrg,
		'Le Comptoir Jazz',
		'sophie-bar',
		'awa-clavier',
		'ORG_INVITE',
		'/organisations',
		ago(2)
	);
	// Café des Sons : revendication en attente de la modération.
	const cafe = await venueIn(ctx, 'Café des Sons', 'CAFE_CONCERT', home, 'zoe-violon');
	await prisma.venueClaim.create({
		data: {
			venueId: cafe.id,
			requestedById: P('paul-salle'),
			code: 'LMCAFESO',
			proofUrl: 'https://www.facebook.com/cafedessons',
			status: 'PENDING',
			createdAt: ago(2),
			submittedAt: ago(1)
		}
	});
	// Le bar du Collectif Nuits Courtes, dans la commune voisine.
	const nuitsVenue = await venueIn(ctx, 'Le Petit Zinc', 'BAR', near(communes, 2), 'lina-orga');
	console.log(
		'  · lieux : Comptoir Jazz (revendiqué, fiche publiée, vérifié), Café des Sons (revendication en attente)'
	);

	// ── 8. Plateaux et candidatures (P5-05a) ──
	// Jeudi jazz au Comptoir : publié par le lieu (sans le métier, Q34),
	// rang « Live » exigé. Fanfare Pirate retenue ; Les Lucioles hors conditions.
	const jeudi = await plateau(ctx, {
		issuerId: comptoirOrg,
		postedBy: 'sophie-bar',
		venueId: comptoir.id,
		title: 'Jeudi jazz au Comptoir',
		description: 'Deux groupes, sets de 45 minutes, chapeau et repas offert. Fin à minuit.',
		startsAt: nextWeekday(4, 10, 18, 30),
		slots: 2,
		genre: 'jazz',
		minBandTier: 'FIRST_GIG',
		createdAt: ago(10)
	});
	const lucasSophie = await chat(
		ctx,
		'lucas-sax',
		'sophie-bar',
		[
			[
				'from',
				'Candidature à « Jeudi jazz au Comptoir », au nom de Fanfare Pirate : on est six cuivres, 45 minutes de set.'
			],
			['to', 'Avec plaisir ! Vous ouvrez la soirée à 20 h.']
		],
		ago(8),
		jeudi
	);
	await apply(ctx, {
		opportunityId: jeudi,
		bandId: fanfare,
		sentBy: 'lucas-sax',
		message: 'On est six cuivres, 45 minutes de set, autonomes en son.',
		status: 'ACCEPTED',
		at: ago(8),
		notify: ['sophie-bar'],
		conversationId: lucasSophie,
		title: 'Jeudi jazz au Comptoir'
	});
	// Plateau rock de Bruit Rose : Orbital en attente, Les Rats présélectionnés.
	const rock = await plateau(ctx, {
		issuerId: bruitRose,
		postedBy: 'yanis-orga',
		venueId: comptoir.id,
		title: 'Plateau rock du vendredi',
		description: 'Trois groupes rock ou metal, 40 minutes chacun, cachet de 150 € par groupe.',
		startsAt: nextWeekday(5, 18, 19, 0),
		slots: 3,
		genre: 'rock',
		minBandTier: 'FIRST_REHEARSAL',
		createdAt: ago(6)
	});
	await apply(ctx, {
		opportunityId: rock,
		bandId: orbital,
		sentBy: 'kevin-metal',
		message: 'Metal prog, 40 minutes, on vient avec notre batteuse (16 ans, accompagnée).',
		status: 'SENT',
		at: ago(2),
		notify: ['yanis-orga', 'lina-orga'],
		title: 'Plateau rock du vendredi'
	});
	const rats = await prisma.actor.findUnique({
		where: { handle: 'les-rats-du-mardi' },
		select: { id: true }
	});
	if (rats) {
		await apply(ctx, {
			opportunityId: rock,
			bandId: rats.id,
			sentBy: 'malik-batterie',
			message: 'Funk-rock, cinq musicien·nes, on a déjà joué au Bœuf du Mardi.',
			status: 'SHORTLISTED',
			at: ago(4),
			notify: ['yanis-orga', 'lina-orga'],
			title: 'Plateau rock du vendredi'
		});
	}
	// Scène découverte de Lina (à son nom) : ouverte à tous, Les Lucioles candidates.
	const decouverte = await plateau(ctx, {
		issuerId: P('lina-orga'),
		venueId: nuitsVenue.id,
		title: 'Scène découverte folk',
		description: 'Pour les groupes qui n’ont jamais joué : 20 minutes, public bienveillant.',
		startsAt: inDays(9, 18, 0),
		slots: 3,
		genre: 'folk',
		createdAt: ago(5)
	});
	await apply(ctx, {
		opportunityId: decouverte,
		bandId: lucioles,
		sentBy: 'zoe-violon',
		message: 'Duo violon-ukulélé, trois chansons, notre toute première scène !',
		status: 'SENT',
		at: ago(1),
		notify: ['lina-orga'],
		title: 'Scène découverte folk'
	});
	// Soirée disco de Hugo : à son organisation non vérifiée.
	await plateau(ctx, {
		issuerId: disco,
		postedBy: 'hugo-dj',
		venueId: comptoir.id,
		title: 'Disco live : cherche section rythmique',
		description: 'Un groupe pour jouer 30 minutes entre deux sets DJ, groove obligatoire.',
		startsAt: inDays(25, 22, 0),
		slots: 1,
		genre: 'disco',
		createdAt: ago(3)
	});
	console.log('  · plateaux : 4 ouverts, 4 candidatures (acceptée, présélectionnée, envoyées)');

	// ── 9. Concerts vérifiés et tournée (P5-06) ──
	// Fanfare Pirate : trois concerts dans trois communes en 30 jours, chez
	// des hôtes vérifiés → « Premier concert » et « Première tournée » vérifiés.
	const tour: [
		host: string,
		hostOrg: string,
		isVenue: boolean,
		commune: Commune,
		days: number,
		title: string
	][] = [
		['sophie-bar', comptoirOrg, true, home, 24, 'Fanfare Pirate au Comptoir'],
		['lina-orga', nuitsCourtes, false, near(communes, 2), 16, 'Fanfare Pirate au Petit Zinc'],
		['yanis-orga', coteaux, false, near(communes, 4), 8, 'Fanfare Pirate au Festival des Coteaux']
	];
	for (const [i, [host, hostOrg, isVenue, commune, days, title]] of tour.entries()) {
		const conversationId = await chat(
			ctx,
			'lucas-sax',
			host,
			[
				['from', `Bonjour, on confirme la date du ${dayOf(ago(days))} ?`],
				['to', 'Parfait, à bientôt !']
			],
			ago(days + 10)
		);
		const collabId = await collab(ctx, {
			a: 'lucas-sax',
			b: host,
			kind: 'GIG',
			title,
			when: ago(days, 20),
			conversationId,
			completed: true,
			gig: { bandId: fanfare, hostOrgId: hostOrg, communeCode: commune.code, hostSide: 'b' }
		});
		await gigHeld(ctx, {
			collaborationId: collabId,
			bandId: fanfare,
			hostOrgId: hostOrg,
			hostIsVenue: isVenue,
			verified: true,
			organizer: host,
			player: 'lucas-sax',
			when: ago(days, 20),
			firstDate: i === 0
		});
	}
	await raise(ctx, fanfare, 'FIRST_TOUR', 'VERIFIED', ago(7));
	// Les Rats au Comptoir : leur premier concert passe de corroboré à vérifié.
	if (rats) {
		const malikSophie = await chat(
			ctx,
			'malik-batterie',
			'sophie-bar',
			[
				['from', 'Merci pour la soirée, on confirme le concert ?'],
				['to', 'Oui, salle pleine, revenez quand vous voulez !']
			],
			ago(20)
		);
		const ratsGig = await collab(ctx, {
			a: 'malik-batterie',
			b: 'sophie-bar',
			kind: 'GIG',
			title: 'Les Rats du Mardi au Comptoir',
			when: ago(13, 20),
			conversationId: malikSophie,
			completed: true,
			gig: { bandId: rats.id, hostOrgId: comptoirOrg, communeCode: home.code, hostSide: 'b' }
		});
		await gigHeld(ctx, {
			collaborationId: ratsGig,
			bandId: rats.id,
			hostOrgId: comptoirOrg,
			hostIsVenue: true,
			verified: true,
			organizer: 'sophie-bar',
			player: 'malik-batterie',
			when: ago(13, 20),
			firstDate: false
		});
	}
	// Orbital chez Hugo (organisation non vérifiée) : « Premier concert » corroboré.
	const kevinHugo = await chat(
		ctx,
		'kevin-metal',
		'hugo-dj',
		[
			['from', 'Hugo, on a adoré ouvrir ta soirée, on confirme ?'],
			['to', 'Avec plaisir, c’était énorme.']
		],
		ago(15)
	);
	const orbitalGig = await collab(ctx, {
		a: 'kevin-metal',
		b: 'hugo-dj',
		kind: 'GIG',
		title: 'Orbital aux Soirées Disco Club',
		when: ago(11, 21),
		conversationId: kevinHugo,
		completed: true,
		gig: {
			bandId: orbital,
			hostOrgId: disco,
			communeCode: near(communes, 6).code,
			hostSide: 'b'
		}
	});
	await gigHeld(ctx, {
		collaborationId: orbitalGig,
		bandId: orbital,
		hostOrgId: disco,
		hostIsVenue: false,
		verified: false,
		organizer: 'hugo-dj',
		player: 'kevin-metal',
		when: ago(11, 21),
		firstDate: true
	});
	// Un concert à confirmer : Fanfare Pirate à la Halle des Coteaux, côté Yanis.
	const lucasYanis = await ctx.prisma.conversation.findUniqueOrThrow({
		where: { pairKey: pairKey(P('lucas-sax'), P('yanis-orga')) },
		select: { id: true }
	});
	await collab(ctx, {
		a: 'lucas-sax',
		b: 'yanis-orga',
		kind: 'GIG',
		title: 'Fanfare Pirate, apéro-concert des Coteaux',
		when: ago(2, 19),
		conversationId: lucasYanis.id,
		completed: false,
		gig: {
			bandId: fanfare,
			hostOrgId: coteaux,
			communeCode: near(communes, 4).code,
			hostSide: 'b'
		}
	});
	console.log(
		'  · concerts : tournée vérifiée de Fanfare Pirate, Rats vérifiés, Orbital corroboré, un concert à confirmer'
	);
}

/** DASH-05d à 05g : périodes fictives explicites, sans déduire les actes des anciennes participations. */
export async function seedComanagementDecisions(
	prisma: PrismaClient,
	communes: Commune[],
	demoHandles: ReadonlyMap<string, string>
) {
	const ctx = await demoContext(prisma, communes[0], null, demoHandles);
	for (const fixture of [
		{
			kind: 'PROMOTER',
			owner: 'yanis-orga',
			participant: 'lina-orga',
			orgId: 'demo-memoire-cogestion',
			name: 'Démo — Mémoire de co-gestion',
			prefix: 'demo-cogestion'
		},
		{
			kind: 'STUDIO',
			owner: 'samir-son',
			participant: 'nora-prod',
			orgId: 'demo-memoire-studio',
			name: 'Démo — Mémoire du studio',
			prefix: 'demo-studio-cogestion'
		},
		{
			kind: 'AGENCY',
			owner: 'marc-manager',
			participant: 'elise-booker',
			orgId: 'demo-memoire-agence',
			name: 'Démo — Mémoire de l’agence',
			prefix: 'demo-agence-participation'
		},
		{
			kind: 'BAND',
			owner: 'malik-batterie',
			participant: 'zoe-violon',
			orgId: 'demo-memoire-groupe',
			name: 'Démo — Mémoire du groupe',
			prefix: 'demo-groupe-participation'
		}
	] as const) {
		const ownerId = id(ctx, fixture.owner);
		const participantId = id(ctx, fixture.participant);
		if (
			!ownerId ||
			!participantId ||
			(await prisma.person.count({
				where: {
					actorId: { in: [ownerId, participantId] },
					user: { email: { endsWith: '@demo.linkmusician.test' } }
				}
			})) !== 2
		)
			continue;
		const orgId = fixture.orgId;
		await prisma.actor.upsert({
			where: { id: orgId },
			update: {},
			create: {
				id: orgId,
				kind: 'ORGANIZATION',
				handle: orgId,
				displayName: fixture.name,
				hidden: true,
				organization: {
					create: {
						kind: fixture.kind,
						...(fixture.kind === 'STUDIO'
							? { studio: { create: {} } }
							: fixture.kind === 'PROMOTER'
								? { promoter: { create: {} } }
								: {}),
						memberships: {
							create: { personId: ownerId, role: 'OWNER', status: 'ACTIVE', startedAt: ago(10) }
						}
					}
				}
			}
		});
		for (const kind of ['LEFT', 'DECLINED', 'WITHDRAWN'] as const) {
			const at = ago(kind === 'LEFT' ? 7 : kind === 'DECLINED' ? 5 : 3);
			await prisma.membership.upsert({
				where: { id: `${fixture.prefix}-${kind.toLowerCase()}` },
				update: {},
				create: {
					id: `${fixture.prefix}-${kind.toLowerCase()}`,
					orgId,
					personId: participantId,
					role: fixture.kind === 'BAND' ? 'MEMBER' : 'ADMIN',
					status: kind === 'LEFT' ? 'LEFT' : 'DECLINED',
					invitedById: ownerId,
					createdAt: new Date(at.getTime() - 2 * DAY),
					startedAt: kind === 'LEFT' ? new Date(at.getTime() - DAY) : null,
					endedAt: at,
					decisions: {
						create: [
							...(kind === 'LEFT'
								? [
										{
											kind: 'ACCEPTED' as const,
											authorId: participantId,
											occurredAt: new Date(at.getTime() - DAY)
										}
									]
								: []),
							{ kind, authorId: kind === 'WITHDRAWN' ? ownerId : participantId, occurredAt: at }
						]
					}
				}
			});
		}
		// DASH-05h : scénario fictif dédié, aucune conversion des périodes existantes.
		if (fixture.kind === 'BAND') {
			const rolesOrg = 'demo-memoire-roles-groupe';
			await prisma.actor.upsert({
				where: { id: rolesOrg },
				update: {},
				create: {
					id: rolesOrg,
					kind: 'ORGANIZATION',
					handle: rolesOrg,
					displayName: 'Démo — Rôles du groupe',
					hidden: true,
					organization: { create: { kind: 'BAND' } }
				}
			});
			for (const [personId, role, suffix] of [
				[ownerId, 'OWNER', 'responsable'],
				[participantId, 'ADMIN', 'membre']
			] as const) {
				const membershipId = `demo-roles-groupe-${suffix}`;
				await prisma.membership.upsert({
					where: { id: membershipId },
					update: {},
					create: {
						id: membershipId,
						orgId: rolesOrg,
						personId,
						role,
						status: 'ACTIVE',
						startedAt: ago(12)
					}
				});
				const acts =
					suffix === 'membre'
						? ([
								['BAND_ADMIN_GRANTED', ownerId, 11],
								['BAND_MEMBER_SET', ownerId, 10],
								['BAND_ADMIN_GRANTED', ownerId, 9],
								['BAND_OWNERSHIP_RECEIVED', ownerId, 8],
								['BAND_OWNERSHIP_GIVEN', participantId, 7],
								['BAND_OWNERSHIP_RECEIVED', ownerId, 6],
								['BAND_OWNERSHIP_GIVEN', participantId, 5]
							] as const)
						: ([
								['BAND_OWNERSHIP_GIVEN', ownerId, 8],
								['BAND_OWNERSHIP_RECEIVED', participantId, 7],
								['BAND_OWNERSHIP_GIVEN', ownerId, 6],
								['BAND_OWNERSHIP_RECEIVED', participantId, 5]
							] as const);
				for (const [index, [kind, authorId, days]] of acts.entries()) {
					await prisma.membershipDecision.upsert({
						where: { id: `${membershipId}-acte-${index}` },
						update: {},
						create: {
							id: `${membershipId}-acte-${index}`,
							membershipId,
							kind,
							authorId,
							occurredAt: ago(days)
						}
					});
				}
			}
		}
		if (fixture.kind === 'BAND') {
			for (const [i, kind] of (
				[
					'REQUEST_DECLINED',
					'REQUEST_WITHDRAWN',
					'REQUEST_ACCEPTED',
					'RECRUITMENT_ACCEPTED'
				] as const
			).entries()) {
				const at = ago(6 - i);
				const joined = kind === 'REQUEST_ACCEPTED' || kind === 'RECRUITMENT_ACCEPTED';
				const decidedAt = new Date(at.getTime() - DAY);
				const requestedAt = new Date(at.getTime() - 2 * DAY);
				await prisma.membership.upsert({
					where: { id: `${fixture.prefix}-${kind.toLowerCase()}` },
					update: {},
					create: {
						id: `${fixture.prefix}-${kind.toLowerCase()}`,
						orgId,
						personId: participantId,
						role: 'MEMBER',
						status: joined ? 'LEFT' : 'DECLINED',
						createdAt: requestedAt,
						startedAt: joined ? decidedAt : null,
						endedAt: joined ? at : decidedAt,
						decisions: {
							create: [
								...(kind !== 'RECRUITMENT_ACCEPTED'
									? [
											{
												kind: 'JOIN_REQUESTED' as const,
												authorId: participantId,
												occurredAt: requestedAt
											}
										]
									: []),
								{
									kind,
									authorId: kind === 'REQUEST_WITHDRAWN' ? participantId : ownerId,
									occurredAt: decidedAt
								},
								...(joined
									? [{ kind: 'LEFT' as const, authorId: participantId, occurredAt: at }]
									: [])
							]
						}
					}
				});
			}
		}
	}
}
