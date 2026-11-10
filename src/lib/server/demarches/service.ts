/**
 * Démarches au bon moment (P3-15a) : les faits de chaque écran, lus en base,
 * qui choisissent la démarche à annoncer (`#lib/demarches/nudges`). Les
 * masquages sont ceux des conseils (`persons.tipsDismissed`).
 */
import { prisma } from '#lib/server';
import { adultBirthCutoff } from '#lib/actors/visibility';
import { nudgeFor, type ShownNudge } from '#lib/demarches/nudges';

type Viewer = { tipsDismissed: string[] };

/** Fiche d'un morceau : seulement pour son équipe, une fois composé. */
export function workNudge(
	work: { id: string; state: string; team: boolean; credits: { confirmed: boolean }[] },
	viewer: Viewer
): ShownNudge | null {
	if (!work.team) return null;
	return nudgeFor(
		'morceau',
		{
			composed: work.state === 'COMPOSED',
			confirmedCredits: work.credits.filter((c) => c.confirmed).length,
			documents: { bulletin: `/morceaux/${work.id}/bulletin` }
		},
		viewer.tipsDismissed
	);
}

/** Page d'un groupe : pour ses membres actifs. */
export async function bandNudge(
	band: { id: string; handle: string },
	milestones: readonly { key: string }[],
	viewer: Viewer,
	now = new Date()
): Promise<ShownNudge | null> {
	const minors = await prisma.membership.count({
		where: {
			orgId: band.id,
			status: 'ACTIVE',
			person: { person: { birthDate: { gt: adultBirthCutoff(now) } } }
		}
	});
	return nudgeFor(
		'groupe',
		{
			milestones: milestones.map((m) => m.key),
			hasMinor: minors > 0,
			documents: { programme: `/groupes/${band.handle}/programme` }
		},
		viewer.tipsDismissed
	);
}

/** Fiche d'une annonce. */
export function opportunityNudge(kind: string, viewer: Viewer): ShownNudge | null {
	return nudgeFor('annonce', { opportunityKind: kind }, viewer.tipsDismissed);
}
