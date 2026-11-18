/**
 * Carte de carrière (P3-13, conception 07 §2 et §4.5, D53 ; carte parallèle
 * N2, conception 21 §10, D73 Q-NL-1) : règle pure, partagée par le serveur et
 * le navigateur.
 *
 * Huit **épreuves**, rangées en **branches** indépendantes (Équipe,
 * Création, Production, Scène, Diffusion, Accompagnement). Cinq se jouent
 * aujourd'hui (Rencontre, Création, Studio, Production, Scène), trois sont
 * « bientôt sur Melokiva ». Chaque épreuve est prouvée par quelqu'un d'autre
 * et calculée depuis des **faits**, **jamais depuis l'XP**. Aucune épreuve
 * n'en attend une autre : il n'y a plus d'« acte en cours » (N2).
 *
 * Quatre états de présentation, distincts du niveau de preuve des faits :
 *
 * - `passed` (« Franchie ») : les faits admissibles la prouvent ;
 * - `within_reach` (« À portée ») : un **fait déclencheur** existe et un geste
 *   réel peut la faire reconnaître (un concert passé à confirmer, un rôle qui
 *   attend sa confirmation…) ;
 * - `open` (« Ouverte ») : jouable, sans déclencheur pour l'instant ;
 * - `soon` (« Bientôt ») : la fonction n'est pas encore livrée.
 *
 * Au plus **trois** épreuves à portée, triées par l'ambition, puis par
 * branche, puis par leur numéro interne : à faits égaux, même ordre. Le
 * numéro (1 à 8) reste un identifiant interne (`Person.actsCelebrated`,
 * célébrations, carte souvenir) ; il n'est plus affiché.
 */
import { AMBITION_INFO, type AmbitionValue } from './ambition';
import { countable, dedupeRealisations, type Realisation } from './realisations';

/** Faits prouvés de la personne (aucun nombre de points). */
export type CareerFacts = {
	/** Appréciations reçues après une jam (non reprises). */
	jamAppreciations: number;
	/** Collaborations confirmées des deux côtés. */
	collaborations: number;
	/** Morceaux composés à plusieurs (corroborés) où l'on est crédité·e. */
	worksTogether: number;
	/** Morceaux composés seul·e (déclarés) : ne franchissent pas « La création ». */
	worksSolo: number;
	/** Premiers enregistrements corroborés d'un groupe dont on était membre. */
	recordings: number;
	/**
	 * Morceaux produits (collaboration de production confirmée par le ou la
	 * producteur·rice, P4-06) où l'on joue ou écrit : confirmé·e au crédit,
	 * ou membre du groupe qui le porte (P4-10).
	 */
	productions: number;
	/**
	 * Groupes dont on était membre à la date de leur « Premier concert »
	 * **vérifié** par un hôte vérifié (P5-06, P5-08).
	 */
	verifiedGigs: number;
	/** Groupes dont on était membre à la date de leur « Première tournée » vérifiée. */
	tours: number;
};

/**
 * Faits **déclencheurs** (N2) : ce qui existe déjà et qu'un geste réel peut
 * faire reconnaître. Lus par le serveur (`#lib/server/career/map`) ; aucun
 * n'est une valeur de progression, et aucun ne vient de l'XP.
 */
export type ReachFacts = {
	/**
	 * Collaborations passées, acceptées, qui n'attendent plus que **ma**
	 * confirmation (`nextStep` = `confirm`), la plus ancienne d'abord.
	 */
	toConfirm: {
		kind: string;
		title: string;
		/** Jour `AAAA-MM-JJ`. */
		happenedOn: string;
		/** Je fournis la prestation (son, production) : ce n'est pas « mon » morceau produit. */
		asProvider: boolean;
		/** Concert : je suis membre actif du groupe qui a joué. */
		bandSide: boolean;
		/** Concert : nom de l'hôte s'il est vérifié (sinon le concert ne sera pas vérifié). */
		verifiedHostName: string | null;
		/** Production : rattachée à un morceau. */
		hasWork: boolean;
	}[];
	/**
	 * Morceaux composés, déclarés, où je suis confirmé·e et où un autre rôle
	 * attend sa confirmation (à deux crédits confirmés, ils sont corroborés).
	 */
	pendingCoauthors: { workId: string; title: string }[];
	/** « Premier enregistrement » déclaré, non gelé, d'un groupe dont je suis membre actif. */
	declaredRecordings: { bandHandle: string; bandName: string; manager: boolean }[];
	/** Un « Premier concert » d'un de mes groupes est corroboré, actif, mais pas vérifié. */
	corroboratedGig: boolean;
};

export const NO_REACH: ReachFacts = {
	toConfirm: [],
	pendingCoauthors: [],
	declaredRecordings: [],
	corroboratedGig: false
};

/** Familles d'affichage (conception 21 §4.2), pas des objets en base. */
export const BRANCHES = [
	'EQUIPE',
	'CREATION',
	'PRODUCTION',
	'SCENE',
	'DIFFUSION',
	'ACCOMPAGNEMENT'
] as const;
export type CareerBranch = (typeof BRANCHES)[number];

export const BRANCH_INFO: Readonly<
	Record<CareerBranch, { label: string; slug: string; pitch: string }>
> = {
	EQUIPE: {
		label: 'Équipe',
		slug: 'equipe',
		pitch: 'Rencontrer, jouer avec d’autres, monter un groupe.'
	},
	CREATION: {
		label: 'Création',
		slug: 'creation',
		pitch: 'Noter une idée, composer, créditer chacun.'
	},
	PRODUCTION: {
		label: 'Production',
		slug: 'production',
		pitch: 'Enregistrer, mixer, produire un morceau.'
	},
	SCENE: { label: 'Scène', slug: 'scene', pitch: 'Répéter, jouer en concert, partir en tournée.' },
	DIFFUSION: { label: 'Diffusion', slug: 'diffusion', pitch: 'Sorties, EP et album.' },
	ACCOMPAGNEMENT: {
		label: 'Accompagnement',
		slug: 'accompagnement',
		pitch: 'Management, booking, label.'
	}
};

export function branchFromSlug(slug: string): CareerBranch | null {
	return BRANCHES.find((b) => BRANCH_INFO[b].slug === slug) ?? null;
}

export type TrialState = 'passed' | 'within_reach' | 'open' | 'soon';

/** Libellés d'état : le mot porte l'information, la couleur ne fait qu'accompagner. */
export const TRIAL_STATE_LABEL: Readonly<Record<TrialState, string>> = {
	passed: 'Franchie',
	within_reach: 'À portée',
	open: 'Ouverte',
	soon: 'Bientôt'
};

/** Pourquoi une épreuve est à portée, et le geste unique qui la fait avancer. */
export type Reach = { reason: string; action: { label: string; href: string } };

export type Act = {
	/** Identifiant interne (célébrations, carte souvenir) ; jamais affiché comme un rang. */
	number: number;
	name: string;
	branch: CareerBranch;
	/** Ce qui s'y passe. */
	content: string;
	/** L'épreuve. */
	trial: string;
	/**
	 * Épreuve de plus, affichée mais pas bloquante (Scène : la tournée).
	 * `done` : déjà prouvée.
	 */
	bonusTrial: { label: string; done: boolean } | null;
	/** Ce que franchir l'épreuve ouvre (D53 : affiché, sans verrou). `href` nul : bientôt. */
	unlocks: { label: string; href: string | null }[];
	/** Jouable aujourd'hui (sinon « bientôt »). */
	playable: boolean;
	state: TrialState;
	/** Mise en avant par l'ambition (présentation seulement). */
	highlighted: boolean;
	/** Où agir, sans déclencheur : une porte d'entrée de la branche. */
	cta: { label: string; href: string } | null;
	/** Seulement si `state` vaut `within_reach`. */
	reach: Reach | null;
};

type ActDef = Omit<Act, 'state' | 'highlighted' | 'bonusTrial' | 'reach'> & {
	passed?: (f: CareerFacts) => boolean;
	bonus?: { label: string; done: (f: CareerFacts) => boolean };
	reach?: (r: ReachFacts) => Reach | null;
};

/** `AAAA-MM-JJ` → `JJ/MM/AAAA`. */
function day(iso: string) {
	const [y, m, d] = iso.split('-');
	return `${d}/${m}/${y}`;
}

const TO_CONFIRM = '/espace/a-confirmer';

const ACTS: ActDef[] = [
	{
		number: 1,
		name: 'La rencontre',
		branch: 'EQUIPE',
		content: 'Trouver avec qui jouer : jams, annonces, bœufs.',
		trial: 'Une jam où quelqu’un t’apprécie, ou une collaboration confirmée des deux côtés.',
		unlocks: [
			{ label: 'Apprécier tes partenaires de jam', href: '/jam/apprecier' },
			{ label: 'Garder le contact et écrire sans échanger ton numéro', href: '/messages/contacts' }
		],
		playable: true,
		// Q-NL-3 : les jams se trouvent dans Rencontre (mode Jam), pas dans Collab.
		cta: { label: 'Trouver une jam dans Rencontre', href: '/jam' },
		passed: (f) => f.jamAppreciations >= 1 || f.collaborations >= 1,
		reach: (r) => {
			const c = r.toConfirm[0];
			return c
				? {
						reason: `« ${c.title} » (${day(c.happenedOn)}) n’attend plus que ta confirmation.`,
						action: { label: 'Confirmer la collaboration', href: TO_CONFIRM }
					}
				: null;
		}
	},
	{
		number: 2,
		name: 'La création',
		branch: 'CREATION',
		content: 'Composer, monter un groupe, répéter, faire une maquette.',
		trial: 'Un morceau composé à plusieurs, rôles confirmés par l’équipe, avec une maquette.',
		unlocks: [
			{ label: 'Ton morceau sur ton profil et la page du groupe', href: '/morceaux' },
			{ label: 'Recruter par rôle depuis la fiche du morceau', href: '/morceaux' }
		],
		playable: true,
		cta: { label: 'Noter une idée de morceau', href: '/morceaux/nouveau' },
		passed: (f) => f.worksTogether >= 1,
		reach: (r) => {
			const w = r.pendingCoauthors[0];
			return w
				? {
						reason: `Un rôle attend sa confirmation sur « ${w.title} » : une fois confirmé, le morceau compte comme composé à plusieurs.`,
						action: { label: 'Voir le morceau', href: `/morceaux/${w.workId}` }
					}
				: null;
		}
	},
	{
		number: 3,
		name: 'Le studio',
		branch: 'PRODUCTION',
		content: 'Enregistrer, mixer, masteriser.',
		trial:
			'Un premier enregistrement du groupe confirmé par une personne extérieure qui y était, ou vérifié par l’ingé son ou le studio.',
		unlocks: [
			{
				label: 'Trouver un·e producteur·rice pour ton morceau',
				href: '/decouvrir?metier=producteur'
			},
			{ label: 'Proposer un morceau dans la vitrine des producteur·rices', href: null }
		],
		playable: true,
		cta: { label: 'Trouver un·e ingé son', href: '/decouvrir?metier=inge-son' },
		passed: (f) => f.recordings >= 1,
		reach: (r) => {
			const m = r.declaredRecordings[0];
			if (!m) return null;
			const href = `/groupes/${m.bandHandle}#milestones-title`;
			return m.manager
				? {
						reason: `Le premier enregistrement de ${m.bandName} est déclaré : une personne extérieure qui y était peut le confirmer.`,
						action: { label: 'Demander une confirmation', href }
					}
				: {
						reason: `Le premier enregistrement de ${m.bandName} est déclaré : la gestion du groupe peut demander sa confirmation à une personne extérieure qui y était.`,
						action: { label: 'Voir le parcours du groupe', href }
					};
		}
	},
	{
		number: 4,
		name: 'La production',
		branch: 'PRODUCTION',
		content: 'Arranger, produire, finaliser le son.',
		trial: 'Un morceau produit, la production confirmée par le ou la producteur·rice.',
		unlocks: [
			{ label: 'Le récap de campagne sur la fiche du morceau', href: '/espace/campagnes' },
			{ label: 'Candidater aux tremplins et appels à projets', href: null }
		],
		playable: true,
		cta: { label: 'Trouver un·e producteur·rice', href: '/decouvrir?metier=producteur' },
		passed: (f) => f.productions >= 1,
		reach: (r) => {
			const c = r.toConfirm.find((x) => x.kind === 'PRODUCTION' && x.hasWork && !x.asProvider);
			return c
				? {
						reason: `La production « ${c.title} » (${day(c.happenedOn)}) n’attend plus que ta confirmation.`,
						action: { label: 'Confirmer la production', href: TO_CONFIRM }
					}
				: null;
		}
	},
	{
		number: 5,
		name: 'La scène',
		branch: 'SCENE',
		content: 'Tremplins, premières parties, dates locales, puis une tournée.',
		trial: 'Un concert de ton groupe vérifié par le lieu ou l’organisation qui l’accueille.',
		unlocks: [
			{ label: 'Ta carte souvenir du concert, à partager', href: '/espace/fiche' },
			{ label: 'Entrer dans le radar des pros', href: null }
		],
		playable: true,
		cta: { label: 'Voir les plateaux ouverts', href: '/annonces?type=GIG_SLOT' },
		passed: (f) => f.verifiedGigs >= 1,
		bonus: {
			label: 'Une tournée : trois concerts vérifiés dans trois villes en un mois.',
			done: (f) => f.tours >= 1
		},
		reach: (r) => {
			const gig = r.toConfirm.find((x) => x.kind === 'GIG' && x.bandSide && x.verifiedHostName);
			if (gig)
				return {
					reason: `Le concert du ${day(gig.happenedOn)} peut être vérifié par ${gig.verifiedHostName}.`,
					action: { label: 'Confirmer le concert', href: TO_CONFIRM }
				};
			return r.corroboratedGig
				? {
						reason:
							'Ton groupe a déjà un concert confirmé. Un concert accueilli par un lieu ou une organisation vérifiée franchit l’épreuve.',
						action: { label: 'Voir les plateaux ouverts', href: '/annonces?type=GIG_SLOT' }
					}
				: null;
		}
	},
	{
		number: 6,
		name: 'La sortie',
		branch: 'DIFFUSION',
		content: 'Distribution, codes ISRC, promo, playlists, clip.',
		trial: 'Une sortie vérifiée.',
		unlocks: [{ label: 'Être proposé·e aux labels et éditeurs', href: null }],
		playable: false,
		cta: null
	},
	{
		number: 7,
		name: 'Le développement',
		branch: 'ACCOMPAGNEMENT',
		content: 'Manager, booker, éditeur, label.',
		trial: 'Une signature validée par un label vérifié.',
		unlocks: [{ label: 'Le rang « Signé », parrainer d’autres artistes', href: null }],
		playable: false,
		cta: null
	},
	{
		number: 8,
		name: 'La carrière',
		branch: 'ACCOMPAGNEMENT',
		content: 'Albums, tournées, festivals, vivre de la musique.',
		trial: 'Le palier « Référence ».',
		unlocks: [],
		playable: false,
		cta: null
	}
];

/** Au plus trois épreuves à portée sur la carte (conception 21 §9.3). */
export const MAX_WITHIN_REACH = 3;

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/**
 * Faits comptés d'une branche, pour sa tuile : jamais un pourcentage ni de
 * l'XP, et rien quand il n'y a rien (NL2 : l'absence n'est pas un manque).
 */
export function branchFigures(branch: CareerBranch, f: CareerFacts): string[] {
	const out: string[] = [];
	const add = (n: number, one: string, many: string) => {
		if (n > 0) out.push(plural(n, one, many));
	};
	switch (branch) {
		case 'EQUIPE':
			add(f.collaborations, 'collaboration confirmée', 'collaborations confirmées');
			add(f.jamAppreciations, 'appréciation reçue en jam', 'appréciations reçues en jam');
			break;
		case 'CREATION': {
			const composed = f.worksTogether + f.worksSolo;
			add(composed, 'morceau composé', 'morceaux composés');
			if (f.worksTogether > 0 && f.worksSolo > 0) out.push(`dont ${f.worksTogether} à plusieurs`);
			break;
		}
		case 'PRODUCTION':
			add(f.productions, 'morceau produit', 'morceaux produits');
			add(f.recordings, 'premier enregistrement de groupe', 'premiers enregistrements de groupe');
			break;
		case 'SCENE':
			add(f.verifiedGigs, 'premier concert vérifié', 'premiers concerts vérifiés');
			add(f.tours, 'tournée', 'tournées');
			break;
	}
	return out;
}

/** Tuile d'une branche de la mosaïque. */
export type BranchTile = {
	branch: CareerBranch;
	label: string;
	slug: string;
	pitch: string;
	figures: string[];
	trials: { number: number; name: string; state: TrialState }[];
	passedCount: number;
	withinReach: boolean;
	/** Aucune épreuve jouable aujourd'hui dans la branche. */
	soon: boolean;
};

/**
 * Les huit épreuves, leur état, les épreuves à portée et les tuiles de
 * branche. `ambition` et l'ordre des branches ne changent **que l'ordre** des
 * épreuves à portée, jamais un état.
 */
export function careerMap(
	facts: CareerFacts,
	ambition: AmbitionValue | null = null,
	reachFacts: ReachFacts = NO_REACH
) {
	const highlighted = new Set(ambition ? AMBITION_INFO[ambition].acts : []);
	const acts: Act[] = ACTS.map(({ passed, bonus, reach, ...a }) => {
		const isPassed = passed?.(facts) ?? false;
		const r = !isPassed && a.playable ? (reach?.(reachFacts) ?? null) : null;
		const state: TrialState = isPassed
			? 'passed'
			: !a.playable
				? 'soon'
				: r
					? 'within_reach'
					: 'open';
		return {
			...a,
			bonusTrial: bonus ? { label: bonus.label, done: bonus.done(facts) } : null,
			state,
			highlighted: highlighted.has(a.number),
			reach: r
		};
	});
	const branchRank = (b: CareerBranch) => BRANCHES.indexOf(b);
	const withinReach = acts
		.filter((a) => a.state === 'within_reach')
		.sort(
			(x, y) =>
				Number(y.highlighted) - Number(x.highlighted) ||
				branchRank(x.branch) - branchRank(y.branch) ||
				x.number - y.number
		)
		.slice(0, MAX_WITHIN_REACH);
	const branches: BranchTile[] = BRANCHES.map((branch) => {
		const own = acts.filter((a) => a.branch === branch);
		return {
			branch,
			...BRANCH_INFO[branch],
			figures: branchFigures(branch, facts),
			trials: own.map((a) => ({ number: a.number, name: a.name, state: a.state })),
			passedCount: own.filter((a) => a.state === 'passed').length,
			withinReach: own.some((a) => a.state === 'within_reach'),
			soon: own.every((a) => !a.playable)
		};
	});
	return {
		acts,
		passed: acts.filter((a) => a.state === 'passed').map((a) => a.number),
		withinReach,
		branches,
		/** Morceaux composés seul·e, aucun à plusieurs : rappel de la règle de « La création ». */
		soloOnly: facts.worksSolo > 0 && facts.worksTogether === 0
	};
}
export type CareerMap = ReturnType<typeof careerMap>;

/** Épreuves franchies pas encore fêtées (célébration une fois et une seule). */
export function actsToCelebrate(passed: readonly number[], celebrated: readonly number[]) {
	return passed.filter((n) => !celebrated.includes(n));
}

/** Nom affiché d'une épreuve (« La création ») : sans numéro ni rang (N2). */
export function actTitle(number: number): string {
	return ACTS.find((a) => a.number === number)?.name ?? 'Épreuve';
}

/**
 * Un « Premier concert » corroboré (pas vérifié), actif, où l'on est
 * crédité·e : un concert a été joué et confirmé, la vérification par un hôte
 * vérifié reste possible (déclencheur de « La scène »).
 */
export function corroboratedGigOf(list: readonly Realisation[]) {
	return dedupeRealisations(list).some(
		(r) =>
			r.object.type === 'MILESTONE' &&
			r.object.definitionId === 'FIRST_GIG' &&
			countable(r) &&
			r.proof === 'CORROBORATED'
	);
}
