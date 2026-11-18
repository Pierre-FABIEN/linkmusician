// LINKMUSICIAN: page d'une branche de la carte (N2, conception 21 §10.3) :
// possible maintenant, en cours, réalisé, premières fois et épreuves, pas
// possible pour l'instant. Privée : l'acteur lui-même, droits côté serveur.
import { error } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { BRANCH_INFO, branchFromSlug } from '#lib/career/map';
import { branchDetail } from '#lib/career/branch';
import { careerBranchFor } from '#lib/server/career/map';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const branch = branchFromSlug(params.branche);
	if (!branch) error(404, 'Branche introuvable');
	const person = (await getPersonByUserId(locals.user!.id))!;
	const read = await careerBranchFor(person.actorId, person.ambition, branch);
	return {
		branch: { id: branch, ...BRANCH_INFO[branch] },
		detail: branchDetail(branch, read.map, read.reach, read.realisations, read.titles),
		soloOnly: branch === 'CREATION' && read.map.soloOnly
	};
};
