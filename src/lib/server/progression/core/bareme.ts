/**
 * Barème de la progression (conception 02 §2.2), **versionné** : une
 * modification ne réécrit jamais l'historique, elle s'applique aux
 * événements suivants (`version` est inscrit sur chaque transaction).
 *
 * Valeurs calibrées par les personas simulés (`personas.test.ts`, conception
 * 02 §2.3) : si une modification fait sortir un persona de sa cible, le test
 * échoue. Écarts avec la première version de la conception, motivés par ce
 * calibrage : voir `docs/conception/02-progression.md` §2.2.
 */
import type { CraftService } from './crafts';
import type { Milestone, ProofStatus } from './events';

type MilestoneValues = Readonly<Record<ProofStatus, number | null>>;

export const BAREME = {
	version: 1,

	// Personne, piste musicien
	profileCompleted: 150,
	firstDemo: 100,
	extraDemo: 30,
	extraDemoPerWeek: 3,
	reciprocalConversation: 30,
	reciprocalConversationPerDay: 5,
	membershipAccepted: 200,
	collaborationCompleted: 400,
	endorsementReceived: 40,
	/** Morceau composé à plusieurs, par contributeur confirmé (D35). */
	workComposed: 150,
	/** Part de l'XP d'une étape de groupe versée à chaque membre présent. */
	memberShare: 0.25,

	// Métiers du son (P4-01, conception 08 §5 et §7) : prestation confirmée
	// par l'artiste, sur la piste du métier, × les mêmes multiplicateurs
	// qu'une collaboration (rendement par artiste, confiance de l'artiste).
	services: {
		RECORDING: 300,
		MIXING: 300,
		MASTERING: 150,
		LIVE_SOUND: 150,
		PRODUCTION: 400,
		ARRANGEMENT: 200
	} satisfies Record<CraftService, number>,
	/** Crédit d'une personne du son sur une sortie vérifiée. */
	releaseCreditVerified: 300,

	// Métiers de la scène (P5-01, conception 08 §8 à §10) : concert tenu et
	// confirmé par qui y jouait, × rendement par artiste et confiance de qui
	// confirme. Les musicien·nes n'y gagnent rien de plus ; le lieu gagne un
	// rang, pas d'XP (Q24).
	/** Événement tenu, par personne qui organise (piste organisateur·rice). */
	gigHeld: 200,
	/** Par artiste programmé pour sa toute première date (organisateur·rice). */
	gigFirstDate: 100,
	/** Date bookée et jouée, par personne qui a booké (piste booker). */
	gigBooked: 150,
	/** Accompagnement confirmé par l'artiste (piste manager). */
	managementConfirmed: 200,

	// Anti-abus (§6)
	/** k-ième occurrence avec la même contrepartie : 1, 0,5, 0,25, puis 0. */
	diminishing: [1, 0.5, 0.25] as readonly number[],
	diminishingWindowDays: 365,
	/** Poids de la confiance de la contrepartie (TL0 → TL3). */
	trustWeight: [0.1, 0.5, 1, 1] as readonly [number, number, number, number],

	// Groupe : étapes et niveau de preuve (§2.2). `null` : statut impossible.
	milestones: {
		FORMATION: { DECLARED: null, CORROBORATED: null, VERIFIED: 100 },
		FIRST_REHEARSAL: { DECLARED: 30, CORROBORATED: 50, VERIFIED: 80 },
		FIRST_COMPOSITION: { DECLARED: 50, CORROBORATED: 150, VERIFIED: null },
		FIRST_RECORDING: { DECLARED: 50, CORROBORATED: 200, VERIFIED: 400 },
		FIRST_PUBLIC_DEMO: { DECLARED: 50, CORROBORATED: 300, VERIFIED: 500 },
		FIRST_GIG: { DECLARED: 50, CORROBORATED: 400, VERIFIED: 1000 },
		FIRST_TOUR: { DECLARED: null, CORROBORATED: 1000, VERIFIED: 1500 },
		FIRST_EP: { DECLARED: null, CORROBORATED: null, VERIFIED: 1500 },
		FIRST_ALBUM: { DECLARED: null, CORROBORATED: null, VERIFIED: 3000 },
		SIGNING: { DECLARED: 0, CORROBORATED: null, VERIFIED: 3000 }
	} satisfies Record<Milestone, MilestoneValues>
} as const;
