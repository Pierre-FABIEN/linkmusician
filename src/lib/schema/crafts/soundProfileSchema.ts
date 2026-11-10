/**
 * « Mon profil d'ingé son » (P4-02) : spécialités, mobilité, matériel,
 * travaux en écoute. Règles dans `#lib/crafts/sound`. Envoyé en JSON.
 */
import { z } from 'zod';
import {
	checkReference,
	CRAFT_MOBILITY,
	MAX_GEAR_LENGTH,
	MAX_REFERENCES,
	normalizeGear,
	SOUND_SPECIALTIES
} from '#lib/crafts/sound';

export const soundProfileSchema = z
	.object({
		specialties: z.array(z.enum(SOUND_SPECIALTIES)).default([]),
		mobility: z.array(z.enum(CRAFT_MOBILITY)).default([]),
		gear: z.string().max(4000).default(''),
		references: z
			.array(z.object({ title: z.string().max(400), url: z.string().max(400) }))
			.default([])
	})
	.superRefine((value, ctx) => {
		const issue = (path: (string | number)[], message: string) =>
			ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
		if (normalizeGear(value.gear).length > MAX_GEAR_LENGTH) {
			issue(['gear'], `${MAX_GEAR_LENGTH} caractères au plus.`);
		}
		const filled = value.references.filter((r) => r.title.trim() || r.url.trim());
		if (filled.length > MAX_REFERENCES) {
			issue(['references'], `${MAX_REFERENCES} travaux au plus.`);
		}
		value.references.forEach((r, i) => {
			if (!r.title.trim() && !r.url.trim()) return; // ligne vide : ignorée
			const checked = checkReference(r);
			if (!checked.ok) issue(['references', i, checked.field], checked.message);
		});
	});

export type SoundProfileForm = z.infer<typeof soundProfileSchema>;
