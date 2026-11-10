/**
 * Assistant d'inscription (P3-17, D47) côté serveur.
 *
 * - **Désactivé par défaut** : `ONBOARDING_ASSISTANT_ENABLED=1` et une clé
 *   `ANTHROPIC_API_KEY` sont requis. D47 : ne pas l'ouvrir tant que les
 *   garanties du fournisseur (conservation, sous-traitants) ne sont pas
 *   vérifiées (voir `docs/onboarding/assistant.md`).
 * - Seulement pendant l'onboarding, après action explicite et accord.
 * - Quota : `ASSISTANT_QUOTA` analyses par compte, réservées atomiquement,
 *   rendues si le fournisseur échoue.
 * - Le texte et la réponse brute ne sont **ni stockés ni journalisés** : les
 *   erreurs sont journalisées par leur classe et leur statut seulement.
 * - Le modèle n'a aucun outil et n'agit sur rien : il renvoie un objet,
 *   validé par Zod puis confronté aux référentiels (`validateProposals`).
 */
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { prisma } from '#lib/server';
import { incrementMetric } from '#lib/server/metrics';
import {
	ASSISTANT_MAX_CHARS,
	ASSISTANT_MIN_CHARS,
	ASSISTANT_QUOTA,
	MODEL_OUTPUT,
	isEmpty,
	minimize,
	proposedFieldCount,
	systemPrompt,
	validateProposals,
	type AssistantReferentials,
	type ModelOutput,
	type Proposals
} from '#lib/onboarding/assistant';

export const ASSISTANT_MODEL = 'claude-haiku-5-5';
const TIMEOUT_MS = 20_000;

export class AssistantError extends Error {
	constructor(
		message: string,
		public status: number,
		public code: 'unavailable' | 'quota' | 'input' | 'provider' | 'empty' | 'onboarded'
	) {
		super(message);
	}
}

/** Fournisseur : un texte minimisé et le prompt système → une sortie validée ou `null`. */
export type AssistantProvider = (input: {
	system: string;
	text: string;
}) => Promise<{ output: ModelOutput | null; inputTokens: number; outputTokens: number }>;

/**
 * Fournisseur factice et déterministe pour les e2e et le dev
 * (`ONBOARDING_ASSISTANT_FAKE=1`), **jamais en production** : il reconnaît
 * quelques mots, sans aucun appel externe.
 */
export function fakeAssistant(env: NodeJS.ProcessEnv = process.env): boolean {
	return (
		env.ONBOARDING_ASSISTANT_FAKE === '1' &&
		env.NODE_ENV !== 'production' &&
		env.VERCEL_ENV !== 'production'
	);
}

export const fakeProvider: AssistantProvider = async ({ text }) => {
	const t = text.toLowerCase();
	const has = (word: string) => t.includes(word);
	return {
		output: {
			tracks: has('musicien') || has('joue') ? ['MUSICIAN'] : [],
			instruments: [
				...(has('basse') ? [{ slug: 'basse', level: has('confirmé') ? 3 : null }] : []),
				...(has('batterie') ? [{ slug: 'batterie', level: null }] : [])
			],
			genres: [...(has('rock') ? ['rock'] : []), ...(has('jazz') ? ['jazz'] : [])],
			commune: has('toulouse') ? 'Toulouse' : has('blagnac') ? 'Blagnac' : null,
			radiusKm: has('25 km') ? 25 : null,
			lookingFor: [
				...(has('groupe') ? (['BAND'] as const) : []),
				...(has('jam') ? (['JAMS'] as const) : [])
			]
		},
		inputTokens: 0,
		outputTokens: 0
	};
};

export function assistantAvailable(env: NodeJS.ProcessEnv = process.env): boolean {
	if (fakeAssistant(env)) return true;
	return env.ONBOARDING_ASSISTANT_ENABLED === '1' && Boolean(env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;

/** Claude Haiku, sortie structurée, aucun outil, effort bas (extraction simple). */
export const anthropicProvider: AssistantProvider = async ({ system, text }) => {
	client ??= new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 1 });
	const response = await client.messages.parse({
		model: ASSISTANT_MODEL,
		max_tokens: 2048,
		output_config: { effort: 'low', format: zodOutputFormat(MODEL_OUTPUT) },
		system,
		messages: [{ role: 'user', content: `<description>\n${text}\n</description>` }]
	});
	const usable = response.stop_reason === 'end_turn' && response.parsed_output != null;
	return {
		output: usable ? response.parsed_output : null,
		inputTokens: response.usage.input_tokens,
		outputTokens: response.usage.output_tokens
	};
};

/** Référentiels actifs servis au modèle (identifiants, jamais d'autre donnée). */
export async function assistantReferentials(): Promise<AssistantReferentials> {
	const [instruments, genres] = await Promise.all([
		prisma.instrument.findMany({
			where: { active: true },
			orderBy: { name: 'asc' },
			select: { id: true, slug: true, name: true }
		}),
		prisma.genre.findMany({
			where: { active: true },
			orderBy: { name: 'asc' },
			select: { id: true, slug: true, name: true }
		})
	]);
	return { instruments, genres };
}

/** Analyses restantes pour cette personne (0 si l'aide est indisponible). */
export async function assistantState(actorId: string) {
	if (!assistantAvailable()) return { available: false, remaining: 0 };
	const person = await prisma.person.findUnique({
		where: { actorId },
		select: { assistantRuns: true, onboardedAt: true }
	});
	if (!person || person.onboardedAt) return { available: false, remaining: 0 };
	return { available: true, remaining: Math.max(0, ASSISTANT_QUOTA - person.assistantRuns) };
}

export async function runAssistant(
	actorId: string,
	rawText: unknown,
	options: { provider?: AssistantProvider; env?: NodeJS.ProcessEnv } = {}
): Promise<{ proposals: Proposals; remaining: number; removed: number }> {
	if (!assistantAvailable(options.env)) {
		throw new AssistantError('L’aide n’est pas disponible pour le moment.', 503, 'unavailable');
	}
	if (typeof rawText !== 'string') throw new AssistantError('Texte manquant.', 400, 'input');
	const trimmed = rawText.trim();
	if (trimmed.length < ASSISTANT_MIN_CHARS) {
		throw new AssistantError('Écris quelques phrases de plus.', 400, 'input');
	}
	if (trimmed.length > ASSISTANT_MAX_CHARS) {
		throw new AssistantError(`${ASSISTANT_MAX_CHARS} caractères au plus.`, 400, 'input');
	}
	const person = await prisma.person.findUnique({
		where: { actorId },
		select: { onboardedAt: true }
	});
	if (!person || person.onboardedAt) {
		throw new AssistantError('L’aide sert seulement pendant l’inscription.', 403, 'onboarded');
	}
	// Réservation atomique d'une analyse.
	const reserved = await prisma.person.updateMany({
		where: { actorId, assistantRuns: { lt: ASSISTANT_QUOTA } },
		data: { assistantRuns: { increment: 1 } }
	});
	if (reserved.count === 0) {
		await incrementMetric('onboarding_assistant.quota');
		throw new AssistantError(
			'Tu as utilisé tes analyses : continue avec les écrans habituels.',
			429,
			'quota'
		);
	}
	const release = () =>
		prisma.person.updateMany({
			where: { actorId, assistantRuns: { gt: 0 } },
			data: { assistantRuns: { decrement: 1 } }
		});
	const { text, removed } = minimize(trimmed);
	const refs = await assistantReferentials();
	await incrementMetric('onboarding_assistant.run');
	let result: Awaited<ReturnType<AssistantProvider>>;
	try {
		const provider =
			options.provider ?? (fakeAssistant(options.env) ? fakeProvider : anthropicProvider);
		result = await provider({ system: systemPrompt(refs), text });
	} catch (err) {
		await release();
		await incrementMetric('onboarding_assistant.failed');
		// Jamais le texte ni la réponse : la classe et le statut seulement.
		const status = err instanceof Anthropic.APIError ? err.status : undefined;
		console.error('[assistant-inscription] échec du fournisseur', {
			error: err instanceof Error ? err.name : 'inconnu',
			status
		});
		throw new AssistantError(
			'L’aide ne répond pas. Rien n’a été enregistré : continue avec les écrans habituels.',
			502,
			'provider'
		);
	}
	await Promise.all([
		incrementMetric('onboarding_assistant.input_tokens', result.inputTokens),
		incrementMetric('onboarding_assistant.output_tokens', result.outputTokens)
	]);
	if (!result.output) {
		await release();
		await incrementMetric('onboarding_assistant.failed');
		throw new AssistantError(
			'L’aide n’a pas su lire ta description. Rien n’a été enregistré.',
			502,
			'provider'
		);
	}
	const proposals = validateProposals(result.output, refs);
	await Promise.all([
		incrementMetric('onboarding_assistant.proposed_fields', proposedFieldCount(proposals)),
		proposals.dropped ? incrementMetric('onboarding_assistant.dropped', proposals.dropped) : null
	]);
	if (isEmpty(proposals)) {
		await incrementMetric('onboarding_assistant.empty');
		throw new AssistantError(
			'Rien de précis à proposer : ajoute tes instruments, tes styles ou ta ville.',
			422,
			'empty'
		);
	}
	const after = await prisma.person.findUniqueOrThrow({
		where: { actorId },
		select: { assistantRuns: true }
	});
	return { proposals, remaining: Math.max(0, ASSISTANT_QUOTA - after.assistantRuns), removed };
}

/** Ce que la personne fait des propositions : un compteur, aucune valeur. */
export const USAGE_EVENTS = ['applied', 'ignored', 'removed', 'edited'] as const;
export type UsageEvent = (typeof USAGE_EVENTS)[number];

export async function recordUsage(event: unknown, count: unknown = 1): Promise<boolean> {
	if (!(USAGE_EVENTS as readonly unknown[]).includes(event)) return false;
	const n =
		typeof count === 'number' && Number.isInteger(count) ? Math.min(Math.max(count, 1), 30) : 1;
	await incrementMetric(`onboarding_assistant.${event as UsageEvent}`, n);
	return true;
}
