/**
 * Assistant d'inscription (P3-17, D47) sur la base de `.env`, schéma `e2e`,
 * avec un fournisseur simulé (aucun appel réel) : indisponible sans
 * interrupteur, seulement pendant l'onboarding, texte minimisé avant envoi,
 * quota de 3 analyses rendu en cas d'échec, rien d'autre enregistré.
 * Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/onboarding-assistant
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createPrismaClient } from '../../../prisma/client.js';
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
vi.mock('#lib/server/metrics', () => ({ incrementMetric: vi.fn(async () => {}) }));

const { runAssistant, assistantState, AssistantError } = await import('./onboarding-assistant');
type Provider = NonNullable<Parameters<typeof runAssistant>[2]>['provider'];

const PREFIX = 'assistant-test-';
const ENV = { ONBOARDING_ASSISTANT_ENABLED: '1', ANTHROPIC_API_KEY: 'test' } as NodeJS.ProcessEnv;
const TEXT =
	'Je joue de la basse et un peu de chant, plutôt rock. Écris-moi à lea@example.test, je suis à Blagnac.';

describe.skipIf(!enabled)('assistant d’inscription (schéma e2e)', { timeout: 60_000 }, () => {
	let actorId = '';
	const seen: string[] = [];
	const good: Provider = async ({ text }) => {
		seen.push(text);
		return {
			output: {
				tracks: ['MUSICIAN'],
				instruments: [
					{ slug: 'basse', level: null },
					{ slug: 'instrument-invente', level: 2 }
				],
				genres: ['rock'],
				commune: 'Blagnac',
				radiusKm: null,
				lookingFor: ['BAND']
			},
			inputTokens: 100,
			outputTokens: 20
		};
	};
	const failing: Provider = async () => {
		throw new Error('panne');
	};

	async function cleanup() {
		const actors = await db.actor.findMany({
			where: { handle: { startsWith: PREFIX } },
			select: { id: true }
		});
		await db.actor.deleteMany({ where: { id: { in: actors.map((a) => a.id) } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
	}
	const status = (p: Promise<unknown>) =>
		p.then(
			() => null,
			(err: unknown) => (err instanceof AssistantError ? err.status : err)
		);
	const runs = async () =>
		(await db.person.findUniqueOrThrow({ where: { actorId }, select: { assistantRuns: true } }))
			.assistantRuns;

	beforeAll(async () => {
		await cleanup();
		const user = await db.user.create({
			data: { email: `${PREFIX}lea@example.test`, referralCode: `${PREFIX}lea` }
		});
		actorId = (
			await db.actor.create({
				data: {
					kind: 'PERSON',
					handle: `${PREFIX}lea`,
					displayName: 'Assistant Lea',
					person: { create: { userId: user.id, termsAcceptedAt: new Date() } }
				}
			})
		).id;
	});

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('indisponible sans interrupteur ni clé', async () => {
		expect(await status(runAssistant(actorId, TEXT, { provider: good, env: {} }))).toBe(503);
		expect(await runs()).toBe(0);
	});

	it('texte trop court : refusé sans consommer d’analyse', async () => {
		expect(await status(runAssistant(actorId, 'basse', { provider: good, env: ENV }))).toBe(400);
		expect(await runs()).toBe(0);
	});

	it('propositions validées ; le fournisseur ne reçoit pas l’email', async () => {
		const result = await runAssistant(actorId, TEXT, { provider: good, env: ENV });
		expect(seen.at(-1)).not.toContain('lea@example.test');
		expect(result.removed).toBe(1);
		expect(result.proposals.tracks).toEqual(['MUSICIAN']);
		expect(result.proposals.instruments.map((i) => [i.name, i.level])).toEqual([
			['Basse électrique', null]
		]);
		expect(result.proposals.genres.map((g) => g.name)).toEqual(['Rock']);
		expect(result.proposals.communeQuery).toBe('Blagnac');
		expect(result.proposals.dropped).toBe(1);
		expect(result.remaining).toBe(2);
		// Rien n'est enregistré dans le profil.
		const person = await db.person.findUniqueOrThrow({
			where: { actorId },
			select: { lookingFor: true, tracks: true, instruments: true }
		});
		expect(person).toEqual({ lookingFor: [], tracks: [], instruments: [] });
	});

	it('un échec du fournisseur rend l’analyse', async () => {
		expect(await status(runAssistant(actorId, TEXT, { provider: failing, env: ENV }))).toBe(502);
		expect(await runs()).toBe(1);
	});

	it('3 analyses par compte, puis 429', async () => {
		await runAssistant(actorId, TEXT, { provider: good, env: ENV });
		await runAssistant(actorId, TEXT, { provider: good, env: ENV });
		expect(await runs()).toBe(3);
		expect(await status(runAssistant(actorId, TEXT, { provider: good, env: ENV }))).toBe(429);
		expect(await runs()).toBe(3);
	});

	it('après l’onboarding : plus d’aide', async () => {
		await db.person.update({
			where: { actorId },
			data: { assistantRuns: 0, onboardedAt: new Date() }
		});
		expect(await status(runAssistant(actorId, TEXT, { provider: good, env: ENV }))).toBe(403);
		vi.stubEnv('ONBOARDING_ASSISTANT_ENABLED', '1');
		vi.stubEnv('ANTHROPIC_API_KEY', 'test');
		expect(await assistantState(actorId)).toEqual({ available: false, remaining: 0 });
		vi.unstubAllEnvs();
	});
});
