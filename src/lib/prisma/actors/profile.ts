/**
 * Profil complet d'une personne (P1-06b) : bio (sur l'acteur), statut pro,
 * recherche, matériel, pratique, mobilité, liens. Règles pures dans
 * `#lib/actors/profile`.
 */
import { mayOfferToOrganize } from '#lib/jam/organizer';
import type { Equipment, LinkKind, LookingFor, ProStatus } from '@prisma/client';
import { prisma } from '#lib/server';
import {
	checkLink,
	LINK_KINDS,
	normalizeBio,
	type EquipmentValue,
	type LinkKindValue,
	type LookingForValue,
	type ProStatusValue
} from '#lib/actors/profile';
import type { ProfileForm } from '#lib/schema/actors/profileSchema';

type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
/** Échouent à la compilation si les listes pures et les enums Prisma divergent. */
export const PROFILE_ENUMS_MATCH_PRISMA: [
	Equals<ProStatus, ProStatusValue>,
	Equals<LookingFor, LookingForValue>,
	Equals<Equipment, EquipmentValue>,
	Equals<LinkKind, LinkKindValue>
] = [true, true, true, true];

export async function getProfileDetails(person: { actorId: string }) {
	const data = await prisma.person.findUniqueOrThrow({
		where: { actorId: person.actorId },
		select: {
			proStatus: true,
			lookingFor: true,
			equipment: true,
			practiceSince: true,
			travelRadiusKm: true,
			organizesJams: true,
			birthDate: true,
			links: { select: { kind: true, url: true } },
			actor: { select: { bio: true } }
		}
	});
	return {
		bio: data.actor.bio,
		proStatus: data.proStatus,
		lookingFor: data.lookingFor,
		equipment: data.equipment,
		practiceSince: data.practiceSince,
		travelRadiusKm: data.travelRadiusKm,
		organizesJams: data.organizesJams,
		/** La case « organiser des jams » ne s'offre qu'aux adultes (D51). */
		mayOrganize: mayOfferToOrganize(data.birthDate),
		links: data.links
	};
}

/** Valeurs du formulaire à partir du profil enregistré. */
export function profileFormValues(
	details: Awaited<ReturnType<typeof getProfileDetails>>
): ProfileForm {
	const links = Object.fromEntries(LINK_KINDS.map((k) => [k, ''])) as ProfileForm['links'];
	for (const link of details.links) links[link.kind] = link.url;
	return {
		bio: details.bio ?? '',
		proStatus: details.proStatus ?? '',
		lookingFor: details.lookingFor,
		equipment: details.equipment,
		practiceSince: details.practiceSince,
		travelRadiusKm: details.travelRadiusKm ?? 0,
		organizesJams: details.organizesJams,
		links
	};
}

/**
 * Enregistre le profil, en une transaction. La saisie a été validée par
 * `profileSchema` ; les liens sont normalisés ici (https, domaine contrôlé)
 * et un lien invalide est ignoré par sûreté.
 */
export async function saveProfileDetails(person: { actorId: string }, form: ProfileForm) {
	const bio = normalizeBio(form.bio);
	// Adultes seulement (D51) : une case cochée par un·e mineur·e est ignorée.
	const { birthDate } = await prisma.person.findUniqueOrThrow({
		where: { actorId: person.actorId },
		select: { birthDate: true }
	});
	const organizesJams = form.organizesJams && mayOfferToOrganize(birthDate);
	const links = LINK_KINDS.flatMap((kind) => {
		const raw = form.links[kind].trim();
		if (raw === '') return [];
		const result = checkLink(kind, raw);
		return result.ok ? [{ personId: person.actorId, kind, url: result.url }] : [];
	});

	await prisma.$transaction([
		prisma.actor.update({ where: { id: person.actorId }, data: { bio: bio === '' ? null : bio } }),
		prisma.person.update({
			where: { actorId: person.actorId },
			data: {
				proStatus: form.proStatus === '' ? null : form.proStatus,
				lookingFor: [...new Set(form.lookingFor)],
				equipment: [...new Set(form.equipment)],
				practiceSince: form.practiceSince,
				travelRadiusKm: form.travelRadiusKm === 0 ? null : form.travelRadiusKm,
				organizesJams
			}
		}),
		prisma.profileLink.deleteMany({ where: { personId: person.actorId } }),
		prisma.profileLink.createMany({ data: links })
	]);
	return { bio, links };
}
