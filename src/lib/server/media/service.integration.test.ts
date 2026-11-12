/**
 * Service des médias (P1-08) sur la base de `.env`, schéma `e2e`. Désactivé
 * par défaut :
 *
 *   MEDIA_INTEGRATION=1 npx vitest --run src/lib/server/media
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createPrismaClient } from '../../../../prisma/client.js';
import dotenv from 'dotenv';

const enabled = process.env.MEDIA_INTEGRATION === '1';
const url = new URL(
	dotenv.config({ quiet: true }).parsed?.DATABASE_URL ??
		process.env.DATABASE_URL ??
		'postgresql://x/y'
);
url.searchParams.set('schema', 'e2e');
const db = createPrismaClient(url.toString());

// Le service utilise le client de l'application : on lui donne celui du schéma e2e.
vi.mock('#lib/server', () => ({ prisma: db }));
vi.mock('$app/env/private', () => ({ SECRET_ADDRESS_SEARCH_MODE: 'e2e' }));

const { addExternalMedia, getPublishedMedia, MediaError } = await import('./service');

const PREFIX = 'media-test-';

describe.skipIf(!enabled)('médias (schéma e2e)', () => {
	let newcomer = '';
	let confirmed = '';

	async function cleanup() {
		const actors = await db.actor.findMany({
			where: { handle: { startsWith: PREFIX } },
			select: { id: true }
		});
		const ids = actors.map((a) => a.id);
		await db.actor.deleteMany({ where: { id: { in: ids } } });
		if (ids.length) await db.domainEvent.deleteMany({ where: { actorIds: { hasSome: ids } } });
	}

	beforeAll(async () => {
		await cleanup();
		newcomer = (
			await db.actor.create({
				data: { kind: 'PERSON', handle: `${PREFIX}nouveau`, displayName: 'N', trustLevel: 0 }
			})
		).id;
		confirmed = (
			await db.actor.create({
				data: { kind: 'PERSON', handle: `${PREFIX}confirme`, displayName: 'C', trustLevel: 2 }
			})
		).id;
	}, 60_000);

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	}, 60_000);

	it('un TL0 est bloqué au-delà de son quota de médias, ses liens attendent la modération', async () => {
		const ids: string[] = [];
		for (let i = 0; i < 3; i++) {
			const { media } = await addExternalMedia(newcomer, {
				url: `https://soundcloud.com/lea/titre-${i}`,
				isDemo: true
			});
			expect(media.status).toBe('PENDING_REVIEW');
			ids.push(media.id);
		}
		await expect(
			addExternalMedia(newcomer, { url: 'https://soundcloud.com/lea/titre-4', isDemo: true })
		).rejects.toThrow(MediaError);
		expect(await db.media.count({ where: { actorId: newcomer } })).toBe(3);
		// Non publié : introuvable publiquement.
		expect(await getPublishedMedia(ids[0])).toBeNull();
		// Pas d'XP tant que rien n'est publié.
		expect(await db.xpTransaction.count({ where: { actorId: newcomer } })).toBe(0);
	}, 120_000);

	it('un TL2 publie d’office ; la première démo rapporte, la photo non', async () => {
		const first = await addExternalMedia(confirmed, {
			url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
			title: 'Ma démo',
			isDemo: true
		});
		expect(first.media.status).toBe('PUBLISHED');
		expect(first.progress).toMatchObject({ xp: 100, achievements: ['first-demo'] });
		expect(await getPublishedMedia(first.media.id)).toMatchObject({ title: 'Ma démo' });

		const second = await addExternalMedia(confirmed, {
			url: 'https://lea.bandcamp.com/track/autre',
			isDemo: false
		});
		expect(second.progress).toMatchObject({ xp: 0 });
		expect(await db.xpTransaction.count({ where: { actorId: confirmed } })).toBe(1);
	}, 120_000);

	it('refuse un lien d’une autre plateforme', async () => {
		await expect(
			addExternalMedia(confirmed, { url: 'https://vimeo.com/1', isDemo: true })
		).rejects.toThrow(/YouTube, SoundCloud et Bandcamp/);
	});
});
