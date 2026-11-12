import { requirePerson } from '#server/actors/tracksForm';
import { canOpenStudio } from '#lib/server/studios/service';
import { isPromoter } from '#lib/server/opportunities/gigSlots';
import { isIndexable } from '#lib/actors/visibility';
import { myStructures } from '#lib/server/organizations/structures';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ locals }) => {
	const person = await requirePerson(locals);
	const [structures, studio, promoter] = await Promise.all([
		myStructures(person.actorId),
		canOpenStudio(person.actorId),
		isPromoter(person.actorId)
	]);
	const open = [
		{ href: '/groupes/nouveau', title: 'Créer un groupe', text: 'Rassembler ton équipe musicale.' }
	];
	if (studio)
		open.push({
			href: '/studios',
			title: 'Ouvrir un studio',
			text: 'Créer ou retrouver ta fiche de studio.'
		});
	if (promoter)
		open.push({
			href: '/organisations',
			title: 'Ouvrir une organisation',
			text: 'Ton association, collectif ou festival.'
		});
	if (isIndexable(person.birthDate))
		open.push({
			href: '/ecoles',
			title: 'Ouvrir une école',
			text: 'Ton école de musique, ta MJC ou ton conservatoire.'
		});
	open.push({
		href: '/lieux',
		title: 'Retrouver un lieu',
		text: 'Chercher sa fiche dans l’annuaire pour la revendiquer.'
	});
	return { structures, open };
};
