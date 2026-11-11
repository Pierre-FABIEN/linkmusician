/**
 * Organisations d'organisateur·rices (P5-05b) sur la base de `.env`, schéma
 * `e2e` : création réservée aux organisateur·rices majeur·es, fiche, plateau
 * publié au nom de l'organisation, co-gestion qui reçoit et tranche les
 * candidatures, export RGPD. Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/organizations/promoters
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

const orgs = await import('./promoters');
const bands = await import('../bands/service');
const { createGigSlot, applyAsBand } = await import('../opportunities/gigSlots');
const { decideApplication, listForIssuer } = await import('../opportunities/applications');
const { listMine } = await import('../opportunities/service');
const { isVerifiedOrg } = await import('./verification');
const { setActorLocation } = await import('../geo/queries');
const { exportPersonData } = await import('#lib/prisma/actors/person');

const PREFIX = 'promorg-test-';
const YEAR = 365.25 * 86_400_000;
const toulouse = E2E_COMMUNES.find((c) => c.nom === 'Toulouse')!;
const inTenDays = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);

describe.skipIf(!enabled)('organisations d’organisateur·rices (schéma e2e)', () => {
	const ids: Record<string, string> = {};
	const users: Record<string, string> = {};
	let org = { id: '', handle: '' };
	let band = { id: '', handle: '' };
	let venueId = '';
	let gigId = '';

	async function cleanup() {
		const actors = await db.actor.findMany({
			where: {
				OR: [
					{ handle: { startsWith: PREFIX } },
					{ displayName: { startsWith: PREFIX } },
					{ person: { user: { email: { startsWith: PREFIX } } } }
				]
			},
			select: { id: true }
		});
		const list = actors.map((a) => a.id);
		await db.conversation.deleteMany({
			where: { participants: { some: { actorId: { in: list } } } }
		});
		await db.venue.deleteMany({ where: { name: { startsWith: PREFIX } } });
		await db.actor.deleteMany({ where: { id: { in: list } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
	}

	async function person(name: string, opts: { promoter?: boolean; minor?: boolean } = {}) {
		const user = await db.user.create({
			data: { email: `${PREFIX}${name}@example.test`, referralCode: `${PREFIX}${name}` }
		});
		users[name] = user.id;
		const actor = await db.actor.create({
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
						birthDate: new Date(Date.now() - (opts.minor ? 16 : 30) * YEAR),
						tracks: {
							create: [{ track: opts.promoter ? 'PROMOTER' : 'MUSICIAN', isPrimary: true }]
						}
					}
				}
			}
		});
		await setActorLocation(actor.id, toulouse, { db, schema: 'e2e' });
		return actor.id;
	}

	const gigForm = () => ({
		venueId,
		day: inTenDays,
		start: '21:00',
		title: 'Plateau de l’asso',
		description: 'Deux groupes, chapeau, repas offert, son assuré par l’asso.',
		slots: 2,
		radiusKm: 50
	});

	beforeAll(async () => {
		await cleanup();
		ids.sam = await person('sam', { promoter: true });
		ids.zoe = await person('zoe', { promoter: true });
		ids.kid = await person('kid', { promoter: true, minor: true });
		ids.lea = await person('lea');
		band = await bands.createBand(ids.lea, { name: `${PREFIX}Les Rats`, title: 'guitare' });
		await setActorLocation(band.id, toulouse, { db, schema: 'e2e' });
		venueId = (
			await db.venue.create({
				data: {
					name: `${PREFIX}Le Bikini`,
					nameKey: `${PREFIX}le bikini`,
					kind: 'BAR',
					communeCode: '31555',
					communeName: 'Toulouse',
					departmentCode: '31',
					lat: 43.6,
					lng: 1.44,
					createdById: ids.sam,
					validatedAt: new Date()
				}
			})
		).id;
	}, 120_000);

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('seul·e un·e organisateur·rice majeur·e crée une organisation, et en est responsable', async () => {
		await expect(orgs.createPromoterOrg(ids.lea, { name: `${PREFIX}Asso` })).rejects.toThrow(
			/Organisateur·rice/
		);
		await expect(orgs.createPromoterOrg(ids.kid, { name: `${PREFIX}Asso` })).rejects.toThrow(
			/majeur/
		);
		org = await orgs.createPromoterOrg(ids.sam, { name: `${PREFIX}Bruit Rose` });
		const row = await db.organization.findUniqueOrThrow({
			where: { actorId: org.id },
			select: { kind: true, memberships: { select: { personId: true, role: true } } }
		});
		expect(row).toMatchObject({
			kind: 'PROMOTER',
			memberships: [{ personId: ids.sam, role: 'OWNER' }]
		});
		expect(await orgs.getPublicPromoterOrg(org.handle)).toMatchObject({ verified: false });
	}, 60_000);

	it('un plateau au nom de l’organisation demande une fiche complète, puis l’a pour émettrice', async () => {
		await expect(createGigSlot(ids.sam, gigForm(), new Date(), org.id)).rejects.toThrow(
			/ville de l’organisation/
		);
		await orgs.updatePromoterOrg(org.id, ids.sam, {
			name: `${PREFIX}Bruit Rose`,
			bio: 'Concerts rock et scènes ouvertes à Toulouse.',
			eventKinds: ['CONCERTS', 'OPEN_STAGES'],
			genreIds: [],
			capacity: 300,
			commune: toulouse
		});
		await expect(createGigSlot(ids.zoe, gigForm(), new Date(), org.id)).rejects.toThrow(
			/gèrent l’organisation/
		);
		gigId = (await createGigSlot(ids.sam, gigForm(), new Date(), org.id)).id;
		expect(await db.opportunity.findUniqueOrThrow({ where: { id: gigId } })).toMatchObject({
			issuerActorId: org.id,
			postedById: ids.sam
		});
		expect((await orgs.getPublicPromoterOrg(org.handle))?.gigSlots.map((g) => g.id)).toEqual([
			gigId
		]);
	}, 60_000);

	it('co-gestion : une organisatrice invitée accepte, et retrouve le plateau', async () => {
		await expect(orgs.invitePromoterManager(org.id, ids.sam, PREFIX + 'lea')).rejects.toThrow(
			/organisateur·rice majeur·e/
		);
		await orgs.invitePromoterManager(org.id, ids.sam, `@${PREFIX}zoe`);
		expect(
			await db.notification.count({ where: { recipientActorId: ids.zoe, type: 'ORG_INVITE' } })
		).toBe(1);
		const [invite] = await orgs.myPromoterOrgInvites(ids.zoe);
		await orgs.answerPromoterInvite(invite.membershipId, ids.zoe, true);
		expect((await orgs.myPromoterOrgs(ids.zoe)).map((o) => o.handle)).toEqual([org.handle]);
		expect((await listMine(ids.zoe)).map((o) => o.id)).toContain(gigId);
	}, 60_000);

	it('toute la gestion est prévenue d’une candidature, et une co-gérante la tranche', async () => {
		await applyAsBand(ids.lea, gigId, band.handle, 'Rock garage, quarante minutes, autonomes.');
		for (const manager of [ids.sam, ids.zoe]) {
			expect(
				await db.notification.count({
					where: { recipientActorId: manager, type: 'APPLICATION_RECEIVED' }
				})
			).toBe(1);
		}
		const [app] = await listForIssuer(ids.zoe, gigId);
		const { conversationId } = await decideApplication(ids.zoe, app.id, 'accept');
		const participants = await db.conversationParticipant.findMany({
			where: { conversationId: conversationId! },
			select: { actorId: true }
		});
		expect(participants.map((p) => p.actorId).sort()).toEqual([ids.zoe, ids.lea].sort());
	}, 60_000);

	it('vérification : le statut accordé par la modération ouvre `isVerifiedOrg`', async () => {
		expect(await isVerifiedOrg(org.id)).toBe(false);
		await db.organization.update({ where: { actorId: org.id }, data: { verifiedAt: new Date() } });
		expect(await isVerifiedOrg(org.id)).toBe(true);
		expect(await orgs.getPublicPromoterOrg(org.handle)).toMatchObject({ verified: true });
	}, 60_000);

	it('la responsable ne part pas seule ; partir transmet l’organisation ; RGPD exporté', async () => {
		const exported = await exportPersonData(users.sam);
		expect(exported?.organisations).toEqual([
			expect.objectContaining({ organisation: `${PREFIX}Bruit Rose`, role: 'OWNER' })
		]);
		const team = await db.membership.findMany({
			where: { orgId: org.id, status: 'ACTIVE' },
			select: { id: true, personId: true }
		});
		const sam = team.find((m) => m.personId === ids.sam)!;
		await orgs.leaveOrRemovePromoterManager(org.id, ids.sam, sam.id);
		const zoe = await db.membership.findFirstOrThrow({
			where: { orgId: org.id, personId: ids.zoe, status: 'ACTIVE' }
		});
		expect(zoe.role).toBe('OWNER');
		await expect(orgs.leaveOrRemovePromoterManager(org.id, ids.zoe, zoe.id)).rejects.toThrow(
			/seul·e/
		);
	}, 60_000);
});
