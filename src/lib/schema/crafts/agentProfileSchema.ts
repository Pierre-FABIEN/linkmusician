/**
 * « Mon profil de manager ou de booker » (P5-07) : genres suivis et ce que
 * je cherche. Règles dans `#lib/crafts/agent`. Envoyé en JSON.
 */
import { z } from 'zod';
import { MAX_AGENT_GENRES, MAX_AGENT_PITCH } from '#lib/crafts/agent';

export const agentProfileSchema = z.object({
	genreIds: z
		.array(z.string().min(1).max(60))
		.default([])
		.refine((ids) => new Set(ids).size <= MAX_AGENT_GENRES, `${MAX_AGENT_GENRES} genres au plus.`),
	pitch: z
		.string()
		.trim()
		.max(MAX_AGENT_PITCH, `${MAX_AGENT_PITCH} caractères au plus.`)
		.default('')
});

export type AgentProfileForm = z.infer<typeof agentProfileSchema>;
