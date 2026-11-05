/**
 * LINKMUSICIAN: les deux modes de jeu (D21, P2-12), affichés à l'accueil de
 * l'espace comme le menu d'un jeu, avec une présentation en trois étapes la
 * première fois (P2-12b). Module pur.
 */
export const PLAY_MODES = ['CAREER', 'JAM'] as const;
export type PlayModeValue = (typeof PLAY_MODES)[number];

export type IntroStep = { title: string; text: string };

export const PLAY_MODE_INFO: Readonly<
	Record<
		PlayModeValue,
		{
			label: string;
			pitch: string;
			/** Comment on avance, en une phrase. */
			how: string;
			href: string;
			/** Adresse de la présentation (`/jouer/<slug>`). */
			slug: string;
			intro: readonly [IntroStep, IntroStep, IntroStep];
		}
	>
> = {
	CAREER: {
		label: 'Mode carrière',
		pitch: 'Monte ton groupe, enregistre, joue sur scène : chaque étape réelle te fait avancer.',
		how: 'Tu avances en complétant ton profil, puis en jouant avec d’autres.',
		href: '/espace',
		slug: 'carriere',
		intro: [
			{
				title: 'Ta carrière, comme dans un jeu',
				text: 'Rencontre, création, studio, scène, sortie : ta carrière avance étape par étape, et chaque étape franchie est réelle.'
			},
			{
				title: 'Comment tu gagnes des points',
				text: 'Complète ton profil, publie une démo, puis joue avec d’autres : chaque collaboration confirmée des deux côtés te fait monter. Les points ne s’achètent pas.'
			},
			{
				title: 'Une étape à la fois',
				text: 'Ton tableau de bord te montre toujours ta prochaine étape. Pas besoin de tout faire d’un coup.'
			}
		]
	},
	JAM: {
		label: 'Mode jam',
		pitch:
			'Envie de jouer ce soir ? Trouve des jams autour de toi et rencontre d’autres musicien·nes.',
		how: 'Tu découvres des musicien·nes, et tes points montent quand ceux avec qui tu joues t’apprécient.',
		href: '/jam',
		slug: 'jam',
		intro: [
			{
				title: 'Jouer pour le plaisir',
				text: 'Pas de projet, pas de pression : mets-toi dispo ou rejoins une jam, toujours dans un lieu public ou un local de répète.'
			},
			{
				title: 'Fais-toi remarquer',
				text: 'Venir ne suffit pas : après la jam, les musicien·nes présents peuvent te laisser une appréciation (« bon groove », « à l’écoute »). C’est ce qui fait monter tes points.'
			},
			{
				title: 'Et peut-être plus',
				text: 'Les rencontres d’un soir deviennent souvent des groupes. Quand tu veux, passe en mode carrière pour monter un projet.'
			}
		]
	}
};

export function isPlayMode(value: unknown): value is PlayModeValue {
	return (PLAY_MODES as readonly unknown[]).includes(value);
}

/** Mode d'une adresse de présentation (`carriere`, `jam`). */
export function modeFromSlug(slug: string): PlayModeValue | null {
	return PLAY_MODES.find((m) => PLAY_MODE_INFO[m].slug === slug) ?? null;
}

/** Le dernier mode choisi en premier (« Reprendre »), l'autre ensuite. */
export function orderedModes(preferred: PlayModeValue | null | undefined) {
	return [...PLAY_MODES]
		.sort((a, b) => Number(b === preferred) - Number(a === preferred))
		.map((mode) => ({ mode, resume: mode === preferred, ...PLAY_MODE_INFO[mode] }));
}

/** Où mène le choix d'un mode : sa présentation la première fois, sinon le mode. */
export function destinationFor(mode: PlayModeValue, introsSeen: readonly PlayModeValue[]) {
	const info = PLAY_MODE_INFO[mode];
	return introsSeen.includes(mode) ? info.href : `/jouer/${info.slug}`;
}
