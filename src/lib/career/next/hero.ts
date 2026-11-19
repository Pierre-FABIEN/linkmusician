/**
 * Héros de l'accueil Collab (U0, UX-1 acceptée : D74 ; conception 20 §5.2,
 * conception 21 §9.3). Règle pure : elle **choisit** parmi les prochaines
 * actions déjà triées par le moteur N3 (et filtrées par les choix N4), elle
 * ne recalcule aucune priorité.
 *
 * 1. La première action du moteur : ce qui bloque quelqu'un (rang 1), une
 *    demande (rang 2), mon travail en cours (rang 3), un besoin (rang 4),
 *    une suggestion (rang 5), dans l'ordre du moteur. Les candidatures et
 *    demandes de contact ne prennent pas le héros : elles ont leur tuile.
 * 2. Sinon, le projet principal et sa prochaine action réelle (U2) : déduit
 *    de ma dernière action (UX-3, défaut ; `mainProject`), jamais épinglé.
 * 3. Sinon, un compte neuf voit « Commence ici » (trois portes réelles) ;
 *    les autres, leur objectif de progression (`NextStep`).
 *
 * Jamais l'XP : le moteur ne la lit pas, ce choix non plus.
 */
import type { SuggestionRank } from './engine';
import { ruleOfKey } from './choices';

/** Le mot qui dit la nature d'une action ; la couleur ne fait qu'accompagner. */
export const RANK_KICKER: Readonly<Record<SuggestionRank, string>> = {
	1: 'Quelqu’un t’attend',
	2: 'Une demande pour toi',
	3: 'Ton travail en cours',
	4: 'Un besoin de ton morceau',
	5: 'Si tu veux'
};

/** Règles qui restent dans leurs tuiles (conception 20 §5.2). */
export const NOT_A_HERO = ['applications.review', 'contact.respond'] as const;

export type HeroChoice<T> =
	| { kind: 'action'; action: T; rest: T[] }
	| { kind: 'project'; rest: T[] }
	| { kind: 'start'; rest: T[] }
	| { kind: 'objective'; rest: T[] };

export function pickHero<T extends { key: string }>(
	next: readonly T[],
	context: { newAccount: boolean; hasObjective: boolean; hasProject?: boolean }
): HeroChoice<T> {
	const index = next.findIndex(
		(a) => !(NOT_A_HERO as readonly string[]).includes(ruleOfKey(a.key) ?? '')
	);
	if (index >= 0)
		return {
			kind: 'action',
			action: next[index],
			// Le héros n'est pas répété dans la liste en dessous.
			rest: next.filter((_, i) => i !== index)
		};
	if (context.hasProject) return { kind: 'project', rest: [...next] };
	if (context.newAccount || !context.hasObjective) return { kind: 'start', rest: [...next] };
	return { kind: 'objective', rest: [...next] };
}

/** Compte neuf : ni morceau, ni groupe, ni épreuve franchie (conception 20 §6.2). */
export function isNewAccount(facts: { works: number; bands: number; trialsPassed: number }) {
	return facts.works === 0 && facts.bands === 0 && facts.trialsPassed === 0;
}

/** « Commence ici » : trois portes réelles, au même rang ; aucune ne mène à un écran absent. */
export const START_DOORS = [
	{
		href: '/morceaux/nouveau',
		title: 'Noter une idée de morceau',
		text: 'Un titre suffit pour commencer ; la suite viendra.'
	},
	{
		href: '/decouvrir',
		title: 'Trouver avec qui travailler',
		text: 'Musicien·nes, ingés son, producteur·rices près de chez toi.'
	},
	{
		// Rencontre, pas Collab : un lien, sans prérequis (conception 20 §4.4).
		href: '/jam',
		title: 'Rencontrer des musicien·nes',
		text: 'Les jams près de chez toi, dans Rencontre.'
	}
] as const;
