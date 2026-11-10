/**
 * « Mon profil de producteur·rice » (P4-04) : spécialités, styles produits,
 * logiciels, tarifs indicatifs, mobilité, productions en écoute. Règles dans
 * `#lib/crafts/producer` et `#lib/crafts/common`. Envoyé en JSON.
 */
import { z } from 'zod';
import { checkReference, CRAFT_MOBILITY, MAX_REFERENCES } from '#lib/crafts/common';
import {
	MAX_PRODUCER_GENRES,
	MAX_RATE_LENGTH,
	MAX_SOFTWARE_LENGTH,
	normalizeRate,
	normalizeSoftware,
	PRODUCER_SPECIALTIES
} from '#lib/crafts/producer';

export const producerProfileSchema = z
	.object({
		specialties: z.array(z.enum(PRODUCER_SPECIALTIES)).default([]),
		genreIds: z.array(z.string().min(1).max(60)).default([]),
		software: z.string().max(2000).default(''),
		rate: z.string().max(1000).default(''),
		mobility: z.array(z.enum(CRAFT_MOBILITY)).default([]),
		references: z
			.array(z.object({ title: z.string().max(400), url: z.string().max(400) }))
			.default([])
	})
	.superRefine((value, ctx) => {
		const issue = (path: (string | number)[], message: string) =>
			ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
		if (new Set(value.genreIds).size > MAX_PRODUCER_GENRES) {
			issue(['genreIds'], `${MAX_PRODUCER_GENRES} styles au plus.`);
		}
		if (normalizeSoftware(value.software).length > MAX_SOFTWARE_LENGTH) {
			issue(['software'], `${MAX_SOFTWARE_LENGTH} caractères au plus.`);
		}
		if (normalizeRate(value.rate).length > MAX_RATE_LENGTH) {
			issue(['rate'], `${MAX_RATE_LENGTH} caractères au plus.`);
		}
		const filled = value.references.filter((r) => r.title.trim() || r.url.trim());
		if (filled.length > MAX_REFERENCES) {
			issue(['references'], `${MAX_REFERENCES} productions au plus.`);
		}
		value.references.forEach((r, i) => {
			if (!r.title.trim() && !r.url.trim()) return; // ligne vide : ignorée
			const checked = checkReference(r);
			if (!checked.ok) issue(['references', i, checked.field], checked.message);
		});
	});

export type ProducerProfileForm = z.infer<typeof producerProfileSchema>;
