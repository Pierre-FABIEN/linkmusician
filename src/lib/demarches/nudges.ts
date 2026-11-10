/**
 * Démarches au bon moment (P3-15a, conception 09 §3) : là où une question
 * administrative se pose (un morceau écrit à plusieurs, un premier
 * concert, un groupe formé), une phrase et un lien vers la fiche.
 *
 * Même mécanique que les conseils en contexte (P2-17) : **une seule à la
 * fois** par écran, la première dont la condition tient et que la personne
 * n'a pas masquée (« J'ai compris », `persons.tipsDismissed`). Lire une
 * fiche ne rapporte rien (conception 09 §1.6). Module pur.
 */
import { ficheBySlug, ficheHref } from './catalog';

/** Préfixe des identifiants, pour les distinguer des conseils P2-17. */
export const NUDGE_PREFIX = 'demarche-';

export type NudgeScreen = 'morceau' | 'groupe' | 'annonce';

/** Faits sur l'écran, lus par le serveur. */
export type NudgeContext = {
	/** Morceau : composé (l'idée ne déclenche rien). */
	composed?: boolean;
	/** Morceau : nombre de crédits confirmés. */
	confirmedCredits?: number;
	/** Groupe : clés des étapes déclarées (P3-04). */
	milestones?: readonly string[];
	/** Groupe : au moins un·e membre actif·ve mineur·e. */
	hasMinor?: boolean;
	/** Annonce : son type (P2-02). */
	opportunityKind?: string;
	/** Documents préremplis disponibles sur l'écran (P3-15b), par clé. */
	documents?: Partial<Record<DocumentKey, string>>;
};

/** Documents préremplis (P3-15b). */
export const DOCUMENT_LABELS = {
	bulletin: 'Préparer le bulletin de partage',
	programme: 'Préparer le programme des œuvres'
} as const;
export type DocumentKey = keyof typeof DOCUMENT_LABELS;

type Nudge = {
	id: string;
	screen: NudgeScreen;
	text: string;
	/** Fiches liées, la première est le lien principal. */
	fiches: readonly string[];
	/** Document prérempli proposé en premier lien, s'il est disponible. */
	document?: DocumentKey;
	when: (ctx: NudgeContext) => boolean;
};

const has = (ctx: NudgeContext, key: string) => ctx.milestones?.includes(key) ?? false;

/** Dans l'ordre de priorité de chaque écran. */
export const NUDGES: readonly Nudge[] = [
	{
		id: `${NUDGE_PREFIX}morceau-a-plusieurs`,
		screen: 'morceau',
		when: (c) => Boolean(c.composed) && (c.confirmedCredits ?? 0) >= 2,
		text: 'Vous l’avez écrit à plusieurs : notez qui a fait quoi et à quel pourcentage, avant que le morceau rapporte.',
		fiches: ['ecrire-a-plusieurs', 'proteger-un-morceau'],
		document: 'bulletin'
	},
	{
		id: `${NUDGE_PREFIX}morceau-proteger`,
		screen: 'morceau',
		when: (c) => Boolean(c.composed),
		text: 'Ton morceau est protégé dès sa création. Garde de quoi prouver sa date.',
		fiches: ['proteger-un-morceau']
	},
	{
		id: `${NUDGE_PREFIX}groupe-concert`,
		screen: 'groupe',
		when: (c) => has(c, 'FIRST_GIG'),
		text: 'Un concert ? Remettez la liste des morceaux joués à l’organisateur, et s’il vous paie, demandez comment il vous déclare.',
		fiches: ['premier-concert', 'etre-paye-pour-un-concert'],
		document: 'programme'
	},
	{
		id: `${NUDGE_PREFIX}groupe-mineurs`,
		screen: 'groupe',
		when: (c) => Boolean(c.hasMinor),
		text: 'Le groupe compte un·e mineur·e : avant un concert payé, voici ce qu’il faut savoir, avec ses parents.',
		fiches: ['mineurs-sur-scene']
	},
	{
		id: `${NUDGE_PREFIX}groupe-demo`,
		screen: 'groupe',
		when: (c) => has(c, 'FIRST_RECORDING') || has(c, 'FIRST_PUBLIC_DEMO'),
		text: 'Avant de publier vos morceaux, déclarez-les pour ne pas perdre de droits.',
		fiches: ['premiere-demo']
	},
	{
		id: `${NUDGE_PREFIX}groupe-association`,
		screen: 'groupe',
		when: (c) => has(c, 'FORMATION'),
		text: 'Le jour où le groupe encaisse de l’argent, une association simplifie tout. Faut-il en créer une ?',
		fiches: ['association-du-groupe']
	},
	{
		id: `${NUDGE_PREFIX}annonce-session`,
		screen: 'annonce',
		when: (c) => c.opportunityKind === 'SESSION_WORK',
		text: 'Une session payée ? Un·e musicien·ne payé·e pour jouer reçoit un cachet déclaré, pas une enveloppe.',
		fiches: ['etre-paye-pour-un-concert', 'jouer-gratuitement']
	}
];

const BY_ID = new Map(NUDGES.map((n) => [n.id, n]));

export function isNudgeId(value: unknown): value is string {
	return typeof value === 'string' && BY_ID.has(value);
}

export type ShownNudge = {
	id: string;
	text: string;
	links: { href: string; label: string }[];
};

/** La démarche à montrer sur un écran, ou `null`. */
export function nudgeFor(
	screen: NudgeScreen,
	ctx: NudgeContext,
	dismissed: readonly string[]
): ShownNudge | null {
	const hidden = new Set(dismissed);
	const nudge = NUDGES.find((n) => n.screen === screen && !hidden.has(n.id) && n.when(ctx));
	if (!nudge) return null;
	const documentHref = nudge.document ? ctx.documents?.[nudge.document] : undefined;
	return {
		id: nudge.id,
		text: nudge.text,
		links: [
			...(documentHref && nudge.document
				? [{ href: documentHref, label: DOCUMENT_LABELS[nudge.document] }]
				: []),
			...nudge.fiches.map((slug) => ({ href: ficheHref(slug), label: ficheBySlug(slug)!.title }))
		]
	};
}
