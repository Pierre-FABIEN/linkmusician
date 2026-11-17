/**
 * Accès aux données des personnes (`Actor` + `Person`).
 *
 * Une personne est créée juste après le compte (`User`) : à l'inscription par
 * email, ou à l'écran `/bienvenue` pour les comptes qui n'en ont pas encore
 * (connexion Google, comptes antérieurs, comptes créés par les tests du
 * boilerplate). Règles : décisions D5, D14 et D16.
 */
import { Prisma } from '@prisma/client';
import { MEMBERSHIP_DECISION_LABELS, collaborationTimeline } from '#lib/activity/timeline';
import { prisma } from '#lib/server';
// Le champ en conflit : `meta.target` en Prisma 5, le nom de l'index en Prisma 7.
import { isUniqueViolation } from '#lib/server/db-errors';
import { civilDateToUtc } from '#lib/actors/age';
import { suggestHandle } from '#lib/actors/handle';
import { successorOf } from '#lib/bands/rules';
import { getMusicalProfile } from '#lib/prisma/skills/musicalProfile';
import { getProfileDetails } from '#lib/prisma/actors/profile';
import { getTrackDetails } from '#lib/prisma/actors/specializations';
import { getActorLocation } from '#lib/server/geo/queries';
import { getProgress } from '#lib/server/progression/read';
import { worksExport } from '#lib/server/works/service';
import { workStepsExport } from '#lib/server/works/steps';
import { milestonesExport } from '#lib/server/milestones/service';
import { introductionsExport } from '#lib/server/career/introductions';
import { proofsExport } from '#lib/server/milestones/proofs';
import { contactGroupsExport } from '#lib/server/contacts/service';
import { discussionsExport } from '#lib/server/discussions/service';
import { verificationsExport } from '#lib/server/organizations/verification';
import { venueClaimsExport } from '#lib/server/venues/claims';

export type NewPersonInput = {
	userId: string;
	/** Nom affiché (pseudo ou nom Google). */
	displayName: string;
	/** Handle souhaité, ou texte dont dériver le handle (pseudo, nom…). */
	handleSource: string;
	/** Date civile `AAAA-MM-JJ`, déjà contrôlée (âge minimum) par l'appelant. */
	birthDate: string;
	termsAcceptedAt?: Date;
};

export async function isHandleTaken(handle: string): Promise<boolean> {
	const existing = await prisma.actor.findUnique({ where: { handle }, select: { id: true } });
	return existing !== null;
}

export async function getPersonByUserId(userId: string) {
	return prisma.person.findUnique({
		where: { userId },
		include: { actor: true, tracks: true }
	});
}

export async function hasPerson(userId: string): Promise<boolean> {
	const person = await prisma.person.findUnique({ where: { userId }, select: { actorId: true } });
	return person !== null;
}

/**
 * Crée l'acteur et la personne d'un compte, en une transaction.
 *
 * Idempotent : si le compte a déjà une personne, elle est renvoyée telle
 * quelle. Une collision de handle (deux inscriptions simultanées sur le même
 * pseudo) relance une suggestion, au plus trois fois.
 */
export async function createPersonForUser(input: NewPersonInput) {
	const existing = await getPersonByUserId(input.userId);
	if (existing) return existing;

	const birthDate = civilDateToUtc(input.birthDate);
	const termsAcceptedAt = input.termsAcceptedAt ?? new Date();

	for (let attempt = 1; attempt <= 3; attempt++) {
		const handle = await suggestHandle(input.handleSource, isHandleTaken);
		try {
			// Création imbriquée : `Actor` et `Person` dans la même requête,
			// donc dans la même transaction.
			await prisma.actor.create({
				data: {
					kind: 'PERSON',
					handle,
					displayName: input.displayName.trim() || handle,
					person: {
						create: { userId: input.userId, birthDate, termsAcceptedAt }
					}
				}
			});
			return prisma.person.findUniqueOrThrow({
				where: { userId: input.userId },
				include: { actor: true, tracks: true }
			});
		} catch (err) {
			if (isUniqueViolation(err, 'userId')) {
				// Créée entre-temps par une requête concurrente : on la renvoie.
				const created = await getPersonByUserId(input.userId);
				if (created) return created;
			}
			if (isUniqueViolation(err, 'handle') && attempt < 3) continue;
			throw err;
		}
	}
	throw new Error('Création de la personne impossible (collisions de handle répétées)');
}

/* -------------------------------------------------------------------------- */
/*  RGPD                                                                      */
/* -------------------------------------------------------------------------- */

/** Données LinkMusician d'un compte, pour l'export RGPD (`buildUserDataExport`). */
export async function exportPersonData(userId: string) {
	const person = await getPersonByUserId(userId);
	if (!person) return null;
	const musical = await getMusicalProfile(person);
	const details = await getProfileDetails(person);
	const location = await getActorLocation(person.actorId);
	const progress = await getProgress(person.actorId, prisma);
	// ONB-01 : spécialités, « Je propose » et « Je recherche » par métier.
	const trackDetails = await getTrackDetails(person.actorId);
	// ONB-03 : profil de musicien·ne et précisions déclarées par métier.
	const [musicianProfile, trackAttributes] = await Promise.all([
		prisma.musicianProfile.findUnique({
			where: { personId: person.actorId },
			select: { practiceExperience: true, commitment: true, updatedAt: true }
		}),
		prisma.personTrackAttribute.findMany({
			where: { personId: person.actorId },
			select: { track: true, field: true, code: true },
			orderBy: [{ track: 'asc' }, { field: 'asc' }, { code: 'asc' }]
		})
	]);
	// Métiers du son (P4-02) : profil d'ingé son et travaux en écoute.
	const [soundProfile, craftReferences, producerProfile, promoterProfile, bandApplications] =
		await Promise.all([
			prisma.soundEngineerProfile.findUnique({
				where: { personId: person.actorId },
				select: { specialties: true, mobility: true, gear: true, updatedAt: true }
			}),
			prisma.craftReference.findMany({
				where: { personId: person.actorId },
				orderBy: [{ track: 'asc' }, { position: 'asc' }],
				select: { track: true, title: true, url: true, createdAt: true }
			}),
			// Producteur·rice (P4-04).
			prisma.producerProfile.findUnique({
				where: { personId: person.actorId },
				select: {
					specialties: true,
					mobility: true,
					software: true,
					rate: true,
					updatedAt: true,
					genres: { select: { genre: { select: { name: true } } } }
				}
			}),
			// Organisateur·rice (P5-05a).
			prisma.promoterProfile.findUnique({
				where: { personId: person.actorId },
				select: {
					eventKinds: true,
					capacity: true,
					updatedAt: true,
					genres: { select: { genre: { select: { name: true } } } }
				}
			}),
			// Candidatures envoyées au nom d'un groupe (plateaux, P5-05a).
			prisma.application.findMany({
				where: { sentById: person.actorId },
				orderBy: { createdAt: 'asc' },
				select: {
					message: true,
					status: true,
					delegated: true,
					withdrawnAt: true,
					createdAt: true,
					applicant: { select: { displayName: true } },
					opportunity: { select: { title: true } }
				}
			})
		]);
	// Manager, booker (P5-07) : fiche, et accompagnements (comme agent ou artiste).
	const [agentProfile, representations] = await Promise.all([
		prisma.agentProfile.findUnique({
			where: { personId: person.actorId },
			select: {
				pitch: true,
				updatedAt: true,
				genres: { select: { genre: { select: { name: true } } } }
			}
		}),
		prisma.representation.findMany({
			where: {
				OR: [
					{ agentId: person.actorId },
					{ artistId: person.actorId },
					{ endedById: person.actorId, status: { in: ['DECLINED', 'WITHDRAWN'] } }
				]
			},
			orderBy: { createdAt: 'asc' },
			select: {
				agentId: true,
				artistId: true,
				endedBy: { select: { displayName: true, deletedAt: true } },
				startsAt: true,
				expiresAt: true,
				departmentCodes: true,
				allowedActions: true,
				kind: true,
				status: true,
				message: true,
				createdAt: true,
				confirmedAt: true,
				endedAt: true,
				agent: { select: { displayName: true } },
				artist: { select: { displayName: true } }
			}
		})
	]);
	// DASH-07a : droits de candidater demandés, accordés, reçus ou terminés, et leurs actes.
	const applicationGrants = await prisma.applicationGrant.findMany({
		where: {
			OR: [
				{ requestedById: person.actorId },
				{ grantedById: person.actorId },
				{ endedById: person.actorId },
				{ acts: { some: { byId: person.actorId } } },
				{ representation: { OR: [{ agentId: person.actorId }, { artistId: person.actorId }] } }
			]
		},
		orderBy: { createdAt: 'asc' },
		select: {
			kinds: true,
			expiresAt: true,
			createdAt: true,
			grantedAt: true,
			endedAt: true,
			representation: {
				select: {
					kind: true,
					artist: { select: { displayName: true } },
					agent: { select: { displayName: true } }
				}
			},
			acts: {
				orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
				select: { kind: true, createdAt: true, by: { select: { displayName: true } } }
			}
		}
	});
	const mandateDelegations = await prisma.representationDelegation.findMany({
		where: {
			OR: [
				{ delegateId: person.actorId },
				{ proposedById: person.actorId },
				{ approvedById: person.actorId },
				{ endedById: person.actorId },
				{ representation: { OR: [{ agentId: person.actorId }, { artistId: person.actorId }] } }
			]
		},
		orderBy: { createdAt: 'asc' },
		select: {
			actions: true,
			createdAt: true,
			acceptedAt: true,
			approvedAt: true,
			expiresAt: true,
			endedAt: true,
			agency: { select: { actor: { select: { displayName: true } } } },
			delegate: { select: { displayName: true } },
			proposedBy: { select: { displayName: true } },
			approvedBy: { select: { displayName: true } },
			endedBy: { select: { displayName: true } },
			representation: {
				select: {
					kind: true,
					startsAt: true,
					expiresAt: true,
					departmentCodes: true,
					allowedActions: true,
					artist: { select: { displayName: true } },
					agent: { select: { displayName: true } }
				}
			}
		}
	});
	const [
		ledger,
		reportsFiled,
		sanctions,
		activityDays,
		messagesSent,
		blocksMade,
		opportunities,
		applications,
		collaborations,
		availability,
		venuesAdded,
		jamsComing,
		jamInvites,
		venuesConfirmed,
		jamsLed,
		endorsementsGiven,
		endorsementsReceivedRows,
		networkTies,
		collabEndorsementsGiven,
		collabEndorsementsReceived,
		reputation,
		notifications,
		notificationPreferences,
		collusionCases,
		suggestionsDismissed,
		memberships,
		works,
		milestonesDeclared,
		milestoneProofs,
		contactGroups,
		groupDiscussions,
		orgVerifications,
		introductions,
		venueClaims
	] = await Promise.all([
		prisma.xpTransaction.findMany({
			where: { actorId: person.actorId },
			orderBy: { createdAt: 'asc' },
			select: { amount: true, track: true, reason: true, createdAt: true }
		}),
		prisma.report.findMany({
			where: { reporterActorId: person.actorId },
			orderBy: { createdAt: 'asc' },
			select: { targetType: true, reason: true, details: true, status: true, createdAt: true }
		}),
		prisma.sanction.findMany({
			where: { actorId: person.actorId },
			orderBy: { createdAt: 'asc' },
			select: { kind: true, reason: true, until: true, liftedAt: true, createdAt: true }
		}),
		prisma.actorActivityDay.findMany({
			where: { actorId: person.actorId },
			orderBy: { day: 'asc' },
			select: { day: true }
		}),
		// Messagerie (P2-04) : les messages envoyés. Les messages reçus sont les
		// données de l'autre personne et restent hors de cet export.
		prisma.message.findMany({
			where: { senderActorId: person.actorId },
			orderBy: { createdAt: 'asc' },
			select: {
				body: true,
				createdAt: true,
				conversation: {
					select: {
						participants: {
							where: { actorId: { not: person.actorId } },
							select: { actor: { select: { displayName: true } } }
						}
					}
				}
			}
		}),
		// Blocage (P2-05) : les personnes que j'ai bloquées.
		prisma.block.findMany({
			where: { blockerActorId: person.actorId },
			orderBy: { createdAt: 'asc' },
			select: { createdAt: true, blocked: { select: { displayName: true } } }
		}),
		// Annonces (P2-02), et celles publiées au nom d'un groupe (P3-03).
		prisma.opportunity.findMany({
			where: { OR: [{ issuerActorId: person.actorId }, { postedById: person.actorId }] },
			orderBy: { createdAt: 'asc' },
			select: {
				kind: true,
				title: true,
				description: true,
				status: true,
				createdAt: true,
				postedById: true,
				issuer: { select: { displayName: true } },
				// Par métier (P4-05).
				targetTrack: true,
				targetSpecialty: true,
				work: { select: { title: true } },
				// Conditions (ONB-13b, D63).
				pay: true,
				payMinEuros: true,
				payMaxEuros: true,
				formation: true,
				repertoire: true,
				commitment: true,
				presence: true
			}
		}),
		// Candidatures (P2-03).
		prisma.application.findMany({
			where: { applicantActorId: person.actorId },
			orderBy: { createdAt: 'asc' },
			select: {
				message: true,
				status: true,
				createdAt: true,
				delegated: true,
				withdrawnAt: true,
				sentBy: { select: { displayName: true } },
				opportunity: { select: { title: true } }
			}
		}),
		// Collaborations (P2-06) : elles survivent à l'anonymisation (historique
		// de l'autre personne, affichée « Compte supprimé »).
		prisma.collaboration.findMany({
			where: {
				participants: { some: { actorId: person.actorId } }
			},
			orderBy: { happenedOn: 'asc' },
			select: {
				appreciationActs: {
					select: {
						id: true,
						kind: true,
						occurredAt: true,
						author: { select: { displayName: true, deletedAt: true } }
					}
				},
				id: true,
				kind: true,
				title: true,
				happenedOn: true,
				status: true,
				participants: {
					select: {
						actorId: true,
						service: true,
						acceptedAt: true,
						confirmedCompletionAt: true,
						declinedAt: true,
						cancelledAt: true,
						actor: { select: { displayName: true, deletedAt: true } }
					}
				},
				// Morceau concerné (P4-06).
				work: { select: { title: true } }
			}
		}),
		// Mode jam (P2-13).
		prisma.availability.findUnique({
			where: { actorId: person.actorId },
			select: { slot: true, startsAt: true, endsAt: true, note: true }
		}),
		// Annuaire des lieux (P2-14a) : lieux ajoutés par la personne.
		prisma.venue.findMany({
			where: { createdById: person.actorId },
			orderBy: { createdAt: 'asc' },
			select: { name: true, kind: true, communeName: true, createdAt: true }
		}),
		// Jams publiques (P2-14b) : « Je viens ».
		prisma.jamAttendance.findMany({
			where: { actorId: person.actorId },
			orderBy: { createdAt: 'asc' },
			select: {
				createdAt: true,
				instrument: { select: { name: true } },
				attendedAt: true,
				removedAt: true,
				opportunity: { select: { title: true, startsAt: true } }
			}
		}),
		// Formation des jams (P2-14c) : invitations reçues.
		prisma.jamInvite.findMany({
			where: { actorId: person.actorId },
			orderBy: { createdAt: 'asc' },
			select: {
				status: true,
				createdAt: true,
				respondedAt: true,
				instrument: { select: { name: true } },
				opportunity: { select: { title: true, startsAt: true } }
			}
		}),
		// Validation des lieux (P2-14c) : lieux confirmés par la personne.
		prisma.venue.findMany({
			where: { confirmedById: person.actorId },
			orderBy: { createdAt: 'asc' },
			select: { name: true, communeName: true, validatedAt: true }
		}),
		// Jams dont la personne est lead (P2-14c).
		prisma.opportunity.findMany({
			where: { leadActorId: person.actorId },
			orderBy: { createdAt: 'asc' },
			select: { title: true, startsAt: true }
		}),
		// Après la jam (P2-15) : appréciations données et reçues.
		prisma.jamEndorsement.findMany({
			where: { fromActorId: person.actorId },
			orderBy: { createdAt: 'asc' },
			select: {
				quality: true,
				createdAt: true,
				revokedAt: true,
				instrument: { select: { name: true } },
				to: { select: { displayName: true } },
				opportunity: { select: { title: true } }
			}
		}),
		prisma.jamEndorsement.findMany({
			where: { toActorId: person.actorId },
			orderBy: { createdAt: 'asc' },
			select: {
				quality: true,
				createdAt: true,
				revokedAt: true,
				instrument: { select: { name: true } },
				from: { select: { displayName: true } },
				opportunity: { select: { title: true } }
			}
		}),
		// Réseau musical (P2-16) : les personnes gardées.
		prisma.musicalTie.findMany({
			where: { ownerId: person.actorId },
			orderBy: { createdAt: 'asc' },
			select: { createdAt: true, contact: { select: { displayName: true } } }
		}),
		// Appréciations après une collaboration (P2-07), données et reçues.
		prisma.collabEndorsement.findMany({
			where: { fromActorId: person.actorId },
			orderBy: { createdAt: 'asc' },
			select: {
				quality: true,
				createdAt: true,
				revokedAt: true,
				instrument: { select: { name: true } },
				to: { select: { displayName: true } },
				collaboration: { select: { title: true } }
			}
		}),
		prisma.collabEndorsement.findMany({
			where: { toActorId: person.actorId },
			orderBy: { createdAt: 'asc' },
			select: {
				quality: true,
				createdAt: true,
				revokedAt: true,
				instrument: { select: { name: true } },
				from: { select: { displayName: true } },
				collaboration: { select: { title: true } }
			}
		}),
		// Réputation (P2-08) : la carte publique. Le score interne de tri n'est
		// qu'un calcul sur ces faits, déjà tous présents dans l'export.
		prisma.reputationSnapshot.findUnique({
			where: { actorId: person.actorId },
			select: {
				confirmedCollabs: true,
				distinctCounterparts: true,
				corroboratedGigs: true,
				verifiedReleases: true,
				bands: true,
				distinctEndorsers: true,
				responseBucket: true,
				computedAt: true
			}
		}),
		// Notifications (P2-09a) : reçues, et préférences par type.
		prisma.notification.findMany({
			where: { recipientActorId: person.actorId },
			orderBy: { createdAt: 'asc' },
			select: {
				type: true,
				title: true,
				readAt: true,
				createdAt: true,
				from: { select: { displayName: true } }
			}
		}),
		prisma.notificationPreference.findMany({
			where: { actorId: person.actorId },
			select: { type: true, inApp: true, email: true }
		}),
		// Détection de collusion (P2-10) : vérifications qui concernent la
		// personne, sans les autres membres (leurs données, pas les siennes).
		prisma.collusionCase.findMany({
			where: { memberIds: { has: person.actorId } },
			orderBy: { detectedAt: 'asc' },
			select: { status: true, detectedAt: true, handledAt: true }
		}),
		// Suggestions écartées (« Pas intéressé·e », P2-18).
		prisma.suggestionDismissal.findMany({
			where: { ownerId: person.actorId },
			orderBy: { createdAt: 'asc' },
			select: { createdAt: true, actor: { select: { displayName: true } } }
		}),
		// Groupes (P3-01) : chaque période, invitation ou demande.
		prisma.membership.findMany({
			where: { personId: person.actorId },
			orderBy: { createdAt: 'asc' },
			select: {
				role: true,
				title: true,
				status: true,
				startedAt: true,
				endedAt: true,
				createdAt: true,
				org: { select: { kind: true, actor: { select: { displayName: true } } } },
				invitedBy: { select: { displayName: true } }
			}
		}),
		// Morceaux (P3-11) : portés et crédits.
		worksExport(person.actorId),
		// Étapes de groupe déclarées (P3-04).
		milestonesExport(person.actorId),
		// Preuves d'étapes (P3-05) : confirmations demandées, liens joints.
		proofsExport(person.actorId),
		// Groupes de contacts (P3-16b).
		contactGroupsExport(person.actorId),
		// Discussions de groupe (P3-16c) : les siennes et ses messages.
		discussionsExport(person.actorId),
		// Vérifications d'organisation demandées (P3-09).
		verificationsExport(person.actorId),
		// Parrainage (P4-13b) : présentations faites ou reçues.
		introductionsExport(person.actorId),
		// Revendications de lieux (P5-03a).
		venueClaimsExport(person.actorId)
	]);
	const media = await prisma.media.findMany({
		where: { actorId: person.actorId },
		orderBy: { createdAt: 'asc' },
		select: {
			title: true,
			kind: true,
			status: true,
			externalUrl: true,
			providerId: true,
			createdAt: true
		}
	});
	// Scènes ouvertes publiées pour un lieu que la personne gère (P5-04a).
	const jamSeries = await prisma.jamSeries.findMany({
		where: { postedById: person.actorId },
		orderBy: { createdAt: 'asc' },
		select: {
			title: true,
			weekday: true,
			startTime: true,
			endTime: true,
			createdAt: true,
			stoppedAt: true,
			venue: { select: { name: true } }
		}
	});
	// Lieux où la personne anime, ou où on l'invite à animer (P5-04b).
	const venueHostings = await prisma.venueHost.findMany({
		where: { personId: person.actorId },
		orderBy: { createdAt: 'asc' },
		select: {
			status: true,
			createdAt: true,
			since: true,
			org: { select: { actor: { select: { displayName: true } } } }
		}
	});
	const seriesLed = await prisma.jamSeries.findMany({
		where: { leadId: person.actorId },
		select: { title: true, venue: { select: { name: true } } }
	});
	const membershipDecisions = await prisma.membershipDecision.findMany({
		where: { OR: [{ authorId: person.actorId }, { membership: { personId: person.actorId } }] },
		orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
		select: {
			kind: true,
			occurredAt: true,
			author: { select: { displayName: true, deletedAt: true } },
			membership: {
				select: { personId: true, org: { select: { actor: { select: { displayName: true } } } } }
			}
		}
	});
	// DASH-06a : étapes prises en charge et actes qui me concernent.
	const workSteps = await workStepsExport(person.actorId);
	const withdrawals = await prisma.application.findMany({
		where: { withdrawnById: person.actorId },
		select: { id: true, withdrawnAt: true, opportunity: { select: { title: true } } }
	});

	return {
		actes_de_participation: membershipDecisions.map((d) => ({
			role:
				d.membership.personId === person.actorId
					? 'participation personnelle'
					: 'auteur de décision',
			organisation: d.membership.org.actor.displayName,
			acte: MEMBERSHIP_DECISION_LABELS[d.kind],
			date: d.occurredAt,
			auteur: d.author && !d.author.deletedAt ? d.author.displayName : null
		})),
		identifiant_public: person.actor.handle,
		nom_affiche: person.actor.displayName,
		profil_public_masque: person.actor.hidden,
		date_de_naissance: person.birthDate?.toISOString().slice(0, 10) ?? null,
		cgu_acceptees_le: person.termsAcceptedAt,
		// Digest email (P2-09b) : date du dernier envoi.
		dernier_digest_email_le: person.digestSentAt,
		// Conseils en contexte masqués (P2-17).
		conseils_masques: person.tipsDismissed,
		// Assistant d'inscription (P3-17) : nombre d'analyses, jamais le texte.
		analyses_assistant_inscription: person.assistantRuns,
		// ONB-12b (D61) : visibilité par bloc et « ouvert aux sollicitations ».
		metiers: person.tracks.map((t) => ({
			metier: t.track,
			principal: t.isPrimary,
			visibilite_specialites_et_intentions: t.offersVisibility,
			visibilite_precisions: t.detailsVisibility,
			visibilite_conditions: t.conditionsVisibility,
			ouvert_aux_sollicitations: t.openToRequests
		})),
		profil_musicien: musicianProfile
			? {
					experience_declaree: musicianProfile.practiceExperience,
					engagement_souhaite: musicianProfile.commitment,
					modifie_le: musicianProfile.updatedAt
				}
			: null,
		precisions_par_metier: trackAttributes.map((a) => ({
			metier: a.track,
			champ: a.field,
			valeur: a.code
		})),
		specialites_et_intentions_par_metier: trackDetails.map((d) => ({
			metier: d.track,
			specialites: d.specializations,
			je_propose: d.offers,
			je_recherche: d.needs
		})),
		instruments: musical.instruments.map((i) => ({
			instrument: i.name,
			niveau_declare: i.level,
			principal: i.isPrimary
		})),
		genres: musical.genres.map((g) => g.name),
		influences: musical.influences,
		presentation: details.bio,
		statut_declare: details.proStatus,
		recherche: details.lookingFor,
		materiel: details.equipment,
		joue_depuis: details.practiceSince,
		rayon_de_deplacement_km: details.travelRadiusKm,
		pret_a_organiser_des_jams: details.organizesJams,
		profil_inge_son: soundProfile
			? {
					specialites: soundProfile.specialties,
					ou_je_travaille: soundProfile.mobility,
					materiel: soundProfile.gear,
					modifie_le: soundProfile.updatedAt
				}
			: null,
		profil_producteur: producerProfile
			? {
					specialites: producerProfile.specialties,
					styles_produits: producerProfile.genres.map((g) => g.genre.name),
					logiciels: producerProfile.software,
					tarifs_indicatifs: producerProfile.rate,
					ou_je_travaille: producerProfile.mobility,
					modifie_le: producerProfile.updatedAt
				}
			: null,
		profil_organisateur: promoterProfile
			? {
					ce_que_j_organise: promoterProfile.eventKinds,
					genres_programmes: promoterProfile.genres.map((g) => g.genre.name),
					jauge_habituelle: promoterProfile.capacity,
					modifie_le: promoterProfile.updatedAt
				}
			: null,
		profil_manager_booker: agentProfile
			? {
					ce_que_je_cherche: agentProfile.pitch,
					genres: agentProfile.genres.map((g) => g.genre.name),
					modifie_le: agentProfile.updatedAt
				}
			: null,
		affectations: mandateDelegations.map((d) => ({
			agence: d.agency.actor.displayName,
			artiste: d.representation.artist.displayName,
			agent: d.representation.agent.displayName,
			collaborateur: d.delegate.displayName,
			metier: d.representation.kind,
			actions: d.actions,
			activites_parent: d.representation.allowedActions,
			departements: d.representation.departmentCodes,
			debut_parent: d.representation.startsAt,
			fin_parent: d.representation.expiresAt,
			propose_par: d.proposedBy?.displayName ?? null,
			approuve_par: d.approvedBy?.displayName ?? null,
			retire_par: d.endedBy?.displayName ?? null,
			propose_le: d.createdAt,
			accepte_le: d.acceptedAt,
			approuve_le: d.approvedAt,
			fin_exclue: d.expiresAt,
			retire_le: d.endedAt
		})),
		droits_de_candidater: applicationGrants.map((g) => ({
			artiste: g.representation.artist.displayName,
			agent: g.representation.agent.displayName,
			metier: g.representation.kind,
			types_d_annonces: g.kinds,
			demande_le: g.createdAt,
			accorde_le: g.grantedAt,
			fin_exclue: g.expiresAt,
			termine_le: g.endedAt,
			actes: g.acts.map((a) => ({
				acte: a.kind,
				le: a.createdAt,
				par: a.by?.displayName ?? null
			}))
		})),
		accompagnements: representations.map((r) => ({
			role:
				r.agentId === person.actorId
					? 'agent'
					: r.artistId === person.actorId
						? 'artiste'
						: 'auteur de décision',
			metier: r.kind,
			artiste: r.artist.displayName,
			avec: r.agentId === person.actorId ? r.artist.displayName : r.agent.displayName,
			statut: r.status,
			mot: r.message,
			debut: r.startsAt,
			fin_exclue: r.expiresAt,
			departements: r.departmentCodes,
			actions_autorisees: r.allowedActions,
			propose_le: r.createdAt,
			confirme_le: r.confirmedAt,
			termine_le: r.endedAt,
			auteur_fin_refus_retrait: r.endedBy && !r.endedBy.deletedAt ? r.endedBy.displayName : null
		})),
		travaux_en_ecoute: craftReferences.map((r) => ({
			metier: r.track,
			titre: r.title,
			lien: r.url,
			ajoute_le: r.createdAt
		})),
		ambition_de_carriere: person.ambition,
		liens: details.links.map((l) => ({ type: l.kind, url: l.url })),
		// Seule la commune est stockée (jamais d'adresse ni de point précis).
		commune: location ? `${location.communeName} (${location.departmentCode})` : null,
		medias: media.map((m) => ({
			titre: m.title,
			type: m.kind,
			statut: m.status,
			lien: m.externalUrl,
			fichier: m.providerId,
			ajoute_le: m.createdAt
		})),
		progression: {
			palier_de_confiance: person.actor.trustLevel,
			xp: progress.xp,
			niveau: progress.level,
			succes: progress.achievements.map((a) => ({ succes: a.name, debloque_le: a.unlockedAt })),
			registre_xp: ledger.map((l) => ({
				xp: l.amount,
				piste: l.track,
				motif: l.reason,
				le: l.createdAt
			}))
		},
		signalements_faits: reportsFiled.map((r) => ({
			cible: r.targetType,
			motif: r.reason,
			precisions: r.details,
			statut: r.status,
			le: r.createdAt
		})),
		sanctions_recues: sanctions.map((s) => ({
			type: s.kind,
			motif: s.reason,
			jusqu_au: s.until,
			levee_le: s.liftedAt,
			le: s.createdAt
		})),
		// Indicateurs (P1-13) : seuls les jours de visite sont relevés.
		jours_de_visite: activityDays.map((a) => a.day.toISOString().slice(0, 10)),
		annonces: opportunities.map((o) => ({
			type: o.kind,
			titre: o.title,
			texte: o.description,
			statut: o.status,
			le: o.createdAt,
			au_nom_du_groupe: o.postedById ? o.issuer.displayName : null,
			metier_recherche: o.targetTrack,
			specialite_recherchee: o.targetSpecialty,
			morceau: o.work?.title ?? null
		})),
		scenes_ouvertes_publiees: jamSeries.map((s) => ({
			titre: s.title,
			lieu: s.venue.name,
			jour_de_la_semaine: s.weekday,
			horaires: `${s.startTime}-${s.endTime}`,
			le: s.createdAt,
			arretee_le: s.stoppedAt
		})),
		lieux_ou_j_anime: venueHostings.map((h) => ({
			lieu: h.org.actor.displayName,
			statut: h.status === 'ACTIVE' ? 'anime' : 'invitation en attente',
			invite_le: h.createdAt,
			depuis: h.since
		})),
		scenes_ouvertes_menees_par_defaut: seriesLed.map((s) => ({
			titre: s.title,
			lieu: s.venue.name
		})),
		disponibilite: availability,
		jams_je_viens: jamsComing.map((a) => ({
			jam: a.opportunity.title,
			debut: a.opportunity.startsAt,
			instrument: a.instrument?.name ?? null,
			le: a.createdAt,
			j_y_etais: a.attendedAt,
			retire_par_l_hote: a.removedAt
		})),
		reseau_musical: networkTies.map((t) => ({ nom: t.contact.displayName, le: t.createdAt })),
		appreciations_donnees: endorsementsGiven.map((e) => ({
			jam: e.opportunity.title,
			a: e.to.displayName,
			qualite: e.quality,
			instrument: e.instrument?.name ?? null,
			le: e.createdAt,
			reprise_le: e.revokedAt
		})),
		appreciations_recues: endorsementsReceivedRows.map((e) => ({
			jam: e.opportunity.title,
			de: e.from.displayName,
			qualite: e.quality,
			instrument: e.instrument?.name ?? null,
			le: e.createdAt,
			reprise_le: e.revokedAt
		})),
		appreciations_collaborations_donnees: collabEndorsementsGiven.map((e) => ({
			collaboration: e.collaboration.title,
			a: e.to.displayName,
			qualite: e.quality,
			instrument: e.instrument?.name ?? null,
			le: e.createdAt,
			reprise_le: e.revokedAt
		})),
		appreciations_collaborations_recues: collabEndorsementsReceived.map((e) => ({
			collaboration: e.collaboration.title,
			de: e.from.displayName,
			qualite: e.quality,
			instrument: e.instrument?.name ?? null,
			le: e.createdAt,
			reprise_le: e.revokedAt
		})),
		jams_invitations: jamInvites.map((i) => ({
			jam: i.opportunity.title,
			debut: i.opportunity.startsAt,
			instrument: i.instrument.name,
			statut: i.status,
			le: i.createdAt,
			reponse_le: i.respondedAt
		})),
		jams_lead: jamsLed.map((o) => ({ jam: o.title, debut: o.startsAt })),
		lieux_confirmes: venuesConfirmed.map((v) => ({
			nom: v.name,
			commune: v.communeName,
			le: v.validatedAt
		})),
		lieux_ajoutes: venuesAdded.map((v) => ({
			nom: v.name,
			type: v.kind,
			commune: v.communeName,
			le: v.createdAt
		})),
		collaborations: collaborations.map((c) => ({
			validations: collaborationTimeline(c).map((e) => ({
				acte: e.action,
				auteur: e.author,
				le: e.occurredAt
			})),
			type: c.kind,
			titre: c.title,
			le: c.happenedOn,
			statut: c.status,
			avec: c.participants
				.filter((p) => p.actorId !== person.actorId)
				.map((p) => p.actor.displayName),
			// Prestation du son assurée (P4-06) et morceau concerné.
			ma_prestation: c.participants.find((p) => p.actorId === person.actorId)?.service ?? null,
			morceau: c.work?.title ?? null
		})),
		retraits_de_candidatures: withdrawals.map((a) => ({
			candidature: a.id,
			annonce: a.opportunity.title,
			le: a.withdrawnAt
		})),
		candidatures: applications.map((a) => ({
			annonce: a.opportunity.title,
			deleguee: a.delegated,
			envoyee_par: a.sentBy?.displayName ?? null,
			retiree_le: a.withdrawnAt,
			message: a.message,
			statut: a.status,
			le: a.createdAt
		})),
		candidatures_au_nom_d_un_groupe: bandApplications.map((a) => ({
			plateau: a.opportunity.title,
			deleguee: a.delegated,
			retiree_le: a.withdrawnAt,
			groupe: a.applicant.displayName,
			message: a.message,
			statut: a.status,
			le: a.createdAt
		})),
		personnes_bloquees: blocksMade.map((b) => ({ nom: b.blocked.displayName, le: b.createdAt })),
		messages_envoyes: messagesSent.map((m) => ({
			a: m.conversation.participants[0]?.actor.displayName ?? null,
			texte: m.body,
			le: m.createdAt
		})),
		carte_de_reputation: reputation
			? {
					collaborations_confirmees: reputation.confirmedCollabs,
					personnes_distinctes: reputation.distinctCounterparts,
					concerts_corrobores: reputation.corroboratedGigs,
					sorties_verifiees: reputation.verifiedReleases,
					groupes: reputation.bands,
					personnes_qui_recommandent: reputation.distinctEndorsers,
					reactivite: reputation.responseBucket,
					calculee_le: reputation.computedAt
				}
			: null,
		notifications: notifications.map((n) => ({
			type: n.type,
			de: n.from?.displayName ?? null,
			titre: n.title,
			le: n.createdAt,
			lue_le: n.readAt
		})),
		preferences_de_notifications: notificationPreferences.map((p) => ({
			type: p.type,
			dans_l_app: p.inApp,
			par_email: p.email
		})),
		groupes: memberships
			.filter((m) => m.org.kind === 'BAND')
			.map((m) => ({
				groupe: m.org.actor.displayName,
				role: m.role,
				ce_que_j_y_fais: m.title,
				statut: m.status,
				invite_par: m.invitedBy?.displayName ?? null,
				cree_le: m.createdAt,
				debut: m.startedAt,
				fin: m.endedAt
			})),
		// Organisations d'organisateur·rices (P5-05b) et lieux (P5-03b) gérés,
		// comme les studios : la fiche appartient à l'organisation.
		organisations: memberships
			.filter((m) => m.org.kind === 'PROMOTER' || m.org.kind === 'VENUE')
			.map((m) => ({
				organisation: m.org.actor.displayName,
				role: m.role,
				statut: m.status,
				debut: m.startedAt,
				fin: m.endedAt
			})),
		// Agences (DASH-02b) : chaque période de participation, sans mandat implicite.
		agences: memberships
			.filter((m) => m.org.kind === 'AGENCY')
			.map((m) => ({
				agence: m.org.actor.displayName,
				role: m.role,
				statut: m.status,
				invite_par: m.invitedBy?.displayName ?? null,
				cree_le: m.createdAt,
				debut: m.startedAt,
				fin: m.endedAt
			})),
		// Écoles (P5-11) : comme prof (gestion) ou comme élève (MEMBER).
		ecoles: memberships
			.filter((m) => m.org.kind === 'SCHOOL')
			.map((m) => ({
				ecole: m.org.actor.displayName,
				role: m.role === 'MEMBER' ? 'élève' : m.role,
				statut: m.status,
				debut: m.startedAt,
				fin: m.endedAt
			})),
		// Studios gérés (P4-03) : la fiche appartient au studio, seule la
		// gestion est une donnée de la personne.
		studios: memberships
			.filter((m) => m.org.kind === 'STUDIO')
			.map((m) => ({
				studio: m.org.actor.displayName,
				role: m.role,
				statut: m.status,
				debut: m.startedAt,
				fin: m.endedAt
			})),
		morceaux: {
			actes_de_credits: works.acts.map((a) => ({
				id: a.id,
				periode: a.periodId,
				type: a.kind,
				le: a.occurredAt,
				auteur: a.author,
				concerne_mon_credit: a.concernsMe
			})),
			// DASH-06b : rôles du son ajoutés à son propre crédit.
			roles_ajoutes: works.roleActs.map((a) => ({
				morceau: a.work,
				role: a.role,
				le: a.occurredAt
			})),
			portes: works.owned.map((w) => ({
				titre: w.title,
				etat: w.state,
				preuve: w.proof,
				genres: w.genres,
				cree_le: w.createdAt,
				compose_le: w.composedAt
			})),
			credits: works.credits.map((c) => ({
				morceau: c.work,
				porte_par: c.carriedBy,
				roles: c.roles,
				confirme_le: c.confirmedAt,
				cree_le: c.createdAt
			})),
			etapes_prises_en_charge: workSteps.steps.map((st) => ({
				morceau: st.work,
				etape: st.kind,
				mode: st.mode,
				lieu: st.place,
				statut: st.status,
				commencee_le: st.startedAt,
				terminee_le: st.doneAt
			})),
			actes_d_etapes: workSteps.acts.map((a) => ({
				morceau: a.work,
				etape: a.step,
				type: a.kind,
				de: a.fromStatus,
				vers: a.toStatus,
				le: a.occurredAt,
				par_moi: a.byMe,
				me_concerne: a.aboutMe
			}))
		},
		etapes_de_groupe_declarees: milestonesDeclared,
		etapes_de_groupe_confirmations: milestoneProofs.confirmations,
		etapes_de_groupe_liens: milestoneProofs.liens,
		groupes_de_contacts: contactGroups,
		discussions_de_groupe: groupDiscussions.discussions,
		messages_de_groupe_envoyes: groupDiscussions.messages,
		verifications_d_organisation_demandees: orgVerifications,
		revendications_de_lieux: venueClaims,
		presentations: introductions,
		suggestions_ecartees: suggestionsDismissed.map((d) => ({
			nom: d.actor.displayName,
			le: d.createdAt
		})),
		verifications_de_moderation: collusionCases.map((c) => ({
			objet: 'Cercle fermé de collaborations et d’appréciations (détection automatique)',
			statut: c.status,
			reperee_le: c.detectedAt,
			tranchee_le: c.handledAt
		})),
		cree_le: person.createdAt
	};
}

/**
 * Opérations d'anonymisation, à inclure dans la transaction de
 * `anonymizeUser`. L'acteur est conservé (ses contreparties gardent leur
 * historique), mais il est vidé de tout ce qui identifie la personne.
 */
export async function personAnonymizationOps(
	userId: string
): Promise<Prisma.PrismaPromise<unknown>[]> {
	const person = await prisma.person.findUnique({ where: { userId }, select: { actorId: true } });
	if (!person) return [];
	const bandOps = await bandAnonymizationOps(person.actorId);
	// DASH-07a : droits de candidater encore ouverts où la personne est
	// l'agent ou l'artiste ; ils se terminent par un acte sans auteur.
	const openGrants = await prisma.applicationGrant.findMany({
		where: {
			endedAt: null,
			representation: { OR: [{ agentId: person.actorId }, { artistId: person.actorId }] }
		},
		select: { id: true, grantedAt: true }
	});
	const grantEnd = new Date();
	return [
		...bandOps,
		prisma.person.update({ where: { userId }, data: { birthDate: null } }),
		// Les spécialités, intentions et précisions par métier suivent
		// (cascade, ONB-01, ONB-03).
		prisma.personTrack.deleteMany({ where: { personId: person.actorId } }),
		prisma.musicianProfile.deleteMany({ where: { personId: person.actorId } }),
		prisma.personInstrument.deleteMany({ where: { personId: person.actorId } }),
		// Métiers du son (P4-02) : tout est déclaratif, rien ne reste.
		prisma.soundEngineerProfile.deleteMany({ where: { personId: person.actorId } }),
		prisma.craftReference.deleteMany({ where: { personId: person.actorId } }),
		// Producteur·rice (P4-04) : les styles suivent le profil (cascade).
		prisma.producerProfile.deleteMany({ where: { personId: person.actorId } }),
		// Organisateur·rice (P5-05a) : les genres suivent le profil (cascade).
		prisma.promoterProfile.deleteMany({ where: { personId: person.actorId } }),
		// Manager, booker (P5-07) : la fiche part (genres en cascade) ; les
		// propositions en attente disparaissent ; un accompagnement confirmé
		// se termine et garde sa trace pour l'autre partie (« Compte supprimé »),
		// sans mot ni personne qui a confirmé ou terminé.
		// DASH-04b : retirer les droits, conserver les consentements du groupe et oublier les auteurs.
		prisma.representationDelegation.updateMany({
			where: {
				endedAt: null,
				OR: [
					{ delegateId: person.actorId },
					{ proposedById: person.actorId },
					{ representation: { OR: [{ agentId: person.actorId }, { artistId: person.actorId }] } }
				]
			},
			data: { endedAt: new Date() }
		}),
		prisma.representationDelegation.updateMany({
			where: { proposedById: person.actorId },
			data: { proposedById: null }
		}),
		prisma.representationDelegation.updateMany({
			where: { approvedById: person.actorId },
			data: { approvedById: null }
		}),
		prisma.representationDelegation.updateMany({
			where: { endedById: person.actorId },
			data: { endedById: null }
		}),
		// DASH-07a : droits ouverts terminés (acte sans auteur), auteurs oubliés ;
		// un droit accordé par un groupe reste au groupe.
		prisma.applicationGrant.updateMany({
			where: { id: { in: openGrants.map((g) => g.id) } },
			data: { endedAt: grantEnd }
		}),
		prisma.applicationGrantAct.createMany({
			data: openGrants.map((g) => ({
				grantId: g.id,
				kind: g.grantedAt ? ('REVOKED' as const) : ('WITHDRAWN' as const),
				createdAt: grantEnd
			}))
		}),
		prisma.applicationGrant.updateMany({
			where: { requestedById: person.actorId },
			data: { requestedById: null }
		}),
		prisma.applicationGrant.updateMany({
			where: { grantedById: person.actorId },
			data: { grantedById: null }
		}),
		prisma.applicationGrant.updateMany({
			where: { endedById: person.actorId },
			data: { endedById: null }
		}),
		prisma.applicationGrantAct.updateMany({
			where: { byId: person.actorId },
			data: { byId: null }
		}),
		prisma.agentProfile.deleteMany({ where: { personId: person.actorId } }),
		prisma.representation.deleteMany({
			where: {
				status: 'PROPOSED',
				OR: [{ agentId: person.actorId }, { artistId: person.actorId }]
			}
		}),
		prisma.representation.updateMany({
			where: {
				status: 'CONFIRMED',
				OR: [{ agentId: person.actorId }, { artistId: person.actorId }]
			},
			data: { status: 'ENDED', endedAt: new Date() }
		}),
		prisma.representation.updateMany({
			where: { OR: [{ agentId: person.actorId }, { artistId: person.actorId }] },
			data: { message: null }
		}),
		prisma.representation.updateMany({
			where: { confirmedById: person.actorId },
			data: { confirmedById: null }
		}),
		prisma.representation.updateMany({
			where: { endedById: person.actorId },
			data: { endedById: null }
		}),
		prisma.actorGenre.deleteMany({ where: { actorId: person.actorId } }),
		// Morceaux (P3-11) : ceux que la personne porte sont supprimés ; ses
		// crédits confirmés sur ceux des autres restent (« Compte supprimé »),
		// les crédits en attente disparaissent (leurs rôles redeviennent à
		// pourvoir).
		// DASH-05m : oublier aussi l’auteur des actes sur les crédits d’autrui.
		// DASH-06b : les rôles ajoutés à son propre crédit (`work_role_acts`)
		// suivent ce crédit, conservé en « Compte supprimé » ; aucun autre
		// acteur n'y figure, rien à oublier en plus.
		prisma.workCreditAct.updateMany({
			where: { authorId: person.actorId },
			data: { authorId: null }
		}),
		// DASH-06a : étapes d'autrui prises en charge et actes, sans auteur ni
		// responsable ; les étapes des morceaux portés partent avec eux.
		prisma.workStep.updateMany({
			where: { assigneeId: person.actorId },
			data: { assigneeId: null }
		}),
		prisma.workStepAct.updateMany({
			where: { authorId: person.actorId },
			data: { authorId: null }
		}),
		prisma.workStepAct.updateMany({
			where: { assigneeId: person.actorId },
			data: { assigneeId: null }
		}),
		prisma.work.deleteMany({ where: { ownerId: person.actorId } }),
		prisma.workContributor.deleteMany({ where: { personId: person.actorId, confirmedAt: null } }),
		prisma.workContributor.updateMany({
			where: { invitedById: person.actorId },
			data: { invitedById: null }
		}),
		prisma.work.updateMany({ where: { createdById: person.actorId }, data: { createdById: null } }),
		// Étapes de groupe (P3-04) : elles restent au groupe ; on oublie qui
		// les a déclarées.
		prisma.milestone.updateMany({
			where: { declaredById: person.actorId },
			data: { declaredById: null }
		}),
		// Preuves (P3-05) : les demandes en attente disparaissent ; une
		// confirmation donnée reste (l'étape du groupe en dépend) ; on oublie
		// qui a demandé et qui a joint un lien.
		prisma.milestoneAttestation.deleteMany({
			where: { attesterId: person.actorId, status: 'REQUESTED' }
		}),
		prisma.milestoneAttestation.updateMany({
			where: { requestedById: person.actorId },
			data: { requestedById: null }
		}),
		prisma.milestoneEvidence.updateMany({
			where: { addedById: person.actorId },
			data: { addedById: null }
		}),
		prisma.influence.deleteMany({ where: { actorId: person.actorId } }),
		prisma.profileLink.deleteMany({ where: { personId: person.actorId } }),
		prisma.actorActivityDay.deleteMany({ where: { actorId: person.actorId } }),
		// Mode jam (P2-13).
		prisma.availability.deleteMany({ where: { actorId: person.actorId } }),
		// Annuaire des lieux (P2-14a) : les lieux ajoutés restent (ce sont des
		// lieux publics, utiles aux autres) ; ils restent liés à l'acteur
		// anonymisé, qui ne dit plus rien de la personne.
		// Jams publiques (P2-14b) : « Je viens » supprimés avec le compte.
		prisma.jamAttendance.deleteMany({ where: { actorId: person.actorId } }),
		// Formation (P2-14c) : invitations reçues supprimées, lead retiré (l'hôte
		// reprend la main). Les lieux confirmés restent, comme les lieux ajoutés.
		prisma.jamInvite.deleteMany({ where: { actorId: person.actorId } }),
		// Après la jam (P2-15) : appréciations reçues supprimées ; celles
		// données restent (la réputation des autres), liées à l'acteur
		// anonymisé. L'XP reste au registre (ajout seul).
		prisma.jamEndorsement.deleteMany({ where: { toActorId: person.actorId } }),
		// Collaborations (P2-07) : même règle que les jams.
		prisma.collabEndorsement.deleteMany({ where: { toActorId: person.actorId } }),
		// Réputation (P2-08) : projection supprimée ; elle ne se recalcule pas
		// pour un acteur anonymisé (`recomputeReputation`).
		prisma.reputationSnapshot.deleteMany({ where: { actorId: person.actorId } }),
		// Suggestions écartées (P2-18) : dans les deux sens.
		prisma.suggestionDismissal.deleteMany({
			where: { OR: [{ ownerId: person.actorId }, { actorId: person.actorId }] }
		}),
		// Parrainage (P4-13b) : présentations faites ou reçues, supprimées
		// (le succès Passeur déjà obtenu reste à qui l'a gagné).
		prisma.introduction.deleteMany({
			where: {
				OR: [
					{ introducerId: person.actorId },
					{ firstId: person.actorId },
					{ secondId: person.actorId }
				]
			}
		}),
		// Collusion (P2-10) : les cas qui la citent sont supprimés.
		prisma.collusionCase.deleteMany({ where: { memberIds: { has: person.actorId } } }),
		// Notifications (P2-09a) : reçues et causées, et préférences.
		prisma.notification.deleteMany({
			where: { OR: [{ recipientActorId: person.actorId }, { fromActorId: person.actorId }] }
		}),
		prisma.notificationPreference.deleteMany({ where: { actorId: person.actorId } }),
		// Groupes de contacts (P3-16b) : les siens, et sa place dans ceux des autres.
		prisma.contactGroup.deleteMany({ where: { ownerId: person.actorId } }),
		prisma.contactGroupMember.deleteMany({ where: { contactId: person.actorId } }),
		// Discussions de groupe (P3-16c) : on la sort de chacune (les invitations
		// disparaissent) ; ses messages restent, sans le texte.
		prisma.groupDiscussionMember.deleteMany({
			where: { actorId: person.actorId, state: { not: 'ACTIVE' } }
		}),
		prisma.groupDiscussionMember.updateMany({
			where: { actorId: person.actorId },
			data: { state: 'LEFT', leftAt: new Date() }
		}),
		prisma.groupDiscussionMessage.updateMany({
			where: { senderActorId: person.actorId },
			data: { body: 'Message supprimé' }
		}),
		// Vérifications d'organisation (P3-09) : la demande reste au groupe,
		// on oublie qui l'a faite.
		prisma.organizationVerification.updateMany({
			where: { requestedById: person.actorId },
			data: { requestedById: null }
		}),
		// Revendications de lieux (P5-03a) : le lien de preuve et le code
		// peuvent désigner la personne ; on les efface avec le demandeur.
		prisma.venueClaim.updateMany({
			where: { requestedById: person.actorId },
			data: { requestedById: null, proofUrl: null }
		}),
		// Réseau musical (P2-16) : supprimé, dans les deux sens.
		prisma.musicalTie.deleteMany({
			where: { OR: [{ ownerId: person.actorId }, { contactId: person.actorId }] }
		}),
		prisma.opportunity.updateMany({
			where: { leadActorId: person.actorId },
			data: { leadActorId: null }
		}),
		// Annonces (P2-02) : supprimées avec le compte. Celles publiées au nom
		// d'un groupe (P3-03) restent au groupe ; on oublie qui les a publiées.
		prisma.opportunity.updateMany({
			where: { postedById: person.actorId },
			data: { postedById: null }
		}),
		// Scènes ouvertes (P5-04a) : elles restent au lieu ; on oublie qui les a publiées.
		prisma.jamSeries.updateMany({
			where: { postedById: person.actorId },
			data: { postedById: null }
		}),
		// Animateur·rices (P5-04b) : supprimé·e des lieux, plus lead par défaut ;
		// on oublie qui a invité.
		prisma.venueHost.deleteMany({ where: { personId: person.actorId } }),
		prisma.venueHost.updateMany({
			where: { invitedById: person.actorId },
			data: { invitedById: null }
		}),
		prisma.jamSeries.updateMany({
			where: { leadId: person.actorId },
			data: { leadId: null }
		}),
		prisma.opportunity.deleteMany({ where: { issuerActorId: person.actorId } }),
		// Candidatures (P2-03) : supprimées avec le compte. Celles envoyées au
		// nom d'un groupe (plateaux, P5-05a) restent au groupe ; on oublie qui
		// les a envoyées.
		prisma.application.updateMany({
			where: { withdrawnById: person.actorId },
			data: { withdrawnById: null }
		}),
		prisma.application.deleteMany({ where: { applicantActorId: person.actorId } }),
		prisma.application.updateMany({
			where: { sentById: person.actorId },
			data: { sentById: null }
		}),
		// Blocage (P2-05) : faits et reçus, sans objet après l'effacement.
		prisma.block.deleteMany({
			where: { OR: [{ blockerActorId: person.actorId }, { blockedActorId: person.actorId }] }
		}),
		// Messagerie (P2-04) : le texte est effacé, le message reste pour
		// l'historique de l'autre personne (« Compte supprimé »).
		prisma.message.updateMany({
			where: { senderActorId: person.actorId },
			data: { body: 'Message supprimé' }
		}),
		prisma.actorLocation.deleteMany({ where: { actorId: person.actorId } }),
		// Les fichiers Cloudinary sont supprimés après la transaction (`anonymizeUser`).
		prisma.media.deleteMany({ where: { actorId: person.actorId } }),
		// Signalements faits : gardés pour l'historique de modération, sans le
		// texte libre, qui peut contenir des données personnelles.
		prisma.report.updateMany({
			where: { reporterActorId: person.actorId },
			data: { details: null }
		}),
		prisma.person.update({
			where: { userId },
			data: {
				proStatus: null,
				lookingFor: [],
				equipment: [],
				practiceSince: null,
				travelRadiusKm: null,
				organizesJams: false,
				ambition: null,
				tipsDismissed: [],
				assistantRuns: 0
			}
		}),
		prisma.actor.update({
			where: { id: person.actorId },
			data: {
				handle: `supprime-${person.actorId}`,
				displayName: 'Compte supprimé',
				bio: null,
				trustLevel: 0,
				hidden: true,
				deletedAt: new Date()
			}
		})
	];
}

/**
 * Fichiers Cloudinary de la personne, à supprimer **après** la transaction
 * d'anonymisation (un appel réseau n'a rien à faire dans la transaction, et
 * son échec ne doit pas bloquer l'effacement du compte).
 */
export {
	mediaAssetsOfUser as personMediaAssets,
	destroyMediaAssets
} from '#lib/server/media/service';

/**
 * Groupes (P3-01) : les adhésions en cours se closent (la personne reste
 * dans l'historique du groupe, « Compte supprimé »), les invitations et
 * demandes en attente sont supprimées. Un groupe dont la personne était
 * responsable passe à son successeur (`successorOf`) ou, sans autre membre,
 * est dissous : un groupe garde toujours un OWNER.
 */
async function bandAnonymizationOps(actorId: string): Promise<Prisma.PrismaPromise<unknown>[]> {
	const now = new Date();
	const owned = await prisma.membership.findMany({
		where: { personId: actorId, status: 'ACTIVE', role: 'OWNER', org: { dissolvedAt: null } },
		select: {
			orgId: true,
			org: {
				select: {
					kind: true,
					memberships: {
						where: { status: 'ACTIVE' },
						select: { id: true, personId: true, role: true, startedAt: true }
					}
				}
			}
		}
	});
	const ops: Prisma.PrismaPromise<unknown>[] = [];
	for (const band of owned) {
		// Une école (P5-11) ne passe jamais à un·e élève : à la gestion, sinon dissoute.
		const candidates = ['SCHOOL', 'AGENCY'].includes(band.org.kind)
			? band.org.memberships.filter((m) => m.role !== 'MEMBER')
			: band.org.memberships;
		const next = successorOf(actorId, candidates);
		if (next) {
			ops.push(prisma.membership.update({ where: { id: next.id }, data: { role: 'OWNER' } }));
		} else {
			// DASH-02b : fermer aussi les participations des collaborateurs, sans les promouvoir.
			if (band.org.kind === 'AGENCY')
				ops.push(
					prisma.membership.updateMany({
						where: { orgId: band.orgId, personId: { not: actorId }, status: 'ACTIVE' },
						data: { status: 'REMOVED', endedAt: now }
					})
				);
			ops.push(
				prisma.membership.updateMany({
					where: { orgId: band.orgId, status: { in: ['INVITED', 'REQUESTED'] } },
					data: { status: 'DECLINED', endedAt: now }
				}),
				prisma.organization.update({ where: { actorId: band.orgId }, data: { dissolvedAt: now } })
			);
		}
	}
	ops.push(
		prisma.membership.updateMany({
			where: { personId: actorId, status: 'ACTIVE' },
			data: { status: 'LEFT', endedAt: now }
		}),
		prisma.membership.deleteMany({
			where: { personId: actorId, status: { in: ['INVITED', 'REQUESTED'] } }
		}),
		// DASH-05d : oublier l’auteur de tous ses actes, y compris pour autrui.
		prisma.membershipDecision.updateMany({
			where: { authorId: actorId },
			data: { authorId: null }
		}),
		// Invitations envoyées : on oublie qui a invité.
		prisma.membership.updateMany({ where: { invitedById: actorId }, data: { invitedById: null } }),
		// Liens d'invitation d'école (P5-11) : on oublie qui les a créés.
		prisma.schoolInvite.updateMany({ where: { createdById: actorId }, data: { createdById: null } })
	);
	return ops;
}
