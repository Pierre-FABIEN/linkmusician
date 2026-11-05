/**
 * LINKMUSICIAN: les deux modes de jeu (D21, P2-12), affichés à l'accueil de
 * l'espace comme le menu d'un jeu. Module pur.
 */
export const PLAY_MODES = ['CAREER', 'JAM'] as const;
export type PlayModeValue = (typeof PLAY_MODES)[number];

export const PLAY_MODE_INFO: Readonly<
	Record<PlayModeValue, { label: string; pitch: string; href: string }>
> = {
	CAREER: {
		label: 'Mode carrière',
		pitch: 'Monte ton groupe, enregistre, joue sur scène : chaque étape réelle te fait avancer.',
		href: '/espace'
	},
	JAM: {
		label: 'Mode jam',
		pitch:
			'Envie de jouer ce soir ? Trouve des jams autour de toi et rencontre d’autres musicien·nes.',
		href: '/jam'
	}
};

export function isPlayMode(value: unknown): value is PlayModeValue {
	return (PLAY_MODES as readonly unknown[]).includes(value);
}

/** Le dernier mode choisi en premier (« Reprendre »), l'autre ensuite. */
export function orderedModes(preferred: PlayModeValue | null | undefined) {
	return [...PLAY_MODES]
		.sort((a, b) => Number(b === preferred) - Number(a === preferred))
		.map((mode) => ({ mode, resume: mode === preferred, ...PLAY_MODE_INFO[mode] }));
}
