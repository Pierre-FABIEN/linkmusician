/**
 * Candidatures (P2-03) : postuler (conditions vérifiées), retirer, voir et
 * trancher les candidatures de son annonce. L'acceptation ouvre une
 * conversation liée à l'annonce : quand l'échange devient réciproque, la
 * règle `conversation.reciprocated` crédite les deux personnes.
 *
 * Recrutement d'un groupe (P3-03) : la gestion du groupe est prévenue et
 * tranche ; accepter ouvre la conversation avec la personne qui accepte et
 * fait entrer la candidate dans le groupe (`joinFromRecruitment`, XP
 * d'adhésion et formation du groupe), dans la même transaction.
 *
 * Plateau (P5-05a) : on candidate au nom d'un groupe (`gigSlots.ts`) ; la
 * conversation s'ouvre avec la personne qui a envoyé la candidature.
 */
import { prisma } from '#lib/server';
import { publicActorWhere } from '#lib/server/actors/visibility';
import { getMusicianTier } from '#lib/server/progression/read';
import { checkMessage, pairKey } from '#lib/messaging/rules';
import {
	isActive,
	unknownConditions,
	unmetConditions,
	type CandidateFacts,
	type EligibilityCondition
} from '#lib/opportunities/rules';
import { UNKNOWN_LABELS } from '#lib/opportunities/qualification';
import { qualifiedTable } from '#lib/server/db-schema';
import type { Prisma } from '@prisma/client';
import {
	MAX_APPLICATION,
	MIN_APPLICATION,
	UNMET_LABELS,
	applicationTransition,
	type ApplicationStatusValue
} from '#lib/opportunities/applications';
import { OpportunityError, managesIssuer } from './service';
import { BAND_TX, BandError, bandManagerIds, joinFromRecruitment } from '#lib/server/bands/service';
import { notify } from '#lib/server/notifications/service';
import { artistAnswerers } from '#lib/server/representation/delegationAccess';
import { bandTierOf } from '#lib/server/milestones/service';
import { adultBirthCutoff } from '#lib/actors/visibility';

type Db = Prisma.TransactionClient | typeof prisma;

/** Ce que le profil d'une personne dit des conditions d'une annonce. */
export async function candidateFacts(actorId: string, db: Db = prisma): Promise<CandidateFacts> {
	const [instruments, genres, tier, tracks, sound, producer, musician] = await Promise.all([
		db.personInstrument.findMany({
			where: { personId: actorId },
			select: { declaredLevel: true, instrument: { select: { slug: true } } }
		}),
		db.actorGenre.findMany({
			where: { actorId },
			select: { genre: { select: { slug: true, parent: { select: { slug: true } } } } }
		}),
		getMusicianTier(actorId, db),
		// Métiers du son (P4-05) : métiers, spécialités, styles produits.
		db.personTrack.findMany({ where: { personId: actorId }, select: { track: true } }),
		db.soundEngineerProfile.findUnique({
			where: { personId: actorId },
			select: { specialties: true, mobility: true }
		}),
		db.producerProfile.findUnique({
			where: { personId: actorId },
			select: {
				specialties: true,
				mobility: true,
				genres: {
					select: { genre: { select: { slug: true, parent: { select: { slug: true } } } } }
				}
			}
		}),
		// ONB-13b : engagement déclaré (ONB-03), `null` si non précisé.
		db.musicianProfile.findUnique({ where: { personId: actorId }, select: { commitment: true } })
	]);
	const allGenres = [...genres, ...(producer?.genres ?? [])];
	return {
		instruments: instruments.map((i) => ({ slug: i.instrument.slug, level: i.declaredLevel })),
		// Un sous-genre déclaré compte aussi pour son genre parent.
		genreSlugs: [
			...new Set(
				allGenres.flatMap((g) => [g.genre.slug, ...(g.genre.parent ? [g.genre.parent.slug] : [])])
			)
		],
		tiers: tier.reached,
		tracks: tracks.map((t) => t.track),
		specialties: [...(sound?.specialties ?? []), ...(producer?.specialties ?? [])],
		commitment: musician?.commitment ?? null,
		mobility: [...new Set([...(sound?.mobility ?? []), ...(producer?.mobility ?? [])])]
	};
}

type OpportunityConditions = {
	instrumentId: string | null;
	minLevel: number | null;
	genreSlug: string | null;
	minTier: string | null;
	targetTrack?: string | null;
	targetSpecialty?: string | null;
	commitment?: EligibilityCondition['commitment'];
	presence?: EligibilityCondition['presence'];
};

/**
 * Conditions non remplies (`unmet`, vide = éligible) et conditions que le
 * profil ne précise pas (`unknown`, ONB-13b : jamais exclusives), en mots.
 */
export async function eligibilityFor(actorId: string, o: OpportunityConditions, db: Db = prisma) {
	const instrument = o.instrumentId
		? await db.instrument.findUnique({ where: { id: o.instrumentId }, select: { slug: true } })
		: null;
	const condition: EligibilityCondition = {
		instrument: instrument?.slug,
		minLevel: o.minLevel,
		genre: o.genreSlug,
		minTier: o.minTier,
		targetTrack: o.targetTrack,
		targetSpecialty: o.targetSpecialty,
		commitment: o.commitment ?? null,
		presence: o.presence ?? null
	};
	const facts = await candidateFacts(actorId, db);
	const unknownCriteria = unknownConditions(condition, facts);
	return {
		unmet: unmetConditions(condition, facts).map((u) => UNMET_LABELS[u]),
		unknown: unknownCriteria.map((u) => UNKNOWN_LABELS[u]),
		/** Codes des critères non précisés, pour l'invitation à compléter (ONB-12c3). */
		unknownCriteria
	};
}

export function checkedMessage(raw: string) {
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
	if (o.kind === 'GIG_SLOT')
		throw new OpportunityError('Un plateau se candidate au nom d’un groupe que tu gères.');
	if (await managesIssuer(actorId, o.issuerActorId))
		throw new OpportunityError('C’est ton annonce.');
	const issuerIsBand = Boolean(
		await prisma.organization.findUnique({
			where: { actorId: o.issuerActorId },
			select: { actorId: true }
		})
	);
	if (issuerIsBand) {
		const member = await prisma.membership.count({
			where: { orgId: o.issuerActorId, personId: actorId, status: 'ACTIVE' }
		});
		if (member > 0) throw new OpportunityError('Tu fais déjà partie de ce groupe.');
	}
	if (!isActive(o, now)) throw new OpportunityError('Cette annonce n’est plus ouverte.');
	const issuerVisible = await prisma.actor.count({
		where: { id: o.issuerActorId, ...publicActorWhere(now, actorId) }
	});
	if (issuerVisible === 0) throw new OpportunityError('Annonce introuvable.', 404);
	const existing = await prisma.application.findUnique({
		where: { opportunityId_applicantActorId: { opportunityId, applicantActorId: actorId } }
	});
	if (existing) throw new OpportunityError('Tu as déjà postulé à cette annonce.');
	const { unmet } = await eligibilityFor(actorId, o);
	if (unmet.length > 0) {
		throw new OpportunityError(`Tu ne peux pas postuler : ${unmet.join(', ')}.`);
	}
	const message = checkedMessage(raw);
	return prisma.$transaction(async (tx) => {
		// ONB-13b : annonce verrouillée puis relue, conditions revérifiées dans
		// la transaction (une clôture ou un profil modifié entre-temps compte).
		await tx.$queryRaw`SELECT id FROM ${qualifiedTable('opportunities')} WHERE id = ${opportunityId} FOR UPDATE`;
		const fresh = await tx.opportunity.findUniqueOrThrow({ where: { id: opportunityId } });
		if (!isActive(fresh, now)) throw new OpportunityError('Cette annonce n’est plus ouverte.');
		// Deux envois simultanés : le second voit le premier sous le verrou.
		const twice = await tx.application.count({
			where: { opportunityId, applicantActorId: actorId }
		});
		if (twice > 0) throw new OpportunityError('Tu as déjà postulé à cette annonce.');
		const again = await eligibilityFor(actorId, fresh, tx);
		if (again.unmet.length > 0) {
			throw new OpportunityError(`Tu ne peux pas postuler : ${again.unmet.join(', ')}.`);
		}
		const created = await tx.application.create({
			data: { opportunityId, applicantActorId: actorId, message },
			select: { id: true }
		});
		// Notification (P2-09a) : la candidature se lit sur l'annonce. Pour un
		// groupe, chaque personne qui le gère est prévenue (P3-03).
		const recipients = issuerIsBand ? await bandManagerIds(o.issuerActorId, tx) : [o.issuerActorId];
		for (const recipientId of recipients) {
			await notify(tx, {
				recipientId,
				type: 'APPLICATION_RECEIVED',
				fromActorId: actorId,
				href: `/annonces/${opportunityId}`,
				title: o.title
			});
		}
		return created;
	});
}

export async function withdrawApplication(actorId: string, applicationId: string) {
	const first = await prisma.application.findUnique({
		where: { id: applicationId },
		select: { opportunityId: true, applicantActorId: true }
	});
	if (!first) throw new OpportunityError('Candidature introuvable.', 404);
	await prisma.$transaction(async (tx) => {
		await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`band:${first.applicantActorId}`}))`;
		await tx.$queryRaw`SELECT id FROM ${qualifiedTable('opportunities')} WHERE id = ${first.opportunityId} FOR UPDATE`;
		const app = await tx.application.findUniqueOrThrow({ where: { id: applicationId } });
		const manages = await tx.membership.count({
			where: {
				orgId: app.applicantActorId,
				personId: actorId,
				status: 'ACTIVE',
				role: { in: ['OWNER', 'ADMIN'] },
				org: { dissolvedAt: null },
				person: { deletedAt: null }
			}
		});
		// L'agent d'une candidature déléguée la retire ; celle d'un groupe, sa
		// gestion actuelle seulement (DASH-20b : un retrait de gestion pendant
		// l'attente ôte ce droit à qui l'avait envoyée).
		const sender = app.delegated && app.sentById === actorId;
		if (app.applicantActorId !== actorId && !sender && !manages)
			throw new OpportunityError('Tu ne peux pas retirer cette candidature.', 403);
		const next = applicationTransition(app.status as ApplicationStatusValue, 'withdraw');
		if (!next) throw new OpportunityError('Cette candidature ne peut plus être retirée.');
		await tx.application.update({
			where: { id: applicationId },
			data: {
				status: next,
				withdrawnAt: new Date(),
				withdrawnById: actorId
			}
		});
	}, BAND_TX);
}

/** Ma candidature à une annonce, s'il y en a une. */
export async function myApplication(actorId: string, opportunityId: string) {
	return prisma.application.findUnique({
		where: { opportunityId_applicantActorId: { opportunityId, applicantActorId: actorId } },
		select: {
			id: true,
			status: true,
			conversationId: true,
			createdAt: true,
			delegated: true,
			sentBy: { select: { displayName: true } }
		}
	});
}

/** Mes candidatures (et celles envoyées au nom d'un groupe, P5-05a), les plus récentes d'abord. */
export async function listMyApplications(actorId: string) {
	const rows = await prisma.application.findMany({
		where: {
			OR: [
				{ applicantActorId: actorId },
				{ sentById: actorId },
				{
					applicant: {
						organization: {
							dissolvedAt: null,
							memberships: {
								some: { personId: actorId, status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN'] } }
							}
						}
					}
				}
			]
		},
		orderBy: { createdAt: 'desc' },
		take: 50,
		select: {
			id: true,
			status: true,
			conversationId: true,
			applicantActorId: true,
			sentById: true,
			delegated: true,
			sentBy: { select: { displayName: true } },
			applicant: { select: { displayName: true } },
			opportunity: { select: { id: true, title: true } }
		}
	});
	return rows.map(({ applicantActorId, applicant, sentById, sentBy, delegated, ...r }) => ({
		...r,
		conversationId: delegated && sentById !== actorId ? null : r.conversationId,
		sender: delegated ? (sentBy?.displayName ?? 'Compte supprimé') : null,
		/** Groupe au nom duquel j'ai candidaté, sinon `null`. */
		band: applicantActorId === actorId ? null : applicant.displayName,
		status: r.status as ApplicationStatusValue
	}));
}

/**
 * Candidatures reçues sur mon annonce. Les ouvrir les marque « vues » : le
 * candidat sait où il en est.
 */
export async function listForIssuer(viewerId: string, opportunityId: string) {
	const o = await prisma.opportunity.findUnique({
		where: { id: opportunityId },
		select: { id: true, issuerActorId: true }
	});
	if (!o || !(await managesIssuer(viewerId, o.issuerActorId))) return [];
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
			delegated: true,
			sentBy: { select: { displayName: true } },
			conversationId: true,
			createdAt: true,
			applicant: {
				select: {
					id: true,
					kind: true,
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
	// Plateau (P5-05a) : le rang prouvé de chaque groupe candidat, jamais l'XP.
	const tiers = new Map(
		await Promise.all(
			rows
				.filter((r) => r.applicant.kind === 'ORGANIZATION')
				.map(
					async (r) => [r.applicant.id, (await bandTierOf(r.applicant.id))?.label ?? null] as const
				)
		)
	);
	return rows.map((r) => ({
		id: r.id,
		status: r.status as ApplicationStatusValue,
		message: r.message,
		delegatedBy: r.delegated ? (r.sentBy?.displayName ?? 'Compte supprimé') : null,
		conversationId: r.conversationId,
		createdAt: r.createdAt,
		applicant: {
			handle: r.applicant.deletedAt ? null : r.applicant.handle,
			displayName: r.applicant.displayName,
			isBand: r.applicant.kind === 'ORGANIZATION',
			bandTier: tiers.get(r.applicant.id) ?? null,
			instruments: (r.applicant.person?.instruments ?? []).map((i) => ({
				name: i.instrument.name,
				level: i.declaredLevel
			}))
		}
	}));
}

/**
 * Qui parle pour un groupe candidat à un plateau (DASH-20b) : la personne qui
 * a envoyé la candidature si elle gère encore le groupe et est majeure (D5),
 * sinon la gestion majeure la plus ancienne (responsable d'abord). `null` si
 * le groupe n'a plus de gestion majeure.
 */
async function bandContact(
	tx: Prisma.TransactionClient,
	bandId: string,
	sentById: string | null,
	now: Date
) {
	const managers = await tx.membership.findMany({
		where: {
			orgId: bandId,
			status: 'ACTIVE',
			role: { in: ['OWNER', 'ADMIN'] },
			org: { dissolvedAt: null },
			person: { deletedAt: null, person: { birthDate: { lte: adultBirthCutoff(now) } } }
		},
		orderBy: [{ role: 'asc' }, { startedAt: 'asc' }],
		select: { personId: true }
	});
	const ids = managers.map((m) => m.personId);
	return sentById && ids.includes(sentById) ? sentById : (ids[0] ?? null);
}

/**
 * Présélectionner, accepter ou refuser une candidature de mon annonce (ou
 * de celle d'un groupe que je gère). `issuerId` : la personne qui tranche.
 */
export async function decideApplication(
	issuerId: string,
	applicationId: string,
	action: 'shortlist' | 'accept' | 'decline',
	now = new Date()
) {
	const first = await prisma.application.findUnique({
		where: { id: applicationId },
		select: { opportunityId: true }
	});
	if (!first) throw new OpportunityError('Candidature introuvable.', 404);
	return prisma.$transaction(async (tx) => {
		await tx.$queryRaw`SELECT id FROM ${qualifiedTable('opportunities')} WHERE id = ${first.opportunityId} FOR UPDATE`;
		const app = await tx.application.findUnique({
			where: { id: applicationId },
			include: { opportunity: true, applicant: { select: { displayName: true } } }
		});
		if (!app || !(await managesIssuer(issuerId, app.opportunity.issuerActorId, tx))) {
			throw new OpportunityError('Candidature introuvable.', 404);
		}
		const bandId =
			app.opportunity.issuerActorId === issuerId ? null : app.opportunity.issuerActorId;
		const next = applicationTransition(app.status as ApplicationStatusValue, action);
		if (!next) throw new OpportunityError('Cette candidature est déjà tranchée.');
		if (action !== 'accept') {
			await tx.application.update({
				where: { id: applicationId },
				data: { status: next, ...(action === 'decline' ? { decidedAt: now } : {}) }
			});
			return { conversationId: null, joinedBand: false };
		}
		const o = app.opportunity;
		if (o.status !== 'OPEN') throw new OpportunityError('Cette annonce n’est plus ouverte.');
		// Plateau (P5-05a) : le groupe candidat parle par la personne qui a
		// envoyé la candidature, si elle le gère encore ; sinon par sa gestion
		// majeure restante (DASH-20b). Déléguée : par l'agent.
		const contactId = app.delegated
			? app.sentById
			: o.kind === 'GIG_SLOT'
				? await bandContact(tx, app.applicantActorId, app.sentById, now)
				: app.applicantActorId;
		if (!contactId) {
			throw new OpportunityError(
				app.delegated
					? 'La personne qui a envoyé cette candidature n’est plus là : écris au groupe.'
					: 'Plus personne de majeur ne gère ce groupe : la candidature ne peut pas être acceptée.'
			);
		}
		const issuerIds = [issuerId, o.issuerActorId];
		const candidateIds = [contactId, app.applicantActorId];
		if (
			await tx.block.count({
				where: {
					OR: [
						{ blockerActorId: { in: issuerIds }, blockedActorId: { in: candidateIds } },
						{ blockedActorId: { in: issuerIds }, blockerActorId: { in: candidateIds } }
					]
				}
			})
		) {
			throw new OpportunityError('Impossible d’accepter cette candidature.');
		}

		const instrument = o.instrumentId
			? await tx.instrument.findUnique({ where: { id: o.instrumentId }, select: { name: true } })
			: null;

		const accepted = await tx.application.count({
			where: { opportunityId: o.id, status: 'ACCEPTED' }
		});
		if (accepted >= o.slots) throw new OpportunityError('Toutes les places sont déjà prises.');

		// Conversation liée à l'annonce : le message de candidature en premier,
		// le candidat comme initiateur. La première réponse de l'auteur rend
		// l'échange réciproque (XP des deux, règle de l'annonce).
		const key = pairKey(issuerId, contactId);
		const body =
			app.delegated || o.kind === 'GIG_SLOT'
				? `Candidature à « ${o.title} », au nom de ${app.applicant.displayName} :\n\n${app.message}`
				: `Candidature à « ${o.title} » :\n\n${app.message}`;
		await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`conversation-pair:${key}`}))`;
		const existing = await tx.conversation.findUnique({ where: { pairKey: key } });
		let conversationId: string;
		if (existing) {
			conversationId = existing.id;
			await tx.conversation.update({
				where: { id: existing.id },
				data: {
					lastMessageAt: now,
					...(app.delegated ? { delegated: true } : {}),
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
					senderActorId: contactId,
					body,
					createdAt: now
				}
			});
		} else {
			const created = await tx.conversation.create({
				data: {
					pairKey: key,
					initiatorId: contactId,
					opportunityId: o.id,
					delegated: app.delegated,
					lastMessageAt: now,
					participants: {
						create: [
							{ actorId: contactId, state: 'ACCEPTED', lastReadAt: now },
							{ actorId: issuerId, state: 'ACCEPTED' }
						]
					},
					messages: {
						create: { senderActorId: contactId, body, createdAt: now }
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
		// Recrutement d'un groupe (P3-03) : la candidate entre dans le groupe.
		if (bandId && o.kind === 'RECRUIT_MEMBER') {
			try {
				await joinFromRecruitment(
					tx,
					{
						bandId,
						personId: contactId,
						managerId: issuerId,
						title: instrument?.name.toLowerCase() ?? null
					},
					now
				);
			} catch (err) {
				if (err instanceof BandError) throw new OpportunityError(err.message, err.status);
				throw err;
			}
		}
		if (accepted + 1 >= o.slots) {
			await tx.opportunity.update({ where: { id: o.id }, data: { status: 'FILLED' } });
		}
		// Notification (P2-09a) : la conversation est ouverte.
		await notify(tx, {
			recipientId: contactId,
			type: 'APPLICATION_ACCEPTED',
			fromActorId: issuerId,
			href: `/messages/${conversationId}`,
			title: o.title
		});
		if (app.delegated) {
			for (const recipientId of await artistAnswerers(tx, app.applicantActorId, now)) {
				await notify(tx, {
					recipientId,
					type: 'APPLICATION_ACCEPTED',
					fromActorId: issuerId,
					href: `/annonces/${o.id}`,
					title: o.title
				});
			}
		}
		return { conversationId, joinedBand: Boolean(bandId && o.kind === 'RECRUIT_MEMBER') };
	}, BAND_TX);
}

/** DASH-03 : lecture seule, ne marque jamais les candidatures comme vues. */
export async function pendingVisibleApplications(
	actorId: string,
	opportunityIds: string[],
	now = new Date()
) {
	// Revalider les permissions en base, sans une requête par annonce.
	const memberships = await prisma.membership.findMany({
		where: {
			personId: actorId,
			status: 'ACTIVE',
			role: { in: ['OWNER', 'ADMIN'] },
			org: { dissolvedAt: null }
		},
		select: { orgId: true }
	});
	const visible = publicActorWhere(now, actorId);
	return prisma.application.count({
		where: {
			opportunityId: { in: opportunityIds },
			status: { in: ['SENT', 'SEEN', 'SHORTLISTED'] },
			opportunity: {
				status: 'OPEN',
				expiresAt: { gt: now },
				issuerActorId: { in: [actorId, ...memberships.map((m) => m.orgId)] }
			},
			applicant: visible,
			OR: [
				{ opportunity: { kind: { not: 'GIG_SLOT' } } },
				{ opportunity: { kind: 'GIG_SLOT' }, sentBy: visible }
			]
		}
	});
}
