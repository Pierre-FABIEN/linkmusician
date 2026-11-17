/**
 * Démo ONB-12c1 (D64) : formation et répertoire déclarés de trois groupes.
 * Rejouable : une fiche déjà présente (déclarée par la démo ou modifiée à la
 * main) n'est jamais réécrite. Orbital et Néon Lagune restent « non précisé »,
 * pour montrer qu'une absence n'exclut rien.
 */
import type { BandFormation, BandRepertoire, PrismaClient } from '@prisma/client';

const LINEUPS: readonly {
	handle: string;
	formation: BandFormation;
	repertoire: BandRepertoire;
}[] = [
	{ handle: 'les-lucioles', formation: 'DUO', repertoire: 'COVERS' },
	{ handle: 'fanfare-pirate', formation: 'BAND', repertoire: 'BOTH' },
	{ handle: 'les-rats-du-mardi', formation: 'BAND', repertoire: 'ORIGINALS' }
];

export async function seedBandLineups(prisma: PrismaClient) {
	let created = 0;
	for (const l of LINEUPS) {
		const band = await prisma.organization.findFirst({
			where: { kind: 'BAND', actor: { handle: l.handle, deletedAt: null } },
			select: { actorId: true, bandProfile: { select: { orgId: true } } }
		});
		if (!band || band.bandProfile) continue;
		await prisma.bandProfile.create({
			data: { orgId: band.actorId, formation: l.formation, repertoire: l.repertoire }
		});
		created++;
	}
	console.log(
		created
			? `Formation et répertoire déclarés pour ${created} groupe(s) (D64).`
			: 'Formations des groupes déjà en place : rien à refaire.'
	);
}
