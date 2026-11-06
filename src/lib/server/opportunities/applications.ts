/**
 * Candidatures (P2-03) : postuler (conditions vérifiées), retirer, voir et
 * trancher les candidatures de son annonce. L'acceptation ouvre une
 * conversation liée à l'annonce : quand l'échange devient réciproque, la
 * règle `conversation.reciprocated` crédite les deux personnes.
 */
import { prisma } from '#lib/server';
import { publicActorWhere } from '#lib/server/actors/visibility';
import { isBlockedBetween } from '#lib/server/blocking/service';
import { getMusicianTier } from '#lib/server/progression/read';
import { checkMessage, pairKey } from '#lib/messaging/rules';
import { isActive, unmetConditions, type CandidateFacts } from '#lib/opportunities/rules';
import {
	MAX_APPLICATION,
	MIN_APPLICATION,
	UNMET_LABELS,
	applicationTransition,
	type ApplicationStatusValue
} from '#lib/opportunities/applications';
import { OpportunityError } from './service';
import { notify } from '#lib/server/notifications/service';

/** Ce que le profil d'une personne dit des conditions d'une annonce. */
export async function candidateFacts(actorId: string): Promise<CandidateFacts> {
	const [instruments, genres, tier] = await Promise.all([
		prisma.personInstrument.findMany({
			where: { personId: actorId },
			select: { declaredLevel: true, instrument: { select: { slug: true } } }
		}),
		prisma.actorGenre.findMany({
			where: { actorId },
			select: { genre: { select: { slug: true, parent: { select: { slug: true } } } } }
		}),
		getMusicianTier(actorId, prisma)
	]);
	return {
		instruments: instruments.map((i) => ({ slug: i.instrument.slug, level: i.declaredLevel })),
		// Un sous-genre déclaré compte aussi pour son genre parent.
		genreSlugs: [
			...new Set(
				genres.flatMap((g) => [g.genre.slug, ...(g.genre.parent ? [g.genre.parent.slug] : [])])
			)
		],
		tiers: tier.reached
	};
}

/** Conditions non remplies, en mots (vide = éligible). */
export async function eligibilityFor(
	actorId: string,
	o: {
		instrumentId: string | null;
		minLevel: number | null;
		genreSlug: string | null;
		minTier: string | null;
	}
) {
	const instrument = o.instrumentId
		? await prisma.instrument.findUnique({ where: { id: o.instrumentId }, select: { slug: true } })
		: null;
	const unmet = unmetConditions(
		{ instrument: instrument?.slug, minLevel: o.minLevel, genre: o.genreSlug, minTier: o.minTier },
		await candidateFacts(actorId)
	);
	return unmet.map((u) => UNMET_LABELS[u]);
}

function checkedMessage(raw: string) {
	const result = checkMessage(raw);
	if (!result.ok || [...result.body].length < MIN_APPLICATION) {
		throw new OpportunityError(`Présente-toi en ${MIN_APPLICATION} caractères au moins.`);
	}
	if ([...result.body].length > MAX_APPLICATION) {
		throw new OpportunityError(`Ton message dépasse ${MAX_APPLICATION} caractères.`);
	}
	return result.body;
}

export async function applyTo(
	actorId: string,
	opportunityId: string,
	raw: string,
	now = new Date()
) {
	const o = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
	if (!o || o.status === 'REMOVED') throw new OpportunityError('Annonce introuvable.', 404);
	if (o.issuerActorId === actorId) throw new OpportunityError('C’est ton annonce.');
	if (!isActive(o, now)) throw new OpportunityError('Cette annonce n’est plus ouverte.');
	const issuerVisible = await prisma.actor.count({
		where: { id: o.issuerActorId, ...publicActorWhere(now, actorId) }
	});
	if (issuerVisible === 0) throw new OpportunityError('Annonce introuvable.', 404);
	const existing = await prisma.application.findUnique({
		where: { opportunityId_applicantActorId: { opportunityId, applicantActorId: actorId } }
	});
	if (existing) throw new OpportunityError('Tu as déjà postulé à cette annonce.');
	const unmet = await eligibilityFor(actorId, o);
	if (unmet.length > 0) {
		throw new OpportunityError(`Tu ne peux pas postuler : ${unmet.join(', ')}.`);
	}
	return prisma.$transaction(async (tx) => {
		const created = await tx.application.create({
			data: { opportunityId, applicantActorId: actorId, message: checkedMessage(raw) },
			select: { id: true }
		});
		// Notification (P2-09a) : la candidature se lit sur l'annonce.
		await notify(tx, {
			recipientId: o.issuerActorId,
			type: 'APPLICATION_RECEIVED',
			fromActorId: actorId,
			href: `/annonces/${opportunityId}`,
			title: o.title
		});
		return created;
	});
}

export async function withdrawApplication(actorId: string, applicationId: string) {
	const app = await prisma.application.findFirst({
		where: { id: applicationId, applicantActorId: actorId }
	});
	const next = app && applicationTransition(app.status as ApplicationStatusValue, 'withdraw');
	if (!next) throw new OpportunityError('Cette candidature ne peut plus être retirée.');
	await prisma.application.update({ where: { id: applicationId }, data: { status: next } });
}

/** Ma candidature à une annonce, s'il y en a une. */
export async function myApplication(actorId: string, opportunityId: string) {
	return prisma.application.findUnique({
		where: { opportunityId_applicantActorId: { opportunityId, applicantActorId: actorId } },
		select: { id: true, status: true, conversationId: true, createdAt: true }
	});
}

/** Mes candidatures, les plus récentes d'abord. */
export async function listMyApplications(actorId: string) {
	const rows = await prisma.application.findMany({
		where: { applicantActorId: actorId },
		orderBy: { createdAt: 'desc' },
		take: 50,
		select: {
			id: true,
			status: true,
			conversationId: true,
			opportunity: { select: { id: true, title: true } }
		}
	});
	return rows.map((r) => ({ ...r, status: r.status as ApplicationStatusValue }));
}

/**
 * Candidatures reçues sur mon annonce. Les ouvrir les marque « vues » : le
 * candidat sait où il en est.
 */
export async function listForIssuer(issuerId: string, opportunityId: string) {
	const o = await prisma.opportunity.findFirst({
		where: { id: opportunityId, issuerActorId: issuerId },
		select: { id: true }
	});
	if (!o) return [];
	await prisma.application.updateMany({
		where: { opportunityId, status: 'SENT' },
		data: { status: 'SEEN' }
	});
	const rows = await prisma.application.findMany({
		where: { opportunityId, status: { not: 'WITHDRAWN' } },
		orderBy: { createdAt: 'asc' },
		select: {
			id: true,
			status: true,
			message: true,
			conversationId: true,
			createdAt: true,
			applicant: {
				select: {
					handle: true,
					displayName: true,
					deletedAt: true,
					person: {
						select: {
							instruments: {
								orderBy: [{ isPrimary: 'desc' }],
								take: 2,
								select: { declaredLevel: true, instrument: { select: { name: true } } }
							}
						}
					}
				}
			}
		}
	});
	return rows.map((r) => ({
		id: r.id,
		status: r.status as ApplicationStatusValue,
		message: r.message,
		conversationId: r.conversationId,
		createdAt: r.createdAt,
		applicant: {
			handle: r.applicant.deletedAt ? null : r.applicant.handle,
			displayName: r.applicant.displayName,
			instruments: (r.applicant.person?.instruments ?? []).map((i) => ({
				name: i.instrument.name,
				level: i.declaredLevel
			}))
		}
	}));
}

/** Présélectionner, accepter ou refuser une candidature de mon annonce. */
export async function decideApplication(
	issuerId: string,
	applicationId: string,
	action: 'shortlist' | 'accept' | 'decline',
	now = new Date()
) {
	const app = await prisma.application.findUnique({
		where: { id: applicationId },
		include: { opportunity: true }
	});
	if (!app || app.opportunity.issuerActorId !== issuerId) {
		throw new OpportunityError('Candidature introuvable.', 404);
	}
	const next = applicationTransition(app.status as ApplicationStatusValue, action);
	if (!next) throw new OpportunityError('Cette candidature est déjà tranchée.');
	if (action !== 'accept') {
		await prisma.application.update({
			where: { id: applicationId },
			data: { status: next, ...(action === 'decline' ? { decidedAt: now } : {}) }
		});
		return { conversationId: null };
	}
	const o = app.opportunity;
	if (o.status !== 'OPEN') throw new OpportunityError('Cette annonce n’est plus ouverte.');
	if (await isBlockedBetween(issuerId, app.applicantActorId)) {
		throw new OpportunityError('Impossible d’accepter cette candidature.');
	}

	return prisma.$transaction(async (tx) => {
		const accepted = await tx.application.count({
			where: { opportunityId: o.id, status: 'ACCEPTED' }
		});
		if (accepted >= o.slots) throw new OpportunityError('Toutes les places sont déjà prises.');

		// Conversation liée à l'annonce : le message de candidature en premier,
		// le candidat comme initiateur. La première réponse de l'auteur rend
		// l'échange réciproque (XP des deux, règle de l'annonce).
		const key = pairKey(issuerId, app.applicantActorId);
		const body = `Candidature à « ${o.title} » :\n\n${app.message}`;
		const existing = await tx.conversation.findUnique({ where: { pairKey: key } });
		let conversationId: string;
		if (existing) {
			conversationId = existing.id;
			await tx.conversation.update({
				where: { id: existing.id },
				data: {
					lastMessageAt: now,
					...(existing.opportunityId === null && existing.reciprocatedAt === null
						? { opportunityId: o.id }
						: {})
				}
			});
			// Accepter vaut consentement des deux côtés.
			await tx.conversationParticipant.updateMany({
				where: { conversationId: existing.id },
				data: { state: 'ACCEPTED' }
			});
			await tx.message.create({
				data: {
					conversationId: existing.id,
					senderActorId: app.applicantActorId,
					body,
					createdAt: now
				}
			});
		} else {
			const created = await tx.conversation.create({
				data: {
					pairKey: key,
					initiatorId: app.applicantActorId,
					opportunityId: o.id,
					lastMessageAt: now,
					participants: {
						create: [
							{ actorId: app.applicantActorId, state: 'ACCEPTED', lastReadAt: now },
							{ actorId: issuerId, state: 'ACCEPTED' }
						]
					},
					messages: {
						create: { senderActorId: app.applicantActorId, body, createdAt: now }
					}
				},
				select: { id: true }
			});
			conversationId = created.id;
		}
		await tx.application.update({
			where: { id: applicationId },
			data: { status: 'ACCEPTED', decidedAt: now, conversationId }
		});
		if (accepted + 1 >= o.slots) {
			await tx.opportunity.update({ where: { id: o.id }, data: { status: 'FILLED' } });
		}
		// Notification (P2-09a) : la conversation est ouverte.
		await notify(tx, {
			recipientId: app.applicantActorId,
			type: 'APPLICATION_ACCEPTED',
			fromActorId: issuerId,
			href: `/messages/${conversationId}`,
			title: o.title
		});
		return { conversationId };
	});
}
