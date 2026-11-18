/**
 * Projets (P2, D72) : formulaires validés côté serveur. Le client n'envoie que
 * des intentions ; ses identifiants (porteur, morceau, élément) ne prouvent
 * aucun droit : le service relit tout sous verrou.
 */
import { z } from 'zod';
import {
	MAX_PROJECT_DESCRIPTION,
	MAX_PROJECT_NAME,
	MAX_WORKING_TITLE,
	MIN_PROJECT_NAME,
	PROJECT_KINDS,
	PROJECT_SHARES,
	PROJECT_STATUSES
} from '#lib/projects/rules';

const blankToNull = (v: string | undefined) => v?.trim() || null;

const name = z
	.string()
	.trim()
	.min(MIN_PROJECT_NAME, { message: 'Donne un nom au projet.' })
	.max(MAX_PROJECT_NAME, { message: `${MAX_PROJECT_NAME} caractères au plus pour le nom.` });

const kind = z.enum(PROJECT_KINDS, { message: 'Choisis ce qu’est le projet.' });

const day = z
	.string()
	.optional()
	.transform(blankToNull)
	.refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), { message: 'Date invalide.' })
	.transform((v) => (v === null ? null : new Date(`${v}T00:00:00.000Z`)))
	.refine((v) => v === null || !Number.isNaN(v.getTime()), { message: 'Date invalide.' });

const details = {
	name,
	kind,
	description: z
		.string()
		.optional()
		.transform(blankToNull)
		.refine((v) => v === null || v.length <= MAX_PROJECT_DESCRIPTION, {
			message: `${MAX_PROJECT_DESCRIPTION} caractères au plus pour la phrase d’objectif.`
		}),
	startsOn: day,
	dueOn: day
};

const datesInOrder = (v: { startsOn: Date | null; dueOn: Date | null }) =>
	!v.startsOn || !v.dueOn || v.dueOn >= v.startsOn;
const datesMessage = { message: 'L’échéance vient après le début.', path: ['dueOn'] };

export const newProjectSchema = z
	.object({
		...details,
		/** Identifiant de l'acteur porteur ; vide : le projet est à moi. */
		owner: z.string().optional().transform(blankToNull)
	})
	.refine(datesInOrder, datesMessage);
export type NewProjectInput = z.infer<typeof newProjectSchema>;

export const editProjectSchema = z.object(details).refine(datesInOrder, datesMessage);
export type EditProjectInput = z.infer<typeof editProjectSchema>;

export const projectStatusSchema = z.object({
	status: z.enum(PROJECT_STATUSES, { message: 'État inconnu.' })
});

const workingTitle = z
	.string()
	.optional()
	.transform(blankToNull)
	.refine((v) => v === null || v.length <= MAX_WORKING_TITLE, {
		message: `${MAX_WORKING_TITLE} caractères au plus pour le titre affiché.`
	});

export const addItemSchema = z.object({
	workId: z.string().trim().min(1, { message: 'Choisis un morceau.' }).max(64),
	/** Vide : le partage par défaut (public → résumé, privé → rien). */
	share: z
		.string()
		.optional()
		.transform(blankToNull)
		.pipe(z.enum(PROJECT_SHARES, { message: 'Partage inconnu.' }).nullable()),
	workingTitle
});
export type AddItemInput = z.infer<typeof addItemSchema>;

export const itemShareSchema = z.object({
	itemId: z.string().trim().min(1).max(64),
	share: z.enum(PROJECT_SHARES, { message: 'Partage inconnu.' }),
	workingTitle
});
export type ItemShareInput = z.infer<typeof itemShareSchema>;

export const itemRefSchema = z.object({ itemId: z.string().trim().min(1).max(64) });
