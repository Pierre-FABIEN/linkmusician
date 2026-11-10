/**
 * Annonces par métier (P4-05) sur la base de `.env`, schéma `e2e` : une
 * annonce « cherche ingé son, prise de son » n'apparaît autour de soi que
 * pour les ingés son qui ont coché la prise de son ; les autres ne peuvent
 * pas y répondre ; le morceau relié doit être géré par l'émetteur.
 * Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/opportunities
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { E2E_COMMUNES } from '#lib/geo/communes-e2e';

const enabled = process.env.PROGRESSION_INTEGRATION === '1';
const url = new URL(
	dotenv.config({ quiet: true }).parsed?.DATABASE_URL ??
		process.env.DATABASE_URL ??
		'postgresql://x/y'
);
url.searchParams.set('schema', 'e2e');
// Le SQL brut (villes, PostGIS) lit son schéma dans l'URL de connexion.
if (enabled) process.env.DATABASE_URL = url.toString();
const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });

vi.mock('#lib/server', () => ({ prisma: db }));

const { createOpportunity, listNearby, getOpportunity } = await import('./service');
const { eligibilityFor } = await import('./applications');
const { setActorLocation } = await import('../geo/queries');

const PREFIX = 'cible-test-';
const YEAR = 365.25 * 86_400_000;
const toulouse = E2E_COMMUNES.find((c) => c.nom === 'Toulouse')!;

type Spec = {
	track: 'MUSICIAN' | 'SOUND_ENGINEER' | 'PRODUCER';
	sound?: ('RECORDING' | 'MIXING')[];
};
const PEOPLE: Record<string, Spec> = {
	lea: { track: 'MUSICIAN' },
	sam: { track: 'SOUND_ENGINEER', sound: ['RECORDING', 'MIXING'] },
	ines: { track: 'SOUND_ENGINEER', sound: ['MIXING'] },
	nora: { track: 'PRODUCER' },
	malik: { track: 'MUSICIAN' }
};

describe.skipIf(!enabled)('annonces par métier (schéma e2e)', { timeout: 60_000 }, () => {
	const ids: Record<string, string> = {};
	let opportunityId = '';
	let workId = '';

	async function cleanup() {
		const actors = await db.actor.findMany({
			where: { person: { user: { email: { startsWith: PREFIX } } } },
			select: { id: true }
		});
		const list = actors.map((a) => a.id);
		await db.actor.deleteMany({ where: { id: { in: list } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
		if (list.length > 0)
			await db.domainEvent.deleteMany({ where: { actorIds: { hasSome: list } } });
	}

	beforeAll(async () => {
		await cleanup();
		for (const [name, spec] of Object.entries(PEOPLE)) {
			const user = await db.user.create({
				data: { email: `${PREFIX}${name}@example.test`, referralCode: `${PREFIX}${name}` }
			});
			ids[name] = (
				await db.actor.create({
					data: {
						kind: 'PERSON',
						handle: PREFIX + name,
						displayName: name,
						trustLevel: 1,
						person: {
							create: {
								userId: user.id,
								termsAcceptedAt: new Date(),
								onboardedAt: new Date(),
								birthDate: new Date(Date.now() - 30 * YEAR),
								tracks: { create: { track: spec.track, isPrimary: true } },
								soundProfile: spec.sound ? { create: { specialties: spec.sound } } : undefined
							}
						}
					}
				})
			).id;
			await setActorLocation(ids[name], toulouse, { db, schema: 'e2e' });
		}
		workId = (
			await db.work.create({
				data: { title: 'Nuit blanche', ownerId: ids.lea, createdById: ids.lea },
				select: { id: true }
			})
		).id;
	});

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	const form = {
		kind: 'SESSION_WORK' as const,
		title: 'Ingé son pour enregistrer un titre',
		description: 'Une voix et une guitare, un après-midi, à Toulouse.',
		radiusKm: 25,
		durationDays: 14,
		slots: 1,
		target: 'SOUND_ENGINEER' as const,
		specialty: 'RECORDING'
	};

	it('refuse une cible incohérente ou un morceau qu’on ne gère pas', async () => {
		await expect(createOpportunity(ids.lea, { ...form, kind: 'RECRUIT_MEMBER' })).rejects.toThrow(
			/session/
		);
		await expect(createOpportunity(ids.lea, { ...form, specialty: 'BEATMAKING' })).rejects.toThrow(
			/spécialité/
		);
		await expect(createOpportunity(ids.malik, { ...form, work: workId })).rejects.toThrow(
			/morceau/
		);
	});

	it('publie l’annonce ciblée, reliée au morceau, sans conditions de musicien·ne', async () => {
		({ id: opportunityId } = await createOpportunity(ids.lea, {
			...form,
			instrument: 'batterie',
			minLevel: 3,
			work: workId
		}));
		const row = await db.opportunity.findUniqueOrThrow({ where: { id: opportunityId } });
		expect(row).toMatchObject({
			targetTrack: 'SOUND_ENGINEER',
			targetSpecialty: 'RECORDING',
			workId,
			instrumentId: null,
			minLevel: null
		});
		expect(await getOpportunity(opportunityId, ids.sam)).toMatchObject({
			target: 'Un·e ingé son · Prise de son',
			work: { id: workId, title: 'Nuit blanche', linkable: false }
		});
	});

	it('seuls les ingés son qui font de la prise de son la voient autour d’eux', async () => {
		const sees = async (name: string) =>
			(await listNearby(ids[name])).some((o) => o.id === opportunityId);
		expect(await sees('sam')).toBe(true);
		expect(await sees('ines')).toBe(false);
		expect(await sees('nora')).toBe(false);
		expect(await sees('malik')).toBe(false);
	});

	it('les autres ne remplissent pas les conditions pour répondre', async () => {
		const raw = await db.opportunity.findUniqueOrThrow({ where: { id: opportunityId } });
		expect(await eligibilityFor(ids.sam, raw)).toEqual([]);
		expect(await eligibilityFor(ids.ines, raw)).toEqual([
			'cette spécialité n’est pas cochée dans ton profil de métier'
		]);
		expect(await eligibilityFor(ids.malik, raw)).toEqual([
			'l’annonce cherche un autre métier que les tiens'
		]);
	});
});
