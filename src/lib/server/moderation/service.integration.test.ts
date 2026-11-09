/**
 * Modération (P1-12) sur la base de `.env`, schéma `e2e`. Désactivé par défaut :
 *
 *   MODERATION_INTEGRATION=1 npx vitest --run src/lib/server/moderation
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

const enabled = process.env.MODERATION_INTEGRATION === '1';
const url = new URL(
	dotenv.config({ quiet: true }).parsed?.DATABASE_URL ??
		process.env.DATABASE_URL ??
		'postgresql://x/y'
);
url.searchParams.set('schema', 'e2e');
const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });

vi.mock('#lib/server', () => ({ prisma: db }));
vi.mock('$app/env/private', () => ({ SECRET_ADDRESS_SEARCH_MODE: 'e2e' }));
vi.mock('#lib/server/rate-limit', () => ({
	RefillingTokenBucket: class {
		consume = async () => true;
		check = async () => true;
	}
}));

const svc = await import('./service');
const { addExternalMedia, getPublishedMedia } = await import('../media/service');

const PREFIX = 'moder-test-';
const DAY = 86_400_000;

describe.skipIf(!enabled)('modération (schéma e2e)', () => {
	let author = '';
	let reporter = '';
	let moderatorUserId = '';
	const users: string[] = [];

	async function cleanup() {
		const actors = await db.actor.findMany({
			where: { handle: { startsWith: PREFIX } },
			select: { id: true }
		});
		const ids = actors.map((a) => a.id);
		await db.actor.deleteMany({ where: { id: { in: ids } } });
		if (ids.length) await db.domainEvent.deleteMany({ where: { actorIds: { hasSome: ids } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
		if (moderatorUserId) await db.adminAuditLog.deleteMany({ where: { actorId: moderatorUserId } });
	}

	async function person(name: string, ageDays: number) {
		const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
		const user = await db.user.create({
			data: {
				email: `${PREFIX}${name}-${stamp}@example.test`,
				emailVerified: true,
				referralCode: `M${stamp}`.slice(0, 12)
			}
		});
		users.push(user.id);
		const actor = await db.actor.create({
			data: { kind: 'PERSON', handle: `${PREFIX}${name}`, displayName: name }
		});
		await db.person.create({
			data: {
				actorId: actor.id,
				userId: user.id,
				birthDate: new Date('1990-01-01'),
				termsAcceptedAt: new Date(),
				createdAt: new Date(Date.now() - ageDays * DAY)
			}
		});
		return { actorId: actor.id, userId: user.id };
	}

	beforeAll(async () => {
		await cleanup();
		const a = await person('auteur', 20);
		author = a.actorId;
		reporter = (await person('signaleur', 20)).actorId;
		moderatorUserId = (await person('moderateur', 100)).userId;
		// L'auteur devient Membre (TL1) : profil complété et un échange.
		const { emitAndProcess } = await import('../progression/processor');
		await db.$transaction(
			(t) => emitAndProcess(t, { type: 'profile.completed', actorId: author }),
			{ timeout: 30_000 }
		);
		await db.$transaction(
			(t) =>
				emitAndProcess(t, {
					type: 'conversation.reciprocated',
					actorId: author,
					counterpartId: reporter,
					fromOpportunity: true
				}),
			{ timeout: 30_000 }
		);
		expect((await db.actor.findUniqueOrThrow({ where: { id: author } })).trustLevel).toBe(1);
	}, 120_000);

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	}, 120_000);

	it('signalement → retrait du média et avertissement → confiance retombée', async () => {
		const { media } = await addExternalMedia(author, {
			url: 'https://soundcloud.com/a/b',
			isDemo: true
		});
		expect(media.status).toBe('PUBLISHED');

		await expect(
			svc.fileReport(author, { targetType: 'MEDIA', targetId: media.id, reason: 'SPAM' })
		).rejects.toThrow(/toi-même/);
		expect(
			await svc.fileReport(reporter, {
				targetType: 'MEDIA',
				targetId: media.id,
				reason: 'SPAM',
				details: 'pub'
			})
		).toEqual({
			alreadyReported: false
		});
		expect(
			await svc.fileReport(reporter, { targetType: 'MEDIA', targetId: media.id, reason: 'SPAM' })
		).toEqual({
			alreadyReported: true
		});
		const queue = await svc.moderationQueue();
		const report = queue.openReports.find((r) => r.targetId === media.id);
		expect(report?.media?.title).toBeDefined();

		const by = { userId: moderatorUserId };
		await svc.rejectMedia(media.id, 'Spam', by);
		expect(await db.report.findUniqueOrThrow({ where: { id: report!.id } })).toMatchObject({
			status: 'ACTIONED'
		});
		expect(await getPublishedMedia(media.id)).toBeNull();

		await svc.sanction(author, { kind: 'WARNING', reason: 'Spam répété', days: null }, by);
		expect((await db.actor.findUniqueOrThrow({ where: { id: author } })).trustLevel).toBe(0);
		expect(await db.adminAuditLog.count({ where: { actorId: moderatorUserId } })).toBe(2);
	}, 120_000);

	it('une suspension masque les médias publics, sa levée les rend', async () => {
		const by = { userId: moderatorUserId };
		const published = await db.media.create({
			data: {
				actorId: reporter,
				kind: 'EXTERNAL_LINK',
				provider: 'YOUTUBE',
				externalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
				title: 'x',
				status: 'PUBLISHED'
			}
		});
		expect(await getPublishedMedia(published.id)).not.toBeNull();
		const s = await svc.sanction(reporter, { kind: 'SUSPENSION', reason: 'test', days: 7 }, by);
		expect(await svc.currentSuspension(reporter)).toMatchObject({ id: s.id });
		expect(await getPublishedMedia(published.id)).toBeNull();
		await svc.liftSanction(s.id, by);
		expect(await svc.currentSuspension(reporter)).toBeNull();
		expect(await getPublishedMedia(published.id)).not.toBeNull();
	}, 120_000);

	it('un signalement classé ne peut pas l’être deux fois', async () => {
		const target = await db.media.create({
			data: {
				actorId: author,
				kind: 'EXTERNAL_LINK',
				provider: 'YOUTUBE',
				title: 'y',
				status: 'PUBLISHED'
			}
		});
		await svc.fileReport(reporter, { targetType: 'MEDIA', targetId: target.id, reason: 'OTHER' });
		const report = await db.report.findFirstOrThrow({ where: { targetId: target.id } });
		await svc.dismissReport(report.id, 'rien à signaler', { userId: moderatorUserId });
		await expect(svc.dismissReport(report.id, '', { userId: moderatorUserId })).rejects.toThrow(
			/déjà traité/
		);
	}, 120_000);

	it('un signalement d’étape de groupe gelé par la modération clôt le dossier', async () => {
		const definition = await db.milestoneDefinition.findFirstOrThrow();
		const band = await db.actor.create({
			data: {
				kind: 'ORGANIZATION',
				handle: `${PREFIX}band-${Date.now()}`,
				displayName: 'Groupe contesté',
				organization: { create: { kind: 'BAND' } }
			}
		});
		const milestone = await db.milestone.create({
			data: {
				definitionId: definition.id,
				bandId: band.id,
				proof: 'CORROBORATED',
				occurredAt: new Date(),
				definitionVersion: definition.version
			}
		});
		await expect(
			svc.fileReport(reporter, {
				targetType: 'MILESTONE',
				targetId: milestone.id,
				reason: 'INAPPROPRIATE'
			})
		).resolves.toEqual({ alreadyReported: false });
		await expect(
			svc.reviewMilestoneContest(milestone.id, true, { userId: moderatorUserId }, 'preuve douteuse')
		).resolves.toEqual({ accepted: true });
		const updated = await db.milestone.findUniqueOrThrow({ where: { id: milestone.id } });
		expect(updated.frozenAt).not.toBeNull();
		expect(await db.report.findFirst({ where: { targetType: 'MILESTONE', targetId: milestone.id } })).toMatchObject({
			status: 'ACTIONED'
		});
	}, 120_000);
});
