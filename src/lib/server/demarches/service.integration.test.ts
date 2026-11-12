/**
 * Démarches en contexte (P3-15a) sur la base de `.env`, schéma `e2e` : la
 * présence d'un·e mineur·e active dans un groupe (pas une ancienne, pas un
 * compte supprimé), et « J'ai compris » mémorisé une fois, sans toucher aux
 * conseils de P2-17. Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/demarches
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createPrismaClient } from '../../../../prisma/client.js';
import dotenv from 'dotenv';

const enabled = process.env.PROGRESSION_INTEGRATION === '1';
const url = new URL(
	dotenv.config({ quiet: true }).parsed?.DATABASE_URL ??
		process.env.DATABASE_URL ??
		'postgresql://x/y'
);
url.searchParams.set('schema', 'e2e');
const db = createPrismaClient(url.toString());

vi.mock('#lib/server', () => ({ prisma: db }));

const { bandDemarcheContext, demarcheNudge, dismissDemarche } = await import('./service');

const PREFIX = 'demarches-test-';
const YEAR = 365.25 * 86_400_000;

describe.skipIf(!enabled)('démarches en contexte (schéma e2e)', { timeout: 60_000 }, () => {
	const ids: Record<string, string> = {};
	let bandId = '';

	async function cleanup() {
		const actors = await db.actor.findMany({
			where: {
				OR: [
					{ handle: { startsWith: PREFIX } },
					{ person: { user: { email: { startsWith: PREFIX } } } }
				]
			},
			select: { id: true }
		});
		await db.actor.deleteMany({ where: { id: { in: actors.map((a) => a.id) } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
	}

	beforeAll(async () => {
		await cleanup();
		for (const [name, age] of Object.entries({ lea: 30, zoe: 16, max: 17 })) {
			const user = await db.user.create({
				data: { email: `${PREFIX}${name}@example.test`, referralCode: `${PREFIX}${name}` }
			});
			ids[name] = (
				await db.actor.create({
					data: {
						kind: 'PERSON',
						handle: PREFIX + name,
						displayName: `Demarches Test ${name}`,
						person: {
							create: {
								userId: user.id,
								termsAcceptedAt: new Date(),
								onboardedAt: new Date(),
								birthDate: new Date(Date.now() - age * YEAR),
								tipsDismissed: ['profil-public']
							}
						}
					}
				})
			).id;
		}
		bandId = (
			await db.actor.create({
				data: {
					kind: 'ORGANIZATION',
					handle: `${PREFIX}groupe`,
					displayName: 'Demarches Test groupe',
					organization: { create: { kind: 'BAND', formedAt: new Date() } }
				}
			})
		).id;
		await db.membership.createMany({
			data: [
				{ orgId: bandId, personId: ids.lea, role: 'OWNER', status: 'ACTIVE' },
				// Max (17 ans) est parti : il ne compte plus.
				{ orgId: bandId, personId: ids.max, status: 'LEFT', endedAt: new Date() }
			]
		});
	});

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('groupe d’adultes : l’association, pas la fiche des mineur·es', async () => {
		const ctx = await bandDemarcheContext({ id: bandId, formedAt: new Date() }, [
			{ key: 'FIRST_GIG', frozen: true }
		]);
		expect(ctx).toEqual({ screen: 'groupe', formed: true, milestones: [], hasMinor: false });
		expect((await demarcheNudge(ids.lea, ctx))?.id).toBe('groupe-association');
	});

	it('une mineure active : la fiche des mineur·es passe devant', async () => {
		await db.membership.create({ data: { orgId: bandId, personId: ids.zoe, status: 'ACTIVE' } });
		const ctx = await bandDemarcheContext({ id: bandId, formedAt: new Date() }, []);
		expect(ctx).toMatchObject({ hasMinor: true });
		expect((await demarcheNudge(ids.lea, ctx))?.id).toBe('groupe-mineurs');
	});

	it('« J’ai compris » : retenu une fois, préfixé, les conseils restent', async () => {
		expect(await dismissDemarche(ids.lea, 'groupe-mineurs')).toBe(true);
		expect(await dismissDemarche(ids.lea, 'groupe-mineurs')).toBe(true);
		expect(await dismissDemarche(ids.lea, 'inconnue')).toBe(false);
		const person = await db.person.findUniqueOrThrow({
			where: { actorId: ids.lea },
			select: { tipsDismissed: true }
		});
		expect(person.tipsDismissed).toEqual(['profil-public', 'demarche:groupe-mineurs']);
		const ctx = await bandDemarcheContext({ id: bandId, formedAt: new Date() }, []);
		expect((await demarcheNudge(ids.lea, ctx))?.id).toBe('groupe-association');
	});
});
