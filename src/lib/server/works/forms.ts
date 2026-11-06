/**
 * Morceaux (P3-11) : données des formulaires (référentiel d'instruments par
 * famille) et lecture des champs `roles`.
 */
import { listInstrumentsByFamily } from '#lib/prisma/skills/referentials';
import { INSTRUMENT_FAMILY_LABELS } from '#lib/skills/instruments';

export async function instrumentFamilies() {
	return (await listInstrumentsByFamily())
		.filter((f) => f.instruments.length > 0)
		.map((f) => ({
			family: f.family,
			label: INSTRUMENT_FAMILY_LABELS[f.family],
			instruments: f.instruments.map((i) => ({ slug: i.slug, name: i.name }))
		}));
}

/** Rôles cochés ou choisis (le choix vide « Aucun » est ignoré). */
export function rolesOf(form: FormData): string[] {
	return form
		.getAll('roles')
		.map(String)
		.filter((v) => v.trim() !== '');
}
