/**
 * Prestations des métiers du son (P4-01, conception 08 §5 et §7) : ce
 * qu'une personne de la plateforme fait sur une collaboration quand elle
 * n'y joue pas. Chaque prestation rapporte sur la piste du métier exercé
 * (D20) ; les musicien·nes de la même collaboration gagnent, eux, sur la
 * piste musicien. Module pur.
 */
export const CRAFT_SERVICES = [
	'RECORDING',
	'MIXING',
	'MASTERING',
	'LIVE_SOUND',
	'PRODUCTION',
	'ARRANGEMENT'
] as const;
export type CraftService = (typeof CRAFT_SERVICES)[number];

/** Pistes des métiers du son. */
export const CRAFT_TRACKS = ['SOUND_ENGINEER', 'PRODUCER'] as const;
export type CraftTrack = (typeof CRAFT_TRACKS)[number];

/** Piste créditée par chaque prestation. */
export const SERVICE_TRACK: Readonly<Record<CraftService, CraftTrack>> = {
	RECORDING: 'SOUND_ENGINEER',
	MIXING: 'SOUND_ENGINEER',
	MASTERING: 'SOUND_ENGINEER',
	LIVE_SOUND: 'SOUND_ENGINEER',
	PRODUCTION: 'PRODUCER',
	ARRANGEMENT: 'PRODUCER'
};

/** Libellé du gain, lisible par la personne (« Mixage confirmé »). */
export const SERVICE_REASON: Readonly<Record<CraftService, string>> = {
	RECORDING: 'Session d’enregistrement confirmée',
	MIXING: 'Mixage confirmé',
	MASTERING: 'Mastering confirmé',
	LIVE_SOUND: 'Sonorisation confirmée',
	PRODUCTION: 'Production confirmée',
	ARRANGEMENT: 'Arrangement confirmé'
};

/**
 * Prestations où les musicien·nes de la collaboration gagnent aussi la
 * collaboration (P4-06) : ils jouent (enregistrement, date sonorisée) ou
 * co-créent (production, arrangement). Sur un mixage ou un mastering, ils ne
 * jouent pas : seule la personne du son gagne. Défaut provisoire, question Q1
 * de `docs/plan/a-trancher.md`.
 */
export const MUSICIAN_EARNS: ReadonlySet<CraftService> = new Set([
	'RECORDING',
	'LIVE_SOUND',
	'PRODUCTION',
	'ARRANGEMENT'
]);

/** Les musicien·nes d'une collaboration y gagnent-ils (aucune prestation, ou une où l'on joue) ? */
export function musiciansEarn(services: Readonly<Record<string, CraftService>> | undefined) {
	return Object.values(services ?? {}).every((s) => MUSICIAN_EARNS.has(s));
}

/**
 * Pistes des métiers de la scène (P5-01, conception 08 §8 à §10) :
 * organisateur·rice, booker, manager. Le lieu (organisation `VENUE`) gagne
 * un rang, pas d'XP (Q24) ; les points vont aux personnes qui organisent ou
 * bookent, jamais aux musicien·nes qui jouent (elles et ils gagnent déjà par
 * la collaboration et les étapes).
 */
export const SCENE_TRACKS = ['PROMOTER', 'BOOKER', 'MANAGER'] as const;
export type SceneTrack = (typeof SCENE_TRACKS)[number];

/** Accompagnement confirmé par l'artiste : manager ou booker (08 §9, §10). */
export const AGENT_KINDS = ['MANAGER', 'BOOKER'] as const;
export type AgentKind = (typeof AGENT_KINDS)[number];
