// LINKMUSICIAN (P3-04, D41) : référentiel des étapes de groupe, chargé par
// `npm run seed:referentiels`. La clé (`id`) est celle du moteur et ne
// change jamais. Changer un libellé ou un mode : incrémenter `version`. Une
// étape retirée d'ici est désactivée en base, jamais supprimée. Libellés et
// règles : `src/lib/milestones/rules.ts` ; cohérence vérifiée par
// `src/lib/milestones/referential.test.ts`. Le barème d'XP vit dans le
// moteur (`src/lib/server/progression/core/bareme.ts`).

export const MILESTONES_VERSION = 1;

/** @type {[id: string, ordinal: number, label: string, mode: 'formation' | 'work' | 'declare' | 'later'][]} */
export const milestoneDefinitions = [
	['FORMATION', 1, 'Formation', 'formation'],
	['FIRST_REHEARSAL', 2, 'Première répétition', 'declare'],
	['FIRST_COMPOSITION', 3, 'Première composition', 'work'],
	['FIRST_RECORDING', 4, 'Premier enregistrement', 'declare'],
	['FIRST_PUBLIC_DEMO', 5, 'Première démo publique', 'declare'],
	['FIRST_GIG', 6, 'Premier concert', 'declare'],
	['FIRST_TOUR', 7, 'Première tournée', 'later'],
	['FIRST_EP', 8, 'Premier EP', 'later'],
	['FIRST_ALBUM', 9, 'Premier album', 'later'],
	['SIGNING', 10, 'Signature', 'later']
];
