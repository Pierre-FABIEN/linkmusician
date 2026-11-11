/**
 * Parrainage (P4-13b, conception 07 §4.8) : une personne au palier Pilier
 * local ou Référence présente deux personnes de son réseau musical. Quand
 * elles collaborent ensuite, elle obtient le succès _Passeur_ (02 §9). On
 * progresse aussi en faisant progresser les autres : sans XP, sans
 * classement.
 *
 * Module pur, partagé par le serveur et le navigateur.
 */

/** Paliers musicien qui ouvrent le parrainage. */
export const SPONSOR_TIERS = ['LOCAL_PILLAR', 'REFERENCE'] as const;
export const MAX_INTRO_NOTE = 300;
/** Présentations par période glissante (anti-spam). */
export const MAX_INTRODUCTIONS = 10;
export const INTRODUCTION_WINDOW_DAYS = 30;

/** Les paliers atteints ouvrent-ils le parrainage ? */
export function canSponsor(reached: readonly string[]): boolean {
	return reached.some((tier) => (SPONSOR_TIERS as readonly string[]).includes(tier));
}

/** Paire rangée : une seule ligne par présentation, dans les deux sens. */
export function pairOf(a: string, b: string): [string, string] {
	return a < b ? [a, b] : [b, a];
}

/** Petit mot : texte brut sur une ou plusieurs lignes, espaces resserrés. */
export function normalizeNote(text: string): string {
	return text
		.split('\n')
		.map((line) => line.trim().replace(/\s+/g, ' '))
		.filter(Boolean)
		.join('\n');
}

export type IntroductionCheck = {
	sponsor: boolean;
	same: boolean;
	/** Les deux sont dans le réseau de la personne qui présente. */
	bothInNetwork: boolean;
	/** L'une des deux est mineure (D5) : jamais présentée à un·e adulte. */
	minor: boolean;
	/** Un blocage entre les deux. */
	blocked: boolean;
	/** Elles ont déjà joué ensemble : rien à présenter. */
	alreadyPlayed: boolean;
	alreadyIntroduced: boolean;
	recent: number;
	noteLength: number;
};

/**
 * Ce qui empêche la présentation, en clair, ou `null`. Un blocage ne se dit
 * pas comme tel (P2-05) : on répond comme pour une personne indisponible.
 */
export function introductionBlocker(c: IntroductionCheck): string | null {
	if (!c.sponsor) return 'Le parrainage s’ouvre au palier Pilier local.';
	if (c.same) return 'Choisis deux personnes différentes.';
	if (!c.bothInNetwork) return 'Tu présentes deux personnes de ton réseau musical.';
	if (c.minor || c.blocked) return 'Impossible de présenter ces deux personnes.';
	if (c.alreadyPlayed) return 'Elles ont déjà joué ensemble : elles se connaissent.';
	if (c.alreadyIntroduced) return 'Tu les as déjà présentées l’une à l’autre.';
	if (c.recent >= MAX_INTRODUCTIONS)
		return `${MAX_INTRODUCTIONS} présentations par mois au plus : laisse-leur le temps de se rencontrer.`;
	if (c.noteLength > MAX_INTRO_NOTE) return `Ton mot tient en ${MAX_INTRO_NOTE} caractères.`;
	return null;
}

/**
 * Présentations réussies par une collaboration : celles dont les deux
 * personnes y ont participé, faites avant, pas encore réussies.
 */
export function succeededBy<T extends { firstId: string; secondId: string; createdAt: Date }>(
	introductions: readonly T[],
	participantIds: readonly string[],
	completedAt: Date
): T[] {
	const present = new Set(participantIds);
	return introductions.filter(
		(i) =>
			present.has(i.firstId) &&
			present.has(i.secondId) &&
			i.createdAt.getTime() <= completedAt.getTime()
	);
}
