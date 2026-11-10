/**
 * Documents préremplis (P3-15b) sur la base de `.env`, schéma `e2e` : qui
 * peut télécharger le bulletin et le programme, et ce qu'ils contiennent
 * (crédits confirmés seulement, comptes supprimés exclus, auteur·rices et
 * compositeur·rices seulement au programme). Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/demarches
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

const { splitSheetFor, concertProgramFor, DocumentError } = await import('./documents');

const PREFIX = 'documents-test-';
const YEAR = 365.25 * 86_400_000;

describe.skipIf(!enabled)('documents préremplis (schéma e2e)', { timeout: 60_000 }, () => {
	const ids: Record<string, string> = {};
	let bandId = '';
	let composedId = '';
	let ideaId = '';
	const handle = `${PREFIX}groupe`;

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

	const refusal = (p: Promise<unknown>) =>
		p.then(
			() => null,
			(err: unknown) => (err instanceof DocumentError ? err.status : err)
		);

	beforeAll(async () => {
		process.env.DATABASE_URL = url.toString();
		await cleanup();
		for (const name of ['lea', 'malik', 'sam', 'ivy', 'neo', 'gone']) {
			const user = await db.user.create({
				data: { email: `${PREFIX}${name}@example.test`, referralCode: `${PREFIX}${name}` }
			});
			ids[name] = (
				await db.actor.create({
					data: {
						kind: 'PERSON',
						handle: PREFIX + name,
						displayName: `Documents ${name}`,
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
		bandId = (
			await db.actor.create({
				data: {
					kind: 'ORGANIZATION',
					handle,
					displayName: 'Documents Les Étoiles',
					organization: { create: { kind: 'BAND', formedAt: new Date() } }
				}
			})
		).id;
		await db.membership.createMany({
			data: [
				{ orgId: bandId, personId: ids.lea, role: 'OWNER', status: 'ACTIVE' },
				{ orgId: bandId, personId: ids.malik, status: 'ACTIVE' }
			]
		});
		const composed = await db.work.create({
			data: {
				ownerId: bandId,
				title: 'Cœur battant',
				state: 'COMPOSED',
				proof: 'CORROBORATED',
				composedAt: new Date('2026-10-01T12:00:00Z')
			}
		});
		composedId = composed.id;
		ideaId = (await db.work.create({ data: { ownerId: bandId, title: 'Une idée' } })).id;
		const credit = async (
			name: string,
			kinds: ('LYRICS' | 'COMPOSITION' | 'INSTRUMENT')[],
			confirmed: boolean
		) => {
			const c = await db.workContributor.create({
				data: {
					workId: composedId,
					personId: ids[name],
					confirmedAt: confirmed ? new Date() : null
				}
			});
			for (const kind of kinds) {
				await db.workRole.create({ data: { workId: composedId, kind, contributorId: c.id } });
			}
		};
		await credit('lea', ['LYRICS'], true);
		await credit('malik', ['COMPOSITION'], true);
		await credit('ivy', ['INSTRUMENT'], true); // interprète : au bulletin, pas au programme
		await credit('neo', ['LYRICS'], false); // pas encore confirmé
		await credit('gone', ['COMPOSITION'], true);
		await db.actor.update({ where: { id: ids.gone }, data: { deletedAt: new Date() } });
	});

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('bulletin : crédits confirmés de comptes actifs, cases cochées d’après les rôles', async () => {
		const view = await splitSheetFor(composedId, ids.lea);
		expect(view.title).toBe('Cœur battant');
		expect(view.rows.map((r) => [r.name, r.lyrics, r.music])).toEqual([
			['Documents ivy', false, false],
			['Documents lea', true, false],
			['Documents malik', false, true]
		]);
		expect(view.facts[0]).toEqual({ label: 'Groupe', value: 'Documents Les Étoiles' });
	});

	it('bulletin : une personne créditée hors groupe y a droit, pas une personne extérieure', async () => {
		expect((await splitSheetFor(composedId, ids.ivy)).rows).toHaveLength(3);
		expect(await refusal(splitSheetFor(composedId, ids.sam))).toBe(403);
	});

	it('bulletin : refusé tant que le morceau est une idée, 404 pour un inconnu', async () => {
		expect(await refusal(splitSheetFor(ideaId, ids.lea))).toBe(409);
		expect(await refusal(splitSheetFor('inexistant', ids.lea))).toBe(404);
	});

	it('programme : les morceaux composés, auteur·rices et compositeur·rices confirmés', async () => {
		const view = await concertProgramFor(handle, ids.malik);
		expect(view.band).toBe('Documents Les Étoiles');
		expect(view.rows).toEqual([
			{ title: 'Cœur battant', creators: 'Documents lea, Documents malik' }
		]);
	});

	it('programme : réservé aux membres actifs', async () => {
		expect(await refusal(concertProgramFor(handle, ids.sam))).toBe(403);
		expect(await refusal(concertProgramFor(handle, ids.ivy))).toBe(403);
		expect(await refusal(concertProgramFor(`${PREFIX}inconnu`, ids.lea))).toBe(404);
	});
});
