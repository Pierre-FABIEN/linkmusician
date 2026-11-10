/**
 * Déclencheurs des démarches (P3-15a, conception 09 §3) : une fiche
 * s'annonce là où sa question se pose, **une seule à la fois** par écran,
 * avec la même mécanique que les conseils en contexte (P2-17) : « J'ai
 * compris » la masque pour de bon.
 *
 * Le masquage est retenu dans `persons.tipsDismissed`, préfixé par
 * `demarche:` (déjà couvert par l'export et l'anonymisation RGPD). Lire une
 * fiche ne rapporte rien (09 §1.6).
 *
 * Module pur, partagé par le serveur et le navigateur.
 */
import type { MilestoneKey } from '#lib/milestones/rules';
import { demarcheHref, fiche, type FicheSlug } from './catalog';

export type DemarcheScreen = 'morceau' | 'groupe' | 'annonce';

/** Faits sur l'écran qui choisissent la démarche (lus par le serveur). */
export type DemarcheContext =
	| {
			screen: 'morceau';
			/** Morceau déclaré composé (P3-11). */
			composed: boolean;
			/** Crédits confirmés (P3-11) : 2 ou plus = écrit à plusieurs. */
			confirmedCredits: number;
	  }
	| {
			screen: 'groupe';
			/** Groupe formé (2ᵉ adhésion, P3-01). */
			formed: boolean;
			/** Étapes franchies et non gelées (P3-04, P3-06). */
			milestones: readonly MilestoneKey[];
			/** Au moins un·e membre actif·ve mineur·e (D5), sans dire qui. */
			hasMinor: boolean;
	  }
	| {
			screen: 'annonce';
			kind: 'JAM' | 'RECRUIT_MEMBER' | 'SESSION_WORK';
	  };

export type DemarcheTrigger = {
	id: string;
	screen: DemarcheScreen;
	/** La phrase dans l'écran (09 §1.2 : une phrase et un lien). */
	text: string;
	/** La fiche principale, puis au plus une fiche voisine. */
	fiches: readonly [FicheSlug, ...FicheSlug[]];
	when: (ctx: DemarcheContext) => boolean;
};

const on =
	<S extends DemarcheScreen>(
		screen: S,
		test: (ctx: Extract<DemarcheContext, { screen: S }>) => boolean
	) =>
	(ctx: DemarcheContext) =>
		ctx.screen === screen && test(ctx as Extract<DemarcheContext, { screen: S }>);

/**
 * Catalogue, dans l'ordre de priorité de chaque écran : la sécurité des
 * mineur·es d'abord, puis l'étape la plus avancée.
 */
export const DEMARCHE_TRIGGERS: readonly DemarcheTrigger[] = [
	{
		id: 'morceau-a-plusieurs',
		screen: 'morceau',
		text: 'Vous l’avez écrit à plusieurs : notez qui a fait quoi, et à quelle part, avant que l’argent arrive.',
		fiches: ['ecrire-a-plusieurs', 'proteger-un-morceau'],
		when: on('morceau', (c) => c.composed && c.confirmedCredits >= 2)
	},
	{
		id: 'morceau-proteger',
		screen: 'morceau',
		text: 'Ce morceau est à toi dès qu’il existe. Garde une preuve de la date : c’est simple et ça peut servir.',
		fiches: ['proteger-un-morceau'],
		when: on('morceau', (c) => c.composed)
	},
	{
		id: 'groupe-mineurs',
		screen: 'groupe',
		text: 'Jouer sur scène avant 18 ans : ce qu’il faut savoir, pour les membres concernés et leurs parents.',
		fiches: ['mineurs-sur-scene'],
		when: on('groupe', (c) => c.hasMinor)
	},
	{
		id: 'groupe-premier-concert',
		screen: 'groupe',
		text: 'Premier concert : remettez la liste de vos morceaux au lieu, et si vous êtes payés, c’est un cachet.',
		fiches: ['premier-concert', 'etre-paye-pour-jouer'],
		when: on('groupe', (c) => c.milestones.includes('FIRST_GIG'))
	},
	{
		id: 'groupe-premiere-demo',
		screen: 'groupe',
		text: 'Avant de publier votre démo : déclarez vos morceaux, sinon une partie de vos droits se perd.',
		fiches: ['premiere-demo'],
		when: on('groupe', (c) => c.milestones.includes('FIRST_PUBLIC_DEMO'))
	},
	{
		id: 'groupe-association',
		screen: 'groupe',
		text: 'Le groupe est formé. Pour encaisser un cachet ou ouvrir un compte commun, faut-il une association ?',
		fiches: ['association-du-groupe'],
		when: on('groupe', (c) => c.formed)
	},
	{
		id: 'annonce-session',
		screen: 'annonce',
		text: 'Une session payée, c’est un cachet : voici comment être payé·e en règle.',
		fiches: ['etre-paye-pour-jouer'],
		when: on('annonce', (c) => c.kind === 'SESSION_WORK')
	}
];

export const DISMISS_PREFIX = 'demarche:';
export const dismissKey = (id: string) => `${DISMISS_PREFIX}${id}`;

const BY_ID: ReadonlyMap<string, DemarcheTrigger> = new Map(
	DEMARCHE_TRIGGERS.map((t) => [t.id, t])
);

export function isTriggerId(value: unknown): value is string {
	return typeof value === 'string' && BY_ID.has(value);
}

export type DemarcheNudge = {
	id: string;
	text: string;
	links: { href: string; label: string }[];
};

/** La démarche à annoncer sur l'écran, ou `null` (rien à dire, ou tout masqué). */
export function demarcheFor(
	ctx: DemarcheContext,
	dismissed: readonly string[]
): DemarcheNudge | null {
	const hidden = new Set(dismissed);
	const trigger = DEMARCHE_TRIGGERS.find(
		(t) => t.screen === ctx.screen && !hidden.has(dismissKey(t.id)) && t.when(ctx)
	);
	if (!trigger) return null;
	return {
		id: trigger.id,
		text: trigger.text,
		links: trigger.fiches.map((slug) => ({ href: demarcheHref(slug), label: fiche(slug)!.nav }))
	};
}
