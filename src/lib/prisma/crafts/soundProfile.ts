/**
 * Profil d'ingé son (P4-02) : spécialités, mobilité, matériel et travaux en
 * écoute. Seul point d'écriture de `sound_engineer_profiles` et des
 * `craft_references` de la piste ingé son (hors anonymisation).
 */
import { prisma } from '#lib/server';
import {
	normalizeGear,
	type CraftMobilityValue,
	type Reference,
	type ReferenceInput,
	type SoundSpecialtyValue
} from '#lib/crafts/sound';
import { listReferences, normalizeReferences, replaceReferencesOps } from './references';
import { legacySpecializationOps } from '#lib/prisma/actors/specializations';

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
		listReferences(personId, TRACK)
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
	const references = normalizeReferences(input.references);
	const data = {
		specialties: [...new Set(input.specialties)],
		mobility: [...new Set(input.mobility)],
		gear: normalizeGear(input.gear)
	};
	// ONB-01 : les spécialités suivent aussi dans `person_track_specializations`.
	const specializationOps = await legacySpecializationOps(personId, TRACK, data.specialties);
	await prisma.$transaction([
		prisma.soundEngineerProfile.upsert({
			where: { personId },
			create: { personId, ...data },
			update: data
		}),
		...replaceReferencesOps(personId, TRACK, references),
		...specializationOps
	]);
	return { ...data, references };
}
