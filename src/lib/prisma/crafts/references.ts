/**
 * Travaux en écoute d'un profil de métier (P4-02, P4-04) : seul point
 * d'écriture de `craft_references` (hors anonymisation).
 */
import type { TrackKind } from '@prisma/client';
import { prisma } from '#lib/server';
import { checkReference, type Reference, type ReferenceInput } from '#lib/crafts/common';

/**
 * Revérifie la saisie, quel que soit l'appelant : lignes vides ignorées,
 * liens normalisés, doublons retirés. Lève une erreur sur un lien invalide.
 */
export function normalizeReferences(input: readonly ReferenceInput[]): Reference[] {
	const references: Reference[] = [];
	for (const r of input) {
		if (!r.title.trim() && !r.url.trim()) continue;
		const checked = checkReference(r);
		if (!checked.ok) throw new Error(`Travail en écoute invalide (${checked.field})`);
		if (!references.some((x) => x.url === checked.reference.url))
			references.push(checked.reference);
	}
	return references;
}

/** Opérations qui remplacent les travaux d'une piste, à passer dans une transaction. */
export function replaceReferencesOps(personId: string, track: TrackKind, references: Reference[]) {
	return [
		prisma.craftReference.deleteMany({ where: { personId, track } }),
		prisma.craftReference.createMany({
			data: references.map((r, position) => ({ personId, track, position, ...r }))
		})
	];
}

export function listReferences(personId: string, track: TrackKind) {
	return prisma.craftReference.findMany({
		where: { personId, track },
		orderBy: { position: 'asc' },
		select: { title: true, url: true }
	});
}
