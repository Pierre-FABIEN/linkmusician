// LINKMUSICIAN: fiche privée d'un projet (P2, D72 ; présentation U2). Une seule
// lecture serveur (`projectView`) : projet inexistant ou inaccessible, même
// 404 ; un élément non partagé n'arrive jamais jusqu'au navigateur. Chaque
// action relit les droits sous verrou (service), l'identité vient de la session.
import { error, fail, redirect } from '@sveltejs/kit';
import { requirePerson } from '#server/actors/tracksForm';
import { projectView, rangeableWorks } from '#server/projects/view';
import {
	PROJECT_NOT_FOUND,
	ProjectError,
	addProjectItem,
	deleteProject,
	removeProjectItem,
	setProjectStatus,
	updateProject,
	updateProjectItemShare
} from '#server/projects/service';
import {
	answerCapability,
	inviteCandidates,
	inviteMany,
	inviteParticipant,
	leaveProject,
	proposeCapability,
	removeParticipant,
	revokeCapability
} from '#server/projects/participants';
import {
	addItemSchema,
	editProjectSchema,
	itemRefSchema,
	itemShareSchema,
	projectStatusSchema,
	capabilityAnswerSchema,
	inviteSchema,
	participantRefSchema
} from '#lib/schema/projects/project';
import { FAMILY_BLOCKS, familyOf, nextProjectAction, progressLine } from '#lib/projects/overview';
import { bulkInviteSummary } from '#lib/projects/participants';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, setHeaders, url }) => {
	const person = await requirePerson(locals);
	setHeaders({ 'cache-control': 'private, no-store' });
	const project = await projectView(params.id, person.actorId);
	if (!project) error(404, PROJECT_NOT_FOUND);
	// Ranger : gestion ou coordination seulement (P4a), projet en cours.
	const organise =
		project.status === 'ACTIVE' &&
		project.can.live &&
		(project.can.manage || project.can.coordinate);
	// U3 : personnes connues à inviter, lues pour qui peut inviter seulement.
	const [rangeable, invite] = organise
		? await Promise.all([
				rangeableWorks(person.actorId, project.id),
				inviteCandidates(person.actorId, project.id)
			])
		: [[], null];
	// U2 : composition par famille et une seule prochaine action, calculées
	// sur ce que je vois et ce que je peux faire (`#lib/projects/overview`).
	const family = familyOf(project.kind);
	const next = nextProjectAction({
		projectId: project.id,
		status: project.status,
		family,
		manages: organise,
		role: project.role,
		others: project.team.filter((m) => !m.isMe).length,
		ownerIsBand: project.owner.isBand,
		capabilityOffer: (project.me?.proposed.length ?? 0) > 0,
		visibleItems: project.counts.items,
		resumable: project.resumable,
		rangeable: rangeable.length,
		hasDates: !!(project.startsOn || project.dueOn),
		hasDescription: !!project.description?.trim()
	});
	// Depuis « Hors projet » : `?ranger=<morceau>` présélectionne un morceau,
	// seulement s'il est parmi ceux que je peux ranger ici (rien d'autre n'est lu).
	const wanted = url.searchParams.get('ranger');
	return {
		project,
		family,
		blocks: FAMILY_BLOCKS[family],
		next,
		progress: progressLine({
			family,
			items: project.counts.items,
			composed: project.counts.composed,
			startsOn: project.startsOn,
			dueOn: project.dueOn
		}),
		rangeable,
		invite: invite ?? { candidates: [], canPropose: false },
		preselect: wanted && rangeable.some((w) => w.id === wanted) ? wanted : null
	};
};

type Result = { ok?: string; error?: string; action?: string };

async function run(action: string, fn: () => Promise<unknown>, ok: string) {
	try {
		await fn();
	} catch (err) {
		if (err instanceof ProjectError) return fail(err.status, { action, error: err.message });
		throw err;
	}
	return { action, ok } satisfies Result;
}

async function formOf(request: Request) {
	return Object.fromEntries(await request.formData()) as Record<string, string>;
}

const invalid = (action: string, issues: { message: string }[]) =>
	fail(400, { action, error: issues[0]?.message ?? 'Vérifie le formulaire.' });

export const actions: Actions = {
	ranger: async ({ locals, params, request }) => {
		const person = await requirePerson(locals);
		const parsed = addItemSchema.safeParse(await formOf(request));
		if (!parsed.success) return invalid('ranger', parsed.error.issues);
		return run(
			'ranger',
			() => addProjectItem(person.actorId, params.id, parsed.data),
			'Morceau rangé. Il reste à toi, avec ses crédits.'
		);
	},
	partage: async ({ locals, params, request }) => {
		const person = await requirePerson(locals);
		const parsed = itemShareSchema.safeParse(await formOf(request));
		if (!parsed.success) return invalid('partage', parsed.error.issues);
		return run(
			'partage',
			() => updateProjectItemShare(person.actorId, params.id, parsed.data),
			'Partage mis à jour.'
		);
	},
	retirer: async ({ locals, params, request }) => {
		const person = await requirePerson(locals);
		const parsed = itemRefSchema.safeParse(await formOf(request));
		if (!parsed.success) return invalid('retirer', parsed.error.issues);
		return run(
			'retirer',
			() => removeProjectItem(person.actorId, params.id, parsed.data.itemId),
			'Morceau retiré du projet. Le morceau lui-même n’a pas changé.'
		);
	},
	modifier: async ({ locals, params, request }) => {
		const person = await requirePerson(locals);
		const parsed = editProjectSchema.safeParse(await formOf(request));
		if (!parsed.success) return invalid('modifier', parsed.error.issues);
		return run(
			'modifier',
			() => updateProject(person.actorId, params.id, parsed.data),
			'Projet mis à jour.'
		);
	},
	etat: async ({ locals, params, request }) => {
		const person = await requirePerson(locals);
		const parsed = projectStatusSchema.safeParse(await formOf(request));
		if (!parsed.success) return invalid('etat', parsed.error.issues);
		return run(
			'etat',
			() => setProjectStatus(person.actorId, params.id, parsed.data.status),
			'État du projet mis à jour.'
		);
	},
	// P4a : équipe. Le client n'envoie que des intentions ; capacités et droits
	// sont relus côté serveur, sous verrou.
	inviter: async ({ locals, params, request }) => {
		const person = await requirePerson(locals);
		const parsed = inviteSchema.safeParse(await formOf(request));
		if (!parsed.success) return invalid('inviter', parsed.error.issues);
		try {
			const invitee = await inviteParticipant(person.actorId, params.id, parsed.data);
			return { action: 'inviter', ok: `Invitation envoyée à ${invitee.displayName}.` };
		} catch (err) {
			if (err instanceof ProjectError)
				return fail(err.status, { action: 'inviter', error: err.message });
			throw err;
		}
	},
	// U3 (UX-8) : une invitation par membre du groupe porteur, chacune à
	// accepter. La liste est relue côté serveur : le client n'envoie que l'intention.
	'inviter-membres': async ({ locals, params }) => {
		const person = await requirePerson(locals);
		const found = await inviteCandidates(person.actorId, params.id);
		if (!found) return fail(404, { action: 'inviter-membres', error: PROJECT_NOT_FOUND });
		const members = found.candidates.filter((c) => c.member).map((c) => c.id);
		if (members.length === 0)
			return fail(409, {
				action: 'inviter-membres',
				error: 'Tous les membres du groupe sont déjà invité·es ou dans le projet.'
			});
		try {
			const result = await inviteMany(person.actorId, params.id, members);
			return { action: 'inviter-membres', ok: bulkInviteSummary(result) };
		} catch (err) {
			if (err instanceof ProjectError)
				return fail(err.status, { action: 'inviter-membres', error: err.message });
			throw err;
		}
	},
	'retirer-personne': async ({ locals, params, request }) => {
		const person = await requirePerson(locals);
		const parsed = participantRefSchema.safeParse(await formOf(request));
		if (!parsed.success) return invalid('retirer-personne', parsed.error.issues);
		return run(
			'retirer-personne',
			() => removeParticipant(person.actorId, params.id, parsed.data.participantId),
			'C’est fait : cette personne ne participe plus au projet.'
		);
	},
	proposer: async ({ locals, params, request }) => {
		const person = await requirePerson(locals);
		const parsed = participantRefSchema.safeParse(await formOf(request));
		if (!parsed.success) return invalid('proposer', parsed.error.issues);
		return run(
			'proposer',
			() => proposeCapability(person.actorId, params.id, parsed.data.participantId, 'COORDINATE'),
			'Coordination proposée : elle vaudra quand la personne l’aura acceptée.'
		);
	},
	revoquer: async ({ locals, params, request }) => {
		const person = await requirePerson(locals);
		const parsed = participantRefSchema.safeParse(await formOf(request));
		if (!parsed.success) return invalid('revoquer', parsed.error.issues);
		return run(
			'revoquer',
			() => revokeCapability(person.actorId, params.id, parsed.data.participantId, 'COORDINATE'),
			'Coordination retirée.'
		);
	},
	capacite: async ({ locals, params, request }) => {
		const person = await requirePerson(locals);
		const parsed = capabilityAnswerSchema.safeParse(await formOf(request));
		if (!parsed.success) return invalid('capacite', parsed.error.issues);
		const accept = parsed.data.answer === 'accept';
		return run(
			'capacite',
			() => answerCapability(person.actorId, params.id, accept),
			accept ? 'Tu coordonnes ce projet.' : 'Proposition déclinée.'
		);
	},
	quitter: async ({ locals, params }) => {
		const person = await requirePerson(locals);
		try {
			await leaveProject(person.actorId, params.id);
		} catch (err) {
			if (err instanceof ProjectError)
				return fail(err.status, { action: 'quitter', error: err.message });
			throw err;
		}
		redirect(303, '/projets?quitte');
	},
	supprimer: async ({ locals, params }) => {
		const person = await requirePerson(locals);
		try {
			await deleteProject(person.actorId, params.id);
		} catch (err) {
			if (err instanceof ProjectError)
				return fail(err.status, { action: 'supprimer', error: err.message });
			throw err;
		}
		redirect(303, '/projets?supprime');
	}
};
