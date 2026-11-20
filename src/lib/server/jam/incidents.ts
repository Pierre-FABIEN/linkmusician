/**
 * Jams signalées et restriction d'organiser (#91b, RV-01). Règles pures :
 * `#lib/jam/incidents`.
 *
 * - Un·e participant·e inscrit·e **avant le début** signale, du début à 24 h
 *   après la fin, que la jam n'a pas lieu. Un dossier par jam, un signalement
 *   par personne (le renvoyer le met à jour). Ni présence ni XP créées.
 * - Au premier signalement : l'organisateur est prévenu (sans savoir par
 *   qui) et peut répondre ou annuler ; les autres inscrit·es reçoivent un
 *   avertissement **neutre**. Rien n'est affiché publiquement.
 * - Le nombre de signalements priorise, il ne sanctionne jamais. La
 *   modération voit les preuves (signalants, ancienneté des comptes,
 *   réponse, précédents) et décide : classer, ou confirmer avec un
 *   avertissement ou une interdiction d'organiser (7 j, 30 j, sans limite).
 * - L'interdiction ne touche que l'organisation de jams (`isJamOrganizer`,
 *   scènes ouvertes) ; `Person.organizesJams` n'est pas modifié. Levée
 *   tracée, recours compris. Tout passe au journal de modération.
 * - Conservation : un dossier décidé est effacé après 12 mois.
 */
import { prisma } from '#lib/server';
import { logAdminAction } from '#lib/server/audit-log';
import { notify } from '#lib/server/notifications/service';
import { publicActorWhere } from '#lib/server/actors/visibility';
import { RefillingTokenBucket } from '#lib/server/rate-limit';
import { sanction } from '#lib/server/moderation/service';
import { leadOf } from '#lib/jam/lineup';
import {
	INCIDENT_REASON_LABELS,
	MAX_ORGANIZER_RESPONSE,
	PRIORITY_REPORTS,
	RECENT_ACCOUNT_DAYS,
	isReportWindowOpen,
	restrictionDays,
	type IncidentDecisionForm,
	type JamReportForm
} from '#lib/jam/incidents';
import { JamError } from './publicJams';
import { hostIdsOf, issuerManagersSelect } from './hosts';
import { invalidateJam } from './afterJam';

const DAY_MS = 86_400_000;
const RETENTION_DAYS = 365;

type Moderator = { userId: string };

/** Cinq signalements de jam par jour et par compte. */
const reportBucket = new RefillingTokenBucket<string>(5, Math.ceil(86400 / 5), 'jam-incidents');

const jamSelect = {
	id: true,
	title: true,
	kind: true,
	status: true,
	startsAt: true,
	endsAt: true,
	cancelledAt: true,
	issuerActorId: true,
	postedById: true,
	leadActorId: true,
	issuer: { select: { kind: true, ...issuerManagersSelect } }
} as const;

type JamRow = NonNullable<Awaited<ReturnType<typeof findJam>>>;

function findJam(id: string) {
	return prisma.opportunity.findFirst({ where: { id, kind: 'JAM' }, select: jamSelect });
}

/** Qui organise : l'émetteur, la gestion du lieu, la personne qui a publié, le lead. */
function organizerIds(jam: JamRow) {
	return new Set([...hostIdsOf(jam), ...(jam.postedById ? [jam.postedById] : []), leadOf(jam)]);
}

/** La personne responsable d'une jam : qui l'a publiée, sinon l'émetteur s'il est une personne. */
function responsibleOf(jam: JamRow) {
	return jam.postedById ?? (jam.issuer.kind === 'PERSON' ? jam.issuerActorId : null);
}

/** Inscrit·e avant le début : « Je viens » ou invitation acceptée. */
async function registeredBefore(jam: JamRow, actorId: string) {
	const startsAt = jam.startsAt!;
	const [attendance, invite] = await Promise.all([
		prisma.jamAttendance.count({
			where: { opportunityId: jam.id, actorId, createdAt: { lt: startsAt } }
		}),
		prisma.jamInvite.count({
			where: { opportunityId: jam.id, actorId, status: 'ACCEPTED', respondedAt: { lt: startsAt } }
		})
	]);
	return attendance + invite > 0;
}

/**
 * La personne peut-elle signaler cette jam ? `null` si la jam n'existe pas
 * pour elle ; sinon l'état, pour la page de signalement.
 */
export async function reportState(jamId: string, viewerId: string, now = new Date()) {
	const jam = await findJam(jamId);
	if (!jam?.startsAt || !jam.endsAt) return null;
	const issuerVisible = await prisma.actor.count({
		where: { id: jam.issuerActorId, ...publicActorWhere(now, viewerId) }
	});
	if (!issuerVisible) return null;
	const organizers = organizerIds(jam);
	const window = { startsAt: jam.startsAt, endsAt: jam.endsAt };
	const isOrganizer = organizers.has(viewerId);
	const incident = await prisma.jamIncident.findUnique({
		where: { opportunityId: jam.id },
		select: {
			id: true,
			status: true,
			organizerResponse: true,
			reports: { where: { reporterId: viewerId }, select: { reason: true, details: true } }
		}
	});
	const registered = !isOrganizer && (await registeredBefore(jam, viewerId));
	return {
		jam: { id: jam.id, title: jam.title, startsAt: jam.startsAt, endsAt: jam.endsAt },
		isOrganizer,
		cancelled: jam.cancelledAt !== null,
		windowOpen: isReportWindowOpen(window, now),
		canReport: registered && !jam.cancelledAt && isReportWindowOpen(window, now),
		myReport: incident?.reports[0] ?? null,
		// Pour l'organisateur seulement : jamais l'identité des signalant·es.
		incident:
			isOrganizer && incident
				? {
						status: incident.status,
						// Ni identité ni nombre de signalant·es : avec peu d'inscrit·es, le
						// nombre suffirait à deviner qui a signalé.
						response: incident.organizerResponse
					}
				: null
	};
}

/** Personnes à prévenir : inscrit·es et invité·es, hors organisation. */
async function participantIds(jamId: string) {
	const [attendances, invites] = await Promise.all([
		prisma.jamAttendance.findMany({ where: { opportunityId: jamId }, select: { actorId: true } }),
		prisma.jamInvite.findMany({
			where: { opportunityId: jamId, status: { in: ['INVITED', 'ACCEPTED'] } },
			select: { actorId: true }
		})
	]);
	return new Set([...attendances, ...invites].map((r) => r.actorId));
}

/** Signaler « la jam n'a pas lieu ». Renvoie `true` si le dossier vient d'être ouvert. */
export async function reportJam(
	jamId: string,
	reporterId: string,
	form: JamReportForm,
	now = new Date()
) {
	const state = await reportState(jamId, reporterId, now);
	if (!state) throw new JamError('Jam introuvable.', 404);
	if (state.isOrganizer) throw new JamError('Tu organises cette jam : annule-la si besoin.', 403);
	if (state.cancelled) throw new JamError('Cette jam est déjà annulée.');
	if (!state.windowOpen) {
		throw new JamError('On signale une jam du début jusqu’à 24 h après sa fin.');
	}
	if (!state.canReport) {
		throw new JamError('Seules les personnes inscrites avant le début peuvent signaler.', 403);
	}
	if (!state.myReport && !(await reportBucket.consume(reporterId, 1))) {
		throw new JamError('Tu as fait beaucoup de signalements aujourd’hui : réessaie demain.', 429);
	}
	const details = form.details || null;
	const { incident, created } = await prisma.$transaction(async (tx) => {
		const existing = await tx.jamIncident.findUnique({
			where: { opportunityId: jamId },
			select: { id: true, status: true }
		});
		const incident =
			existing ??
			(await tx.jamIncident.upsert({
				where: { opportunityId: jamId },
				create: { opportunityId: jamId },
				update: {},
				select: { id: true, status: true }
			}));
		await tx.jamIncidentReport.upsert({
			where: { incidentId_reporterId: { incidentId: incident.id, reporterId } },
			create: {
				incidentId: incident.id,
				reporterId,
				reason: form.reason,
				wentThere: true,
				details
			},
			update: { reason: form.reason, details }
		});
		// Un signalement tardif rouvre un dossier déjà décidé.
		if (incident.status !== 'OPEN') {
			await tx.jamIncident.update({ where: { id: incident.id }, data: { status: 'OPEN' } });
		}
		return { incident, created: !existing };
	});
	if (created) {
		const jam = (await findJam(jamId))!;
		const organizers = organizerIds(jam);
		for (const recipientId of organizers) {
			await notify(prisma, {
				recipientId,
				type: 'JAM_REPORTED',
				href: `/jams/${jamId}/signaler`,
				title: jam.title
			});
		}
		const reporters = new Set(
			(
				await prisma.jamIncidentReport.findMany({
					where: { incidentId: incident.id },
					select: { reporterId: true }
				})
			).map((r) => r.reporterId)
		);
		for (const recipientId of await participantIds(jamId)) {
			if (organizers.has(recipientId) || reporters.has(recipientId)) continue;
			await notify(prisma, {
				recipientId,
				type: 'JAM_ALERT',
				href: `/jams/${jamId}`,
				title: jam.title
			});
		}
	}
	return created;
}

/** L'organisateur répond au signalement (texte brut, vu de la modération). */
export async function respondToIncident(
	jamId: string,
	organizerId: string,
	raw: string,
	now = new Date()
) {
	const jam = await findJam(jamId);
	if (!jam || !organizerIds(jam).has(organizerId)) {
		throw new JamError('Seule l’organisation de la jam répond.', 403);
	}
	const response = raw.trim().slice(0, MAX_ORGANIZER_RESPONSE);
	if (response.length < 3) throw new JamError('Explique ce qui s’est passé en quelques mots.');
	const { count } = await prisma.jamIncident.updateMany({
		where: { opportunityId: jamId, status: 'OPEN' },
		data: { organizerResponse: response, organizerRespondedAt: now }
	});
	if (count === 0) throw new JamError('Aucun signalement en cours sur cette jam.', 404);
}

/** Avertissement neutre sur la fiche : un dossier est ouvert. Pour les participant·es. */
export async function hasOpenIncident(jamId: string) {
	return (await prisma.jamIncident.count({ where: { opportunityId: jamId, status: 'OPEN' } })) > 0;
}

// ── Restriction d'organiser ─────────────────────────────────────────────

const activeRestrictionWhere = (actorId: string, now: Date) => ({
	actorId,
	liftedAt: null,
	OR: [{ until: null }, { until: { gt: now } }]
});

/** L'interdiction d'organiser en vigueur, ou `null`. */
export async function activeOrganizingRestriction(actorId: string, now = new Date()) {
	return prisma.jamOrganizingRestriction.findFirst({
		where: activeRestrictionWhere(actorId, now),
		orderBy: [{ until: { sort: 'desc', nulls: 'first' } }],
		select: { id: true, reason: true, until: true }
	});
}

// ── Modération ──────────────────────────────────────────────────────────

/** Dossiers ouverts, prioritaires d'abord, avec ce qu'il faut pour instruire. */
export async function jamIncidentQueue(now = new Date()) {
	const incidents = await prisma.jamIncident.findMany({
		where: { status: 'OPEN' },
		orderBy: { createdAt: 'asc' },
		take: 50,
		select: {
			id: true,
			createdAt: true,
			organizerResponse: true,
			organizerRespondedAt: true,
			opportunity: {
				select: {
					...jamSelect,
					issuer: {
						select: { kind: true, handle: true, displayName: true, ...issuerManagersSelect }
					},
					postedBy: { select: { handle: true, displayName: true } },
					venue: { select: { name: true, communeName: true, claimedByActorId: true } },
					_count: { select: { attendances: true } }
				}
			},
			reports: {
				orderBy: { createdAt: 'asc' },
				select: {
					reason: true,
					wentThere: true,
					details: true,
					createdAt: true,
					reporter: { select: { handle: true, displayName: true, createdAt: true } }
				}
			}
		}
	});
	const responsibles = [
		...new Set(
			incidents.map((i) => responsibleOf(i.opportunity)).filter((id): id is string => !!id)
		)
	];
	const [confirmed, restrictions] = await Promise.all([
		prisma.jamIncident.findMany({
			where: {
				status: 'CONFIRMED',
				opportunity: {
					OR: [{ postedById: { in: responsibles } }, { issuerActorId: { in: responsibles } }]
				}
			},
			select: { opportunity: { select: { postedById: true, issuerActorId: true } } }
		}),
		prisma.jamOrganizingRestriction.findMany({
			where: { actorId: { in: responsibles }, liftedAt: null },
			select: { actorId: true }
		})
	]);
	const count = (list: string[], id: string | null) =>
		id ? list.filter((x) => x === id).length : 0;
	const confirmedOf = confirmed.map((c) => c.opportunity.postedById ?? c.opportunity.issuerActorId);
	const restrictedOf = restrictions.map((r) => r.actorId);
	return incidents
		.map((i) => {
			const jam = i.opportunity;
			const responsible = responsibleOf(jam);
			return {
				id: i.id,
				openedAt: i.createdAt,
				priority: i.reports.length >= PRIORITY_REPORTS,
				jam: {
					id: jam.id,
					title: jam.title,
					startsAt: jam.startsAt!,
					endsAt: jam.endsAt!,
					cancelled: jam.cancelledAt !== null,
					venue: jam.venue,
					venueClaimed: Boolean(jam.venue?.claimedByActorId),
					issuer: { handle: jam.issuer.handle, displayName: jam.issuer.displayName },
					postedBy: jam.postedBy,
					registered: jam._count.attendances
				},
				hasResponsible: responsible !== null,
				precedents: count(confirmedOf, responsible),
				activeRestrictions: count(restrictedOf, responsible),
				response: i.organizerResponse,
				reports: i.reports.map((r) => ({
					reason: INCIDENT_REASON_LABELS[r.reason],
					wentThere: r.wentThere,
					details: r.details,
					at: r.createdAt,
					reporter: { handle: r.reporter.handle, displayName: r.reporter.displayName },
					recentAccount:
						now.getTime() - r.reporter.createdAt.getTime() < RECENT_ACCOUNT_DAYS * DAY_MS
				}))
			};
		})
		.sort((a, b) => Number(b.priority) - Number(a.priority));
}

/** Interdictions en vigueur, pour la levée et les recours. */
export async function activeRestrictions(now = new Date()) {
	const rows = await prisma.jamOrganizingRestriction.findMany({
		where: { liftedAt: null, OR: [{ until: null }, { until: { gt: now } }] },
		orderBy: { createdAt: 'desc' },
		take: 100,
		select: {
			id: true,
			reason: true,
			until: true,
			createdAt: true,
			actor: { select: { handle: true, displayName: true } }
		}
	});
	return rows;
}

/**
 * Décider d'un dossier. Classer n'a aucune suite ; confirmer peut avertir ou
 * interdire d'organiser la personne responsable. Participant·es et
 * signalant·es sont prévenu·es que le problème a été examiné.
 */
export async function decideIncident(
	incidentId: string,
	form: IncidentDecisionForm,
	by: Moderator,
	now = new Date()
) {
	const incident = await prisma.jamIncident.findUnique({
		where: { id: incidentId },
		select: { id: true, status: true, opportunity: { select: jamSelect } }
	});
	if (!incident || incident.status !== 'OPEN')
		throw new JamError('Dossier introuvable ou déjà décidé.', 404);
	const jam = incident.opportunity;
	const responsible = responsibleOf(jam);
	if (form.decision === 'confirm' && form.sanction !== 'none' && !responsible) {
		throw new JamError('Aucune personne responsable identifiée pour cette jam.');
	}
	const { count } = await prisma.jamIncident.updateMany({
		where: { id: incidentId, status: 'OPEN' },
		data: {
			status: form.decision === 'confirm' ? 'CONFIRMED' : 'DISMISSED',
			decidedAt: now,
			decidedByUserId: by.userId,
			decisionNote: form.note
		}
	});
	if (count === 0) throw new JamError('Dossier déjà décidé.', 409);
	await logAdminAction({
		actorId: by.userId,
		action: `moderation.jam_incident.${form.decision}`,
		targetType: 'JamIncident',
		targetId: incidentId,
		metadata: { note: form.note, sanction: form.sanction, jamId: jam.id }
	});
	// #93 : une jam fictive confirmée perd ses gains (jam.held, appréciations), une seule fois.
	if (form.decision === 'confirm')
		await invalidateJam(jam.id, `Jam fictive confirmée : ${form.note}`, now);
	if (form.decision === 'confirm' && responsible) {
		if (form.sanction === 'warning') {
			await sanction(responsible, { kind: 'WARNING', reason: form.note, days: null }, by);
		}
		const days = restrictionDays(form.sanction);
		if (days !== undefined) {
			const restriction = await prisma.jamOrganizingRestriction.create({
				data: {
					actorId: responsible,
					incidentId,
					reason: form.note,
					until: days === null ? null : new Date(now.getTime() + days * DAY_MS),
					createdByUserId: by.userId
				},
				select: { id: true, until: true }
			});
			await logAdminAction({
				actorId: by.userId,
				action: 'moderation.jam_restriction.create',
				targetType: 'Actor',
				targetId: responsible,
				metadata: { reason: form.note, until: restriction.until, incidentId }
			});
		}
	}
	const reporters = await prisma.jamIncidentReport.findMany({
		where: { incidentId },
		select: { reporterId: true }
	});
	const recipients = new Set([
		...(await participantIds(jam.id)),
		...reporters.map((r) => r.reporterId)
	]);
	for (const recipientId of recipients) {
		await notify(prisma, {
			recipientId,
			type: 'JAM_INCIDENT_CLOSED',
			href: '/jam/agenda',
			title: jam.title
		});
	}
}

/** Lever une interdiction (fin anticipée, recours accepté), avec un motif. */
export async function liftRestriction(
	restrictionId: string,
	note: string,
	by: Moderator,
	now = new Date()
) {
	if (note.trim().length < 3) throw new JamError('Indique le motif de la levée.');
	const { count } = await prisma.jamOrganizingRestriction.updateMany({
		where: { id: restrictionId, liftedAt: null },
		data: { liftedAt: now, liftedByUserId: by.userId, liftNote: note.trim().slice(0, 1000) }
	});
	if (count === 0) throw new JamError('Interdiction introuvable ou déjà levée.', 404);
	await logAdminAction({
		actorId: by.userId,
		action: 'moderation.jam_restriction.lift',
		targetType: 'JamOrganizingRestriction',
		targetId: restrictionId,
		metadata: { note: note.trim() }
	});
}

/** Conservation : un dossier décidé il y a plus de 12 mois est effacé, ses signalements avec. */
export async function purgeOldIncidents(now = new Date()) {
	const { count } = await prisma.jamIncident.deleteMany({
		where: {
			status: { not: 'OPEN' },
			decidedAt: { lt: new Date(now.getTime() - RETENTION_DAYS * DAY_MS) }
		}
	});
	return count;
}
