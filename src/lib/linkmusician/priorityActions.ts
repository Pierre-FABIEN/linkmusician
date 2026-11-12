/** DASH-03 : sélection de liens réels, sans score de progression. */
import { TRACKS, type TrackKindValue } from '#lib/actors/tracks';

export type PriorityKind = 'confirmations' | 'applications' | 'requests' | 'agenda';
export type PriorityFacts = {
	confirmations: number;
	applications: number;
	requests: number;
	nextDate: Date | null;
	canReceiveRequests: boolean;
};
export type PriorityAction = {
	kind: PriorityKind;
	title: string;
	text: string;
	href: string;
	summary: string | null;
	highlight: boolean;
};
const ORDER: Partial<Record<TrackKindValue, PriorityKind[]>> = {
	MUSICIAN: ['confirmations', 'applications', 'requests', 'agenda'],
	SOUND_ENGINEER: ['confirmations', 'requests', 'agenda', 'applications'],
	PRODUCER: ['confirmations', 'requests', 'agenda', 'applications'],
	PROMOTER: ['applications', 'agenda', 'confirmations', 'requests'],
	MANAGER: ['requests', 'confirmations', 'applications', 'agenda'],
	BOOKER: ['agenda', 'applications', 'requests', 'confirmations']
};

export function priorityActions(track: TrackKindValue, facts: PriorityFacts): PriorityAction[] {
	if (!TRACKS[track].available) return [];
	const count = (n: number) => (n > 0 ? `${n} dans l’aperçu` : null);
	const actions: Record<PriorityKind, PriorityAction> = {
		confirmations: {
			kind: 'confirmations',
			title: 'Collaborations à valider',
			href: '/espace/a-confirmer',
			text:
				facts.confirmations > 0
					? 'Des propositions ou réalisations attendent ta réponse. Tous tes métiers.'
					: 'Aucune collaboration à valider dans l’aperçu. Retrouve aussi tes crédits et invitations sur cet écran.',
			summary: count(facts.confirmations),
			highlight: facts.confirmations > 0
		},
		applications: {
			kind: 'applications',
			title: 'Candidatures reçues',
			href: '/annonces',
			text:
				facts.applications > 0
					? 'Des candidatures attendent sur les annonces que tu gères. Ouvre une annonce pour répondre.'
					: 'Aucune candidature à traiter dans l’aperçu de tes annonces ouvertes. Retrouve tes annonces ou publie-en une.',
			summary: count(facts.applications),
			highlight: facts.applications > 0
		},
		requests: {
			kind: 'requests',
			title: 'Demandes de contact',
			href: '/messages',
			text: !facts.canReceiveRequests
				? 'Les demandes de contact sont réservées aux adultes. Tes échanges existants restent dans Messages.'
				: facts.requests > 0
					? 'Des personnes souhaitent échanger avec toi. Ces demandes sont communes à tes métiers.'
					: 'Aucune demande de contact dans l’aperçu. Tu peux reprendre tes échanges dans Messages.',
			summary: facts.canReceiveRequests ? count(facts.requests) : null,
			highlight: facts.canReceiveRequests && facts.requests > 0
		},
		agenda: {
			kind: 'agenda',
			title: 'Prochaines dates',
			href: '/espace/agenda',
			text: facts.nextDate
				? 'Ta prochaine jam ou collaboration prévue. L’agenda est commun à tes métiers.'
				: 'Aucune date à venir dans l’aperçu. L’agenda rassemble tes jams et collaborations acceptées.',
			summary: facts.nextDate
				? new Intl.DateTimeFormat('fr-FR', {
						dateStyle: 'medium',
						timeZone: 'Europe/Paris'
					}).format(facts.nextDate)
				: null,
			highlight: false
		}
	};
	return (ORDER[track] ?? [])
		.map((kind) => actions[kind])
		.sort(
			(a, b) =>
				Number(b.highlight) - Number(a.highlight) ||
				Number(b.summary !== null) - Number(a.summary !== null)
		);
}
