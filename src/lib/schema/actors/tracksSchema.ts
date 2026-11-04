/**
 * Choix des métiers (« Qui es-tu ? ») : à l'arrivée et dans les réglages.
 * Règles dans `#lib/actors/tracks` (D15).
 */
import { z } from 'zod';
import { checkTrackSelection, TRACK_KINDS, TRACK_MESSAGES } from '#lib/actors/tracks';

export const tracksSchema = z
	.object({
		tracks: z.array(z.enum(TRACK_KINDS)).default([]),
		primary: z.enum(TRACK_KINDS).optional()
	})
	.superRefine((value, ctx) => {
		const result = checkTrackSelection(value.tracks, value.primary);
		if (!result.ok) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: [result.reason === 'empty' ? 'tracks' : 'primary'],
				message: TRACK_MESSAGES[result.reason]
			});
		}
	});

export type TracksForm = z.infer<typeof tracksSchema>;
