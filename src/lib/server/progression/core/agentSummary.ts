/**
 * Résumé d'un·e manager ou d'un·e booker (P5-07, conception 02 §5, 08 §9 et
 * §10) : ce que ses accompagnements **confirmés** établissent, pour en
 * déduire son rang (`agentTier`). Fonction pure ; l'XP n'y entre jamais.
 *
 * - Artistes : distincts, dont un accompagnement a été confirmé (en cours ou
 *   terminé). Une proposition sans réponse ne compte pas.
 * - Développé : un **groupe** qui a franchi au moins deux rangs (`bandTier`)
 *   pendant l'accompagnement, de la confirmation à la fin (ou à
 *   aujourd'hui). Le rang à une date se lit dans les étapes prouvées
 *   (corroborées ou vérifiées) survenues avant elle. Une personne seule
 *   n'est pas comptée « développée » : son rang de musicien·ne ne se date
 *   pas (Q48).
 */
import { MILESTONES, type Milestone, type ProofStatus } from './events';
import { bandTier, type AgentSummary } from './tiers';

export const DEVELOPED_MIN_RANKS = 2;

export type AgentRepresentation = {
	artistId: string;
	confirmedAt: Date;
	endedAt: Date | null;
};

export type BandMilestoneFact = { milestone: Milestone; status: ProofStatus; occurredAt: Date };

/** Rang d'un groupe à une date : 0 sans étape, puis 1 (Projet) à 10 (Signé). */
export function bandRankAt(milestones: readonly BandMilestoneFact[], at: Date): number {
	const reached: Partial<Record<Milestone, ProofStatus>> = {};
	for (const m of milestones) if (m.occurredAt <= at) reached[m.milestone] = m.status;
	const tier = bandTier(reached);
	return tier ? MILESTONES.indexOf(tier.milestone) + 1 : 0;
}

export function agentSummary(
	representations: readonly AgentRepresentation[],
	bandMilestones: ReadonlyMap<string, readonly BandMilestoneFact[]>,
	now: Date
): AgentSummary {
	const artists = new Set<string>();
	const developed = new Set<string>();
	for (const r of representations) {
		artists.add(r.artistId);
		const milestones = bandMilestones.get(r.artistId);
		if (!milestones) continue;
		const gained = bandRankAt(milestones, r.endedAt ?? now) - bandRankAt(milestones, r.confirmedAt);
		if (gained >= DEVELOPED_MIN_RANKS) developed.add(r.artistId);
	}
	return { artists: artists.size, developedArtists: developed.size };
}
