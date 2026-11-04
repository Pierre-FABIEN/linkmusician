import { describe, expect, it, vi } from 'vitest';

vi.mock('#lib/server', () => ({ prisma: {} }));
vi.mock('#lib/server/rate-limit', () => ({
	RefillingTokenBucket: class {
		constructor(
			public max: number,
			public refillIntervalSeconds: number,
			public name: string
		) {}
	}
}));

const { dailyBucket } = await import('./quotas');

describe('limiteurs journaliers par palier', () => {
	it.each([
		[0, 10, 8640],
		[1, 30, 2880],
		[2, 60, 1440],
		[3, 100, 864]
	] as const)('TL%i : %i jetons, un toutes les %i s', (level, max, interval) => {
		const bucket = dailyBucket('dailyFirstMessages', level) as unknown as {
			max: number;
			refillIntervalSeconds: number;
			name: string;
		};
		expect(bucket.max).toBe(max);
		expect(bucket.refillIntervalSeconds).toBe(interval);
		expect(bucket.name).toBe(`quota-dailyFirstMessages-tl${level}`);
	});

	it('réutilise le même limiteur pour un même quota et un même palier', () => {
		expect(dailyBucket('dailyFirstMessages', 1)).toBe(dailyBucket('dailyFirstMessages', 1));
	});
});
