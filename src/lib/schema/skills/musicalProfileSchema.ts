/**
 * « Mon profil musical » (P1-06). Règles dans `#lib/skills/profile`.
 * Formulaire envoyé en JSON (`dataType: 'json'`) : liste d'objets.
 */
import { z } from 'zod';
import {
	checkMusicalProfile,
	MUSICAL_PROFILE_MESSAGES,
	type MusicalProfileProblem
} from '#lib/skills/profile';

const FIELD_OF: Record<
	MusicalProfileProblem,
	'instruments' | 'primaryInstrumentId' | 'genreIds' | 'influences'
> = {
	instruments_empty: 'instruments',
	instruments_too_many: 'instruments',
	instruments_duplicate: 'instruments',
	level: 'instruments',
	primary: 'primaryInstrumentId',
	genres_empty: 'genreIds',
	genres_too_many: 'genreIds',
	influences_too_many: 'influences',
	influence_too_long: 'influences'
};

export const musicalProfileSchema = z
	.object({
		instruments: z
			.array(z.object({ instrumentId: z.string().min(1), level: z.number().int() }))
			.default([]),
		primaryInstrumentId: z.string().optional(),
		genreIds: z.array(z.string().min(1)).default([]),
		influences: z.string().max(2000).default('')
	})
	.superRefine((value, ctx) => {
		const result = checkMusicalProfile(value);
		if (result.ok) return;
		for (const problem of result.problems) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: [FIELD_OF[problem]],
				message: MUSICAL_PROFILE_MESSAGES[problem]
			});
		}
	});

export type MusicalProfileForm = z.infer<typeof musicalProfileSchema>;
