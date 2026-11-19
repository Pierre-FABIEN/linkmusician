/**
 * Prochaines actions (N3, conception 21 §8–§9, D73 NL4–NL5) : tri pur.
 *
 * Reçoit des **candidates** déjà autorisées par le serveur
 * (`#lib/server/career/next`), et rend une liste courte, stable :
 *
 * 1. écarte toute candidate sans déclencheur ni geste (titre, raison,
 *    destination interne) ;
 * 2. dédoublonne : une par clé (règle, objet), puis une par objet (la plus
 *    prioritaire), puis, aux rangs 3 à 5, `perRule` par règle ;
 * 3. trie : rang, échéance réelle la plus proche, attente la plus longue,
 *    clé (ordre lexical) ;
 * 4. tronque à `limit`, avec au plus `maxOptional` suggestion de rang 5.
 *
 * N4 : les choix du lecteur (« Plus tard », « Pas pour moi ») sont appliqués
 * juste après le premier filtre, jamais aux rangs 1 et 2 (`./choices`).
 *
 * Aucune entrée n'est une valeur de progression : le type `Candidate` n'a
 * pas de champ d'XP, de niveau ou de palier (NL5), et rien d'aléatoire.
 * Module pur, partagé par le serveur et le navigateur.
 */
import type { CareerBranch } from '../map';
import { fingerprint, hiddenBy, NO_CHOICES, type ChoiceState } from './choices';

export type SuggestionRank = 1 | 2 | 3 | 4 | 5;

/** Où la suggestion s'affiche (conception 21 §9.3). */
export type SuggestionScope = 'HOME' | 'DETAIL';

/**
 * Geste de masquage le plus fort permis (§8.6) ; aucun n'est enregistré
 * avant N4. `NOT_FOR_ME` permet aussi « Plus tard ».
 */
export type Dismissal = 'NONE' | 'LATER' | 'NOT_FOR_ME';

/** Objet concerné, déjà lisible par le lecteur (son identifiant suffit). */
export type SuggestionSubject =
	| { type: 'COLLABORATION'; id: string }
	| { type: 'WORK'; id: string }
	| { type: 'BAND'; id: string }
	| { type: 'REPRESENTATION'; id: string }
	| { type: 'PROJECT'; id: string }
	| { type: 'PROJECT_INVITE'; id: string }
	| { type: 'INBOX'; id: 'applications' | 'contact-requests' }
	| { type: 'OBJECTIVE'; id: string }
	| { type: 'TRIAL'; id: string };

/** Règles de N3 (conception 21 §8.4) ; le préfixe de chaque clé. */
export const SUGGESTION_RULES = [
	'collab.confirm',
	'collab.respond',
	'credit.confirm',
	'band.invitation',
	'project.invitation',
	'project.coordination',
	'project.need',
	'representation.respond',
	'applications.review',
	'contact.respond',
	'work.step',
	'crea.demo',
	'crea.compose',
	'prod.record',
	'prod.mix',
	'team.fill_role',
	'trial.within_reach',
	'objective'
] as const;
export type SuggestionRule = (typeof SUGGESTION_RULES)[number];

export type Candidate = {
	rule: SuggestionRule;
	rank: SuggestionRank;
	branch: CareerBranch;
	subject: SuggestionSubject;
	/** Une phrase, sans reproche (NL2). */
	title: string;
	/** Pourquoi maintenant, en une phrase : le fait déclencheur. */
	why: string;
	/** L'écran qui réalise le geste ; jamais une écriture directe. */
	href: string;
	cta: string;
	/** Échéance réelle stockée (date d'une session…), sinon `null`. */
	deadline: Date | null;
	/** Depuis quand l'autre attend (date de la demande), sinon `null`. */
	waitingSince: Date | null;
	/**
	 * Le fait déclencheur, sous forme stable (N4) : s'il change, un « Plus
	 * tard » cesse de s'appliquer. Jamais une phrase affichée ni une date de
	 * visite ; seule son empreinte (`version`) est enregistrée.
	 */
	fact: string;
};

export type Suggestion = Candidate & {
	/** Stable : `<règle>:<type>:<objet>`, ex. `prod.mix:WORK:w1`. */
	key: string;
	scope: SuggestionScope;
	dismissal: Dismissal;
	/** Empreinte de `fact` (N4). */
	version: string;
};

/** Limites d'affichage (§9.3). */
export const HOME_LIMIT = 3;
export const DETAIL_LIMIT = 5;

export type RankOptions = {
	scope?: SuggestionScope;
	/** Par défaut, 3 sur l'accueil et 5 dans une vue détaillée. */
	limit?: number;
	/** Suggestions facultatives (rang 5) au plus : une par écran. */
	maxOptional?: number;
	/** Suggestions d'une même règle au plus, aux rangs 3 à 5. */
	perRule?: number;
	/** « Plus tard » et « Pas pour moi » du lecteur (N4), appliqués avant la troncature. */
	choices?: ChoiceState;
	/** Heure du serveur, pour l'échéance des reports. */
	now?: Date;
};

export function suggestionKey(c: Pick<Candidate, 'rule' | 'subject'>): string {
	return `${c.rule}:${c.subject.type}:${c.subject.id}`;
}

const subjectKey = (s: SuggestionSubject) => `${s.type}:${s.id}`;

export function dismissalOf(rank: SuggestionRank): Dismissal {
	return rank <= 2 ? 'NONE' : rank === 3 ? 'LATER' : 'NOT_FOR_ME';
}

/** Destination interne à l'app : un chemin, jamais un autre site. */
export function isInternalHref(href: string): boolean {
	return href.startsWith('/') && !href.startsWith('//') && !href.includes('\\');
}

/** Une candidate a un déclencheur et un geste (NL2, NL4). */
export function isActionable(c: Candidate): boolean {
	return (
		c.title.trim() !== '' &&
		c.why.trim() !== '' &&
		c.cta.trim() !== '' &&
		c.subject.id !== '' &&
		isInternalHref(c.href)
	);
}

const time = (d: Date | null, missing: number) => (d ? d.getTime() : missing);

/** Rang, échéance la plus proche, attente la plus longue, clé. */
export function compareSuggestions(a: Suggestion, b: Suggestion): number {
	return (
		a.rank - b.rank ||
		time(a.deadline, Infinity) - time(b.deadline, Infinity) ||
		time(a.waitingSince, Infinity) - time(b.waitingSince, Infinity) ||
		(a.key < b.key ? -1 : a.key > b.key ? 1 : 0)
	);
}

/** Les prochaines actions, dans un ordre stable à faits égaux. */
export function rankSuggestions(
	candidates: readonly Candidate[],
	options: RankOptions = {}
): Suggestion[] {
	const scope = options.scope ?? 'HOME';
	const limit = options.limit ?? (scope === 'HOME' ? HOME_LIMIT : DETAIL_LIMIT);
	const maxOptional = options.maxOptional ?? 1;
	const perRule = options.perRule ?? 1;
	const choices = options.choices ?? NO_CHOICES;
	const now = options.now ?? new Date();

	// Choix du lecteur filtrés avant le dédoublonnage et la troncature : une
	// suggestion écartée laisse sa place à la suivante.
	const sorted = candidates
		.filter(isActionable)
		.map((c): Suggestion => ({
			...c,
			key: suggestionKey(c),
			scope,
			dismissal: dismissalOf(c.rank),
			version: fingerprint(c.fact)
		}))
		.filter((s) => !hiddenBy(s, choices, now))
		.sort(compareSuggestions);

	const keys = new Set<string>();
	const subjects = new Set<string>();
	const perRuleCount = new Map<SuggestionRule, number>();
	let optional = 0;
	const out: Suggestion[] = [];
	for (const s of sorted) {
		if (out.length >= limit) break;
		// Une par couple (règle, objet), puis une par objet : la plus prioritaire.
		if (keys.has(s.key) || subjects.has(subjectKey(s.subject))) continue;
		if (s.rank >= 3 && (perRuleCount.get(s.rule) ?? 0) >= perRule) continue;
		if (s.rank === 5 && optional >= maxOptional) continue;
		keys.add(s.key);
		subjects.add(subjectKey(s.subject));
		if (s.rank >= 3) perRuleCount.set(s.rule, (perRuleCount.get(s.rule) ?? 0) + 1);
		if (s.rank === 5) optional++;
		out.push(s);
	}
	return out;
}
