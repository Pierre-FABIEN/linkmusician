/**
 * Besoins d'un projet (U3b, D76) : formulaires et brouillons validés côté
 * serveur. Le client n'envoie que le contenu d'un besoin et des intentions ;
 * jamais un état, un auteur ni une décision (N5).
 *
 * `projectNeedDraftSchema` est le format d'un brouillon de besoin : celui
 * du formulaire, et celui qu'un futur assistant (#89) préparera avant que
 * la personne ne relise et confirme. Il ne s'enregistre jamais tel quel.
 */
import { z } from 'zod';
import {
	isNeedTrack,
	MAX_NEED_DESCRIPTION,
	NEED_TRACKS,
	specialtyAllowed
} from '#lib/projects/needs';

const blankToNull = (v: string | undefined) => v?.trim() || null;
const ref = z.string().trim().min(1).max(64);

const draftFields = {
	track: z.enum(NEED_TRACKS, { message: 'Choisis le métier recherché.' }),
	specialty: z.string().max(40).optional().transform(blankToNull),
	/** Slug d'instrument (musicien·ne seulement), relu côté serveur. */
	instrument: z
		.string()
		.max(60)
		.optional()
		.transform(blankToNull)
		.refine((v) => v === null || /^[a-z0-9][a-z0-9-]{0,59}$/.test(v), {
			message: 'Instrument inconnu.'
		}),
	description: z
		.string()
		.optional()
		.transform(blankToNull)
		.refine((v) => v === null || [...v].length <= MAX_NEED_DESCRIPTION, {
			message: `${MAX_NEED_DESCRIPTION} caractères au plus pour la phrase.`
		})
};

type DraftShape = {
	track: string;
	specialty: string | null;
	instrument: string | null;
};

function checkPrecision(d: DraftShape, ctx: z.RefinementCtx) {
	if (isNeedTrack(d.track) && !specialtyAllowed(d.track, d.specialty)) {
		ctx.addIssue({
			code: 'custom',
			message: 'Cette précision ne correspond pas au métier choisi.',
			path: ['specialty']
		});
	}
	if (d.track !== 'MUSICIAN' && d.instrument !== null) {
		ctx.addIssue({
			code: 'custom',
			message: 'Un instrument ne précise qu’un·e musicien·ne.',
			path: ['instrument']
		});
	}
}

// Un état, un auteur ou une décision envoyés par le client sont refusés (`strict`).
export const projectNeedDraftSchema = z.object(draftFields).strict().superRefine(checkPrecision);
export type ProjectNeedDraft = z.infer<typeof projectNeedDraftSchema>;

export const needRefSchema = z.object({ needId: ref });

export const needUpdateSchema = z
	.object({ needId: ref, ...draftFields })
	.strict()
	.superRefine(checkPrecision);

export const needDecisionSchema = z.object({
	needId: ref,
	decision: z.enum(['open', 'decline'], { message: 'Décision inconnue.' })
});

export const needFillSchema = z.object({
	needId: ref,
	/** Participation active désignée (facultatif), relue côté serveur. */
	participantId: z.string().trim().max(64).optional().transform(blankToNull)
});
