/**
 * Étapes de groupe (P3-04, D41) sur la base de `.env`, schéma `e2e` :
 * formation vérifiée en ligne ; déclaration par la gestion d'un groupe formé,
 * une fois, XP « déclarée » au groupe et 25 % aux membres présents ;
 * « Première composition » qui suit les morceaux (déclarée, puis
 * corroborée en XP différentielle, ou reçue à la formation) ; référentiel
 * rejouable ; RGPD. Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/milestones
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { seedMilestones } from '../../../../prisma/seed-referentials.js';

const enabled = process.env.PROGRESSION_INTEGRATION === '1';
const url = new URL(
	dotenv.config({ quiet: true }).parsed?.DATABASE_URL ??
		process.env.DATABASE_URL ??
		'postgresql://x/y'
);
url.searchParams.set('schema', 'e2e');
const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });

vi.mock('#lib/server', () => ({ prisma: db }));

const releaseVerifier = await import('./release-verification');
const verifyRelease = vi.spyOn(releaseVerifier, 'verifyMusicBrainzRelease');
const service = await import('./service');
const bands = await import('#lib/server/bands/service');
const works = await import('#lib/server/works/service');
const { personAnonymizationOps, exportPersonData } = await import('#lib/prisma/actors/person');

const PREFIX = 'milestones-test-';
const YEAR = 365.25 * 86_400_000;
const guitar = { kind: 'INSTRUMENT' as const, instrumentSlug: 'guitare-electrique' };
const bass = { kind: 'INSTRUMENT' as const, instrumentSlug: 'basse' };

describe.skipIf(!enabled)('étapes de groupe (schéma e2e)', { timeout: 60_000 }, () => {
	const ids: Record<string, string> = {};
	const users: Record<string, string> = {};

	async function cleanup() {
		const actors = await db.actor.findMany({
			where: {
				OR: [
					{ handle: { startsWith: PREFIX } },
					{ displayName: { startsWith: 'Milestones Test' } },
					{ person: { user: { email: { startsWith: PREFIX } } } }
				]
			},
			select: { id: true }
		});
		const list = actors.map((a) => a.id);
		await db.actor.deleteMany({ where: { id: { in: list } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
		if (list.length > 0)
			await db.domainEvent.deleteMany({ where: { actorIds: { hasSome: list } } });
	}

	/** XP d'étapes (`milestone.*`) d'un acteur. */
	const xp = async (actor: string) =>
		(
			await db.xpTransaction.aggregate({
				where: { actorId: actor, ruleId: { startsWith: 'milestone.' } },
				_sum: { amount: true }
			})
		)._sum.amount ?? 0;

	const trust = (...names: string[]) =>
		db.actor.updateMany({
			where: { id: { in: names.map((n) => ids[n]) } },
			data: { trustLevel: 2 }
		});

	const demo = (owner: string) =>
		db.media.create({
			data: {
				actorId: owner,
				kind: 'EXTERNAL_LINK',
				provider: 'YOUTUBE',
				externalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
				title: 'Maquette',
				status: 'PUBLISHED',
				publishedAt: new Date()
			}
		});

	async function formBand(owner: string, member: string, name: string) {
		const band = await bands.createBand(ids[owner], { name, title: null });
		await bands.inviteToBand(band.id, ids[owner], { handle: PREFIX + member, title: null });
		const invite = await db.membership.findFirstOrThrow({
			where: { orgId: band.id, personId: ids[member], status: 'INVITED' }
		});
		await bands.answerInvite(invite.id, ids[member], true);
		return band;
	}

	/** Morceau du groupe composé avec sa maquette, sans crédit confirmé. */
	async function composeSolo(bandHandle: string, bandId: string, manager: string, title: string) {
		const work = await works.createWork(ids[manager], {
			title,
			genreIds: [],
			band: bandHandle,
			roles: [guitar]
		});
		await works.setDemo(work.id, ids[manager], { mediaId: (await demo(bandId)).id });
		await works.markComposed(work.id, ids[manager]);
		return work;
	}

	beforeAll(async () => {
		await cleanup();
		await seedMilestones(db);
		for (const name of ['lea', 'malik', 'sam']) {
			const user = await db.user.create({
				data: { email: `${PREFIX}${name}@example.test`, referralCode: `${PREFIX}${name}` }
			});
			users[name] = user.id;
			ids[name] = (
				await db.actor.create({
					data: {
						kind: 'PERSON',
						handle: PREFIX + name,
						displayName: `Milestones Test ${name}`,
						person: {
							create: {
								userId: user.id,
								termsAcceptedAt: new Date(),
								onboardedAt: new Date(),
								birthDate: new Date(Date.now() - 30 * YEAR)
							}
						}
					}
				})
			).id;
		}
	}, 60_000);

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('référentiel rejouable : dix étapes, aucune en double', async () => {
		await seedMilestones(db);
		const defs = await db.milestoneDefinition.findMany({ orderBy: { ordinal: 'asc' } });
		expect(defs.map((d) => d.id)).toEqual([
			'FORMATION',
			'FIRST_REHEARSAL',
			'FIRST_COMPOSITION',
			'FIRST_RECORDING',
			'FIRST_PUBLIC_DEMO',
			'FIRST_GIG',
			'FIRST_TOUR',
			'FIRST_EP',
			'FIRST_ALBUM',
			'SIGNING'
		]);
	});

	it('déclarer : groupe formé, gestion, une fois ; XP déclarée et 25 % aux membres', async () => {
		const solo = await bands.createBand(ids.sam, { name: 'Milestones Test Solo', title: null });
		const gig = { key: 'FIRST_GIG' as const, day: '2019-05-04', note: 'Au Bikini' };
		await expect(service.declareMilestone(solo.id, ids.sam, gig)).rejects.toThrow(/formé/);

		const band = await formBand('lea', 'malik', 'Milestones Test Band');
		// Formation : ligne vérifiée, 100 XP au groupe (P3-01, inchangé).
		expect(await service.bandMilestones(band.id)).toMatchObject([
			{ key: 'FORMATION', proof: 'VERIFIED' }
		]);
		expect(await xp(band.id)).toBe(100);

		await expect(service.declareMilestone(band.id, ids.malik, gig)).rejects.toThrow(/gèrent/);
		await expect(service.declareMilestone(band.id, ids.sam, gig)).rejects.toThrow(/gèrent/);
		await expect(
			service.declareMilestone(band.id, ids.lea, { ...gig, key: 'FIRST_COMPOSITION' })
		).rejects.toThrow(/ne se déclare pas/);
		await expect(
			service.declareMilestone(band.id, ids.lea, { ...gig, key: 'FIRST_TOUR' })
		).rejects.toThrow(/ne se déclare pas/);

		const [leaBefore, malikBefore] = [await xp(ids.lea), await xp(ids.malik)];
		await service.declareMilestone(band.id, ids.lea, gig);
		expect(await xp(band.id)).toBe(150);
		// Concert d'avant la plateforme : crédité à l'effectif de la formation.
		expect(await xp(ids.lea)).toBe(leaBefore + 13);
		expect(await xp(ids.malik)).toBe(malikBefore + 13);
		await expect(service.declareMilestone(band.id, ids.lea, gig)).rejects.toThrow(/déjà/);

		const steps = await service.bandMilestones(band.id);
		expect(steps.map((s) => [s.key, s.proof, s.note])).toEqual([
			['FORMATION', 'VERIFIED', null],
			['FIRST_GIG', 'DECLARED', 'Au Bikini']
		]);
		expect(steps[1].occurredAt.toISOString()).toBe('2019-05-04T12:00:00.000Z');

		// Corriger la précision ne change pas l'XP.
		await service.updateMilestoneDetails(steps[1].id, ids.lea, {
			day: '2019-05-05',
			note: 'Au Bikini, en première partie'
		});
		expect(await xp(band.id)).toBe(150);
		expect((await service.bandMilestones(band.id))[1].note).toBe('Au Bikini, en première partie');
		await expect(
			service.updateMilestoneDetails(steps[0].id, ids.lea, { day: '2026-01-01', note: null })
		).rejects.toThrow(/toute seule/);
	});

	it('« Première composition » suit les morceaux : déclarée, puis corroborée (différence)', async () => {
		const band = await formBand('lea', 'malik', 'Milestones Test Compo');
		expect(await xp(band.id)).toBe(100);

		const first = await composeSolo(band.handle, band.id, 'lea', 'Milestones Test premier');
		expect((await service.bandMilestones(band.id)).map((s) => [s.key, s.proof])).toEqual([
			['FORMATION', 'VERIFIED'],
			['FIRST_COMPOSITION', 'DECLARED']
		]);
		expect(await xp(band.id)).toBe(150);

		// Un 2ᵉ morceau seulement déclaré ne rapporte rien de plus.
		await composeSolo(band.handle, band.id, 'lea', 'Milestones Test deuxième');
		expect(await xp(band.id)).toBe(150);

		// Deux crédits confirmés sur le premier : corroboré, +100 (150 − 50).
		await trust('lea', 'malik');
		// Léa est créditée à la création ; Malik confirme le sien.
		await works.creditPerson(first.id, ids.lea, { handle: PREFIX + 'malik', roles: [bass] });
		await trust('lea', 'malik');
		await works.confirmCredit(first.id, ids.malik);
		const steps = await service.bandMilestones(band.id);
		expect(steps.find((s) => s.key === 'FIRST_COMPOSITION')?.proof).toBe('CORROBORATED');
		expect(await xp(band.id)).toBe(250);
		const row = await db.milestone.findFirstOrThrow({
			where: { bandId: band.id, definitionId: 'FIRST_COMPOSITION' }
		});
		expect(row.workId).toBe(first.id);
	});

	it('un groupe qui compose avant d’être formé reçoit l’étape à sa formation', async () => {
		const band = await bands.createBand(ids.sam, { name: 'Milestones Test Avant', title: null });
		await composeSolo(band.handle, band.id, 'sam', 'Milestones Test en solo');
		expect(await service.bandMilestones(band.id)).toEqual([]);
		expect(await xp(band.id)).toBe(0);

		await bands.inviteToBand(band.id, ids.sam, { handle: PREFIX + 'malik', title: null });
		const invite = await db.membership.findFirstOrThrow({
			where: { orgId: band.id, personId: ids.malik, status: 'INVITED' }
		});
		await bands.answerInvite(invite.id, ids.malik, true);
		expect((await service.bandMilestones(band.id)).map((s) => s.key)).toEqual([
			'FORMATION',
			'FIRST_COMPOSITION'
		]);
		expect(await xp(band.id)).toBe(150);
	});

	it('une sortie MusicBrainz correspondante est vérifiée et ne peut pas être ajoutée deux fois', async () => {
		const band = await formBand('lea', 'malik', 'Milestones Test EP');
		verifyRelease.mockResolvedValue({
			status: 'verified',
			releaseId: 'musicbrainz-release-test',
			title: 'Premier EP',
			url: 'https://musicbrainz.org/release/musicbrainz-release-test'
		});
		const occurredAt = new Date('2025-03-14T12:00:00.000Z');

		const result = await service.verifyReleaseMilestone(band.id, ids.lea, {
			key: 'FIRST_EP',
			kind: 'UPC',
			value: '012345678901',
			occurredAt
		});

		expect(result.title).toBe('Premier EP');
		expect(
			await db.milestone.findUniqueOrThrow({
				where: { bandId_definitionId: { bandId: band.id, definitionId: 'FIRST_EP' } }
			})
		).toMatchObject({
			proof: 'VERIFIED',
			occurredAt,
			releaseReferenceKind: 'UPC',
			releaseReference: '012345678901',
			releaseUrl: 'https://musicbrainz.org/release/musicbrainz-release-test'
		});
		expect(await xp(band.id)).toBe(1600);
		await expect(
			service.verifyReleaseMilestone(band.id, ids.lea, {
				key: 'FIRST_EP',
				kind: 'UPC',
				value: '012345678901',
				occurredAt
			})
		).rejects.toThrow(/déjà/);
		expect(verifyRelease).toHaveBeenCalledTimes(1);
		verifyRelease.mockReset();
	});

	it('RGPD : étapes déclarées exportées, puis on oublie qui les a déclarées', async () => {
		const exported = await exportPersonData(users.lea);
		expect(exported?.etapes_de_groupe_declarees).toMatchObject([
			{ groupe: 'Milestones Test Band', etape: 'Premier concert', preuve: 'DECLARED' },
			{ groupe: 'Milestones Test EP', etape: 'Premier EP', preuve: 'VERIFIED' }
		]);
		await db.$transaction(await personAnonymizationOps(users.lea));
		expect(await db.milestone.count({ where: { declaredById: ids.lea } })).toBe(0);
		expect(
			await db.milestone.count({ where: { definitionId: 'FIRST_GIG', note: { not: null } } })
		).toBeGreaterThan(0);
	});
});
