/**
 * Studio (P4-03, conception 06 §3.3 et 08 §6) : règles pures, partagées par le
 * serveur et le navigateur. Le service (`#lib/server/studios/service`) les
 * applique ; ici, rien ne lit la base.
 *
 * - Un studio est une organisation `STUDIO`, administrée par des personnes
 *   qui ont le métier d'ingé son ou de producteur·rice (OWNER, puis ADMIN).
 * - Sa fiche (services, salles, tarifs, matériel, horaires) reste privée
 *   tant qu'elle n'est pas **publiée** ; publiée, elle donne le rang
 *   « Ouvert » (`studioTier`, `progression/core/tiers.ts`).
 * - Aucune adresse : la ville seulement (centre de la commune, comme pour
 *   un groupe). Les horaires ne sont pas des créneaux réservables : la
 *   réservation viendra avec la phase 5 (D25).
 */
import { z } from 'zod';
import { normalizeBio } from '#lib/actors/profile';
import { normalizeLines } from '#lib/crafts/common';

/** Alignées sur l'enum Prisma `StudioService`, dans l'ordre d'affichage. */
export const STUDIO_SERVICES = ['REHEARSAL', 'RECORDING', 'MIXING', 'MASTERING'] as const;
export type StudioServiceValue = (typeof STUDIO_SERVICES)[number];

export const STUDIO_SERVICE_INFO: Readonly<
	Record<StudioServiceValue, { label: string; hint: string }>
> = {
	REHEARSAL: { label: 'Répétition', hint: 'Une salle équipée, à l’heure.' },
	RECORDING: { label: 'Enregistrement', hint: 'Prise de son, avec ou sans ingé son.' },
	MIXING: { label: 'Mixage', hint: 'Équilibrer et mettre en forme les pistes.' },
	MASTERING: { label: 'Mastering', hint: 'Le son final, prêt à sortir.' }
};

/** Métiers qui peuvent créer et gérer un studio (conception 06 §3.3). */
export const STUDIO_TRACKS = ['SOUND_ENGINEER', 'PRODUCER'] as const;

export const MAX_STUDIO_NAME = 60;
export const MAX_STUDIO_BIO = 600;
export const MAX_STUDIO_GEAR = 1000;
export const MAX_STUDIO_PRICING = 400;
export const MAX_ROOMS = 6;
export const MAX_ROOM_NAME = 40;
export const MAX_ROOM_DESCRIPTION = 160;
/** Tarif horaire indicatif plafonné : au-delà, c'est une faute de frappe. */
export const MAX_HOURLY_RATE = 1000;
/** Studios gérés par personne : au-delà, c'est rarement un vrai studio. */
export const MAX_MANAGED_STUDIOS = 3;
/** Photos du studio (P4-03b) : celles refusées ne comptent pas. */
export const MAX_STUDIO_PHOTOS = 8;
/** Invitations à gérer en attente par studio (anti-spam). */
export const MAX_PENDING_STUDIO_INVITES = 5;

/** 1 = lundi … 7 = dimanche (ISO). */
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
export const WEEKDAY_LABELS: Readonly<Record<number, string>> = {
	1: 'Lundi',
	2: 'Mardi',
	3: 'Mercredi',
	4: 'Jeudi',
	5: 'Vendredi',
	6: 'Samedi',
	7: 'Dimanche'
};

/** Texte brut sur une ligne : contrôles retirés, espaces resserrés. */
function oneLine(raw: string): string {
	return (
		raw
			// eslint-disable-next-line no-control-regex
			.replace(/[\u0000-\u001f\u007f]/g, ' ')
			.replace(/\s+/g, ' ')
			.trim()
	);
}

const length = (v: string) => [...v].length;

const studioName = z
	.string({ required_error: 'Donne un nom au studio.' })
	.transform(oneLine)
	.refine((v) => length(v) >= 2, { message: 'Le nom du studio fait au moins 2 caractères.' })
	.refine((v) => length(v) <= MAX_STUDIO_NAME, {
		message: `Le nom du studio tient en ${MAX_STUDIO_NAME} caractères.`
	});

/** Création : un nom suffit, la fiche se remplit ensuite. */
export const studioSchema = z.object({ name: studioName });
export type StudioForm = z.infer<typeof studioSchema>;

/** « 09:30 » → 570. `null` si l'heure est invalide. */
export function parseTime(raw: string): number | null {
	const match = /^(\d{1,2}):(\d{2})$/.exec(raw.trim());
	if (!match) return null;
	const [h, m] = [Number(match[1]), Number(match[2])];
	if (h > 24 || m > 59 || (h === 24 && m > 0)) return null;
	return h * 60 + m;
}

/** 570 → « 09:30 » (valeur d'un champ `type="time"`), 1440 → « 24:00 ». */
export function formatTime(minutes: number): string {
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** 570 → « 9 h 30 », 600 → « 10 h » : pour l'affichage. */
export function displayTime(minutes: number): string {
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}

const roomSchema = z.object({
	name: z.string().max(400).default(''),
	description: z.string().max(2000).default(''),
	/** Texte du champ : vide (pas de tarif) ou un nombre d'euros entier. */
	hourlyRate: z.string().max(10).default('')
});

const hoursSchema = z.object({
	weekday: z.number().int().min(1).max(7),
	opensAt: z.string().max(5),
	closesAt: z.string().max(5)
});

/**
 * Fiche du studio, envoyée en JSON. Les lignes de salle entièrement vides
 * sont ignorées (comme les travaux en écoute d'un profil de métier).
 */
export const studioProfileSchema = z
	.object({
		name: studioName,
		bio: z.string().max(4000).default(''),
		communeCode: z.string().max(10).default(''),
		services: z.array(z.enum(STUDIO_SERVICES)).default([]),
		rooms: z.array(roomSchema).max(20).default([]),
		gear: z.string().max(6000).default(''),
		pricingNotes: z.string().max(2000).default(''),
		byAppointment: z.boolean().default(false),
		hours: z.array(hoursSchema).max(7).default([])
	})
	.superRefine((value, ctx) => {
		const issue = (path: (string | number)[], message: string) =>
			ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
		if (length(normalizeBio(value.bio)) > MAX_STUDIO_BIO) {
			issue(['bio'], `La présentation tient en ${MAX_STUDIO_BIO} caractères.`);
		}
		if (length(normalizeLines(value.gear)) > MAX_STUDIO_GEAR) {
			issue(['gear'], `Le matériel tient en ${MAX_STUDIO_GEAR} caractères.`);
		}
		if (length(oneLine(value.pricingNotes)) > MAX_STUDIO_PRICING) {
			issue(['pricingNotes'], `Les conditions tiennent en ${MAX_STUDIO_PRICING} caractères.`);
		}
		const rooms = value.rooms.filter(
			(r) => r.name.trim() || r.description.trim() || r.hourlyRate.trim()
		);
		if (rooms.length > MAX_ROOMS) issue(['rooms'], `${MAX_ROOMS} salles au plus.`);
		value.rooms.forEach((r, i) => {
			if (!r.name.trim() && !r.description.trim() && !r.hourlyRate.trim()) return;
			if (!oneLine(r.name)) issue(['rooms', i, 'name'], 'Donne un nom à la salle.');
			else if (length(oneLine(r.name)) > MAX_ROOM_NAME)
				issue(['rooms', i, 'name'], `Le nom d’une salle tient en ${MAX_ROOM_NAME} caractères.`);
			if (length(oneLine(r.description)) > MAX_ROOM_DESCRIPTION)
				issue(
					['rooms', i, 'description'],
					`La description d’une salle tient en ${MAX_ROOM_DESCRIPTION} caractères.`
				);
			const rate = r.hourlyRate.trim();
			if (rate && (!/^\d+$/.test(rate) || Number(rate) < 1 || Number(rate) > MAX_HOURLY_RATE))
				issue(
					['rooms', i, 'hourlyRate'],
					`Un tarif à l’heure en euros entiers, de 1 à ${MAX_HOURLY_RATE}.`
				);
		});
		const days = new Set<number>();
		value.hours.forEach((h, i) => {
			if (days.has(h.weekday)) issue(['hours', i], 'Une seule plage par jour.');
			days.add(h.weekday);
			const opens = parseTime(h.opensAt);
			const closes = parseTime(h.closesAt);
			if (opens === null || closes === null) issue(['hours', i], 'Une heure valide (hh:mm).');
			else if (closes <= opens)
				issue(['hours', i], `${WEEKDAY_LABELS[h.weekday]} : la fermeture vient après l’ouverture.`);
		});
	})
	.transform((value) => ({
		name: value.name,
		bio: normalizeBio(value.bio) || null,
		communeCode: value.communeCode.trim(),
		services: STUDIO_SERVICES.filter((s) => value.services.includes(s)),
		rooms: value.rooms
			.filter((r) => r.name.trim() || r.description.trim() || r.hourlyRate.trim())
			.map((r) => ({
				name: oneLine(r.name),
				description: oneLine(r.description),
				hourlyRate: r.hourlyRate.trim() ? Number(r.hourlyRate.trim()) : null
			})),
		gear: normalizeLines(value.gear),
		pricingNotes: oneLine(value.pricingNotes),
		byAppointment: value.byAppointment,
		hours: value.hours
			.map((h) => ({
				weekday: h.weekday,
				opensAt: parseTime(h.opensAt)!,
				closesAt: parseTime(h.closesAt)!
			}))
			.sort((a, b) => a.weekday - b.weekday)
	}));

export type StudioProfileInput = z.input<typeof studioProfileSchema>;
export type StudioProfileData = z.output<typeof studioProfileSchema>;

/** Ce que la fiche doit contenir pour être publiée, dans l'ordre du formulaire. */
export type PublicationGap = 'commune' | 'services' | 'rooms' | 'pricing' | 'gear' | 'hours';

export const PUBLICATION_GAP_LABELS: Readonly<Record<PublicationGap, string>> = {
	commune: 'la ville du studio',
	services: 'au moins un service',
	rooms: 'au moins une salle',
	pricing: 'un tarif (à l’heure pour une salle, ou des conditions)',
	gear: 'le matériel',
	hours: 'des horaires, ou « sur rendez-vous »'
};

/**
 * Ce qui manque pour publier (conception 08 §6 : « compléter sa fiche :
 * salles, matériel, tarifs »). Vide : la fiche peut être publiée.
 */
export function publicationGaps(fiche: {
	hasCommune: boolean;
	services: readonly unknown[];
	rooms: readonly { hourlyRate: number | null }[];
	pricingNotes: string;
	gear: string;
	byAppointment: boolean;
	hours: readonly unknown[];
}): PublicationGap[] {
	const gaps: PublicationGap[] = [];
	if (!fiche.hasCommune) gaps.push('commune');
	if (fiche.services.length === 0) gaps.push('services');
	if (fiche.rooms.length === 0) gaps.push('rooms');
	if (!fiche.rooms.some((r) => r.hourlyRate !== null) && !fiche.pricingNotes.trim())
		gaps.push('pricing');
	if (!fiche.gear.trim()) gaps.push('gear');
	if (fiche.hours.length === 0 && !fiche.byAppointment) gaps.push('hours');
	return gaps;
}

// ─── Sessions et quêtes (P4-03c) ─────────────────────────────────────────

/**
 * Collaborations qui peuvent se tenir dans un studio. Terminée et confirmée
 * par un·e client·e (une personne qui ne gère pas le studio), c'est une
 * **session** : elle compte pour le rang du studio (`studioTier`).
 */
export const STUDIO_SESSION_KINDS = [
	'REHEARSAL',
	'RECORDING',
	'MIXING',
	'MASTERING',
	'PRODUCTION'
] as const;

export function isStudioSessionKind(kind: string): boolean {
	return (STUDIO_SESSION_KINDS as readonly string[]).includes(kind);
}

/** Ce que l'on sait des sessions d'un studio, lu dans ses collaborations. */
export type StudioSessionStats = {
	sessions: number;
	distinctClients: number;
	/** Répétitions accueillies. */
	rehearsals: number;
	/** Enregistrements reliés à un morceau (les crédits suivent, P4-07). */
	creditedRecordings: number;
};

export type StudioQuestId =
	'fiche' | 'hours' | 'firstSession' | 'firstRehearsal' | 'firstRecording';

/** Quêtes du studio (conception 08 §6), dans l'ordre où elles se font. */
export function studioQuests(input: {
	published: boolean;
	hasHours: boolean;
	stats: StudioSessionStats;
}): { id: StudioQuestId; label: string; done: boolean }[] {
	return [
		{ id: 'fiche', label: 'Compléter et publier sa fiche', done: input.published },
		{ id: 'hours', label: 'Donner ses horaires d’ouverture', done: input.hasHours },
		{
			id: 'firstSession',
			label: 'Une première session confirmée par un·e client·e',
			done: input.stats.sessions > 0
		},
		{
			id: 'firstRehearsal',
			label: 'Accueillir la répétition d’un groupe',
			done: input.stats.rehearsals > 0
		},
		{
			id: 'firstRecording',
			label: 'Un premier enregistrement crédité sur un morceau',
			done: input.stats.creditedRecordings > 0
		}
	];
}
