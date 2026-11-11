/**
 * « Mon profil d'organisateur·rice » (P5-05a) : ce que j'organise, genres
 * programmés, jauge habituelle, événements passés en lien. Règles dans
 * `#lib/crafts/promoter` et `#lib/crafts/common`. Envoyé en JSON.
 */
import { z } from 'zod';
import { checkReference, MAX_REFERENCES } from '#lib/crafts/common';
import { MAX_CAPACITY, MAX_PROMOTER_GENRES, PROMOTER_EVENT_KINDS } from '#lib/crafts/promoter';

export const promoterProfileSchema = z
	.object({
		eventKinds: z.array(z.enum(PROMOTER_EVENT_KINDS)).default([]),
		genreIds: z.array(z.string().min(1).max(60)).default([]),
		/** Jauge habituelle ; vide : non précisée. */
		capacity: z
			.number()
			.int('Un nombre entier de personnes.')
			.min(1, 'Une personne au moins.')
			.max(MAX_CAPACITY, `${MAX_CAPACITY.toLocaleString('fr-FR')} personnes au plus.`)
			.nullable()
			.default(null),
		references: z
			.array(z.object({ title: z.string().max(400), url: z.string().max(400) }))
			.default([])
	})
	.superRefine((value, ctx) => {
		const issue = (path: (string | number)[], message: string) =>
			ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
		if (new Set(value.genreIds).size > MAX_PROMOTER_GENRES) {
			issue(['genreIds'], `${MAX_PROMOTER_GENRES} genres au plus.`);
		}
		const filled = value.references.filter((r) => r.title.trim() || r.url.trim());
		if (filled.length > MAX_REFERENCES) {
			issue(['references'], `${MAX_REFERENCES} événements au plus.`);
		}
		value.references.forEach((r, i) => {
			if (!r.title.trim() && !r.url.trim()) return; // ligne vide : ignorée
			const checked = checkReference(r);
			if (!checked.ok) issue(['references', i, checked.field], checked.message);
		});
	});

export type PromoterProfileForm = z.infer<typeof promoterProfileSchema>;
