/**
 * Studio (P4-03a) sur la base de `.env`, schéma `e2e` : création réservée
 * aux métiers du son, fiche enregistrée, publication refusée tant qu'elle
 * est incomplète, page publique (rang « Ouvert »), retrait automatique d'une
 * fiche vidée, un studio ne compte pas comme un groupe, RGPD. Désactivé par
 * défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/studios
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
// La localisation passe par du SQL brut, qui viserait le schéma de `.env` :
// simulée en mémoire, elle est testée à part (`geo/queries`).
const locations = new Map<
	string,
	{ communeCode: string; communeName: string; departmentCode: string }
>();
vi.mock('#lib/server/geo/queries', () => ({
	getActorLocation: async (id: string) => locations.get(id) ?? null,
	setActorLocation: async (id: string, c: { code: string; nom: string; codeDepartement: string }) =>
		void locations.set(id, {
			communeCode: c.code,
			communeName: c.nom,
			departmentCode: c.codeDepartement
		}),
	clearActorLocation: async (id: string) => void locations.delete(id)
}));

const service = await import('./service');
const { bandCounts } = await import('#lib/server/bands/service');
const { exportPersonData, personAnonymizationOps } = await import('#lib/prisma/actors/person');

const PREFIX = 'studio-test-';
const TOULOUSE = {
	code: '31555',
	nom: 'Toulouse',
	codeDepartement: '31',
	codesPostaux: ['31000'],
	centre: { lat: 43.6, lng: 1.44 }
};

const fiche = {
	name: 'Studio du Canal',
	bio: 'Prise live, mixage analogique.',
	services: ['RECORDING' as const, 'MIXING' as const],
	rooms: [{ name: 'Salle A', description: '25 m²', hourlyRate: 35 }],
	gear: 'Console Audient\nMicros U87',
	pricingNotes: '',
	byAppointment: false,
	hours: [{ weekday: 1, opensAt: 600, closesAt: 1140 }],
	commune: TOULOUSE
};

describe.skipIf(!enabled)('studio (schéma e2e)', { timeout: 60_000 }, () => {
	const ids: Record<string, string> = {};
	let studio = { id: '', handle: '' };

	async function cleanup() {
		const actors = await db.actor.findMany({
			where: {
				OR: [
					{ handle: { startsWith: PREFIX } },
					{ person: { user: { email: { startsWith: PREFIX } } } },
					{
						organization: { memberships: { some: { person: { handle: { startsWith: PREFIX } } } } }
					}
				]
			},
			select: { id: true }
		});
		await db.actor.deleteMany({ where: { id: { in: actors.map((a) => a.id) } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
	}

	async function person(key: string, track?: 'SOUND_ENGINEER' | 'MUSICIAN') {
		const user = await db.user.create({
			data: { email: `${PREFIX}${key}@example.test`, referralCode: `${PREFIX}${key}` }
		});
		const actor = await db.actor.create({
			data: {
				kind: 'PERSON',
				handle: `${PREFIX}${key}`,
				displayName: key,
				person: {
					create: {
						userId: user.id,
						termsAcceptedAt: new Date(),
						onboardedAt: new Date(),
						birthDate: new Date('1990-01-01'),
						...(track ? { tracks: { create: { track, isPrimary: true } } } : {})
					}
				}
			}
		});
		ids[key] = actor.id;
		ids[`${key}User`] = user.id;
	}

	beforeAll(async () => {
		await cleanup();
		await person('sam', 'SOUND_ENGINEER');
		await person('lea', 'MUSICIAN');
	});

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('réserve la création aux métiers du son', async () => {
		await expect(service.createStudio(ids.lea, { name: 'Chez Léa' })).rejects.toMatchObject({
			status: 403
		});
		studio = await service.createStudio(ids.sam, { name: 'Studio du Canal' });
		const org = await db.organization.findUniqueOrThrow({
			where: { actorId: studio.id },
			select: { kind: true, studio: { select: { publishedAt: true } }, memberships: true }
		});
		expect(org.kind).toBe('STUDIO');
		expect(org.studio?.publishedAt).toBeNull();
		expect(org.memberships).toMatchObject([{ personId: ids.sam, role: 'OWNER', status: 'ACTIVE' }]);
	});

	it('un studio ne compte pas comme un groupe', async () => {
		expect((await bandCounts(ids.sam)).active).toBe(0);
		expect(await service.myStudios(ids.sam)).toMatchObject([
			{ handle: studio.handle, role: 'OWNER', published: false }
		]);
	});

	it('refuse la gestion à une autre personne', async () => {
		await expect(service.updateStudio(studio.id, ids.lea, fiche)).rejects.toMatchObject({
			status: 404
		});
		expect(await service.studioForManager(studio.handle, ids.lea)).toBeNull();
	});

	it('ne publie qu’une fiche complète, invisible avant', async () => {
		await expect(service.setStudioPublished(studio.id, ids.sam, true)).rejects.toThrow(
			'Complète la fiche'
		);
		expect(await service.getPublicStudio(studio.handle)).toBeNull();

		expect(await service.updateStudio(studio.id, ids.sam, fiche)).toEqual({ unpublished: false });
		const draft = await service.studioForManager(studio.handle, ids.sam);
		expect(draft?.gaps).toEqual([]);
		expect(draft?.rooms).toEqual([{ name: 'Salle A', description: '25 m²', hourlyRate: 35 }]);

		await service.setStudioPublished(studio.id, ids.sam, true);
		const page = await service.getPublicStudio(studio.handle, new Date(), ids.lea);
		expect(page).toMatchObject({
			name: 'Studio du Canal',
			commune: 'Toulouse',
			services: ['RECORDING', 'MIXING'],
			hours: [{ weekday: 1, opensAt: 600, closesAt: 1140 }],
			rank: { tier: { id: 'OPEN', label: 'Ouvert' }, next: { id: 'ACTIVE' } },
			managers: [{ handle: `${PREFIX}sam`, displayName: 'sam' }],
			isManager: false
		});
		// Ni XP, ni adresse : seule la ville sort.
		expect(JSON.stringify(page)).not.toMatch(/xp|lat|lng|31555/i);
		expect(await service.studiosOfPerson(ids.sam)).toEqual([
			{ handle: studio.handle, name: 'Studio du Canal' }
		]);
	});

	it('retire la fiche si on la vide', async () => {
		expect(await service.updateStudio(studio.id, ids.sam, { ...fiche, rooms: [] })).toEqual({
			unpublished: true
		});
		expect(await service.getPublicStudio(studio.handle)).toBeNull();
		await service.updateStudio(studio.id, ids.sam, fiche);
		await service.setStudioPublished(studio.id, ids.sam, true);
	});

	it('RGPD : la gestion est exportée, le studio fermé avec son seul responsable', async () => {
		const exported = (await exportPersonData(ids.samUser)) as unknown as {
			studios: { studio: string; role: string }[];
			groupes: unknown[];
		};
		expect(exported.studios).toMatchObject([{ studio: 'Studio du Canal', role: 'OWNER' }]);
		expect(exported.groupes).toEqual([]);

		await db.$transaction(await personAnonymizationOps(ids.samUser));
		expect(await service.getPublicStudio(studio.handle)).toBeNull();
		const org = await db.organization.findUniqueOrThrow({ where: { actorId: studio.id } });
		expect(org.dissolvedAt).not.toBeNull();
	});
});
