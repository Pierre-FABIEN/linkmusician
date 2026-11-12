import { describe, expect, it } from 'vitest';
import { agentSummary, bandRankAt, type BandMilestoneFact } from './agentSummary';
import { agentTier } from './tiers';

const d = (day: string) => new Date(`${day}T12:00:00Z`);
const NOW = d('2026-11-12');

const growing: BandMilestoneFact[] = [
	{ milestone: 'FORMATION', status: 'VERIFIED', occurredAt: d('2025-01-01') },
	{ milestone: 'FIRST_REHEARSAL', status: 'CORROBORATED', occurredAt: d('2025-02-01') },
	{ milestone: 'FIRST_RECORDING', status: 'CORROBORATED', occurredAt: d('2026-05-01') },
	{ milestone: 'FIRST_GIG', status: 'VERIFIED', occurredAt: d('2026-09-01') }
];

describe('bandRankAt', () => {
	it('lit le rang dans les étapes survenues avant la date', () => {
		expect(bandRankAt(growing, d('2024-12-01'))).toBe(0);
		expect(bandRankAt(growing, d('2025-03-01'))).toBe(2); // Répète
		expect(bandRankAt(growing, NOW)).toBe(6); // Live
	});

	it('une étape seulement déclarée ne compte pas', () => {
		const declared: BandMilestoneFact[] = [
			{ milestone: 'FORMATION', status: 'VERIFIED', occurredAt: d('2025-01-01') },
			{ milestone: 'FIRST_GIG', status: 'DECLARED', occurredAt: d('2025-06-01') }
		];
		expect(bandRankAt(declared, NOW)).toBe(1);
	});
});

describe('agentSummary', () => {
	it('compte les artistes confirmés, une fois chacun', () => {
		const s = agentSummary(
			[
				{ artistId: 'a', confirmedAt: d('2026-01-01'), endedAt: d('2026-02-01') },
				{ artistId: 'a', confirmedAt: d('2026-03-01'), endedAt: null },
				{ artistId: 'solo', confirmedAt: d('2026-03-01'), endedAt: null }
			],
			new Map(),
			NOW
		);
		expect(s).toEqual({ artists: 2, developedArtists: 0 });
		expect(agentTier(s).tier?.id).toBe('FIRST_ARTIST');
	});

	it('un groupe qui passe deux rangs pendant l’accompagnement est développé', () => {
		const s = agentSummary(
			[{ artistId: 'band', confirmedAt: d('2026-03-01'), endedAt: null }],
			new Map([['band', growing]]),
			NOW
		);
		expect(s.developedArtists).toBe(1);
		expect(agentTier(s).tier?.id).toBe('DEVELOPER');
	});

	it('les rangs franchis après la fin de l’accompagnement ne comptent pas', () => {
		const s = agentSummary(
			[{ artistId: 'band', confirmedAt: d('2026-03-01'), endedAt: d('2026-04-01') }],
			new Map([['band', growing]]),
			NOW
		);
		expect(s.developedArtists).toBe(0);
	});
});
