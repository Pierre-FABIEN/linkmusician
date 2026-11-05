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
	const [ledger, reportsFiled, sanctions, activityDays] = await Promise.all([
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
