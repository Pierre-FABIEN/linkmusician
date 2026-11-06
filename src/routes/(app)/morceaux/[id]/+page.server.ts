// LINKMUSICIAN: fiche d'un morceau (P3-11, D35). Une idée ne se voit que de
// son équipe (404 sinon, sans dire qu'elle existe) ; un morceau composé est
// visible de toute personne connectée, avec ses crédits confirmés. La
// gestion (porteur, ou OWNER/ADMIN du groupe) crédite, ouvre des rôles à
// pourvoir, joint la maquette et déclare le morceau composé.
import { error, fail, redirect } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { listGenreTree } from '#lib/prisma/skills/referentials';
import { instrumentFamilies, rolesOf } from '#lib/server/works/forms';
import {
	WorkError,
	addOpenRole,
	confirmCredit,
	creditPerson,
	deleteWork,
	demoCandidates,
	leaveCredit,
	markComposed,
	removeOpenRole,
	setDemo,
	updateWork,
	withdrawCredit,
	workPage
} from '#lib/server/works/service';
import { creditSchema, demoSchema, editWorkSchema, roleInputSchema } from '#lib/works/rules';
import type { Actions, PageServerLoad } from './$types';

async function me(locals: App.Locals) {
	return (await getPersonByUserId(locals.user!.id))!.actorId;
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const actorId = await me(locals);
	const work = await workPage(params.id, actorId);
	if (!work) error(404, 'Morceau introuvable');
	const [families, candidates, genres] = work.manage
		? await Promise.all([instrumentFamilies(), demoCandidates(work.id, actorId), listGenreTree()])
		: [[], [], []];
	return {
		work,
		families,
		candidates,
		genres: genres.map((g) => ({
			id: g.id,
			name: g.name,
			children: g.children.map((c) => ({ id: c.id, name: c.name }))
		})),
		created: url.searchParams.has('cree')
	};
};

/** Exécute une action du service ; ses refus deviennent un message. */
async function run(action: () => Promise<unknown>, message: string) {
	try {
		await action();
		return { message };
	} catch (err) {
		if (err instanceof WorkError) return fail(err.status, { error: err.message });
		throw err;
	}
}

async function context(locals: App.Locals, request: Request) {
	const actorId = await me(locals);
	const form = await request.formData();
	const field = (name: string) => String(form.get(name) ?? '');
	return { actorId, form, field };
}

const firstIssue = (issues: { message: string }[]) =>
	issues[0]?.message ?? 'Vérifie le formulaire.';

export const actions: Actions = {
	confirm: async ({ locals, params }) => {
		const actorId = await me(locals);
		return run(
			() => confirmCredit(params.id, actorId),
			'C’est confirmé : ton nom figure sur le morceau.'
		);
	},
	leave: async ({ locals, params }) => {
		const actorId = await me(locals);
		try {
			await leaveCredit(params.id, actorId);
		} catch (err) {
			if (err instanceof WorkError) return fail(err.status, { error: err.message });
			throw err;
		}
		redirect(303, '/morceaux');
	},
	credit: async ({ locals, params, request }) => {
		const { actorId, form, field } = await context(locals, request);
		const parsed = creditSchema.safeParse({ handle: field('handle'), roles: rolesOf(form) });
		if (!parsed.success) return fail(400, { error: firstIssue(parsed.error.issues) });
		try {
			const { person } = await creditPerson(params.id, actorId, parsed.data);
			return {
				message:
					person.id === actorId
						? 'Ton rôle est ajouté.'
						: `${person.displayName} est prévenu·e : son nom apparaîtra dès sa confirmation.`
			};
		} catch (err) {
			if (err instanceof WorkError) return fail(err.status, { error: err.message });
			throw err;
		}
	},
	withdrawCredit: async ({ locals, params, request }) => {
		const { actorId, field } = await context(locals, request);
		return run(() => withdrawCredit(params.id, actorId, field('contributorId')), 'C’est retiré.');
	},
	openRole: async ({ locals, params, request }) => {
		const { actorId, form } = await context(locals, request);
		const parsed = roleInputSchema.safeParse(rolesOf(form)[0] ?? '');
		if (!parsed.success) return fail(400, { error: 'Choisis le rôle à pourvoir.' });
		return run(() => addOpenRole(params.id, actorId, parsed.data), 'Rôle ajouté.');
	},
	removeRole: async ({ locals, params, request }) => {
		const { actorId, field } = await context(locals, request);
		return run(() => removeOpenRole(params.id, actorId, field('roleId')), 'Rôle retiré.');
	},
	demo: async ({ locals, params, request }) => {
		const { actorId, field } = await context(locals, request);
		const mediaId = field('mediaId');
		const parsed = demoSchema.safeParse(
			mediaId ? { mediaId } : { url: field('url'), title: field('demoTitle') }
		);
		if (!parsed.success) return fail(400, { error: firstIssue(parsed.error.issues) });
		return run(() => setDemo(params.id, actorId, parsed.data), 'Maquette jointe.');
	},
	compose: async ({ locals, params }) => {
		const actorId = await me(locals);
		try {
			await markComposed(params.id, actorId);
		} catch (err) {
			if (err instanceof WorkError) return fail(err.status, { error: err.message });
			throw err;
		}
		return { message: 'Bravo, le morceau est composé !', composed: true };
	},
	edit: async ({ locals, params, request }) => {
		const { actorId, form, field } = await context(locals, request);
		const parsed = editWorkSchema.safeParse({
			title: field('title'),
			genreIds: form.getAll('genreIds').map(String)
		});
		if (!parsed.success) return fail(400, { error: firstIssue(parsed.error.issues) });
		return run(() => updateWork(params.id, actorId, parsed.data), 'C’est enregistré.');
	},
	delete: async ({ locals, params }) => {
		const actorId = await me(locals);
		try {
			await deleteWork(params.id, actorId);
		} catch (err) {
			if (err instanceof WorkError) return fail(err.status, { error: err.message });
			throw err;
		}
		redirect(303, '/morceaux');
	}
};
