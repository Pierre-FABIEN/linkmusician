/**
 * Confidentialité des activités (RV-01, D81) : **point unique** de décision
 * pour lire la participation d'une autre personne à une jam (« Je viens »,
 * « J'y étais », formation, historique).
 *
 * Phase de protection immédiate : les activités sont **privées par défaut**
 * et aucun partage n'existe encore. Seule la personne voit les siennes ; la
 * gestion d'une jam (hôte, lead) garde ses besoins opérationnels, lus
 * ailleurs et jamais par ce module (inscriptions, invitations, capacité).
 * Le partage volontaire (`SELECTED_CONTACTS`, `PUBLIC`), les exclusions et la
 * découverte sur place s'ajouteront **ici**, sans toucher aux appelants
 * (conception 23).
 *
 * Ni un contact dans le carnet, ni une conversation, ni un rôle
 * d'administration ne donnent accès aux activités d'autrui.
 */
import type { Prisma } from '@prisma/client';

export type ActivityContext = 'jam.presents' | 'jam.lineup' | 'jam.endorse' | 'contacts' | 'log';

/** La personne `viewerId` peut-elle voir l'activité de `ownerId` ? */
export function canViewActivity(input: {
	viewerId: string;
	ownerId: string;
	context: ActivityContext;
}): boolean {
	return input.viewerId === input.ownerId;
}

/**
 * Filtre Prisma sur `JamAttendance` : les présences **d'autres personnes**
 * visibles par `viewerId`. Aujourd'hui aucune (privé par défaut).
 */
export function othersAttendanceVisibleTo(
	viewerId: string,
	_context: ActivityContext
): Prisma.JamAttendanceWhereInput {
	return { actorId: { in: [] }, NOT: { actorId: viewerId } };
}

/** Tranches d'un nombre de participant·es : pas de compte exact, pour ne rien déduire d'un petit groupe. */
export function participantBand(count: number): 'none' | 'few' | 'five' | 'ten' {
	if (count <= 0) return 'none';
	if (count < 5) return 'few';
	if (count < 10) return 'five';
	return 'ten';
}

export const PARTICIPANT_BAND_LABELS = {
	none: 'Personne n’a encore dit venir',
	few: 'Quelques musicien·nes viennent',
	five: 'Plus de 5 musicien·nes viennent',
	ten: 'Plus de 10 musicien·nes viennent'
} as const;
