/**
 * Documents préremplis (P3-15b) : lecture des faits et contrôle d'accès.
 *
 * - Bulletin de partage : l'**équipe** du morceau (porteur, membres actifs du
 *   groupe porteur, personnes créditées), morceau **composé**, crédits
 *   confirmés seulement, comptes supprimés exclus.
 * - Programme des œuvres : les **membres actifs** d'un groupe non dissous ;
 *   ses morceaux composés, avec auteur·rices et compositeur·rices confirmés.
 *
 * L'accès passe par `workPage` et `bandPage` (visibilité, blocages, groupe
 * dissous) : un document ne montre rien que la page ne montre déjà.
 */
import { prisma } from '#lib/server';
import { workPage } from '#lib/server/works/service';
import { bandPage } from '#lib/server/bands/service';
import { roleLabel } from '#lib/works/rules';
import {
	programView,
	splitSheetView,
	type ProgramView,
	type SplitSheetView
} from '#lib/demarches/documents';

export class DocumentError extends Error {
	constructor(
		message: string,
		public status = 403
	) {
		super(message);
	}
}

const CREATOR_KINDS = ['LYRICS', 'COMPOSITION'] as const;

export async function splitSheetFor(
	workId: string,
	viewerId: string,
	now = new Date()
): Promise<SplitSheetView> {
	const work = await workPage(workId, viewerId);
	if (!work) throw new DocumentError('Morceau introuvable', 404);
	if (!work.team) throw new DocumentError('Seule l’équipe du morceau peut préparer son bulletin.');
	if (work.state !== 'COMPOSED') {
		throw new DocumentError('Le bulletin se prépare une fois le morceau déclaré composé.', 409);
	}
	const credits = await prisma.workContributor.findMany({
		where: { workId: work.id, confirmedAt: { not: null }, person: { deletedAt: null } },
		select: {
			person: { select: { displayName: true } },
			roles: { select: { kind: true, instrument: { select: { name: true } } } }
		}
	});
	return splitSheetView(
		{
			title: work.title,
			owner: { name: work.owner.name, isBand: work.owner.kind === 'ORGANIZATION' },
			composedAt: work.composedAt,
			credits: credits.map((c) => ({
				name: c.person.displayName,
				kinds: c.roles.map((r) => r.kind),
				roles: c.roles.map((r) => roleLabel(r))
			}))
		},
		now
	);
}

export async function concertProgramFor(handle: string, viewerId: string): Promise<ProgramView> {
	const band = await bandPage(handle, viewerId);
	if (!band) throw new DocumentError('Groupe introuvable', 404);
	if (band.my?.status !== 'ACTIVE' || band.dissolvedAt) {
		throw new DocumentError('Seuls les membres du groupe peuvent préparer son programme.');
	}
	const works = await prisma.work.findMany({
		where: { ownerId: band.id, state: 'COMPOSED' },
		select: {
			title: true,
			contributors: {
				where: {
					confirmedAt: { not: null },
					person: { deletedAt: null },
					roles: { some: { kind: { in: [...CREATOR_KINDS] } } }
				},
				select: { person: { select: { displayName: true } } }
			}
		}
	});
	return programView({
		band: band.name,
		works: works.map((w) => ({
			title: w.title,
			creators: w.contributors
				.map((c) => c.person.displayName)
				.sort((a, b) => a.localeCompare(b, 'fr'))
		}))
	});
}
