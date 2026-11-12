/**
 * Digest email (P2-09b), sur la base de `.env`, schéma `e2e`, avec un envoi
 * factice (aucun email réel). Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/jobs/digest
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { createPrismaClient } from '../../../../prisma/client.js';
import dotenv from 'dotenv';
import { runDigestJob, type DigestMail } from './digest';

const enabled = process.env.PROGRESSION_INTEGRATION === '1';
const PREFIX = 'digest-test-';
const HOUR = 3_600_000;

describe.skipIf(!enabled)('digest email (schéma e2e)', () => {
	let db: PrismaClient;
	let lea = '';
	let max = '';
	const sent: DigestMail[] = [];
	const run = (now: Date) =>
		runDigestJob({
			db,
			now,
			baseUrl: 'https://app.test',
			onlyActorIds: [lea, max],
			send: async (mail) => {
				sent.push(mail);
			}
		});

	async function cleanup() {
		await db.actor.deleteMany({ where: { handle: { startsWith: PREFIX } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
	}

	async function person(name: string) {
		const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
		const user = await db.user.create({
			data: {
				email: `${PREFIX}${name}-${stamp}@example.test`,
				emailVerified: true,
				referralCode: `D${stamp}`.slice(0, 12)
			}
		});
		const actor = await db.actor.create({
			data: { kind: 'PERSON', handle: `${PREFIX}${name}`, displayName: name }
		});
		await db.person.create({
			data: {
				actorId: actor.id,
				userId: user.id,
				birthDate: new Date('1990-01-01'),
				termsAcceptedAt: new Date(),
				onboardedAt: new Date()
			}
		});
		return actor.id;
	}

	beforeAll(async () => {
		const env = dotenv.config({ quiet: true }).parsed ?? {};
		process.env.BETTER_AUTH_SECRET ??= env.BETTER_AUTH_SECRET ?? 'secret-de-test';
		const url = new URL(env.DATABASE_URL ?? process.env.DATABASE_URL ?? '');
		url.searchParams.set('schema', 'e2e');
		db = createPrismaClient(url.toString());
		await cleanup();
		lea = await person('lea');
		max = await person('max');
	}, 120_000);

	afterAll(async () => {
		await cleanup();
		await db?.$disconnect();
	}, 120_000);

	it('rien de neuf : aucun email', async () => {
		const result = await run(new Date());
		expect(result.sent).toBe(0);
		expect(sent).toHaveLength(0);
	}, 120_000);

	it('une demande et un message : un seul email, une seule fois par jour', async () => {
		const now = new Date();
		await db.notification.create({
			data: {
				recipientActorId: lea,
				type: 'CONTACT_REQUEST',
				fromActorId: max,
				href: '/messages/x',
				createdAt: new Date(now.getTime() - HOUR)
			}
		});
		const conversation = await db.conversation.create({
			data: {
				pairKey: `${PREFIX}${lea}-${max}`,
				initiatorId: max,
				participants: {
					create: [
						{ actorId: max, state: 'ACCEPTED', lastReadAt: now },
						{ actorId: lea, state: 'REQUEST' }
					]
				},
				messages: {
					create: {
						senderActorId: max,
						body: 'Salut',
						createdAt: new Date(now.getTime() - HOUR)
					}
				}
			}
		});
		expect((await run(now)).sent).toBe(1);
		expect(sent).toHaveLength(1);
		const mail = sent[0];
		expect(mail.to).toMatch(/digest-test-lea/);
		expect(mail.text).toContain('max aimerait échanger avec toi.');
		expect(mail.text).toContain('1 message t’attend.');
		expect(mail.headers['List-Unsubscribe']).toMatch(/desinscription\?t=/);

		// Relancé une heure plus tard : rien (au plus un par jour).
		expect((await run(new Date(now.getTime() + HOUR))).sent).toBe(0);
		// Le lendemain, sans rien de neuf : rien, et pas de rappel.
		expect((await run(new Date(now.getTime() + 25 * HOUR))).sent).toBe(0);
		expect(sent).toHaveLength(1);
		await db.conversation.delete({ where: { id: conversation.id } });
	}, 120_000);

	it('un sujet coupé n’est plus envoyé', async () => {
		await db.person.update({ where: { actorId: max }, data: { digestSentAt: null } });
		await db.notificationPreference.create({
			data: { actorId: max, type: 'ENDORSEMENT', email: false }
		});
		await db.notification.create({
			data: { recipientActorId: max, type: 'ENDORSEMENT', fromActorId: lea, href: '/@max' }
		});
		expect((await run(new Date())).sent).toBe(0);
		await db.notification.create({
			data: {
				recipientActorId: max,
				type: 'JAM_INVITE',
				fromActorId: lea,
				href: '/jams/x',
				title: 'Jam'
			}
		});
		expect((await run(new Date())).sent).toBe(1);
		expect(sent.at(-1)!.text).toContain('lea t’invite à la jam « Jam ».');
		expect(sent.at(-1)!.text).not.toContain('appréciation');
	}, 120_000);
});
