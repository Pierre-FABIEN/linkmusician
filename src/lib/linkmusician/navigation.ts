/** Navigation multirôle (DASH-01, #31). Le contexte ne change jamais les droits. */
import { TRACK_ROLES } from '#lib/actors/roles';
import { TRACKS, type TrackKindValue } from '#lib/actors/tracks';

export type HeldTrack = { track: TrackKindValue; isPrimary: boolean };
export type NavigationContext = {
	active: TrackKindValue;
	tracks: { track: TrackKindValue; label: string; available: boolean }[];
	profileHref: string;
};

export function activeTrack(tracks: readonly HeldTrack[], candidate?: string | null) {
	return (
		tracks.find((t) => t.track === candidate)?.track ??
		tracks.find((t) => t.isPrimary)?.track ??
		tracks[0]?.track ??
		null
	);
}

export function profileHref(track: TrackKindValue): string {
	return track === 'MUSICIAN' ? '/profil/pratique' : `/profil/metier/${TRACK_ROLES[track].slug}`;
}

export function navigationContext(
	tracks: readonly HeldTrack[],
	candidate?: string | null
): NavigationContext | null {
	const active = activeTrack(tracks, candidate);
	if (!active) return null;
	return {
		active,
		tracks: tracks.map(({ track }) => ({
			track,
			label: TRACKS[track].label,
			available: TRACKS[track].available
		})),
		profileHref: profileHref(active)
	};
}

/** Retour local uniquement ; les filtres d'une recherche restent intacts. */
export function contextDestination(raw: string, track: TrackKindValue): string {
	// eslint-disable-next-line no-control-regex -- Refuser les contrôles dans une destination de navigation.
	if (!raw.startsWith('/') || raw.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(raw))
		return '/espace';
	const url = new URL(raw, 'https://linkmusician.invalid');
	if (url.origin !== 'https://linkmusician.invalid') return '/espace';
	const roots = [
		'jouer',
		'espace',
		'jam',
		'jams',
		'lieux',
		'profil',
		'reglages',
		'messages',
		'annonces',
		'decouvrir',
		'notifications',
		'groupes',
		'morceaux',
		'studios',
		'organisations',
		'ecoles',
		'accompagnement',
		'aide',
		'demarches',
		'medias'
	];
	if (!roots.includes(url.pathname.split('/')[1]) && !url.pathname.startsWith('/@'))
		return '/espace';
	if (
		/^\/profil\/(metier\/|pratique$|son$|production$|organisateur$|accompagnement$)/.test(
			url.pathname
		)
	)
		return profileHref(track);
	return `${url.pathname}${url.search}${url.hash}`;
}

export type RoleMenuEntry = { href: string; title: string; text: string };

/** Les espaces métiers n'annoncent que des écrans déjà opérationnels. */
export function roleMenu(track: TrackKindValue): RoleMenuEntry[] {
	const profile = {
		href: profileHref(track),
		title: 'Ma fiche métier',
		text: 'Mes spécialités, mes offres, mes besoins et leur visibilité.'
	};
	if (!TRACKS[track].available) return [profile];
	const objectives = {
		href: '/espace/objectifs',
		title: 'Mes objectifs',
		text: 'Les prochaines étapes de mon activité.'
	};
	const messages = {
		href: '/messages',
		title: 'Mes échanges et collaborations',
		text: 'Les demandes, propositions et prestations à confirmer.'
	};
	const byTrack: Partial<Record<TrackKindValue, RoleMenuEntry[]>> = {
		SOUND_ENGINEER: [
			messages,
			{
				href: '/profil/son',
				title: 'Mes travaux et mon matériel',
				text: 'Compléter ma fiche détaillée d’ingé son.'
			},
			{
				href: '/studios',
				title: 'Mes studios',
				text: 'Créer ou gérer les studios dont je fais partie.'
			}
		],
		PRODUCER: [
			messages,
			{
				href: '/profil/production',
				title: 'Mes productions',
				text: 'Mes productions en écoute, logiciels et tarifs indicatifs.'
			},
			{
				href: '/studios',
				title: 'Mes studios',
				text: 'Les fiches et sessions des studios que je gère.'
			},
			{
				href: '/morceaux',
				title: 'Mes morceaux et crédits',
				text: 'Les morceaux de mon équipe et mes contributions.'
			}
		],
		PROMOTER: [
			{
				href: '/plateaux/nouveau',
				title: 'Publier un plateau',
				text: 'Proposer une date aux groupes ; publication réservée aux adultes.'
			},
			{
				href: '/annonces',
				title: 'Mes plateaux et candidatures',
				text: 'Consulter mes annonces et traiter les réponses.'
			},
			{
				href: '/organisations',
				title: 'Mes organisations et lieux',
				text: 'Gérer mes structures, lieux et invitations.'
			},
			{
				href: '/profil/organisateur',
				title: 'Mes événements passés',
				text: 'Présenter mon activité et mes références.'
			}
		],
		MANAGER: [
			{
				href: '/accompagnement',
				title: 'Mes accompagnements',
				text: 'Proposer, confirmer ou terminer un accompagnement.'
			},
			messages,
			{
				href: '/profil/accompagnement',
				title: 'Les artistes que je recherche',
				text: 'Compléter mes genres et ma présentation professionnelle.'
			}
		],
		BOOKER: [
			{
				href: '/accompagnement',
				title: 'Mes artistes et dates bookées',
				text: 'Mes accompagnements confirmés ; les dates se déclarent dans une conversation.'
			},
			messages,
			{
				href: '/annonces',
				title: 'Les dates et plateaux',
				text: 'Parcourir les opportunités et mes candidatures.'
			},
			{
				href: '/profil/accompagnement',
				title: 'Ma fiche détaillée',
				text: 'Préciser les artistes et les styles que je suis.'
			}
		]
	};
	return [profile, objectives, ...(byTrack[track] ?? [])];
}
