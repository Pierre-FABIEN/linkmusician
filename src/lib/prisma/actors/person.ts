/**
 * Accès aux données des personnes (`Actor` + `Person`).
 *
 * Une personne est créée juste après le compte (`User`) : à l'inscription par
 * email, ou à l'écran `/bienvenue` pour les comptes qui n'en ont pas encore
 * (connexion Google, comptes antérieurs, comptes créés par les tests du
 * boilerplate). Règles : décisions D5, D14 et D16.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '#lib/server';
import { civilDateToUtc } from '#lib/actors/age';
import { suggestHandle } from '#lib/actors/handle';
import { getMusicalProfile } from '#lib/prisma/skills/musicalProfile';
import { getProfileDetails } from '#lib/prisma/actors/profile';
import { getActorLocation } from '#lib/server/geo/queries';
import { getProgress } from '#lib/server/progression/read';

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

function isUniqueViolation(err: unknown, field: string): boolean {
	return (
		err instanceof Prisma.PrismaClientKnownRequestError &&
		err.code === 'P2002' &&
		JSON.stringify(err.meta?.target ?? '').includes(field)
	);
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
		notificationPreferences
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
		// Annonces (P2-02).
		prisma.opportunity.findMany({
			where: { issuerActorId: person.actorId },
			orderBy: { createdAt: 'asc' },
			select: { kind: true, title: true, description: true, status: true, createdAt: true }
		}),
		// Candidatures (P2-03).
		prisma.application.findMany({
			where: { applicantActorId: person.actorId },
			orderBy: { createdAt: 'asc' },
			select: {
				message: true,
				status: true,
				createdAt: true,
				opportunity: { select: { title: true } }
			}
		}),
		// Collaborations (P2-06) : elles survivent à l'anonymisation (historique
		// de l'autre personne, affichée « Compte supprimé »).
		prisma.collaboration.findMany({
			where: { participants: { some: { actorId: person.actorId } } },
			orderBy: { happenedOn: 'asc' },
			select: {
				kind: true,
				title: true,
				happenedOn: true,
				status: true,
				participants: {
					where: { actorId: { not: person.actorId } },
					select: { actor: { select: { displayName: true } } }
				}
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
		})
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
	return {
		identifiant_public: person.actor.handle,
		nom_affiche: person.actor.displayName,
		profil_public_masque: person.actor.hidden,
		date_de_naissance: person.birthDate?.toISOString().slice(0, 10) ?? null,
		cgu_acceptees_le: person.termsAcceptedAt,
		// Digest email (P2-09b) : date du dernier envoi.
		dernier_digest_email_le: person.digestSentAt,
		metiers: person.tracks.map((t) => ({ metier: t.track, principal: t.isPrimary })),
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
			le: o.createdAt
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
			type: c.kind,
			titre: c.title,
			le: c.happenedOn,
			statut: c.status,
			avec: c.participants.map((p) => p.actor.displayName)
		})),
		candidatures: applications.map((a) => ({
			annonce: a.opportunity.title,
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
	return [
		prisma.person.update({ where: { userId }, data: { birthDate: null } }),
		prisma.personTrack.deleteMany({ where: { personId: person.actorId } }),
		prisma.personInstrument.deleteMany({ where: { personId: person.actorId } }),
		prisma.actorGenre.deleteMany({ where: { actorId: person.actorId } }),
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
		// Notifications (P2-09a) : reçues et causées, et préférences.
		prisma.notification.deleteMany({
			where: { OR: [{ recipientActorId: person.actorId }, { fromActorId: person.actorId }] }
		}),
		prisma.notificationPreference.deleteMany({ where: { actorId: person.actorId } }),
		// Réseau musical (P2-16) : supprimé, dans les deux sens.
		prisma.musicalTie.deleteMany({
			where: { OR: [{ ownerId: person.actorId }, { contactId: person.actorId }] }
		}),
		prisma.opportunity.updateMany({
			where: { leadActorId: person.actorId },
			data: { leadActorId: null }
		}),
		// Annonces (P2-02) : supprimées avec le compte.
		prisma.opportunity.deleteMany({ where: { issuerActorId: person.actorId } }),
		// Candidatures (P2-03) : supprimées avec le compte.
		prisma.application.deleteMany({ where: { applicantActorId: person.actorId } }),
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
				travelRadiusKm: null
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
