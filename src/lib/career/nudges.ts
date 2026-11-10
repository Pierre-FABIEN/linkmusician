/**
 * Coups de pouce (P4-13a, conception 07 §4.7) : quand on n'avance plus
 * depuis un moment, l'app propose **une marche facile à franchir**, tirée du
 * réseau réel (jams proches, ingé son ou producteur·rice de son réseau,
 * personnes de son réseau qui jouent l'instrument qui manque à un morceau).
 *
 * Ton : jamais de reproche. On ne dit ni depuis combien de temps rien ne
 * s'est passé, ni ce que la personne « n'a pas fait » ; on propose. Aucune
 * notification : les coups de pouce attendent dans l'espace, c'est tout.
 *
 * Module pur, partagé par le serveur et le navigateur. Jamais l'XP ni le
 * palier dans le choix.
 */

/** Sans progrès depuis ce nombre de jours, l'entrée « Coups de pouce » apparaît. */
export const STALL_DAYS = 21;
/** Fenêtre des jams proposées. */
export const JAM_WINDOW_DAYS = 7;
/** Coups de pouce affichés au plus. */
export const MAX_NUDGES = 3;
/** Personnes nommées au plus dans un coup de pouce. */
const MAX_NAMED = 2;

const DAY = 86_400_000;

/**
 * La personne n'avance plus : aucun progrès (événement de domaine qui la
 * concerne) depuis `STALL_DAYS` jours. Un compte récent sans progrès compte
 * à partir de son arrivée.
 */
export function isStalled(lastProgressAt: Date | null, joinedAt: Date, now: Date): boolean {
	const since = lastProgressAt ?? joinedAt;
	return now.getTime() - since.getTime() >= STALL_DAYS * DAY;
}

export type NamedPerson = { handle: string; displayName: string };

export type NudgeInput = {
	/** Jams à venir près de chez soi dans la fenêtre, où l'on n'est pas déjà inscrit·e. */
	jamsSoon: number;
	/** Places libres de ses morceaux, et les personnes de son réseau proches qui jouent l'instrument. */
	openRoles: {
		workId: string;
		workTitle: string;
		instrument: string;
		candidates: NamedPerson[];
	}[];
	/** Morceau composé pas encore enregistré, et les pros du son de son réseau. */
	toRecord: {
		workId: string;
		workTitle: string;
		pros: (NamedPerson & { craft: 'SOUND_ENGINEER' | 'PRODUCER' })[];
	} | null;
};

export type NudgeKind = 'OPEN_ROLE' | 'JAMS_SOON' | 'TO_RECORD';

export type Nudge = {
	kind: NudgeKind;
	title: string;
	text: string;
	href: string;
	cta: string;
};

/** « Léa », « Léa et Jo », « Léa, Jo et 2 autres ». */
export function namesOf(people: readonly NamedPerson[]): string {
	const first = people.slice(0, MAX_NAMED).map((p) => p.displayName.split(' ')[0] || p.displayName);
	const rest = people.length - first.length;
	if (rest > 0) return `${first.join(', ')} et ${rest} autre${rest > 1 ? 's' : ''}`;
	return first.length === 2 ? `${first[0]} et ${first[1]}` : (first[0] ?? '');
}

const CRAFT_PHRASE = {
	SOUND_ENGINEER: { one: 'ingé son', many: 'ingés son' },
	PRODUCER: { one: 'producteur·rice', many: 'producteur·rices' }
} as const;

/**
 * Les coups de pouce, du plus concret au plus large : une place libre que
 * quelqu'un de son réseau peut prendre, un morceau prêt à enregistrer avec
 * un·e pro de son réseau, des jams cette semaine. Trois au plus.
 */
export function pickNudges(input: NudgeInput): Nudge[] {
	const nudges: Nudge[] = [];

	const role = input.openRoles.find((r) => r.candidates.length > 0);
	if (role) {
		const many = role.candidates.length > 1;
		nudges.push({
			kind: 'OPEN_ROLE',
			title: `« ${role.workTitle} » attend : ${role.instrument.toLowerCase()}`,
			text: `${namesOf(role.candidates)}, de ton réseau, ${many ? 'en jouent' : 'en joue'} près de chez toi. Une place est libre sur ton morceau.`,
			href: `/morceaux/${role.workId}`,
			cta: 'Voir le morceau'
		});
	}

	if (input.toRecord && input.toRecord.pros.length > 0) {
		const { pros } = input.toRecord;
		const crafts = new Set(pros.map((p) => p.craft));
		const phrase =
			crafts.size === 1
				? CRAFT_PHRASE[pros[0].craft][pros.length > 1 ? 'many' : 'one']
				: 'pros du son';
		nudges.push({
			kind: 'TO_RECORD',
			title: `« ${input.toRecord.workTitle} » est prêt à enregistrer`,
			text: `${namesOf(pros)}, ${phrase} de ton réseau. Un message suffit pour en parler.`,
			href: `/@${pros[0].handle}`,
			cta: `Voir le profil de ${pros[0].displayName.split(' ')[0] || pros[0].displayName}`
		});
	}

	if (input.jamsSoon > 0) {
		nudges.push({
			kind: 'JAMS_SOON',
			title:
				input.jamsSoon > 1
					? `${input.jamsSoon} jams cette semaine près de chez toi`
					: 'Une jam cette semaine près de chez toi',
			text: 'Pas besoin de groupe : tu viens, tu joues, tu rencontres du monde.',
			href: '/jam/agenda',
			cta: 'Voir les jams'
		});
	}

	return nudges.slice(0, MAX_NUDGES);
}
