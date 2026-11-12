/**
 * Contacts (P3-16b, D45, D46) sur la base de `.env`, schéma `e2e` : le carnet
 * réunit les gens gardés après avoir joué et les conversations ouvertes
 * (pas une demande sans réponse, pas un blocage) ; projets partagés ;
 * groupes de contacts qui n'acceptent que des contacts ; RGPD.
 * Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/contacts
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createPrismaClient } from '../../../../prisma/client.js';
import dotenv from 'dotenv';
import { seedMilestones } from '../../../../prisma/seed-referentials.js';

const enabled = process.env.PROGRESSION_INTEGRATION === '1';
const url = new URL(
	dotenv.config({ quiet: true }).parsed?.DATABASE_URL ??
		process.env.DATABASE_URL ??
		'postgresql://x/y'
);
url.searchParams.set('schema', 'e2e');
const db = createPrismaClient(url.toString());

vi.mock('#lib/server', () => ({ prisma: db }));

const contacts = await import('./service');
const bands = await import('#lib/server/bands/service');
const { exportPersonData, personAnonymizationOps } = await import('#lib/prisma/actors/person');
const { pairKey } = await import('#lib/messaging/rules');

const PREFIX = 'contacts-test-';
const YEAR = 365.25 * 86_400_000;

describe.skipIf(!enabled)('contacts (schéma e2e)', { timeout: 90_000 }, () => {
	const ids: Record<string, string> = {};
	const users: Record<string, string> = {};

	async function cleanup() {
		const actors = await db.actor.findMany({
			where: {
				OR: [
					{ handle: { startsWith: PREFIX } },
					{ displayName: { startsWith: 'Contacts Test' } },
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

	async function conversation(a: string, b: string, bState: 'ACCEPTED' | 'REQUEST') {
		await db.conversation.create({
			data: {
				pairKey: pairKey(ids[a], ids[b]),
				initiatorId: ids[a],
				participants: {
					create: [
						{ actorId: ids[a], state: 'ACCEPTED' },
						{ actorId: ids[b], state: bState }
					]
				}
			}
		});
	}

	beforeAll(async () => {
		await cleanup();
		await seedMilestones(db);
		for (const name of ['lea', 'malik', 'sam', 'neo', 'ivy']) {
			const user = await db.user.create({
				data: { email: `${PREFIX}${name}@example.test`, referralCode: `${PREFIX}${name}` }
			});
			users[name] = user.id;
			ids[name] = (
				await db.actor.create({
					data: {
						kind: 'PERSON',
						handle: PREFIX + name,
						displayName: `Contacts Test ${name}`,
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
		// Malik : gardé après avoir joué, et dans le même groupe que Léa.
		await db.musicalTie.create({ data: { ownerId: ids.lea, contactId: ids.malik } });
		const band = await bands.createBand(ids.lea, { name: 'Contacts Test Band', title: null });
		await bands.inviteToBand(band.id, ids.lea, { handle: PREFIX + 'malik', title: null });
		const invite = await db.membership.findFirstOrThrow({
			where: { orgId: band.id, personId: ids.malik, status: 'INVITED' }
		});
		await bands.answerInvite(invite.id, ids.malik, true);
		// Sam : une conversation ouverte ; Néo : un premier message sans réponse ;
		// Ivy : une conversation ouverte, mais Ivy a bloqué Léa.
		await conversation('lea', 'sam', 'ACCEPTED');
		await conversation('lea', 'neo', 'REQUEST');
		await conversation('lea', 'ivy', 'ACCEPTED');
		await db.block.create({ data: { blockerActorId: ids.ivy, blockedActorId: ids.lea } });
	}, 90_000);

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('le carnet : gardé·es et conversations ouvertes, jamais une demande sans réponse ni un blocage', async () => {
		const list = await contacts.myContacts(ids.lea);
		expect(list.map((c) => c.handle)).toEqual([PREFIX + 'malik', PREFIX + 'sam']);
		expect(list[0]).toMatchObject({
			inCarnet: true,
			howWeMet: 'Vous avez joué ensemble',
			bands: [{ name: 'Contacts Test Band' }],
			conversationId: null
		});
		expect(list[1]).toMatchObject({ inCarnet: false, howWeMet: 'Vous vous écrivez' });
		expect(list[1].conversationId).toBeTruthy();
		expect(await contacts.isContact(ids.lea, ids.neo)).toBe(false);
		expect(await contacts.isContact(ids.lea, ids.ivy)).toBe(false);
	});

	it('groupes de contacts : seulement des contacts, à soi seul·e', async () => {
		const group = await contacts.createContactGroup(ids.lea, '  Projet   funk ');
		expect(group.name).toBe('Projet funk');
		await contacts.addToContactGroup(ids.lea, group.id, `@${PREFIX}malik`);
		await contacts.addToContactGroup(ids.lea, group.id, PREFIX + 'sam');
		await contacts.addToContactGroup(ids.lea, group.id, PREFIX + 'sam'); // sans doublon
		await expect(contacts.addToContactGroup(ids.lea, group.id, PREFIX + 'neo')).rejects.toThrow(
			/ses contacts/
		);
		await expect(contacts.addToContactGroup(ids.sam, group.id, PREFIX + 'lea')).rejects.toThrow(
			/n’existe plus/
		);
		await expect(contacts.createContactGroup(ids.lea, 'x')).rejects.toThrow(/au moins/);

		await contacts.renameContactGroup(ids.lea, group.id, 'Projet funk-rock');
		let groups = await contacts.myContactGroups(ids.lea);
		expect(groups).toMatchObject([
			{
				name: 'Projet funk-rock',
				members: [{ handle: PREFIX + 'malik' }, { handle: PREFIX + 'sam' }]
			}
		]);
		expect((await contacts.myContacts(ids.lea))[0].groups).toEqual([
			{ id: group.id, name: 'Projet funk-rock' }
		]);
		await contacts.removeFromContactGroup(ids.lea, group.id, ids.sam);
		groups = await contacts.myContactGroups(ids.lea);
		expect(groups[0].members.map((m) => m.handle)).toEqual([PREFIX + 'malik']);
		expect(await contacts.myContactGroups(ids.malik)).toEqual([]);
	});

	it('RGPD : groupes exportés ; à l’anonymisation, ses groupes et sa place chez les autres disparaissent', async () => {
		const exported = await exportPersonData(users.lea);
		expect(exported?.groupes_de_contacts).toMatchObject([
			{ nom: 'Projet funk-rock', membres: ['Contacts Test malik'] }
		]);
		await db.$transaction(await personAnonymizationOps(users.malik));
		expect((await contacts.myContactGroups(ids.lea))[0].members).toEqual([]);
		await db.$transaction(await personAnonymizationOps(users.lea));
		expect(await db.contactGroup.count({ where: { ownerId: ids.lea } })).toBe(0);
	});
});
