/**
 * Profil de manager ou de booker (P5-07) : genres suivis et ce que la
 * personne cherche. Seul point d'écriture de `agent_profiles` et
 * `agent_genres` (hors anonymisation). Règles : `#lib/crafts/agent`.
 */
import { prisma } from '#lib/server';
import { MAX_AGENT_GENRES, MAX_AGENT_PITCH } from '#lib/crafts/agent';
import { UnknownGenreError } from './producerProfile';

export { UnknownGenreError };

export type AgentProfile = {
	pitch: string | null;
	genres: { id: string; name: string }[];
};

export async function getAgentProfile(personId: string): Promise<AgentProfile | null> {
	const profile = await prisma.agentProfile.findUnique({
		where: { personId },
		select: {
			pitch: true,
			genres: { select: { genre: { select: { id: true, name: true, sortOrder: true } } } }
		}
	});
	if (!profile) return null;
	return {
		pitch: profile.pitch,
		genres: profile.genres
			.map((g) => g.genre)
			.sort((a, b) => a.sortOrder - b.sortOrder)
			.map(({ id, name }) => ({ id, name }))
	};
}

/** Remplace le profil, en une transaction. Saisie revérifiée : genres actifs (5 au plus), texte borné. */
export async function saveAgentProfile(
	personId: string,
	input: { genreIds: readonly string[]; pitch: string | null }
) {
	const genreIds = [...new Set(input.genreIds)];
	if (genreIds.length > MAX_AGENT_GENRES) throw new Error('Trop de genres');
	const pitch = input.pitch?.trim() || null;
	if (pitch && pitch.length > MAX_AGENT_PITCH) throw new Error('Texte trop long');
	const known = await prisma.genre.count({ where: { id: { in: genreIds }, active: true } });
	if (known !== genreIds.length) throw new UnknownGenreError();
	await prisma.$transaction([
		prisma.agentProfile.upsert({
			where: { personId },
			create: { personId, pitch },
			update: { pitch }
		}),
		prisma.agentGenre.deleteMany({ where: { personId } }),
		prisma.agentGenre.createMany({ data: genreIds.map((genreId) => ({ personId, genreId })) })
	]);
	return { genreIds, pitch };
}
