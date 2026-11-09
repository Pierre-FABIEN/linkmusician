/**
 * Vérification manuelle des organisations (P3-09) sur la base de `.env`,
 * schéma `e2e` : seule la gestion demande ; une demande à la fois ; refus
 * avec motif puis nouvelle demande ; accord (badge public) ; un SIRET pour
 * une seule organisation ; chaque décision au journal ; RGPD.
 * Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/organizations
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

const verification = await import('./verification');
const { moderationJournal } = await import('#lib/server/moderation/journal');
const bands = await import('#lib/server/bands/service');
const { getPublicBand } = await import('#lib/server/bands/public');
const { exportPersonData, personAnonymizationOps } = await import('#lib/prisma/actors/person');

const PREFIX = 'orgverif-test-';
const YEAR = 365.25 * 86_400_000;
const SIRET = '73282932000074';
const moderator = { userId: '' };

describe.skipIf(!enabled)(
	'vérification des organisations (schéma e2e)',
	{ timeout: 120_000 },
	() => {
		const ids: Record<string, string> = {};
		const users: Record<string, string> = {};
		let bandId = '';
		let otherBandId = '';

		async function cleanup() {
			const actors = await db.actor.findMany({
				where: {
					OR: [
						{ handle: { startsWith: PREFIX } },
						{ displayName: { startsWith: 'Orgverif Test' } },
						{ person: { user: { email: { startsWith: PREFIX } } } }
					]
				},
				select: { id: true }
			});
			const list = actors.map((a) => a.id);
			await db.adminAuditLog.deleteMany({ where: { targetId: { in: list } } });
			await db.actor.deleteMany({ where: { id: { in: list } } });
			await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
			if (list.length > 0)
				await db.domainEvent.deleteMany({ where: { actorIds: { hasSome: list } } });
		}

		beforeAll(async () => {
			process.env.DATABASE_URL = url.toString();
			await cleanup();
			await seedMilestones(db);
			for (const name of ['lea', 'malik', 'modo']) {
				const user = await db.user.create({
					data: { email: `${PREFIX}${name}@example.test`, referralCode: `${PREFIX}${name}` }
				});
				users[name] = user.id;
				ids[name] = (
					await db.actor.create({
						data: {
							kind: 'PERSON',
							handle: PREFIX + name,
							displayName: `Orgverif Test ${name}`,
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
			moderator.userId = users.modo;
			bandId = (await bands.createBand(ids.lea, { name: 'Orgverif Test Band', title: null })).id;
			otherBandId = (
				await bands.createBand(ids.malik, { name: 'Orgverif Test Autre', title: null })
			).id;
			await bands.inviteToBand(bandId, ids.lea, { handle: PREFIX + 'malik', title: null });
			const invite = await db.membership.findFirstOrThrow({
				where: { orgId: bandId, personId: ids.malik, status: 'INVITED' }
			});
			await bands.answerInvite(invite.id, ids.malik, true);
		}, 120_000);

		afterAll(async () => {
			await cleanup();
			await db.$disconnect();
		});

		const input = { siret: SIRET, officialUrl: 'https://www.instagram.com/orgverif' };
		const pendingId = async (orgId: string) =>
			(
				await db.organizationVerification.findFirstOrThrow({
					where: { orgId, status: 'PENDING' }
				})
			).id;

		it('demander : la gestion seulement, une demande à la fois, formulaire vérifié', async () => {
			await expect(verification.requestVerification(bandId, ids.malik, input)).rejects.toThrow(
				/gèrent/
			);
			await expect(
				verification.requestVerification(bandId, ids.lea, { ...input, siret: '12345678901234' })
			).rejects.toThrow(/SIRET/);
			await verification.requestVerification(bandId, ids.lea, input);
			await expect(verification.requestVerification(bandId, ids.lea, input)).rejects.toThrow(
				/en cours/
			);
			const queue = await verification.pendingVerifications();
			expect(queue.find((q) => q.org.handle.startsWith('orgverif-test-band'))?.siret).toBe(SIRET);
		});

		it('refus avec motif, nouvelle demande, puis accord : badge public', async () => {
			await expect(
				verification.rejectVerification(await pendingId(bandId), ' ', moderator)
			).rejects.toThrow(/motif/);
			await verification.rejectVerification(
				await pendingId(bandId),
				'Le lien ne mène pas au groupe',
				moderator
			);
			expect((await verification.verificationState(bandId)).last).toMatchObject({
				status: 'REJECTED',
				reason: 'Le lien ne mène pas au groupe'
			});
			await verification.requestVerification(bandId, ids.lea, input);
			await verification.approveVerification(await pendingId(bandId), moderator);
			expect((await verification.verificationState(bandId)).verifiedAt).not.toBeNull();
			const band = await db.actor.findUniqueOrThrow({ where: { id: bandId } });
			expect((await getPublicBand(band.handle))?.verified).toBe(true);
			await expect(verification.requestVerification(bandId, ids.lea, input)).rejects.toThrow(
				/déjà vérifié/
			);
		});

		it('un SIRET accordé ne sert pas à une autre organisation', async () => {
			await expect(verification.requestVerification(otherBandId, ids.malik, input)).rejects.toThrow(
				/autre organisation/
			);
		});

		it('chaque décision est au journal, lisible', async () => {
			const { entries } = await moderationJournal({ family: 'organizations' });
			const mine = entries.filter((e) => e.target?.label === 'Orgverif Test Band');
			expect(mine.map((e) => e.label)).toEqual([
				'Organisation vérifiée',
				'Vérification d’organisation refusée'
			]);
			expect(mine[1].note).toBe('Le lien ne mène pas au groupe');
		});

		it('RGPD : demandes exportées, puis on oublie qui les a faites', async () => {
			const exported = await exportPersonData(users.lea);
			expect(exported?.verifications_d_organisation_demandees).toHaveLength(2);
			await db.$transaction(await personAnonymizationOps(users.lea));
			expect(
				await db.organizationVerification.count({ where: { orgId: bandId, requestedById: null } })
			).toBe(2);
		});
	}
);
