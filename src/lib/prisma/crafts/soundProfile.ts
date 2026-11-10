/**
 * Profil d'ingé son (P4-02) : spécialités, mobilité, matériel et travaux en
 * écoute. Seul point d'écriture de `sound_engineer_profiles` et des
 * `craft_references` de la piste ingé son (hors anonymisation).
 */
import { prisma } from '#lib/server';
import {
	checkReference,
	normalizeGear,
	type CraftMobilityValue,
	type Reference,
	type ReferenceInput,
	type SoundSpecialtyValue
} from '#lib/crafts/sound';

const TRACK = 'SOUND_ENGINEER' as const;

export type SoundProfile = {
	specialties: SoundSpecialtyValue[];
	mobility: CraftMobilityValue[];
	gear: string;
	references: Reference[];
};

export async function getSoundProfile(personId: string): Promise<SoundProfile | null> {
	const [profile, references] = await Promise.all([
		prisma.soundEngineerProfile.findUnique({
			where: { personId },
			select: { specialties: true, mobility: true, gear: true }
		}),
		prisma.craftReference.findMany({
			where: { personId, track: TRACK },
			orderBy: { position: 'asc' },
			select: { title: true, url: true }
		})
	]);
	if (!profile) return null;
	return { ...profile, references };
}

export type SoundProfileInput = {
	specialties: readonly SoundSpecialtyValue[];
	mobility: readonly CraftMobilityValue[];
	gear: string;
	references: readonly ReferenceInput[];
};

/**
 * Remplace le profil, en une transaction. La saisie est revérifiée ici :
 * lignes vides ignorées, liens normalisés, doublons retirés.
 */
export async function saveSoundProfile(personId: string, input: SoundProfileInput) {
	const references: Reference[] = [];
	for (const r of input.references) {
		if (!r.title.trim() && !r.url.trim()) continue;
		const checked = checkReference(r);
		if (!checked.ok) throw new Error(`Travail en écoute invalide (${checked.field})`);
		if (!references.some((x) => x.url === checked.reference.url))
			references.push(checked.reference);
	}
	const data = {
		specialties: [...new Set(input.specialties)],
		mobility: [...new Set(input.mobility)],
		gear: normalizeGear(input.gear)
	};
	await prisma.$transaction([
		prisma.soundEngineerProfile.upsert({
			where: { personId },
			create: { personId, ...data },
			update: data
		}),
		prisma.craftReference.deleteMany({ where: { personId, track: TRACK } }),
		prisma.craftReference.createMany({
			data: references.map((r, position) => ({ personId, track: TRACK, position, ...r }))
		})
	]);
	return { ...data, references };
}
