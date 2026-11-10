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

// Cloudinary simulé : l'envoi est signé, le fichier « relu » est une photo.
vi.mock('#lib/server/media/cloudinary', () => ({
	isCloudinaryConfigured: () => true,
	signUpload: ({ mediaId }: { mediaId: string }) => ({
		publicId: `test/${mediaId}`,
		uploadUrl: 'https://api.cloudinary.test/upload',
		fields: {}
	}),
	fetchAsset: async () => ({
		bytes: 200_000,
		durationSec: null,
		format: 'jpg',
		url: 'https://res.cloudinary.test/studio.jpg'
	}),
	destroyAsset: async () => {}
}));

const service = await import('./service');
const { finalizeUpload, startUpload } = await import('#lib/server/media/service');
const collabs = await import('#lib/server/collaborations/service');
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
		await person('max', 'SOUND_ENGINEER');
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

	it('photos : envoyées par la gestion, validées selon sa confiance, huit au plus', async () => {
		await expect(service.studioForPhotoUpload(studio.handle, ids.lea)).rejects.toMatchObject({
			status: 404
		});
		// La personne est de confiance (TL1), le studio jamais : c'est elle qui compte.
		await db.actor.update({ where: { id: ids.sam }, data: { trustLevel: 1 } });
		const studioId = await service.studioForPhotoUpload(studio.handle, ids.sam);
		expect(studioId).toBe(studio.id);
		const input = { mimeType: 'image/jpeg', bytes: 200_000, title: 'La régie', isDemo: true };
		await expect(
			startUpload(
				studioId,
				{ ...input, mimeType: 'audio/mpeg' },
				{
					uploaderId: ids.sam,
					onlyImages: true
				}
			)
		).rejects.toThrow('Seules les photos');
		const { mediaId } = await startUpload(studioId, input, {
			uploaderId: ids.sam,
			onlyImages: true
		});
		expect(await finalizeUpload(mediaId)).toMatchObject({ status: 'PUBLISHED' });
		const media = await db.media.findUniqueOrThrow({ where: { id: mediaId } });
		expect(media).toMatchObject({ actorId: studio.id, uploadedById: ids.sam, isDemo: false });

		const page = await service.getPublicStudio(studio.handle);
		expect(page?.photos).toEqual([
			{ id: mediaId, title: 'La régie', url: 'https://res.cloudinary.test/studio.jpg' }
		]);
		// Aucune XP pour une photo, ni pour le studio, ni pour la personne.
		expect(await db.xpTransaction.count({ where: { actorId: { in: [studio.id, ids.sam] } } })).toBe(
			0
		);

		await db.media.createMany({
			data: Array.from({ length: 7 }, (_, i) => ({
				actorId: studio.id,
				kind: 'IMAGE' as const,
				provider: 'CLOUDINARY' as const,
				status: 'PUBLISHED' as const,
				title: `Photo ${i}`
			}))
		});
		await expect(service.studioForPhotoUpload(studio.handle, ids.sam)).rejects.toThrow(
			'8 photos au plus'
		);

		await expect(service.deleteStudioPhoto(studio.id, ids.lea, mediaId)).rejects.toMatchObject({
			status: 404
		});
		await service.deleteStudioPhoto(studio.id, ids.sam, mediaId);
		expect(await db.media.count({ where: { id: mediaId } })).toBe(0);
	});

	it('sessions : une collaboration au studio, confirmée par un·e client·e', async () => {
		const { id: conversationId } = await db.conversation.create({
			data: {
				pairKey: [ids.lea, ids.sam].sort().join(':'),
				initiatorId: ids.lea,
				participants: {
					create: [
						{ actorId: ids.lea, state: 'ACCEPTED' },
						{ actorId: ids.sam, state: 'ACCEPTED' }
					]
				}
			},
			select: { id: true }
		});
		const today = new Date().toISOString().slice(0, 10);
		// Un concert ne se tient pas au studio ; un studio inconnu est refusé.
		await expect(
			collabs.proposeCollaboration(ids.lea, conversationId, {
				kind: 'GIG',
				title: 'Concert',
				happenedOn: today,
				studio: studio.handle
			})
		).rejects.toThrow('ne se tient pas');
		await expect(
			collabs.proposeCollaboration(ids.lea, conversationId, {
				kind: 'REHEARSAL',
				title: 'Répète',
				happenedOn: today,
				studio: `${PREFIX}ailleurs`
			})
		).rejects.toMatchObject({ status: 403 });

		// La cliente propose sa répétition au studio de Sam, qui confirme.
		const form = await collabs.collabFormContext(ids.lea, conversationId);
		expect(form?.studios).toEqual([
			{ handle: studio.handle, name: 'Studio du Canal', mine: false }
		]);
		const { id } = await collabs.proposeCollaboration(ids.lea, conversationId, {
			kind: 'REHEARSAL',
			title: 'Répète du jeudi',
			happenedOn: today,
			studio: studio.handle
		});
		expect((await service.studioSessionStats(studio.id)).sessions).toBe(0);
		// Déjà passée : accepter vaut confirmer.
		await collabs.respondToCollaboration(ids.sam, id, true);
		expect(await service.studioSessionStats(studio.id)).toEqual({
			sessions: 1,
			distinctClients: 1,
			rehearsals: 1,
			creditedRecordings: 0
		});
		const fiche = await service.studioForManager(studio.handle, ids.sam);
		expect(fiche?.quests.filter((q) => q.done).map((q) => q.id)).toEqual([
			'fiche',
			'hours',
			'firstSession',
			'firstRehearsal'
		]);
		expect(fiche?.rank).toMatchObject({ tier: { id: 'OPEN' }, next: { id: 'ACTIVE' } });
		expect((await service.getPublicStudio(studio.handle))?.sessions).toBe(1);

		// Quatre sessions de plus avec la même cliente : le studio est Actif.
		for (let i = 1; i <= 4; i++) {
			await db.collaboration.create({
				data: {
					kind: 'RECORDING',
					status: 'COMPLETED',
					title: `Prise ${i}`,
					happenedOn: new Date(`2026-10-0${i}T00:00:00Z`),
					proposedById: ids.sam,
					studioId: studio.id,
					completedAt: new Date(),
					participants: {
						create: [
							{ actorId: ids.sam, acceptedAt: new Date(), confirmedCompletionAt: new Date() },
							{ actorId: ids.lea, acceptedAt: new Date(), confirmedCompletionAt: new Date() }
						]
					}
				}
			});
		}
		// Une « session » entre gens du studio seulement ne compte pas.
		await db.collaboration.create({
			data: {
				kind: 'RECORDING',
				status: 'COMPLETED',
				title: 'Entre nous',
				happenedOn: new Date('2026-10-09T00:00:00Z'),
				proposedById: ids.sam,
				studioId: studio.id,
				completedAt: new Date(),
				participants: {
					create: [{ actorId: ids.sam, acceptedAt: new Date(), confirmedCompletionAt: new Date() }]
				}
			}
		});
		expect((await service.studioSessionStats(studio.id)).sessions).toBe(5);
		expect((await service.studioForManager(studio.handle, ids.sam))?.rank.tier?.id).toBe('ACTIVE');
	});

	it('co-gestion : inviter, accepter, retirer ; on ne part pas seul·e', async () => {
		// Une musicienne sans métier du son ne peut pas être invitée.
		await expect(
			service.inviteStudioManager(studio.id, ids.sam, `@${PREFIX}lea`)
		).rejects.toMatchObject({ status: 404 });
		// La ou le responsable seul·e ne quitte pas le studio.
		const samRow = await db.membership.findFirstOrThrow({
			where: { orgId: studio.id, personId: ids.sam }
		});
		await expect(service.leaveOrRemoveStudioManager(studio.id, ids.sam, samRow.id)).rejects.toThrow(
			'seul·e'
		);

		expect(await service.inviteStudioManager(studio.id, ids.sam, `@${PREFIX}MAX`)).toBe('max');
		await expect(service.inviteStudioManager(studio.id, ids.sam, `${PREFIX}max`)).rejects.toThrow(
			'déjà invité'
		);
		expect(
			await db.notification.count({ where: { recipientActorId: ids.max, type: 'STUDIO_INVITE' } })
		).toBe(1);
		const [invite] = await service.myStudioInvites(ids.max);
		expect(invite).toMatchObject({ name: 'Studio du Canal', invitedBy: 'sam' });

		await service.answerStudioInvite(invite.membershipId, ids.max, true);
		expect(await service.myStudios(ids.max)).toMatchObject([{ role: 'ADMIN', published: true }]);
		const team = (await service.studioForManager(studio.handle, ids.max))!.team;
		expect(team.map((m) => [m.displayName, m.role, m.status])).toEqual([
			['sam', 'OWNER', 'ACTIVE'],
			['max', 'ADMIN', 'ACTIVE']
		]);
		// Un ADMIN ne retire pas la ou le responsable.
		await expect(
			service.leaveOrRemoveStudioManager(studio.id, ids.max, samRow.id)
		).rejects.toMatchObject({ status: 403 });
		// La ou le responsable retire l'ADMIN ; une nouvelle invitation se décline.
		await service.leaveOrRemoveStudioManager(studio.id, ids.sam, invite.membershipId);
		expect(await service.studioForManager(studio.handle, ids.max)).toBeNull();
		await service.inviteStudioManager(studio.id, ids.sam, `${PREFIX}max`);
		const [again] = await service.myStudioInvites(ids.max);
		await service.answerStudioInvite(again.membershipId, ids.max, false);
		expect(await service.myStudioInvites(ids.max)).toEqual([]);
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
