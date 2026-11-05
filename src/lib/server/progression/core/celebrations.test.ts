import { describe, expect, it } from 'vitest';
import { buildCelebrations, MAX_GAIN_CARDS, type DerivedRow, type GainRow } from './celebrations';

const at = (min: number) => new Date(Date.UTC(2026, 10, 5, 10, min));
const gain = (id: string, amount: number, min = 0): GainRow => ({
	id,
	amount,
	reason: `raison ${id}`,
	createdAt: at(min)
});
const derived = (id: string, type: string, payload: unknown, min = 0): DerivedRow => ({
	id,
	type,
	payload,
	createdAt: at(min)
});

describe('célébrations (P2-11)', () => {
	it('rien de neuf : aucune carte, aucun repère', () => {
		expect(buildCelebrations([], [])).toEqual({ items: [], upTo: null });
	});

	it('un gain : sa carte avec sa raison', () => {
		const { items, upTo } = buildCelebrations([gain('g1', 100, 3)], []);
		expect(items).toEqual([{ id: 'g1', kind: 'gain', title: '+100 XP', detail: 'raison g1' }]);
		expect(upTo).toEqual(at(3));
	});

	it('les grands moments passent avant les gains', () => {
		const { items } = buildCelebrations(
			[gain('g1', 150, 1)],
			[
				derived('e1', 'progress.level_reached', { from: 1, to: 2 }, 2),
				derived('e2', 'progress.achievement_unlocked', { name: 'Premier son' }, 2)
			]
		);
		expect(items.map((i) => i.kind)).toEqual(['level', 'achievement', 'gain']);
		expect(items[0].title).toBe('Niveau 2 !');
		expect(items[1].title).toBe('Succès débloqué : Premier son');
	});

	it('confiance : on fête une montée, jamais une baisse', () => {
		const up = buildCelebrations([], [derived('t1', 'progress.trust_changed', { from: 0, to: 1 })]);
		expect(up.items[0]).toMatchObject({ kind: 'trust', title: 'Confiance : Membre' });
		const down = buildCelebrations(
			[],
			[derived('t2', 'progress.trust_changed', { from: 2, to: 1 })]
		);
		expect(down.items).toEqual([]);
		expect(down.upTo).not.toBeNull(); // vu quand même : on ne le resservira pas
	});

	it('une reprise d’XP (négative) n’est pas fêtée', () => {
		expect(buildCelebrations([gain('g1', -100)], []).items).toEqual([]);
	});

	it('au-delà de quelques gains, une seule carte qui fait le total', () => {
		const gains = Array.from({ length: MAX_GAIN_CARDS + 2 }, (_, k) => gain(`g${k}`, 30, k));
		const { items, upTo } = buildCelebrations(gains, []);
		expect(items).toEqual([
			{
				id: 'gains-g0',
				kind: 'gain',
				title: '+150 XP',
				detail: '5 gains depuis ta dernière visite'
			}
		]);
		expect(upTo).toEqual(at(MAX_GAIN_CARDS + 1));
	});

	it('événement inconnu ou mal formé : ignoré', () => {
		const { items } = buildCelebrations(
			[],
			[derived('x', 'progress.level_reached', { to: 'deux' }), derived('y', 'autre', {})]
		);
		expect(items).toEqual([]);
	});
});
