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
	return {
		identifiant_public: person.actor.handle,
		nom_affiche: person.actor.displayName,
		date_de_naissance: person.birthDate?.toISOString().slice(0, 10) ?? null,
		cgu_acceptees_le: person.termsAcceptedAt,
		metiers: person.tracks.map((t) => ({ metier: t.track, principal: t.isPrimary })),
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
		prisma.actor.update({
			where: { id: person.actorId },
			data: {
				handle: `supprime-${person.actorId}`,
				displayName: 'Compte supprimé',
				deletedAt: new Date()
			}
		})
	];
}
