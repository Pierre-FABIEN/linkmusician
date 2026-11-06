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
