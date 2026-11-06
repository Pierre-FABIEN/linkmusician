import { describe, expect, it, vi } from 'vitest';

vi.mock('#lib/server', () => ({ prisma: {} }));

const { notify } = await import('./service');

function fakeDb(opts: { inApp?: boolean; blocks?: number } = {}) {
	const created: unknown[] = [];
	const db = {
		notificationPreference: {
			findUnique: async () => (opts.inApp === undefined ? null : { inApp: opts.inApp })
		},
		block: { count: async () => opts.blocks ?? 0 },
		notification: {
			create: async (args: { data: unknown }) => {
				created.push(args.data);
				return args.data;
			}
		}
	};
	return { db: db as never, created };
}

const input = {
	recipientId: 'lea',
	type: 'CONTACT_REQUEST' as const,
	fromActorId: 'max',
	href: '/messages/c1'
};

describe('notify', () => {
	it('crée la notification par défaut', async () => {
		const { db, created } = fakeDb();
		expect(await notify(db, input)).toBe(true);
		expect(created).toEqual([
			{
				recipientActorId: 'lea',
				type: 'CONTACT_REQUEST',
				fromActorId: 'max',
				href: '/messages/c1',
				title: null
			}
		]);
	});

	it('jamais pour soi-même', async () => {
		const { db, created } = fakeDb();
		expect(await notify(db, { ...input, fromActorId: 'lea' })).toBe(false);
		expect(created).toHaveLength(0);
	});

	it('rien entre deux personnes séparées par un blocage', async () => {
		const { db, created } = fakeDb({ blocks: 1 });
		expect(await notify(db, input)).toBe(false);
		expect(created).toHaveLength(0);
	});

	it('rien pour un type coupé dans les réglages', async () => {
		const { db, created } = fakeDb({ inApp: false });
		expect(await notify(db, input)).toBe(false);
		expect(created).toHaveLength(0);
	});
});
