/**
 * « Mon profil » (P1-06b) : bio, statut pro, recherche, matériel, pratique,
 * mobilité, liens. Règles dans `#lib/actors/profile`. Envoyé en JSON.
 */
import { z } from 'zod';
import {
	checkLink,
	EQUIPMENT,
	isPracticeYear,
	isTravelRadius,
	LINK_KINDS,
	LINK_MESSAGES,
	LOOKING_FOR,
	MAX_BIO_LENGTH,
	normalizeBio,
	PRO_STATUSES
} from '#lib/actors/profile';

const linksShape = Object.fromEntries(LINK_KINDS.map((kind) => [kind, z.string().default('')])) as {
	[K in (typeof LINK_KINDS)[number]]: z.ZodDefault<z.ZodString>;
};

export const profileSchema = z
	.object({
		bio: z.string().max(4000).default(''),
		/** `''` : non précisé. */
		proStatus: z.enum(['', ...PRO_STATUSES]).default(''),
		lookingFor: z.array(z.enum(LOOKING_FOR)).default([]),
		equipment: z.array(z.enum(EQUIPMENT)).default([]),
		practiceSince: z.number().int().nullable().default(null),
		/** `0` : non précisé. */
		travelRadiusKm: z.number().int().default(0),
		links: z.object(linksShape)
	})
	.superRefine((value, ctx) => {
		const issue = (path: (string | number)[], message: string) =>
			ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });

		if (normalizeBio(value.bio).length > MAX_BIO_LENGTH) {
			issue(['bio'], `${MAX_BIO_LENGTH} caractères au plus.`);
		}
		if (value.practiceSince !== null && !isPracticeYear(value.practiceSince)) {
			issue(['practiceSince'], 'Indique une année entre 1940 et cette année.');
		}
		if (value.travelRadiusKm !== 0 && !isTravelRadius(value.travelRadiusKm)) {
			issue(['travelRadiusKm'], 'Choisis un rayon dans la liste.');
		}
		for (const kind of LINK_KINDS) {
			const raw = value.links[kind].trim();
			if (raw === '') continue;
			const result = checkLink(kind, raw);
			if (!result.ok) issue(['links', kind], LINK_MESSAGES[result.reason]);
		}
	});

export type ProfileForm = z.infer<typeof profileSchema>;
