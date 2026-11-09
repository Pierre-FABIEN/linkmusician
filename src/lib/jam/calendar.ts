const parisDateParts = new Intl.DateTimeFormat('fr-FR', {
	timeZone: 'Europe/Paris',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit'
});

/** Jour civil de Paris correspondant à un instant, au format YYYY-MM-DD. */
export function parisDayKey(at: Date): string {
	const parts = Object.fromEntries(
		parisDateParts.formatToParts(at).map(({ type, value }) => [type, value])
	);
	return `${parts.year}-${parts.month}-${parts.day}`;
}
