/**
 * Formation et matériel d'une jam (P2-14c, D27) : règles pures, partagées
 * par le serveur et le navigateur.
 *
 * - Le **lead** (l'hôte, ou la personne qu'il désigne) réserve des places en
 *   invitant des musicien·nes. Une invitation en attente ou acceptée tient la
 *   place ; refusée, elle la libère.
 * - « Je viens » avec un instrument prend une place **ouverte** de cet
 *   instrument, jamais une place réservée.
 * - Le matériel sur place vient de la fiche du lieu, modifiable pour une jam.
 *   La fiche de la jam dit à chacun·e quoi apporter.
 *
 * Rien ici ne crée d'XP.
 */
import { z } from 'zod';

export const BACKLINE_ITEMS = [
	'DRUMS',
	'BASS_AMP',
	'GUITAR_AMP',
	'KEYBOARD',
	'PA_MICS',
	'CABLES'
] as const;
export type BacklineItem = (typeof BACKLINE_ITEMS)[number];

export const BACKLINE_LABELS: Record<BacklineItem, string> = {
	DRUMS: 'Batterie',
	BASS_AMP: 'Ampli basse',
	GUITAR_AMP: 'Ampli guitare',
	KEYBOARD: 'Clavier',
	PA_MICS: 'Sono et micros',
	CABLES: 'Câbles'
};

/** Matériel coché dans un formulaire (`backline` répété), sans doublon. */
export const backlineSchema = z
	.array(z.enum(BACKLINE_ITEMS))
	.max(BACKLINE_ITEMS.length)
	.default([])
	.transform((list) => BACKLINE_ITEMS.filter((item) => list.includes(item)));

export const INVITE_STATUSES = ['INVITED', 'ACCEPTED', 'DECLINED'] as const;
export type InviteStatus = (typeof INVITE_STATUSES)[number];

/** Une invitation tient la place tant qu'elle n'est pas refusée. */
export const holdsSpot = (status: InviteStatus) => status !== 'DECLINED';

export type SpotLine = {
	instrumentId: string;
	name: string;
	/** Places souhaitées par l'hôte. */
	wanted: number;
	/** Réservées par le lead (invitations en attente ou acceptées). */
	reserved: number;
	/** Prises par « Je viens » sur les places restantes. */
	taken: number;
	/** Encore libres pour « Je viens ». */
	open: number;
};

/**
 * Tableau des places : pour chaque instrument souhaité, les places réservées
 * par le lead, prises par « Je viens », et encore ouvertes. Une personne qui
 * dit « Je viens » sur un instrument complet vient quand même : elle ne prend
 * simplement pas de place.
 */
export function spotBoard(
	spots: { instrumentId: string; name: string; count: number }[],
	invites: { instrumentId: string; status: InviteStatus }[],
	attendances: { instrumentId: string | null }[]
): SpotLine[] {
	return spots.map((s) => {
		const reserved = Math.min(
			s.count,
			invites.filter((i) => i.instrumentId === s.instrumentId && holdsSpot(i.status)).length
		);
		const coming = attendances.filter((a) => a.instrumentId === s.instrumentId).length;
		const taken = Math.min(coming, s.count - reserved);
		return {
			instrumentId: s.instrumentId,
			name: s.name,
			wanted: s.count,
			reserved,
			taken,
			open: s.count - reserved - taken
		};
	});
}

/** Le lead peut encore réserver une place de cet instrument. */
export function canReserve(board: SpotLine[], instrumentId: string): boolean {
	const line = board.find((l) => l.instrumentId === instrumentId);
	return line !== undefined && line.reserved < line.wanted;
}

/** Ce qu'une personne apporte et ce qu'elle trouve sur place. */
export type Packing = { bring: string[]; onSite: string[] };

type Kind =
	'drums' | 'eDrums' | 'bass' | 'guitar' | 'acoustic' | 'keys' | 'voice' | 'electronic' | 'other';

const BY_SLUG: Record<string, Kind> = {
	batterie: 'drums',
	'batterie-electronique': 'eDrums',
	basse: 'bass',
	contrebasse: 'bass',
	'guitare-electrique': 'guitar',
	'lap-steel': 'guitar',
	'guitare-acoustique': 'acoustic',
	'guitare-classique': 'acoustic',
	piano: 'keys',
	claviers: 'keys',
	'piano-electrique': 'keys',
	orgue: 'keys'
};

const BY_FAMILY: Record<string, Kind> = {
	VOICE: 'voice',
	ELECTRONIC: 'electronic',
	KEYBOARDS: 'other'
};

const kindOf = (instrument: { slug: string; family: string }): Kind =>
	BY_SLUG[instrument.slug] ?? BY_FAMILY[instrument.family] ?? 'other';

/**
 * Quoi apporter pour un instrument, selon le matériel sur place (« apporte
 * ta guitare, l'ampli est là »). Sans instrument connu, rien à dire.
 */
export function whatToBring(
	instrument: { slug: string; family: string; name: string },
	backline: readonly BacklineItem[]
): Packing {
	const has = (item: BacklineItem) => backline.includes(item);
	const bring: string[] = [];
	const onSite: string[] = [];
	const own = `ton instrument (${instrument.name.toLowerCase()})`;
	const cables = () => (has('CABLES') ? onSite.push('les câbles') : bring.push('tes câbles'));
	const sound = () => {
		if (has('PA_MICS')) onSite.push('la sono');
	};
	switch (kindOf(instrument)) {
		case 'drums':
			if (has('DRUMS')) {
				bring.push('tes baguettes');
				onSite.push('la batterie');
			} else bring.push('ta batterie');
			break;
		case 'eDrums':
			bring.push('ta batterie électronique');
			sound();
			cables();
			break;
		case 'bass':
			bring.push(instrument.slug === 'contrebasse' ? 'ta contrebasse' : 'ta basse');
			if (has('BASS_AMP')) onSite.push('l’ampli basse');
			else bring.push('ton ampli basse');
			cables();
			break;
		case 'guitar':
			bring.push('ta guitare');
			if (has('GUITAR_AMP')) onSite.push('l’ampli guitare');
			else bring.push('ton ampli guitare');
			cables();
			break;
		case 'acoustic':
			bring.push('ta guitare');
			sound();
			break;
		case 'keys':
			if (has('KEYBOARD')) onSite.push('un clavier');
			else bring.push('ton clavier');
			if (has('PA_MICS')) onSite.push('la sono');
			else if (!has('KEYBOARD')) bring.push('ton ampli clavier');
			cables();
			break;
		case 'voice':
			if (has('PA_MICS')) onSite.push('la sono et les micros');
			else bring.push('ton micro');
			break;
		case 'electronic':
			bring.push('ton matériel');
			sound();
			cables();
			break;
		default:
			bring.push(own);
			if (has('PA_MICS')) onSite.push('la sono et les micros');
	}
	return { bring, onSite };
}

const list = (items: string[]) =>
	items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} et ${items.at(-1)}`;

/** La phrase de la fiche : « Apporte ta basse et tes câbles. Sur place : l’ampli basse. » */
export function packingSentence({ bring, onSite }: Packing): string {
	const parts: string[] = [];
	if (bring.length > 0) parts.push(`Apporte ${list(bring)}.`);
	if (onSite.length > 0) parts.push(`Sur place : ${list(onSite)}.`);
	return parts.join(' ');
}

/** Le lead : celui que l'hôte a désigné, sinon l'hôte. */
export const leadOf = (jam: { issuerActorId: string; leadActorId: string | null }) =>
	jam.leadActorId ?? jam.issuerActorId;

export const inviteSchema = z.object({
	handle: z
		.string()
		.trim()
		.transform((h) => h.replace(/^@/, '').toLowerCase())
		.pipe(z.string().regex(/^[a-z0-9][a-z0-9_-]{2,29}$/, 'Indique l’identifiant de la personne.')),
	instrument: z.string().regex(/^[a-z0-9-]{1,60}$/, 'Choisis l’instrument.')
});
export type InviteForm = z.infer<typeof inviteSchema>;
