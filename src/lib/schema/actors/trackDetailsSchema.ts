/**
 * Spécialités, « Je propose » et « Je recherche » par métier (ONB-01).
 * Règles dans `#lib/actors/specializations`. Le refus d'**ajouter** un code
 * retiré dépend de ce que la personne a déjà : il est revérifié à
 * l'enregistrement, côté serveur.
 */
import { z } from 'zod';
import { TRACK_KINDS } from '#lib/actors/tracks';
import {
	catalogOf,
	CODES_MESSAGES,
	MAX_CODES_PER_LIST,
	SELECTION_LISTS
} from '#lib/actors/specializations';

const codes = z.array(z.string().trim().min(1).max(60)).max(MAX_CODES_PER_LIST).default([]);

export const trackDetailsSchema = z
	.object({
		track: z.enum(TRACK_KINDS),
		specializations: codes,
		offers: codes,
		needs: codes
	})
	.superRefine((value, ctx) => {
		for (const list of SELECTION_LISTS) {
			const catalog = catalogOf(value.track, list);
			value[list].forEach((code, index) => {
				if (!catalog.some((e) => e.code === code)) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						path: [list, index],
						message: CODES_MESSAGES.unknown
					});
				}
			});
		}
	});

export const tracksDetailsSchema = z.array(trackDetailsSchema).superRefine((value, ctx) => {
	const seen = new Set<string>();
	value.forEach((d, index) => {
		if (seen.has(d.track)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: [index, 'track'],
				message: 'Ce métier apparaît deux fois.'
			});
		}
		seen.add(d.track);
	});
});

export type TrackDetailsForm = z.infer<typeof trackDetailsSchema>;
