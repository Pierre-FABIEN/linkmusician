/**
 * Carte de carrière (P3-13, conception 07 §2 et §4.5, D53) : règle pure,
 * partagée par le serveur et le navigateur.
 *
 * Huit actes ; les actes I à V se jouent (I à III au MVP, IV depuis P4-10,
 * V depuis P5-08). Chaque acte se termine
 * par une **épreuve** prouvée par quelqu'un d'autre. La carte est calculée
 * depuis des **faits** (appréciations, collaborations, morceaux, étapes),
 * **jamais depuis l'XP**. Les actes suivants restent dans le brouillard, mais
 * on voit ce qu'ils contiennent. Un acte n'est pas un passage obligé : on
 * peut franchir l'acte II avant l'acte I ; l'acte en cours est le premier
 * qui reste à franchir.
 */
import { AMBITION_INFO, type AmbitionValue } from './ambition';

/** Faits prouvés de la personne (aucun nombre de points). */
export type CareerFacts = {
	/** Appréciations reçues après une jam (non reprises). */
	jamAppreciations: number;
	/** Collaborations confirmées des deux côtés. */
	collaborations: number;
	/** Morceaux composés à plusieurs (corroborés) où l'on est crédité·e. */
	worksTogether: number;
	/** Morceaux composés seul·e (déclarés) : ne franchissent pas l'acte II. */
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

export type ActStatus = 'passed' | 'current' | 'open' | 'fog';

export type Act = {
	number: number;
	roman: string;
	name: string;
	/** Ce qui s'y passe. */
	content: string;
	/** L'épreuve de fin d'acte. */
	trial: string;
	/**
	 * Épreuve de plus, affichée mais pas bloquante (acte V : la tournée).
	 * `done` : déjà prouvée.
	 */
	bonusTrial: { label: string; done: boolean } | null;
	/** Ce que franchir l'épreuve ouvre (D53 : affiché, sans verrou au MVP). */
	unlocks: { label: string; href: string | null }[];
	/** Jouable (actes I à V). */
	playable: boolean;
	status: ActStatus;
	/** Mis en avant par l'ambition. */
	highlighted: boolean;
	/** Où agir pour avancer. */
	cta: { label: string; href: string } | null;
};

type ActDef = Omit<Act, 'status' | 'highlighted' | 'bonusTrial'> & {
	passed?: (f: CareerFacts) => boolean;
	bonus?: { label: string; done: (f: CareerFacts) => boolean };
};

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

const ACTS: ActDef[] = [
	{
		number: 1,
		roman: 'I',
		name: 'La rencontre',
		content: 'Trouver avec qui jouer : jams, annonces, bœufs.',
		trial: 'Une jam où quelqu’un t’apprécie, ou une collaboration confirmée des deux côtés.',
		unlocks: [
			{ label: 'Apprécier tes partenaires de jam', href: '/jam/apprecier' },
			{ label: 'Garder le contact et écrire sans échanger ton numéro', href: '/messages/contacts' }
		],
		playable: true,
		cta: { label: 'Trouver une jam', href: '/jam/agenda' },
		passed: (f) => f.jamAppreciations >= 1 || f.collaborations >= 1
	},
	{
		number: 2,
		roman: 'II',
		name: 'La création',
		content: 'Composer, monter un groupe, répéter, faire une maquette.',
		trial: 'Un morceau composé à plusieurs, rôles confirmés par l’équipe, avec une maquette.',
		unlocks: [
			{ label: 'Ton morceau sur ton profil et la page du groupe', href: '/morceaux' },
			{ label: 'Recruter par rôle depuis la fiche du morceau', href: '/morceaux' }
		],
		playable: true,
		cta: { label: 'Noter une idée de morceau', href: '/morceaux/nouveau' },
		passed: (f) => f.worksTogether >= 1
	},
	{
		number: 3,
		roman: 'III',
		name: 'Le studio',
		content: 'Enregistrer, mixer, masteriser.',
		trial:
			'Un premier enregistrement du groupe confirmé par une personne extérieure qui y était, ou vérifié par l’ingé son ou le studio.',
		unlocks: [
			{
				label: 'Trouver un·e producteur·rice pour ton morceau',
				href: '/decouvrir?metier=producteur'
			},
			{ label: 'Proposer un morceau dans la vitrine des producteur·rices (bientôt)', href: null }
		],
		playable: true,
		cta: { label: 'Trouver un·e ingé son', href: '/decouvrir?metier=inge-son' },
		passed: (f) => f.recordings >= 1
	},
	{
		number: 4,
		roman: 'IV',
		name: 'La production',
		content: 'Arranger, produire, finaliser le son.',
		trial: 'Un morceau produit, la production confirmée par le ou la producteur·rice.',
		unlocks: [
			{ label: 'Le récap de campagne sur la fiche du morceau', href: '/espace/campagnes' },
			{ label: 'Candidater aux tremplins et appels à projets (bientôt)', href: null }
		],
		playable: true,
		cta: { label: 'Trouver un·e producteur·rice', href: '/decouvrir?metier=producteur' },
		passed: (f) => f.productions >= 1
	},
	{
		number: 5,
		roman: 'V',
		name: 'La scène',
		content: 'Tremplins, premières parties, dates locales, puis une tournée.',
		trial: 'Un concert de ton groupe vérifié par le lieu ou l’organisation qui l’accueille.',
		unlocks: [
			{ label: 'Ta carte souvenir du concert, à partager', href: '/espace/fiche' },
			{ label: 'Entrer dans le radar des pros (bientôt)', href: null }
		],
		playable: true,
		cta: { label: 'Candidater à un plateau', href: '/annonces?type=GIG_SLOT' },
		passed: (f) => f.verifiedGigs >= 1,
		bonus: {
			label: 'Une tournée : trois concerts vérifiés dans trois villes en un mois.',
			done: (f) => f.tours >= 1
		}
	},
	{
		number: 6,
		roman: 'VI',
		name: 'La sortie',
		content: 'Distribution, codes ISRC, promo, playlists, clip.',
		trial: 'Une sortie vérifiée.',
		unlocks: [{ label: 'Être proposé·e aux labels et éditeurs', href: null }],
		playable: false,
		cta: null
	},
	{
		number: 7,
		roman: 'VII',
		name: 'Le développement',
		content: 'Manager, booker, éditeur, label.',
		trial: 'Une signature validée par un label vérifié.',
		unlocks: [{ label: 'Le rang « Signé », parrainer d’autres artistes', href: null }],
		playable: false,
		cta: null
	},
	{
		number: 8,
		roman: 'VIII',
		name: 'La carrière',
		content: 'Albums, tournées, festivals, vivre de la musique.',
		trial: 'Le palier « Référence ».',
		unlocks: [],
		playable: false,
		cta: null
	}
];

/** Les huit actes, leur état et ce que l'ambition met en avant. */
export function careerMap(facts: CareerFacts, ambition: AmbitionValue | null = null) {
	const highlighted = new Set(ambition ? AMBITION_INFO[ambition].acts : []);
	const passed = new Set(ACTS.filter((a) => a.passed?.(facts)).map((a) => a.number));
	const current = ACTS.find((a) => a.playable && !passed.has(a.number))?.number ?? null;
	const acts: Act[] = ACTS.map(({ passed: _p, bonus, ...a }) => ({
		...a,
		bonusTrial: bonus ? { label: bonus.label, done: bonus.done(facts) } : null,
		roman: ROMAN[a.number - 1],
		status: passed.has(a.number)
			? 'passed'
			: a.number === current
				? 'current'
				: a.playable
					? 'open'
					: 'fog',
		highlighted: highlighted.has(a.number)
	}));
	return {
		acts,
		current,
		passed: [...passed].sort((x, y) => x - y),
		/** Morceaux composés seul·e : rappel qu'ils ne franchissent pas l'acte II. */
		soloOnly: facts.worksSolo > 0 && facts.worksTogether === 0
	};
}
export type CareerMap = ReturnType<typeof careerMap>;

/** Épreuves franchies pas encore fêtées (célébration une fois et une seule). */
export function actsToCelebrate(passed: readonly number[], celebrated: readonly number[]) {
	return passed.filter((n) => !celebrated.includes(n));
}

export function actTitle(number: number): string {
	const act = ACTS.find((a) => a.number === number);
	return act ? `Acte ${ROMAN[number - 1]} · ${act.name}` : `Acte ${number}`;
}
