/**
 * Carnet de jams (P2-16) : le résumé façon souvenirs, calculé à partir des
 * jams où l'on était. Pur, partagé par le serveur et le navigateur.
 */

export type LogEntry = {
	jamId: string;
	communeName: string;
	genre: string | null;
	/** Les autres présent·es et l'instrument qu'ils ou elles jouaient. */
	others: { handle: string; instrument: string | null }[];
};

export type LogStats = {
	jams: number;
	people: number;
	instruments: number;
	styles: number;
	communes: number;
};

/** Jams, personnes rencontrées, instruments croisés, styles, communes. */
export function logStats(entries: readonly LogEntry[]): LogStats {
	const people = new Set<string>();
	const instruments = new Set<string>();
	const styles = new Set<string>();
	const communes = new Set<string>();
	for (const e of entries) {
		communes.add(e.communeName);
		if (e.genre) styles.add(e.genre);
		for (const o of e.others) {
			people.add(o.handle);
			if (o.instrument) instruments.add(o.instrument);
		}
	}
	return {
		jams: entries.length,
		people: people.size,
		instruments: instruments.size,
		styles: styles.size,
		communes: communes.size
	};
}

/** « 3 jams », « 1 jam » : libellés du résumé. */
export function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
	return `${n} ${n > 1 ? pluralForm : singular}`;
}
