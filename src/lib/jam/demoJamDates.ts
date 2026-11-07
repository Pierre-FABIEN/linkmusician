const parisDate = new Intl.DateTimeFormat('en-CA', {
	timeZone: 'Europe/Paris',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit'
});

export function demoJamStartsThisMonth(now: Date): Date[] {
	const parts = Object.fromEntries(
		parisDate.formatToParts(now).map(({ type, value }) => [type, value])
	);
	const year = Number(parts.year);
	const month = Number(parts.month);
	const today = Number(parts.day);
	const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
	const count = Math.min(12, lastDay - today);

	return Array.from({ length: count }, (_, index) => {
		const day =
			count === 1
				? today + 1
				: today + 1 + Math.round((index * (lastDay - today - 1)) / (count - 1));
		return new Date(Date.UTC(year, month - 1, day, 15 + (index % 2)));
	});
}
