/**
 * Discussions de groupe (P3-16c, D46) sur la base de `.env`, schéma `e2e` :
 * ouverture depuis un groupe de contacts, invitations (pas de mineur·e, pas
 * de blocage), rien de visible avant d'avoir rejoint, « Rejoindre » refusé
 * en cas de blocage avec un membre, non-lus, quitter, RGPD.
 * Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/discussions
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

const discussions = await import('./service');
const { unreadTotal } = await import('#lib/server/messaging/service');
const { exportPersonData, personAnonymizationOps } = await import('#lib/prisma/actors/person');
const { pairKey } = await import('#lib/messaging/rules');

const PREFIX = 'discussions-test-';
const YEAR = 365.25 * 86_400_000;

describe.skipIf(!enabled)('discussions de groupe (schéma e2e)', { timeout: 90_000 }, () => {
	const ids: Record<string, string> = {};
	const users: Record<string, string> = {};
	let groupId = '';
	let discussionId = '';

	async function cleanup() {
		const actors = await db.actor.findMany({
			where: {
				OR: [
					{ handle: { startsWith: PREFIX } },
					{ displayName: { startsWith: 'Discussions Test' } },
					{ person: { user: { email: { startsWith: PREFIX } } } }
				]
			},
			select: { id: true }
		});
		const list = actors.map((a) => a.id);
		await db.actor.deleteMany({ where: { id: { in: list } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
	}

	beforeAll(async () => {
		// Le SQL brut (non-lus) suit `DATABASE_URL`.
		process.env.DATABASE_URL = url.toString();
		await cleanup();
		const ages: Record<string, number> = { lea: 30, malik: 28, sam: 35, zoe: 16, ivy: 25, neo: 40 };
		for (const [name, age] of Object.entries(ages)) {
			const user = await db.user.create({
				data: { email: `${PREFIX}${name}@example.test`, referralCode: `${PREFIX}${name}` }
			});
			users[name] = user.id;
			ids[name] = (
				await db.actor.create({
					data: {
						kind: 'PERSON',
						handle: PREFIX + name,
						displayName: `Discussions Test ${name}`,
						person: {
							create: {
								userId: user.id,
								termsAcceptedAt: new Date(),
								onboardedAt: new Date(),
								birthDate: new Date(Date.now() - age * YEAR)
							}
						}
					}
				})
			).id;
		}
		// Contacts de Léa : Malik, Zoé (mineure), Ivy (carnet) ; Sam (conversation).
		for (const c of ['malik', 'zoe', 'ivy']) {
			await db.musicalTie.create({ data: { ownerId: ids.lea, contactId: ids[c] } });
		}
		await db.conversation.create({
			data: {
				pairKey: pairKey(ids.lea, ids.sam),
				initiatorId: ids.lea,
				participants: {
					create: [
						{ actorId: ids.lea, state: 'ACCEPTED' },
						{ actorId: ids.sam, state: 'ACCEPTED' }
					]
				}
			}
		});
		// Malik a bloqué Ivy (rien entre Ivy et Léa).
		await db.block.create({ data: { blockerActorId: ids.malik, blockedActorId: ids.ivy } });
		const group = await db.contactGroup.create({
			data: {
				ownerId: ids.lea,
				name: 'Projet funk',
				members: { create: ['malik', 'zoe', 'ivy'].map((c) => ({ contactId: ids[c] })) }
			}
		});
		groupId = group.id;
	}, 90_000);

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('ouvrir depuis un groupe : invitations aux contacts majeurs, jamais à une mineure', async () => {
		await expect(discussions.openFromContactGroup(ids.malik, groupId)).rejects.toThrow(
			/existe plus/
		);
		const opened = await discussions.openFromContactGroup(ids.lea, groupId);
		discussionId = opened.id;
		expect(opened).toMatchObject({ invited: 2, skipped: 1 });
		const seats = await db.groupDiscussionMember.findMany({
			where: { discussionId },
			select: { actorId: true, state: true }
		});
		expect(Object.fromEntries(seats.map((s) => [s.actorId, s.state]))).toEqual({
			[ids.lea]: 'ACTIVE',
			[ids.malik]: 'INVITED',
			[ids.ivy]: 'INVITED'
		});
		expect(
			await db.notification.count({
				where: { recipientActorId: ids.malik, type: 'GROUP_DISCUSSION_INVITE' }
			})
		).toBe(1);
	});

	it('avant d’avoir rejoint : l’invitation seule, aucun message, pas d’envoi', async () => {
		await discussions.postToDiscussion(ids.lea, discussionId, 'On répète samedi ?');
		const view = await discussions.openDiscussion(ids.malik, discussionId);
		expect(view.access).toBe('invitation');
		expect(view).not.toHaveProperty('messages');
		await expect(discussions.postToDiscussion(ids.malik, discussionId, 'Coucou')).rejects.toThrow(
			/ne fais pas partie/
		);
		// La pastille compte l'invitation, pas les messages.
		expect(await unreadTotal(ids.malik)).toBe(1);
		await expect(discussions.openDiscussion(ids.neo, discussionId)).rejects.toThrow(/introuvable/);
	});

	it('rejoindre : le fil apparaît ; un blocage avec un membre empêche de rejoindre', async () => {
		await discussions.joinDiscussion(ids.malik, discussionId);
		const view = await discussions.openDiscussion(ids.malik, discussionId);
		expect(view.access === 'member' && view.messages.map((m) => m.body)).toEqual([
			'On répète samedi ?'
		]);
		await expect(discussions.joinDiscussion(ids.ivy, discussionId)).rejects.toThrow(
			/ne peux pas rejoindre/
		);
	});

	it('inviter : seulement l’auteur, seulement ses contacts, jamais une mineure', async () => {
		await expect(
			discussions.inviteToDiscussion(ids.malik, discussionId, PREFIX + 'sam')
		).rejects.toThrow(/Seule la personne/);
		await expect(
			discussions.inviteToDiscussion(ids.lea, discussionId, PREFIX + 'neo')
		).rejects.toThrow(/ses contacts/);
		await expect(
			discussions.inviteToDiscussion(ids.lea, discussionId, PREFIX + 'zoe')
		).rejects.toThrow(/ne peut pas être invitée/);
		await discussions.inviteToDiscussion(ids.lea, discussionId, PREFIX + 'sam');
		await discussions.declineDiscussion(ids.sam, discussionId);
		// « Non merci » est définitif.
		await expect(
			discussions.inviteToDiscussion(ids.lea, discussionId, PREFIX + 'sam')
		).rejects.toThrow(/déjà répondu/);
		await expect(discussions.openDiscussion(ids.sam, discussionId)).rejects.toThrow(/introuvable/);
	});

	it('non-lus, puis quitter', async () => {
		await discussions.postToDiscussion(ids.malik, discussionId, 'Samedi ok');
		expect(await unreadTotal(ids.lea)).toBe(1);
		const list = await discussions.listDiscussions(ids.lea);
		expect(list[0]).toMatchObject({ title: 'Projet funk', unread: 1, invitation: false });
		await discussions.openDiscussion(ids.lea, discussionId);
		expect(await unreadTotal(ids.lea)).toBe(0);
		await discussions.leaveDiscussion(ids.malik, discussionId);
		await expect(discussions.openDiscussion(ids.malik, discussionId)).rejects.toThrow(
			/introuvable/
		);
		expect(await discussions.hasNewInDiscussionSince(ids.malik, discussionId, null)).toBeNull();
	});

	it('RGPD : discussions et messages exportés ; anonymisée, la personne en sort et son texte s’efface', async () => {
		const exported = await exportPersonData(users.malik);
		expect(exported?.messages_de_groupe_envoyes).toMatchObject([
			{ discussion: 'Projet funk', texte: 'Samedi ok' }
		]);
		await db.$transaction(await personAnonymizationOps(users.lea));
		expect(
			await db.groupDiscussionMember.findMany({
				where: { actorId: ids.lea },
				select: { state: true }
			})
		).toEqual([{ state: 'LEFT' }]);
		expect(
			await db.groupDiscussionMessage.findMany({
				where: { senderActorId: ids.lea },
				select: { body: true }
			})
		).toEqual([{ body: 'Message supprimé' }]);
	});
});
