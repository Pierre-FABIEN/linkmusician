/**
 * Paliers nommés par piste (conception 02 §5) : des **conditions**, pas un
 * seuil d'XP. Les noms décrivent un parcours, jamais une compétence.
 */
import { MILESTONES, PROOF_STATUSES, type Milestone, type ProofStatus } from './events';

export type MusicianSummary = {
	profileComplete: boolean;
	reciprocalConversations: number;
	bands: number;
	collaborations: number;
	distinctCollaborators: number;
	corroboratedGigs: number;
	verifiedReleases: number;
	distinctEndorsers: number;
	/** Appréciations actives reçues après une jam (D27) : comptent pour « En réseau ». */
	jamAppreciations: number;
};

export const MUSICIAN_TIERS = [
	{ id: 'FIRST_STEPS', label: 'Premiers pas', reached: (s: MusicianSummary) => s.profileComplete },
	{
		id: 'NETWORKED',
		label: 'En réseau',
		reached: (s: MusicianSummary) =>
			s.reciprocalConversations >= 1 &&
			(s.bands >= 1 || s.collaborations >= 1 || s.jamAppreciations >= 1)
	},
	{
		id: 'COLLABORATOR',
		label: 'Collaborateur·rice',
		reached: (s: MusicianSummary) => s.collaborations >= 3 && s.distinctCollaborators >= 2
	},
	{
		id: 'STAGE',
		label: 'Musicien·ne de scène',
		reached: (s: MusicianSummary) => s.corroboratedGigs >= 3
	},
	{
		id: 'LOCAL_PILLAR',
		label: 'Pilier local',
		reached: (s: MusicianSummary) =>
			s.collaborations >= 10 && s.distinctCollaborators >= 5 && s.corroboratedGigs >= 10
	},
	{
		id: 'REFERENCE',
		label: 'Référence',
		reached: (s: MusicianSummary) => s.verifiedReleases >= 1 && s.distinctEndorsers >= 10
	}
] as const;

export type MusicianTierId = (typeof MUSICIAN_TIERS)[number]['id'];

/**
 * Palier affiché : le plus haut dont les conditions sont remplies (les
 * conditions ne sont pas imbriquées : un·e musicien·ne de scène peut ne pas
 * être collaborateur·rice). `null` avant « Premiers pas ».
 */
export function musicianTier(summary: MusicianSummary) {
	const reached = MUSICIAN_TIERS.filter((tier) => tier.reached(summary));
	const top = reached.at(-1);
	return { tier: top ? { id: top.id, label: top.label } : null, reached: reached.map((t) => t.id) };
}

/** Paliers de groupe, alignés sur les étapes (Projet → … → Signé). */
export const BAND_TIER_LABELS: Readonly<Record<Milestone, string>> = {
	FORMATION: 'Projet',
	FIRST_REHEARSAL: 'Répète',
	FIRST_COMPOSITION: 'Compose',
	FIRST_RECORDING: 'Enregistre',
	FIRST_PUBLIC_DEMO: 'Démo',
	FIRST_GIG: 'Live',
	FIRST_TOUR: 'Tournée',
	FIRST_EP: 'EP',
	FIRST_ALBUM: 'Album',
	SIGNING: 'Signé'
};

/** Statut retenu pour une étape : la formation est automatique, donc vérifiée. */
const counts = (status: ProofStatus | undefined, milestone: Milestone) =>
	status !== undefined &&
	(PROOF_STATUSES.indexOf(status) >= PROOF_STATUSES.indexOf('CORROBORATED') ||
		milestone === 'FORMATION');

/**
 * Palier de groupe : la dernière étape (dans l'ordre) franchie au niveau
 * corroboré ou au-delà. `null` si aucune.
 */
export function bandTier(milestones: Partial<Record<Milestone, ProofStatus>>) {
	const last = [...MILESTONES].reverse().find((m) => counts(milestones[m], m));
	return last ? { milestone: last, label: BAND_TIER_LABELS[last] } : null;
}

/**
 * Ingé son et producteur·rice (P4-01, conception 02 §5 et 08 §5, §7) : mêmes
 * rangs, comptés sur les prestations de la piste (sessions, mixages,
 * mastering, sonorisations pour l'ingé son ; productions, arrangements pour
 * le producteur ou la productrice). Un projet n'existe que confirmé par
 * l'artiste ; un crédit, que sur une sortie vérifiée.
 */
export type CraftSummary = {
	/** Travaux en écoute crédités sur le profil (avant / après, productions). */
	listeningWorks: number;
	/** Prestations confirmées par les artistes. */
	projects: number;
	/** Artistes distincts (personnes ou groupes) de ces prestations. */
	distinctArtists: number;
	/** Sorties vérifiées (ISRC, UPC) qui créditent la personne. */
	verifiedReleaseCredits: number;
};

export const CRAFT_TIERS = [
	{ id: 'HOME_STUDIO', label: 'Home studio', reached: (s: CraftSummary) => s.listeningWorks >= 1 },
	{
		id: 'FIRST_PROJECTS',
		label: 'Premiers projets',
		reached: (s: CraftSummary) => s.projects >= 1
	},
	{
		id: 'PORTFOLIO',
		label: 'Portfolio',
		reached: (s: CraftSummary) => s.projects >= 5 && s.distinctArtists >= 3
	},
	{
		id: 'ESTABLISHED',
		label: 'Établi·e',
		reached: (s: CraftSummary) => s.projects >= 15 && s.verifiedReleaseCredits >= 1
	},
	{
		id: 'REFERENCE',
		label: 'Référence',
		reached: (s: CraftSummary) => s.verifiedReleaseCredits >= 5 && s.distinctArtists >= 10
	}
] as const;

export type CraftTierId = (typeof CRAFT_TIERS)[number]['id'];

/** Rang affiché d'un·e ingé son ou d'un·e producteur·rice : le plus haut atteint. */
export function craftTier(summary: CraftSummary) {
	const reached = CRAFT_TIERS.filter((tier) => tier.reached(summary));
	const top = reached.at(-1);
	return { tier: top ? { id: top.id, label: top.label } : null, reached: reached.map((t) => t.id) };
}

/**
 * Studio (P4-01, conception 02 §5 et 08 §6) : le rang va à l'organisation,
 * les points aux personnes qui ont travaillé. Une session ne compte que
 * confirmée par le client.
 */
export type StudioSummary = {
	/** Fiche publiée (salles, matériel, tarifs). */
	published: boolean;
	sessions: number;
	distinctClients: number;
	/** Sorties vérifiées enregistrées sur place. */
	verifiedReleases: number;
};

export const STUDIO_TIERS = [
	{ id: 'OPEN', label: 'Ouvert', reached: (s: StudioSummary) => s.published },
	{ id: 'ACTIVE', label: 'Actif', reached: (s: StudioSummary) => s.sessions >= 5 },
	{
		id: 'RECOGNIZED',
		label: 'Reconnu',
		reached: (s: StudioSummary) => s.sessions >= 20 && s.distinctClients >= 10
	},
	{
		id: 'ESSENTIAL',
		label: 'Incontournable',
		reached: (s: StudioSummary) => s.verifiedReleases >= 5
	}
] as const;

export type StudioTierId = (typeof STUDIO_TIERS)[number]['id'];

export function studioTier(summary: StudioSummary) {
	const reached = STUDIO_TIERS.filter((tier) => tier.reached(summary));
	const top = reached.at(-1);
	return { tier: top ? { id: top.id, label: top.label } : null, reached: reached.map((t) => t.id) };
}

/** Rang le plus haut atteint d'une série (les conditions ne s'imbriquent pas). */
function topTier<S, T extends { id: string; label: string; reached: (s: S) => boolean }>(
	tiers: readonly T[],
	summary: S
) {
	const reached = tiers.filter((tier) => tier.reached(summary));
	const top = reached.at(-1);
	return {
		tier: top ? { id: top.id as T['id'], label: top.label } : null,
		reached: reached.map((t) => t.id as T['id'])
	};
}

/**
 * Organisateur·rice (P5-01, conception 02 §5 et 08 §8) : comptés sur les
 * événements tenus et confirmés par au moins un artiste de l'affiche.
 */
export type PromoterSummary = {
	/** Événements tenus et confirmés. */
	events: number;
	/** Artistes distincts (groupes ou personnes) programmés. */
	distinctArtists: number;
	/** Événements vérifiés (organisation vérifiée) d'au moins 10 artistes. */
	verifiedFestivals: number;
};

export const PROMOTER_TIERS = [
	{
		id: 'FIRST_EVENT',
		label: 'Premier événement',
		reached: (s: PromoterSummary) => s.events >= 1
	},
	{
		id: 'REGULAR',
		label: 'Programmation régulière',
		reached: (s: PromoterSummary) => s.events >= 5
	},
	{
		id: 'LOCAL_SCENE',
		label: 'Scène locale',
		reached: (s: PromoterSummary) => s.events >= 20 && s.distinctArtists >= 30
	},
	{
		id: 'FESTIVAL',
		label: 'Festival',
		reached: (s: PromoterSummary) => s.verifiedFestivals >= 1
	}
] as const;

export type PromoterTierId = (typeof PROMOTER_TIERS)[number]['id'];

export function promoterTier(summary: PromoterSummary) {
	return topTier(PROMOTER_TIERS, summary);
}

/**
 * Manager et booker (P5-01, conception 02 §5, 08 §9 et §10) : mêmes rangs,
 * comptés sur les accompagnements confirmés par les artistes. « Développé » :
 * l'artiste a franchi au moins deux rangs pendant l'accompagnement (le calcul
 * vient avec P5-07). Condition d'« Agence » : défaut Q25.
 */
export type AgentSummary = {
	/** Artistes dont l'accompagnement est confirmé. */
	artists: number;
	/** Artistes ayant franchi ≥2 rangs sous l'accompagnement. */
	developedArtists: number;
};

export const AGENT_TIERS = [
	{ id: 'FIRST_ARTIST', label: 'Premier artiste', reached: (s: AgentSummary) => s.artists >= 1 },
	{
		id: 'DEVELOPER',
		label: 'Développement d’artistes',
		reached: (s: AgentSummary) => s.developedArtists >= 1
	},
	{
		id: 'AGENCY',
		label: 'Agence',
		reached: (s: AgentSummary) => s.artists >= 5 && s.developedArtists >= 3
	}
] as const;

export type AgentTierId = (typeof AGENT_TIERS)[number]['id'];

export function agentTier(summary: AgentSummary) {
	return topTier(AGENT_TIERS, summary);
}

/**
 * Lieu (P5-01, conception 08 §14, D22) : le rang va à l'organisation, les
 * points aux personnes (Q24). Une date ne compte que tenue et confirmée par
 * qui y jouait ; une jam publique (P5-04), par ses participant·es.
 */
export type VenueSummary = {
	/** Fiche complète (jauge, scène, matériel, genres, conditions). */
	published: boolean;
	/** Jams publiques et concerts tenus et confirmés. */
	dates: number;
	/** Artistes distincts programmés en concert. */
	distinctArtists: number;
	/** Groupes passés ensuite au rang Tournée. */
	touringAlumni: number;
};

export const VENUE_TIERS = [
	{ id: 'VENUE_OPEN', label: 'Lieu ouvert', reached: (s: VenueSummary) => s.published },
	{ id: 'OPEN_STAGE', label: 'Scène ouverte', reached: (s: VenueSummary) => s.dates >= 3 },
	{
		id: 'LOCAL_VENUE',
		label: 'Lieu de la scène locale',
		reached: (s: VenueSummary) => s.dates >= 20 && s.distinctArtists >= 15
	},
	{
		id: 'CULT_VENUE',
		label: 'Lieu culte',
		reached: (s: VenueSummary) => s.dates >= 50 && s.touringAlumni >= 5
	}
] as const;

export type VenueTierId = (typeof VENUE_TIERS)[number]['id'];

export function venueTier(summary: VenueSummary) {
	return topTier(VENUE_TIERS, summary);
}
