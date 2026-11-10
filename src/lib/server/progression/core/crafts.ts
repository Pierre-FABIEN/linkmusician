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
