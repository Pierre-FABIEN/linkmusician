/**
 * Complétude d'un profil, par métier (ONB-12b, D61). Module pur.
 *
 * Mesure ce qui rend un profil **exploitable** pour une mise en relation, pas
 * sa richesse : chaque manque dit ce qu'il coûte (« sans offre cochée, tu
 * n'apparais pas comme prestataire »). Pas de pourcentage, d'XP ni de rang ;
 * un champ facultatif est proposé « pour aller plus loin », sans pénalité.
 * Les données communes (ville, genres) sont comptées une fois, à part.
 * Un métier « bientôt » (D15) n'exige rien.
 */
import { TRACKS, type TrackKindValue } from './tracks';
import { TRACK_ROLES } from './roles';
import { isRequired, visibleFields } from './trackFields';
import type { RecapInput, TrackRecapInput } from '#lib/onboarding/recap';

export type CompletenessItem = {
	id: string;
	label: string;
	/** Ce que l'ajout apporte, concrètement. */
	benefit: string;
	href: string;
};

export type TrackCompleteness = {
	track: TrackKindValue;
	label: string;
	href: string;
	/** Métier « bientôt » : rien d'exigé. */
	soon: boolean;
	/** Ce qui manque pour être exploitable. */
	missing: CompletenessItem[];
	/** Pour aller plus loin : jamais compté comme un manque. */
	optional: CompletenessItem[];
};

export type ProfileCompleteness = {
	/** Données communes, demandées une fois pour tous les métiers. */
	common: CompletenessItem[];
	tracks: TrackCompleteness[];
};

export type CompletenessInput = RecapInput & {
	/** « Ouvert aux sollicitations » de chaque métier (`null` : non précisé). */
	openToRequests: Partial<Record<TrackKindValue, boolean | null>>;
};

const EMPTY: TrackRecapInput = { specializations: [], offers: [], needs: [], answers: {} };

/** Page où se complète un métier. */
export function trackProfileHref(track: TrackKindValue): string {
	return TRACK_ROLES[track].onboarding.ownStep
		? `/profil/metier/${TRACK_ROLES[track].slug}`
		: '/profil/pratique';
}

function commonItems(input: RecapInput): CompletenessItem[] {
	const items: CompletenessItem[] = [];
	if (!input.commune)
		items.push({
			id: 'commune',
			label: 'Ta ville',
			benefit: 'Sans ville, personne ne te trouve près de chez lui ou chez elle.',
			href: '/profil/ville'
		});
	if (input.genres.length === 0)
		items.push({
			id: 'genres',
			label: 'Tes genres',
			benefit: 'Les propositions dans ton style passent en premier.',
			href: '/profil/musical'
		});
	return items;
}

function openItem(input: CompletenessInput, track: TrackKindValue, href: string) {
	return input.openToRequests[track] == null
		? [
				{
					id: 'openToRequests',
					label: 'Ouvert·e aux sollicitations ?',
					benefit: 'Dis-le : on ne te propose pas ce que tu ne veux pas recevoir.',
					href
				}
			]
		: [];
}

function musicianCompleteness(input: CompletenessInput, href: string) {
	const m = input.musician;
	const missing: CompletenessItem[] = [];
	if (input.instruments.length === 0)
		missing.push({
			id: 'instruments',
			label: 'Tes instruments',
			benefit: 'Les annonces cherchent un instrument : sans lui, elles ne te trouvent pas.',
			href: '/profil/musical'
		});
	if (!m.practiceExperience)
		missing.push({
			id: 'practiceExperience',
			label: 'Ton expérience',
			benefit: 'Un groupe sait si vous jouez au même rythme.',
			href
		});
	if (!m.commitment)
		missing.push({
			id: 'commitment',
			label: 'Ton engagement',
			benefit: 'On ne te propose pas un projet régulier si tu cherches à jouer de temps en temps.',
			href
		});
	if (m.offers.length === 0 && m.needs.length === 0)
		missing.push({
			id: 'intents',
			label: 'Ce que tu proposes ou recherches',
			benefit: 'Les annonces et les musicien·nes qui te correspondent te sont suggérés.',
			href
		});
	return { missing, optional: openItem(input, 'MUSICIAN', href) };
}

function craftCompleteness(input: CompletenessInput, track: TrackKindValue, href: string) {
	const d = input.details[track] ?? EMPTY;
	const missing: CompletenessItem[] = [];
	const optional: CompletenessItem[] = [];
	if (d.specializations.length === 0)
		missing.push({
			id: 'specializations',
			label: 'Tes spécialités',
			benefit: 'Les demandes ciblées sur une spécialité te trouvent.',
			href
		});
	if (d.offers.length === 0)
		missing.push({
			id: 'offers',
			label: 'Ce que tu proposes',
			benefit: 'Sans offre cochée, tu n’apparais pas comme prestataire.',
			href
		});
	if (d.needs.length === 0)
		optional.push({
			id: 'needs',
			label: 'Ce que tu recherches',
			benefit: 'Les profils qui proposent ce qu’il te faut te sont suggérés.',
			href
		});
	for (const field of visibleFields(track, d)) {
		if ((d.answers[field.id] ?? []).length > 0) continue;
		const item = { id: field.id, label: field.label, benefit: field.hint ?? '', href };
		if (isRequired(track, field))
			missing.push({ ...item, benefit: item.benefit || 'Demandé pour ce que tu as coché.' });
		else
			optional.push({ ...item, benefit: item.benefit || 'Une demande précise te trouve mieux.' });
	}
	return { missing, optional: [...optional, ...openItem(input, track, href)] };
}

export function profileCompleteness(input: CompletenessInput): ProfileCompleteness {
	return {
		common: commonItems(input),
		tracks: input.tracks.map(({ track }) => {
			const href = trackProfileHref(track);
			const base = { track, label: TRACKS[track].label, href };
			if (!TRACKS[track].available) return { ...base, soon: true, missing: [], optional: [] };
			const parts =
				track === 'MUSICIAN'
					? musicianCompleteness(input, href)
					: craftCompleteness(input, track, href);
			return { ...base, soon: false, ...parts };
		})
	};
}
