/**
 * Écran musicien·ne (ONB-03) : expérience et engagement (requis), rôles
 * d'écriture, « Je propose », « Je recherche » et précisions selon
 * l'instrument (facultatifs). Règles dans `#lib/musician/profile` et
 * `#lib/actors/specializations` ; les précisions sont revérifiées côté
 * serveur avec les instruments de la personne (`checkDetails`).
 */
import { z } from 'zod';
import { COMMITMENTS, PRACTICE_EXPERIENCES } from '#lib/musician/profile';
import { catalogOf, CODES_MESSAGES, MAX_CODES_PER_LIST } from '#lib/actors/specializations';

const codes = z.array(z.string().trim().min(1).max(60)).max(MAX_CODES_PER_LIST).default([]);

export const MUSICIAN_STEP_MESSAGES = {
	practiceExperience: 'Dis-nous où tu en es : seul·e, avec d’autres ou sur scène.',
	commitment: 'Choisis l’engagement que tu cherches.'
} as const;

export const musicianStepSchema = z
	.object({
		practiceExperience: z.enum(PRACTICE_EXPERIENCES).optional(),
		commitment: z.enum(COMMITMENTS).optional(),
		/** Rôles d'écriture : spécialités du métier musicien·ne. */
		specializations: codes,
		offers: codes,
		needs: codes,
		details: z.record(z.string(), z.array(z.string().max(60)).max(20)).default({})
	})
	.superRefine((value, ctx) => {
		for (const key of ['practiceExperience', 'commitment'] as const) {
			if (!value[key])
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: [key],
					message: MUSICIAN_STEP_MESSAGES[key]
				});
		}
		for (const list of ['specializations', 'offers', 'needs'] as const) {
			const catalog = catalogOf('MUSICIAN', list);
			value[list].forEach((code, index) => {
				if (!catalog.some((e) => e.code === code))
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						path: [list, index],
						message: CODES_MESSAGES.unknown
					});
			});
		}
	});

export type MusicianStepForm = z.infer<typeof musicianStepSchema>;
