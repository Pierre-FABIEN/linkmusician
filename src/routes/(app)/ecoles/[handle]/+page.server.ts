// LINKMUSICIAN: une école (P5-11, D29), pour ses seuls membres (404 sinon :
// il n'y a pas de page publique, ni de liste d'élèves publique).
// - Gestion : liens d'invitation (créés, retirés ; le lien n'est montré
//   qu'une fois), élèves (retirer), ateliers à venir, « Publier un atelier ».
// - Élève : les ateliers à venir (mineur·es : finis avant 22 h), « Quitter ».
import { error, fail, redirect } from '@sveltejs/kit';
import { requirePerson } from '#server/actors/tracksForm';
import {
	createSchoolInvite,
	leaveOrRemoveStudent,
	revokeSchoolInvite,
	SchoolError,
	schoolForMember,
	schoolInvites,
	schoolStudents
} from '#lib/server/schools/service';
import { upcomingSchoolJams } from '#lib/server/jam/publicJams';
import { inviteUsesSchema } from '#lib/schools/rules';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const person = await requirePerson(locals);
	const school = await schoolForMember(params.handle, person.actorId);
	if (!school) error(404, 'École introuvable');
	const workshops = await upcomingSchoolJams(school.id, person.actorId);
	// L'identifiant interne reste côté serveur.
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { id: _id, ...publicSchool } = school;
	if (!school.manager) {
		return { school: publicSchool, workshops, invites: [], students: [], created: false };
	}
	const [invites, students] = await Promise.all([
		schoolInvites(params.handle, person.actorId),
		schoolStudents(params.handle, person.actorId)
	]);
	return {
		school: publicSchool,
		workshops,
		invites,
		students,
		created: url.searchParams.has('creee')
	};
};

const guard = async <T>(run: () => Promise<T>) => {
	try {
		return await run();
	} catch (err) {
		if (err instanceof SchoolError) return fail(err.status, { error: err.message });
		throw err;
	}
};

export const actions: Actions = {
	invite: async ({ locals, params, request, url }) => {
		const person = await requirePerson(locals);
		const uses = inviteUsesSchema.safeParse((await request.formData()).get('uses'));
		if (!uses.success) return fail(400, { error: uses.error.issues[0]?.message });
		return guard(async () => {
			const token = await createSchoolInvite(params.handle, person.actorId, uses.data);
			return { link: `${url.origin}/ecole/${token}` };
		});
	},
	revoke: async ({ locals, params, request }) => {
		const person = await requirePerson(locals);
		const id = String((await request.formData()).get('id') ?? '');
		return guard(async () => {
			await revokeSchoolInvite(params.handle, person.actorId, id);
			return { done: 'Lien retiré : il ne sert plus.' };
		});
	},
	remove: async ({ locals, params, request }) => {
		const person = await requirePerson(locals);
		const id = String((await request.formData()).get('membershipId') ?? '');
		return guard(async () => {
			await leaveOrRemoveStudent(params.handle, person.actorId, id);
			return { done: 'C’est fait.' };
		});
	},
	leave: async ({ locals, params, request }) => {
		const person = await requirePerson(locals);
		const id = String((await request.formData()).get('membershipId') ?? '');
		const result = await guard(async () => {
			await leaveOrRemoveStudent(params.handle, person.actorId, id);
			return null;
		});
		if (result) return result;
		redirect(303, '/ecoles');
	}
};
