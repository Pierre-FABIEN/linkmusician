/**
 * Conseils en contexte (P2-17, conception 07 §7.1) : sur chaque écran clé, un
 * conseil court qui explique comment jouer le jeu. Créer du lien, apprécier
 * les gens avec qui l'on a joué, trouver des musicien·nes pour un projet.
 *
 * - **Un seul à la fois** : le premier conseil de l'écran dont la condition
 *   tient et que la personne n'a pas masqué.
 * - **Masquable** (« J'ai compris »), mémorisé par personne
 *   (`persons.tipsDismissed`) : un conseil masqué ne revient pas.
 * - **Jamais** sur un écran déjà guidé par « Ta prochaine étape »
 *   (`GUIDED_SCREENS`).
 * - Ton (07 §7) : on encourage et on montre la suite, jamais de reproche.
 *
 * Module pur, partagé par le serveur et le navigateur.
 */

/** Écrans clés de l'espace : chacun a au moins un conseil sans condition. */
export const KEY_SCREENS = [
	'decouvrir',
	'annonces',
	'messages',
	'conversation',
	'profil',
	'carnet'
] as const;
export type TipScreen = (typeof KEY_SCREENS)[number];

/** Écrans déjà guidés par « Ta prochaine étape » (P2-12b) : pas de conseil. */
export const GUIDED_SCREENS = ['espace', 'jam'] as const;

/** Faits sur la personne qui choisissent le conseil (lus par le serveur). */
export type TipContext = {
	/** Personnes avec qui elle a joué (jam où les deux étaient, collaboration). */
	playedWith: number;
	/** Appréciations qu'elle a laissées (actives). */
	appreciationsGiven: number;
	/** Personnes gardées dans son réseau musical. */
	networkSize: number;
	/** Médias publiés. */
	media: number;
	/** Annonces qu'elle a publiées. */
	opportunities: number;
};

export type Tip = {
	id: string;
	screen: TipScreen;
	text: string;
	link?: { href: string; label: string };
	/** Sans condition : toujours possible (le dernier recours de l'écran). */
	when?: (ctx: TipContext) => boolean;
};

/**
 * Catalogue, dans l'ordre de priorité de chaque écran : les conseils
 * conditionnels d'abord, le conseil général en dernier.
 */
export const TIPS: readonly Tip[] = [
	{
		id: 'decouvrir-garder-contact',
		screen: 'decouvrir',
		when: (c) => c.playedWith > 0 && c.networkSize === 0,
		text: 'Tu as déjà joué avec des gens ici : garde le contact depuis ton carnet de jams. Ton réseau musical remonte en tête de tes recherches.',
		link: { href: '/jam/carnet', label: 'Ouvrir mon carnet' }
	},
	{
		id: 'decouvrir-ecrire',
		screen: 'decouvrir',
		text: 'Un profil t’inspire ? Écris un mot simple : ce que tu joues, ce que tu cherches, quand tu es libre. Une demande courte et précise reçoit plus souvent une réponse.'
	},
	{
		id: 'annonces-publier',
		screen: 'annonces',
		when: (c) => c.opportunities === 0,
		text: 'Tu cherches quelqu’un pour un projet, une session ou un groupe ? Publie une annonce : les musicien·nes autour de toi la verront et pourront postuler.'
	},
	{
		id: 'annonces-conditions',
		screen: 'annonces',
		text: 'Une annonce claire attire les bonnes personnes : dis le style, le niveau attendu et le rythme des répétitions.'
	},
	{
		id: 'messages-proposer-jouer',
		screen: 'messages',
		text: 'Après quelques messages, propose de jouer ensemble : une répétition, une jam, une session. C’est en jouant qu’on se découvre vraiment.',
		link: { href: '/jam', label: 'Voir les jams autour de moi' }
	},
	{
		id: 'conversation-collaboration',
		screen: 'conversation',
		text: 'Vous avez joué ensemble ? Proposez une collaboration ici. Une fois confirmée par vous deux, elle compte pour vos parcours, et vous pourrez vous laisser une appréciation.'
	},
	{
		id: 'profil-apprecier',
		screen: 'profil',
		when: (c) => c.playedWith > 0 && c.appreciationsGiven === 0,
		text: 'Tu as joué avec quelqu’un récemment ? Laisse-lui une appréciation : un mot qui fait plaisir, et qui compte pour sa réputation.',
		link: { href: '/jam/carnet', label: 'Ouvrir mon carnet' }
	},
	{
		id: 'profil-demo',
		screen: 'profil',
		when: (c) => c.media === 0,
		text: 'Ajoute une démo : c’est le premier son qu’on entend de toi, et ce qui donne envie de t’écrire.',
		link: { href: '/profil/medias', label: 'Ajouter un média' }
	},
	{
		id: 'profil-public',
		screen: 'profil',
		text: 'Regarde ton profil comme les autres le voient : ce que d’autres confirment de toi (collaborations, appréciations) y apparaît au fil du temps.'
	},
	{
		id: 'carnet-garder-contact',
		screen: 'carnet',
		when: (c) => c.networkSize === 0,
		text: '« Garder le contact » ajoute une personne à ton réseau musical, que toi seul·e vois : elle remonte en tête de tes recherches.'
	},
	{
		id: 'carnet-rejouer',
		screen: 'carnet',
		text: 'Une jam t’a plu ? « Rejouer ensemble » prépare la suivante avec le même lieu et les mêmes places.'
	}
];

export const TIPS_BY_ID: ReadonlyMap<string, Tip> = new Map(TIPS.map((t) => [t.id, t]));

export function isTipId(value: unknown): value is string {
	return typeof value === 'string' && TIPS_BY_ID.has(value);
}

/** Le conseil à montrer sur un écran, ou `null` (tout masqué). */
export function tipFor(
	screen: TipScreen,
	ctx: TipContext,
	dismissed: readonly string[]
): Pick<Tip, 'id' | 'text' | 'link'> | null {
	const hidden = new Set(dismissed);
	const tip = TIPS.find(
		(t) => t.screen === screen && !hidden.has(t.id) && (t.when ? t.when(ctx) : true)
	);
	return tip ? { id: tip.id, text: tip.text, ...(tip.link ? { link: tip.link } : {}) } : null;
}
