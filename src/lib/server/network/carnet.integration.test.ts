/**
 * Carnet de contacts volontaire (D82, #99) sur la base de `.env`, schéma
 * `e2e`. Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/network/carnet
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createPrismaClient } from '../../../../prisma/client.js';
import dotenv from 'dotenv';
import { pairKey } from '#lib/messaging/rules';

const enabled = process.env.PROGRESSION_INTEGRATION === '1';
const url = new URL(
	dotenv.config({ quiet: true }).parsed?.DATABASE_URL ??
		process.env.DATABASE_URL ??
		'postgresql://x/y'
);
url.searchParams.set('schema', 'e2e');
if (enabled) process.env.DATABASE_URL = url.toString();
const db = createPrismaClient(url.toString());

vi.mock('#lib/server', () => ({ prisma: db }));

const network = await import('./service');
const contacts = await import('../contacts/service');
const { introducibleContacts } = await import('../career/introductions');
const { canViewActivity } = await import('../privacy/activities');

const PREFIX = 'carnet-test-';
const YEAR = 365.25 * 86_400_000;
const NOW = new Date('2026-11-21T12:00:00Z');

describe.skipIf(!enabled)('carnet de contacts volontaire (schéma e2e)', { timeout: 60_000 }, () => {
	const ids: Record<string, string> = {};

	async function cleanup() {
		await db.actor.deleteMany({ where: { handle: { startsWith: PREFIX } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
	}

	async function person(name: string) {
		const user = await db.user.create({
			data: { email: `${PREFIX}${name}@example.test`, referralCode: `${PREFIX}${name}` }
		});
		ids[name] = (
			await db.actor.create({
				data: {
					kind: 'PERSON',
					handle: PREFIX + name,
					displayName: `Carnet ${name}`,
					person: {
						create: {
							userId: user.id,
							termsAcceptedAt: NOW,
							onboardedAt: NOW,
							birthDate: new Date(NOW.getTime() - 30 * YEAR)
						}
					}
				}
			})
		).id;
	}

	beforeAll(async () => {
		await cleanup();
		for (const name of ['musicien', 'inge', 'ami', 'cache', 'bloqueur']) await person(name);
		await db.actor.update({ where: { id: ids.cache }, data: { hidden: true } });
		await db.block.create({
			data: { blockerActorId: ids.bloqueur, blockedActorId: ids.musicien }
		});
		ids.groupe = (
			await db.actor.create({
				data: {
					kind: 'ORGANIZATION',
					handle: `${PREFIX}groupe`,
					displayName: 'Carnet Groupe',
					organization: { create: { kind: 'BAND' } }
				}
			})
		).id;
		// L'ami et le musicien se parlent déjà.
		await db.conversation.create({
			data: {
				pairKey: pairKey(ids.musicien, ids.ami),
				initiatorId: ids.musicien,
				participants: {
					create: [
						{ actorId: ids.musicien, state: 'ACCEPTED' },
						{ actorId: ids.ami, state: 'ACCEPTED' }
					]
				}
			}
		});
	});

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('enregistrer sans relation, sans écrire, sans prévenir ; idempotent même en parallèle', async () => {
		const before = await db.notification.count({ where: { recipientActorId: ids.inge } });
		await Promise.all([
			network.saveContact(ids.musicien, `${PREFIX}inge`, NOW),
			network.saveContact(ids.musicien, `@${PREFIX}inge`, NOW)
		]);
		expect(
			await db.savedContact.count({ where: { ownerId: ids.musicien, contactId: ids.inge } })
		).toBe(1);
		expect(await db.notification.count({ where: { recipientActorId: ids.inge } })).toBe(before);
		// Pas de réciprocité, pas de conversation créée.
		expect(await network.isSaved(ids.inge, ids.musicien)).toBe(false);
		expect(
			await db.conversation.count({ where: { pairKey: pairKey(ids.musicien, ids.inge) } })
		).toBe(0);
		expect((await contacts.myContacts(ids.musicien, NOW)).map((c) => c.handle)).toContain(
			`${PREFIX}inge`
		);
	});

	it('même réponse pour un profil inconnu, masqué ou séparé par un blocage', async () => {
		for (const handle of ['inconnu', 'cache', 'bloqueur']) {
			await expect(network.saveContact(ids.musicien, PREFIX + handle, NOW)).rejects.toMatchObject({
				status: 404,
				message: 'Personne inconnue.'
			});
		}
	});

	it('une structure aussi s’enregistre, sans obtenir aucun droit sur elle', async () => {
		await network.saveContact(ids.musicien, `${PREFIX}groupe`, NOW);
		const entry = (await contacts.myContacts(ids.musicien, NOW)).find(
			(c) => c.handle === `${PREFIX}groupe`
		);
		expect(entry).toMatchObject({ isPerson: false, inCarnet: true });
		expect(
			await db.membership.count({ where: { orgId: ids.groupe, personId: ids.musicien } })
		).toBe(0);
	});

	it('une conversation n’ajoute personne au carnet', async () => {
		const handles = (await contacts.myContacts(ids.musicien, NOW)).map((c) => c.handle);
		expect(handles).not.toContain(`${PREFIX}ami`);
	});

	it('le carnet seul ne permet ni d’inviter en groupe, ni de présenter, ni de voir les jams', async () => {
		expect(await contacts.isReachableContact(ids.musicien, ids.inge, NOW)).toBe(false);
		expect((await introducibleContacts(ids.musicien, NOW)).map((c) => c.id)).not.toContain(
			ids.inge
		);
		expect(await canViewActivity(ids.musicien, ids.inge, { scope: 'past', now: NOW })).toBe(false);
		// Avec une conversation acceptée, l'invitation devient possible.
		await network.saveContact(ids.musicien, `${PREFIX}ami`, NOW);
		expect(await contacts.isReachableContact(ids.musicien, ids.ami, NOW)).toBe(true);
	});

	it('retirer : libre, sans notification, même si le profil est masqué depuis', async () => {
		await db.actor.update({ where: { id: ids.inge }, data: { hidden: true } });
		expect((await contacts.myContacts(ids.musicien, NOW)).map((c) => c.handle)).not.toContain(
			`${PREFIX}inge`
		);
		await network.removeContact(ids.musicien, `${PREFIX}inge`);
		expect(await network.isSaved(ids.musicien, ids.inge)).toBe(false);
	});

	it('la reprise de l’ancien carnet est idempotente (migration carnet_volontaire)', async () => {
		await db.musicalTie.create({ data: { ownerId: ids.ami, contactId: ids.musicien } });
		const group = await db.contactGroup.create({
			data: { ownerId: ids.ami, name: 'Projet', members: { create: [{ contactId: ids.inge }] } }
		});
		const schema = url.searchParams.get('schema');
		const backfill = async () => {
			await db.$executeRawUnsafe(`
				INSERT INTO "${schema}"."saved_contacts" ("ownerId", "contactId", "createdAt")
				SELECT "ownerId", "contactId", "createdAt" FROM "${schema}"."musical_ties"
				WHERE "ownerId" <> "contactId"
				ON CONFLICT ("ownerId", "contactId") DO NOTHING`);
			await db.$executeRawUnsafe(`
				INSERT INTO "${schema}"."saved_contacts" ("ownerId", "contactId", "createdAt")
				SELECT g."ownerId", m."contactId", MIN(m."addedAt")
				FROM "${schema}"."contact_group_members" m
				JOIN "${schema}"."contact_groups" g ON g."id" = m."groupId"
				WHERE g."ownerId" <> m."contactId"
				GROUP BY g."ownerId", m."contactId"
				ON CONFLICT ("ownerId", "contactId") DO NOTHING`);
		};
		await backfill();
		await backfill();
		const saved = await db.savedContact.findMany({
			where: { ownerId: ids.ami },
			select: { contactId: true }
		});
		expect(saved.map((s) => s.contactId).sort()).toEqual([ids.inge, ids.musicien].sort());
		expect(await db.contactGroupMember.count({ where: { groupId: group.id } })).toBe(1);
	});
});
