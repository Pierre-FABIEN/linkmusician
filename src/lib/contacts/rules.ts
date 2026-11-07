/**
 * Contacts (P3-16b, D45, D46) : règles pures, partagées par le serveur et
 * le navigateur.
 *
 * - Un **contact**, c'est quelqu'un de son carnet (« Garder le contact »
 *   après avoir joué ensemble) ou avec qui l'on a une conversation ouverte.
 * - Un **groupe de contacts** (« Projet funk ») est privé : un projet
 *   potentiel, qui ouvrira une discussion de groupe (P3-16c). Il ne contient
 *   que des contacts.
 */
import { z } from 'zod';

export const MAX_CONTACT_GROUPS = 20;
export const MAX_GROUP_MEMBERS = 30;
export const MIN_GROUP_NAME = 2;
export const MAX_GROUP_NAME = 40;

function oneLine(raw: string): string {
	return (
		raw
			// eslint-disable-next-line no-control-regex
			.replace(/[\u0000-\u001f\u007f]/g, ' ')
			.replace(/\s+/g, ' ')
			.trim()
	);
}

export const groupNameSchema = z
	.string({ required_error: 'Donne un nom au groupe.' })
	.transform(oneLine)
	.refine((v) => [...v].length >= MIN_GROUP_NAME, {
		message: `Le nom fait au moins ${MIN_GROUP_NAME} caractères.`
	})
	.refine((v) => [...v].length <= MAX_GROUP_NAME, {
		message: `Le nom tient en ${MAX_GROUP_NAME} caractères.`
	});

/** Comment on s'est rencontrés, en une phrase courte. */
export function howWeMet(input: {
	jamsTogether: number;
	collaborations: number;
	inCarnet: boolean;
}): string {
	const parts: string[] = [];
	if (input.jamsTogether > 0) {
		parts.push(
			input.jamsTogether === 1 ? 'Une jam ensemble' : `${input.jamsTogether} jams ensemble`
		);
	}
	if (input.collaborations > 0) {
		parts.push(
			input.collaborations === 1 ? 'une collaboration' : `${input.collaborations} collaborations`
		);
	}
	if (parts.length === 0) return input.inCarnet ? 'Vous avez joué ensemble' : 'Vous vous écrivez';
	const sentence = parts.join(' et ');
	return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

export type ContactSortable = { displayName: string; inCarnet: boolean; lastTogether: Date | null };

/**
 * Ordre du carnet : ceux du carnet d'abord, puis le plus récent ensemble,
 * puis par nom.
 */
export function compareContacts(a: ContactSortable, b: ContactSortable): number {
	if (a.inCarnet !== b.inCarnet) return a.inCarnet ? -1 : 1;
	const at = a.lastTogether?.getTime() ?? 0;
	const bt = b.lastTogether?.getTime() ?? 0;
	if (at !== bt) return bt - at;
	return a.displayName.localeCompare(b.displayName, 'fr');
}
