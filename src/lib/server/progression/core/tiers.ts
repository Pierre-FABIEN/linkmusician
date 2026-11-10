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
