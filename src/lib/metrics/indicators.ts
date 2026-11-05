/**
 * Indicateurs produit (P1-13, D13) : calcul pur à partir de faits par
 * personne. Définitions et seuils : conception 05 §2 (hypothèse du MVP).
 * Le serveur lit les faits (`#lib/server/indicators`), ce module compte.
 */

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Jour civil à Paris, au format `AAAA-MM-JJ` (les relevés d'activité sont par jour). */
export function parisDay(date: Date): string {
	return new Intl.DateTimeFormat('fr-CA', {
		timeZone: 'Europe/Paris',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(date);
}

/** Ce qu'on sait d'une personne pour les indicateurs. */
export type PersonFacts = {
	createdAt: Date;
	onboardedAt: Date | null;
	/** Premier échange réciproque (`conversation.reciprocated`). */
	firstReciprocalAt: Date | null;
	/** Première collaboration confirmée ou adhésion de groupe. */
	firstCollabOrBandAt: Date | null;
	/** A franchi le palier « En réseau » (à n'importe quelle date). */
	networked: boolean;
	/** Jours d'activité, `AAAA-MM-JJ` (heure de Paris). */
	activeDays: ReadonlySet<string>;
	/** Visé par au moins un signalement pour spam. */
	reportedForSpam: boolean;
};

/** Fonctionnalités en place : un indicateur qui en dépend est « pas encore mesurable ». */
export type Availability = { conversations: boolean; collaborations: boolean };

export type Indicator = {
	id: string;
	label: string;
	/** Part, entre 0 et 1 ; `null` si rien à mesurer. */
	value: number | null;
	numerator: number;
	denominator: number;
	/** Seuil de validation (05 §2). */
	target: { kind: 'min' | 'max'; value: number };
	/** `na` : fonctionnalité pas encore livrée ; `empty` : pas encore assez de recul. */
	status: 'ok' | 'below' | 'empty' | 'na';
	note: string;
};

function indicator(base: Omit<Indicator, 'value' | 'status'>, available: boolean): Indicator {
	if (!available) return { ...base, value: null, status: 'na' };
	if (base.denominator === 0) return { ...base, value: null, status: 'empty' };
	const value = base.numerator / base.denominator;
	const ok = base.target.kind === 'min' ? value >= base.target.value : value < base.target.value;
	return { ...base, value, status: ok ? 'ok' : 'below' };
}

/** Personnes inscrites depuis au moins `days` jours (assez de recul pour mesurer). */
const aged = (people: readonly PersonFacts[], days: number, now: Date) =>
	people.filter((p) => now.getTime() - p.createdAt.getTime() >= days * DAY_MS);

const within = (from: Date, at: Date | null, days: number) =>
	at !== null && at.getTime() - from.getTime() <= days * DAY_MS;

/** Active au moins un jour entre J+30 et J+36 après l'inscription. */
export function retainedAt30(p: PersonFacts): boolean {
	for (let d = 30; d < 37; d++) {
		if (p.activeDays.has(parisDay(new Date(p.createdAt.getTime() + d * DAY_MS)))) return true;
	}
	return false;
}

/**
 * Indicateurs sur une cohorte (les personnes inscrites sur la période
 * choisie). Chaque taux ne compte que les personnes qui ont assez de recul.
 */
export function computeIndicators(
	cohort: readonly PersonFacts[],
	now: Date,
	availability: Availability
): Indicator[] {
	const onboarded = cohort.filter((p) => p.onboardedAt !== null).length;
	const at14 = aged(cohort, 14, now);
	const at60 = aged(cohort, 60, now);
	const at37 = aged(cohort, 37, now);
	const networked37 = at37.filter((p) => p.networked);

	return [
		indicator(
			{
				id: 'onboarding',
				label: 'Onboarding terminé',
				numerator: onboarded,
				denominator: cohort.length,
				target: { kind: 'min', value: 0.6 },
				note: 'Repère interne (non fixé par 05 §2) : la porte d’entrée du parcours.'
			},
			true
		),
		indicator(
			{
				id: 'reciprocal14',
				label: 'Conversation réciproque dans les 14 jours',
				numerator: at14.filter((p) => within(p.createdAt, p.firstReciprocalAt, 14)).length,
				denominator: at14.length,
				target: { kind: 'min', value: 0.3 },
				note: 'Inscrits depuis 14 jours au moins.'
			},
			availability.conversations
		),
		indicator(
			{
				id: 'collab60',
				label: 'Collaboration confirmée ou groupe dans les 60 jours',
				numerator: at60.filter((p) => within(p.createdAt, p.firstCollabOrBandAt, 60)).length,
				denominator: at60.length,
				target: { kind: 'min', value: 0.1 },
				note: 'Inscrits depuis 60 jours au moins.'
			},
			availability.collaborations
		),
		indicator(
			{
				id: 'retention30',
				label: 'Rétention à 30 jours',
				numerator: at37.filter(retainedAt30).length,
				denominator: at37.length,
				target: { kind: 'min', value: 0.25 },
				note: 'Venu au moins une fois entre J+30 et J+36. Repère : tous les inscrits.'
			},
			true
		),
		indicator(
			{
				id: 'retention30Networked',
				label: 'Rétention à 30 jours, palier « En réseau »',
				numerator: networked37.filter(retainedAt30).length,
				denominator: networked37.length,
				target: { kind: 'min', value: 0.25 },
				note: 'L’indicateur de 05 §2 : ceux qui ont franchi « En réseau ».'
			},
			availability.conversations
		),
		indicator(
			{
				id: 'spam',
				label: 'Comptes signalés pour spam',
				numerator: cohort.filter((p) => p.reportedForSpam).length,
				denominator: cohort.length,
				target: { kind: 'max', value: 0.02 },
				note: 'Au moins un signalement « spam » reçu.'
			},
			true
		)
	];
}

/** Inscriptions par semaine (lundi à Paris), les `weeks` dernières, de la plus ancienne à la plus récente. */
export function weeklySignups(createdAt: readonly Date[], now: Date, weeks = 8) {
	const monday = new Date(`${parisDay(now)}T00:00:00Z`);
	monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
	const starts = Array.from({ length: weeks }, (_, i) => {
		const d = new Date(monday);
		d.setUTCDate(d.getUTCDate() - 7 * (weeks - 1 - i));
		return parisDay(d);
	});
	const counts = starts.map(() => 0);
	for (const date of createdAt) {
		const day = parisDay(date);
		for (let i = starts.length - 1; i >= 0; i--) {
			if (day >= starts[i]) {
				counts[i] += 1;
				break;
			}
		}
	}
	// Les inscriptions antérieures à la première semaine ne sont pas comptées.
	return starts.map((weekOf, i) => ({ weekOf, count: counts[i] }));
}
