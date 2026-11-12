/**
 * Réglages d'un métier (ONB-12b, D61) : visibilité de chaque bloc et
 * « ouvert aux sollicitations ». Envoyé en formulaire classique.
 */
import { z } from 'zod';
import { TRACK_VISIBILITIES } from '#lib/actors/trackSheet';

/** « Non précisé » reste possible : `null` n'est jamais lu comme « non » (Q66). */
export const OPEN_TO_REQUESTS = ['YES', 'NO', 'UNKNOWN'] as const;

export const trackSettingsSchema = z
	.object({
		offersVisibility: z.enum(TRACK_VISIBILITIES),
		detailsVisibility: z.enum(TRACK_VISIBILITIES),
		conditionsVisibility: z.enum(TRACK_VISIBILITIES),
		openToRequests: z.enum(OPEN_TO_REQUESTS)
	})
	.transform(({ openToRequests, ...rest }) => ({
		...rest,
		openToRequests: openToRequests === 'UNKNOWN' ? null : openToRequests === 'YES'
	}));
