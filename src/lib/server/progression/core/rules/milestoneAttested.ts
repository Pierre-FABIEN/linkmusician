/**
 * Étape de groupe attestée (§2.2, §4). Le passage d'un niveau de preuve à un
 * autre rapporte la **différence** d'XP, ce qui évite de compter deux fois.
 * Le groupe reçoit la différence sur sa piste, chaque membre présent en
 * reçoit une part sur sa piste musicien.
 */
import { BAREME } from '../bareme';
import type { EventOf } from '../events';
import { defineRule } from '../types';

const LABELS: Record<EventOf<'milestone.attested'>['milestone'], string> = {
	FORMATION: 'Formation du groupe',
	FIRST_REHEARSAL: 'Première répétition',
	FIRST_COMPOSITION: 'Première composition',
	FIRST_RECORDING: 'Premier enregistrement',
	FIRST_PUBLIC_DEMO: 'Première démo publique',
	FIRST_GIG: 'Premier concert',
	FIRST_TOUR: 'Première tournée',
	FIRST_EP: 'Premier EP',
	FIRST_ALBUM: 'Premier album',
	SIGNING: 'Signature'
};

const STATUS_LABELS = { DECLARED: 'déclaré', CORROBORATED: 'corroboré', VERIFIED: 'vérifié' };

/** XP supplémentaire due pour ce changement de statut (0 si rien n'est dû). */
export function milestoneDelta(event: EventOf<'milestone.attested'>): number {
	const values = BAREME.milestones[event.milestone];
	const target = values[event.to];
	if (target === null) return 0;
	const previous = event.from ? (values[event.from] ?? 0) : 0;
	return Math.max(0, target - previous);
}

function reasonOf(event: EventOf<'milestone.attested'>) {
	return `${LABELS[event.milestone]} (${STATUS_LABELS[event.to]})`;
}

export const milestoneBand = defineRule({
	id: 'milestone.band',
	version: BAREME.version,
	on: 'milestone.attested',
	apply(event) {
		const amount = milestoneDelta(event);
		if (amount <= 0) return [];
		return [
			{
				actorId: event.bandId,
				track: 'BAND',
				amount,
				multiplier: 1,
				ruleId: this.id,
				ruleVersion: this.version,
				reason: reasonOf(event)
			}
		];
	}
});

export const milestoneMember = defineRule({
	id: 'milestone.member',
	version: BAREME.version,
	on: 'milestone.attested',
	apply(event) {
		const amount = Math.round(milestoneDelta(event) * BAREME.memberShare);
		if (amount <= 0) return [];
		return [...new Set(event.memberIds)].map((memberId) => ({
			actorId: memberId,
			track: 'MUSICIAN' as const,
			amount,
			multiplier: BAREME.memberShare,
			ruleId: this.id,
			ruleVersion: this.version,
			reason: `${reasonOf(event)} avec ton groupe`
		}));
	}
});
