// LINKMUSICIAN: fiche du groupe (P3-02), pour la gestion (OWNER, ADMIN) :
// nom, présentation, genres, ville (centre de commune seulement), liens
// d'écoute. Ce qui s'affiche sur la page publique `/@handle`.
import { error, fail } from '@sveltejs/kit';
import { prisma } from '#lib/server';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { listGenreTree } from '#lib/prisma/skills/referentials';
import { getCommune } from '#lib/server/geo/communes';
import { getActorLocation } from '#lib/server/geo/queries';
import { listOwnMedia } from '#lib/server/media/service';
import {
	BandError,
	addBandMedia,
	bandPage,
	deleteBandMedia,
	updateBandProfile
} from '#lib/server/bands/service';
import { bandProfileSchema, isManager } from '#lib/bands/rules';
import type { Actions, PageServerLoad } from './$types';

async function managed(locals: App.Locals, handle: string) {
	const { actorId } = (await getPersonByUserId(locals.user!.id))!;
	const band = await bandPage(handle, actorId);
	if (!band || band.dissolvedAt) error(404, 'Groupe introuvable');
	if (!isManager(band.my?.role))
		error(403, 'Seules les personnes qui gèrent le groupe modifient sa fiche.');
	return { actorId, band };
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const { band } = await managed(locals, params.handle);
	const [genres, current, location, media] = await Promise.all([
		listGenreTree(),
		prisma.actorGenre.findMany({ where: { actorId: band.id }, select: { genreId: true } }),
		getActorLocation(band.id),
		listOwnMedia(band.id)
	]);
	return {
		band: { handle: band.handle, name: band.name, bio: band.bio },
		genres,
		genreIds: current.map((g) => g.genreId),
		commune: location
			? {
					code: location.communeCode,
					nom: location.communeName,
					codeDepartement: location.departmentCode
				}
			: null,
		media: media.map((m) => ({
			id: m.id,
			title: m.title,
			status: m.status,
			externalUrl: m.externalUrl
		}))
	};
};

export const actions: Actions = {
	save: async ({ locals, params, request }) => {
		const { actorId, band } = await managed(locals, params.handle);
		const data = await request.formData();
		const parsed = bandProfileSchema.safeParse({
			name: String(data.get('name') ?? ''),
			bio: String(data.get('bio') ?? ''),
			genreIds: data.getAll('genreIds').map(String),
			communeCode: String(data.get('communeCode') ?? '')
		});
		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues[0]?.message ?? 'Vérifie le formulaire.' });
		}
		let commune = null;
		if (parsed.data.communeCode) {
			try {
				commune = await getCommune(parsed.data.communeCode);
			} catch {
				return fail(502, {
					error: 'Le service des communes ne répond pas. Réessaie dans un instant.'
				});
			}
			if (!commune) return fail(400, { error: 'Choisis une commune dans la liste.' });
		}
		try {
			await updateBandProfile(band.id, actorId, { ...parsed.data, commune });
		} catch (err) {
			if (err instanceof BandError) return fail(err.status, { error: err.message });
			throw err;
		}
		return { message: 'La fiche du groupe est enregistrée.' };
	},
	addLink: async ({ locals, params, request }) => {
		const { actorId, band } = await managed(locals, params.handle);
		const data = await request.formData();
		const url = String(data.get('url') ?? '');
		try {
			const media = await addBandMedia(band.id, actorId, {
				url,
				title: String(data.get('title') ?? '')
			});
			return {
				message:
					media.status === 'PUBLISHED'
						? 'Le lien est publié sur la page du groupe.'
						: 'Le lien est enregistré : il sera visible après validation.'
			};
		} catch (err) {
			if (err instanceof BandError) return fail(err.status, { error: err.message, url });
			throw err;
		}
	},
	deleteLink: async ({ locals, params, request }) => {
		const { actorId, band } = await managed(locals, params.handle);
		const id = String((await request.formData()).get('id') ?? '');
		try {
			await deleteBandMedia(band.id, actorId, id);
		} catch (err) {
			if (err instanceof BandError) return fail(err.status, { error: err.message });
			throw err;
		}
		return { message: 'Lien retiré.' };
	}
};
