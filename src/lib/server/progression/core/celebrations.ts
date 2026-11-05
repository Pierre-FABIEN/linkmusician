/**
 * Célébrations (P2-11) : ce qu'on fête à la personne depuis sa dernière
 * visite. Fonction pure : le serveur lit le registre et les événements
 * dérivés, ce module choisit et formule. Rien n'est calculé côté client.
 *
 * Ton d'encouragement (conception 07 §7) : on fête les gains, les niveaux,
 * les succès et les montées de confiance ; jamais une baisse.
 */
import { TRUST_NAMES, isTrustLevel } from './trust';

export type CelebrationKind = 'gain' | 'level' | 'achievement' | 'trust';

export type Celebration = {
	id: string;
	kind: CelebrationKind;
	title: string;
	detail: string;
};

export type GainRow = { id: string; amount: number; reason: string; createdAt: Date };
export type DerivedRow = {
	id: string;
	type: string;
	payload: unknown;
	createdAt: Date;
};

/** Au-delà, les gains sont regroupés en une seule carte. */
export const MAX_GAIN_CARDS = 3;

const record = (value: unknown): Record<string, unknown> =>
	value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

function fromDerived(row: DerivedRow): Celebration | null {
	const p = record(row.payload);
	switch (row.type) {
		case 'progress.level_reached':
			return typeof p.to === 'number'
				? {
						id: row.id,
						kind: 'level',
						title: `Niveau ${p.to} !`,
						detail: 'Tu montes en niveau. Continue comme ça.'
					}
				: null;
		case 'progress.achievement_unlocked':
			return typeof p.name === 'string'
				? { id: row.id, kind: 'achievement', title: `Succès débloqué : ${p.name}`, detail: '' }
				: null;
		case 'progress.trust_changed':
			return isTrustLevel(p.to) && isTrustLevel(p.from) && p.to > p.from
				? {
						id: row.id,
						kind: 'trust',
						title: `Confiance : ${TRUST_NAMES[p.to]}`,
						detail: 'De nouvelles possibilités s’ouvrent à toi.'
					}
				: null;
		default:
			return null;
	}
}

/**
 * Cartes à montrer, les grands moments d'abord (niveau, succès, confiance),
 * puis les gains. `upTo` : date jusqu'à laquelle tout a été pris en compte,
 * renvoyée par le client quand il a affiché les cartes.
 */
export function buildCelebrations(gains: readonly GainRow[], derived: readonly DerivedRow[]) {
	const moments = derived.map(fromDerived).filter((c): c is Celebration => c !== null);
	const positive = gains.filter((g) => g.amount > 0);
	const gainCards: Celebration[] =
		positive.length <= MAX_GAIN_CARDS
			? positive.map((g) => ({
					id: g.id,
					kind: 'gain',
					title: `+${g.amount} XP`,
					detail: g.reason
				}))
			: [
					{
						id: `gains-${positive[0].id}`,
						kind: 'gain',
						title: `+${positive.reduce((sum, g) => sum + g.amount, 0)} XP`,
						detail: `${positive.length} gains depuis ta dernière visite`
					}
				];
	const dates = [...gains, ...derived].map((r) => r.createdAt.getTime());
	return {
		items: [...moments, ...gainCards],
		upTo: dates.length > 0 ? new Date(Math.max(...dates)) : null
	};
}
