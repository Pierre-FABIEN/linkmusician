/**
 * Réglages par métier (ONB-12b, D61) sur la base de `.env`, schéma `e2e` :
 * défauts de la migration, écriture limitée à ses propres métiers, fiches
 * filtrées par lecteur, export et anonymisation RGPD. Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/prisma/actors/trackSettings
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

const enabled = process.env.PROGRESSION_INTEGRATION === '1';
const url = new URL(
	dotenv.config({ quiet: true }).parsed?.DATABASE_URL ??
		process.env.DATABASE_URL ??
		'postgresql://x/y'
);
url.searchParams.set('schema', 'e2e');
const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });

vi.mock('#lib/server', () => ({ prisma: db }));

const { getTrackSettings, setTrackSettings } = await import('./trackSettings');
const { setTrackDetails, TrackNotHeldError } = await import('./specializations');
const { publicTrackSheets } = await import('#lib/server/actors/trackSheets');
const { exportPersonData, personAnonymizationOps } = await import('./person');

const PREFIX = 'tset-test-';

describe.skipIf(!enabled)('réglages par métier (schéma e2e)', { timeout: 60_000 }, () => {
	const ids = { alexUser: '', alex: '', samUser: '', sam: '' };

	async function cleanup() {
		await db.actor.deleteMany({ where: { handle: { startsWith: PREFIX } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
	}

	async function person(
		name: string,
		tracks: { track: 'MUSICIAN' | 'PROMOTER'; isPrimary?: boolean }[]
	) {
		const userId = (
			await db.user.create({
				data: { email: `${PREFIX}${name}@example.test`, referralCode: `${PREFIX}${name}` }
			})
		).id;
		const actorId = (
			await db.actor.create({
				data: {
					kind: 'PERSON',
					handle: `${PREFIX}${name}`,
					displayName: name,
					person: {
						create: {
							userId,
							termsAcceptedAt: new Date(),
							onboardedAt: new Date(),
							tracks: { create: tracks }
						}
					}
				}
			})
		).id;
		return { userId, actorId };
	}

	beforeAll(async () => {
		await cleanup();
		const alex = await person('alex', [
			{ track: 'MUSICIAN', isPrimary: true },
			{ track: 'PROMOTER' }
		]);
		const sam = await person('sam', [{ track: 'PROMOTER', isPrimary: true }]);
		Object.assign(ids, {
			alexUser: alex.userId,
			alex: alex.actorId,
			samUser: sam.userId,
			sam: sam.actorId
		});
		await setTrackDetails(
			ids.alex,
			{
				track: 'PROMOTER',
				specializations: ['CONCERTS'],
				offers: ['CONCERT_DATES'],
				needs: ['FIND_ARTISTS']
			},
			{ answers: { structure: ['ASSOCIATION'], territory: ['LOCAL'], concert_pay: ['FEE'] } }
		);
	});

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('défauts de la migration (Q64, Q66) : membres, membres, privé, non précisé', async () => {
		const settings = await getTrackSettings(ids.alex);
		expect(settings.PROMOTER).toEqual({
			offersVisibility: 'MEMBERS',
			detailsVisibility: 'MEMBERS',
			conditionsVisibility: 'PRIVATE',
			openToRequests: null
		});
	});

	it('n’écrit que ses propres métiers : un métier non détenu est refusé', async () => {
		const settings = {
			offersVisibility: 'PUBLIC' as const,
			detailsVisibility: 'PUBLIC' as const,
			conditionsVisibility: 'PUBLIC' as const,
			openToRequests: true
		};
		await expect(setTrackSettings(ids.sam, 'MUSICIAN', settings)).rejects.toBeInstanceOf(
			TrackNotHeldError
		);
		await setTrackSettings(ids.sam, 'PROMOTER', settings);
		// Le même métier chez Alex n'a pas bougé.
		expect((await getTrackSettings(ids.alex)).PROMOTER?.offersVisibility).toBe('MEMBERS');
	});

	it('fiches filtrées : un·e visiteur·se ne reçoit rien de ce qui est réservé', async () => {
		await setTrackSettings(ids.alex, 'PROMOTER', {
			offersVisibility: 'PUBLIC',
			detailsVisibility: 'MEMBERS',
			conditionsVisibility: 'PRIVATE',
			openToRequests: true
		});
		const sheetOf = async (audience: 'public' | 'members' | 'owner') =>
			(await publicTrackSheets(ids.alex, audience)).find((s) => s.track === 'PROMOTER')!;
		expect((await sheetOf('public')).blocks.map((b) => b.block)).toEqual(['offers']);
		expect((await sheetOf('members')).blocks.map((b) => b.block)).toEqual(['offers', 'details']);
		expect(JSON.stringify(await sheetOf('members'))).not.toContain('Cachet');
		expect((await sheetOf('owner')).blocks.map((b) => b.block)).toEqual([
			'offers',
			'details',
			'conditions'
		]);
	});

	it('RGPD : réglages exportés, puis effacés avec les métiers à l’anonymisation', async () => {
		const exported = await exportPersonData(ids.alexUser);
		expect(exported?.metiers).toContainEqual({
			metier: 'PROMOTER',
			principal: false,
			visibilite_specialites_et_intentions: 'PUBLIC',
			visibilite_precisions: 'MEMBERS',
			visibilite_conditions: 'PRIVATE',
			ouvert_aux_sollicitations: true
		});
		await db.$transaction(await personAnonymizationOps(ids.alexUser));
		expect(await db.personTrack.count({ where: { personId: ids.alex } })).toBe(0);
	});
});
