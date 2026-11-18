/**
 * « Plus tard » et « Pas pour moi » (N4, conception 21 §8.6, D73 Q-NL-4) :
 * règle pure, partagée par le serveur et le navigateur.
 *
 * - **Plus tard** : une suggestion des rangs 3 à 5 disparaît 30 jours, ou
 *   jusqu'à ce que son fait déclencheur change (son empreinte `version`
 *   diffère de celle enregistrée). Un simple passage sur la page n'est pas
 *   un fait.
 * - **Pas pour moi** : une règle ou une branche, aux rangs 4 et 5 seulement,
 *   jusqu'à réactivation. Les rangs 1 et 2 sont de vraies demandes : on y
 *   répond, on ne les masque jamais.
 *
 * Une préférence d'affichage, jamais un droit : rien n'est retiré, aucune
 * capacité ni réalisation ne change, aucune XP.
 */
import { BRANCHES, BRANCH_INFO, type CareerBranch } from '../map';
import type { SuggestionRule } from './engine';

/** Durée d'un report (Q-NL-4). */
export const LATER_DAYS = 30;
const DAY = 86_400_000;

export function laterUntil(now: Date): Date {
	return new Date(now.getTime() + LATER_DAYS * DAY);
}

/** Règles qu'on peut écarter : celles des rangs 4 et 5. */
export const NOT_FOR_ME_RULES = [
	'prod.mix',
	'prod.record',
	'team.fill_role',
	'trial.within_reach',
	'objective'
] as const satisfies readonly SuggestionRule[];
export type NotForMeRule = (typeof NOT_FOR_ME_RULES)[number];

/** Ce que la personne lit dans « Ce que Melokiva me propose » : jamais le titre d'un objet. */
export const RULE_LABELS: Readonly<Record<SuggestionRule, string>> = {
	'collab.confirm': 'Collaborations à confirmer',
	'collab.respond': 'Propositions de collaboration',
	'credit.confirm': 'Crédits à confirmer',
	'band.invitation': 'Invitations de groupe',
	'representation.respond': 'Propositions d’accompagnement',
	'applications.review': 'Candidatures reçues',
	'contact.respond': 'Demandes de contact',
	'work.step': 'Étapes que tu as prises en charge',
	'crea.demo': 'Maquette d’une idée de morceau',
	'crea.compose': 'Déclarer un morceau composé',
	'prod.record': 'Trouver qui enregistre un morceau',
	'prod.mix': 'Trouver qui mixe un morceau',
	'team.fill_role': 'Places libres sur mes morceaux',
	'trial.within_reach': 'Épreuves à portée de ma carte',
	objective: 'Objectifs'
};

export type ChoiceTarget =
	{ type: 'rule'; rule: NotForMeRule } | { type: 'branch'; branch: CareerBranch };

export function targetOf(t: ChoiceTarget): string {
	return t.type === 'rule' ? `rule:${t.rule}` : `branch:${t.branch}`;
}

/** Une cible « Pas pour moi » connue, sinon `null` (jamais une clé arbitraire). */
export function parseTarget(raw: string): ChoiceTarget | null {
	const [type, value, ...rest] = raw.split(':');
	if (rest.length > 0 || !value) return null;
	if (type === 'rule' && (NOT_FOR_ME_RULES as readonly string[]).includes(value))
		return { type: 'rule', rule: value as NotForMeRule };
	if (type === 'branch' && (BRANCHES as readonly string[]).includes(value))
		return { type: 'branch', branch: value as CareerBranch };
	return null;
}

export function targetLabel(t: ChoiceTarget): string {
	return t.type === 'rule'
		? RULE_LABELS[t.rule]
		: `Suggestions facultatives : ${BRANCH_INFO[t.branch].label}`;
}

/**
 * Forme d'une clé de suggestion (`règle:TYPE:objet`). La forme ne suffit
 * pas : le serveur n'accepte qu'une clé qu'il propose en ce moment au lecteur.
 */
export const SUGGESTION_KEY = /^[a-z]+(\.[a-z_]+)?:[A-Z]+:[A-Za-z0-9_.-]{1,64}$/;

/** La règle d'une clé de suggestion bien formée. */
export function ruleOfKey(key: string): SuggestionRule | null {
	if (!SUGGESTION_KEY.test(key)) return null;
	return key.split(':')[0] as SuggestionRule;
}

/**
 * Empreinte courte et stable d'un fait déclencheur (FNV-1a 32 bits) : on ne
 * stocke ni nom ni titre, seulement de quoi savoir si le fait a changé.
 */
export function fingerprint(fact: string): string {
	let h = 0x811c9dc5;
	for (let i = 0; i < fact.length; i++) {
		h ^= fact.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return (h >>> 0).toString(36);
}

/** Choix du lecteur, lus en une fois par le serveur. */
export type ChoiceState = {
	later: { target: string; version: string | null; until: Date | null }[];
	notForMe: string[];
};

export const NO_CHOICES: ChoiceState = { later: [], notForMe: [] };

/** Peut-on reporter / écarter cette suggestion ? (rangs, Q-NL-4) */
export const canPostpone = (s: { rank: number }) => s.rank >= 3;
export const canDecline = (s: { rank: number; rule: SuggestionRule }) =>
	s.rank >= 4 && (NOT_FOR_ME_RULES as readonly string[]).includes(s.rule);

/** Un report est actif tant qu'il n'est pas échu et que le fait n'a pas changé. */
export function laterActive(
	c: Pick<ChoiceState['later'][number], 'version' | 'until'>,
	version: string,
	now: Date
): boolean {
	return c.until !== null && c.until.getTime() > now.getTime() && c.version === version;
}

/** Masquée par un choix du lecteur ? Jamais aux rangs 1 et 2. */
export function hiddenBy(
	s: { key: string; rank: number; rule: SuggestionRule; branch: CareerBranch; version: string },
	choices: ChoiceState,
	now: Date
): boolean {
	if (canDecline(s)) {
		const declined = new Set(choices.notForMe);
		if (declined.has(`rule:${s.rule}`)) return true;
		// Un objectif n'appartient à aucune branche : seul « Objectifs » l'écarte.
		if (s.rule !== 'objective' && declined.has(`branch:${s.branch}`)) return true;
	}
	if (canPostpone(s)) {
		const later = choices.later.find((c) => c.target === s.key);
		if (later && laterActive(later, s.version, now)) return true;
	}
	return false;
}
