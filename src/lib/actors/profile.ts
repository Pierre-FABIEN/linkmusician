/**
 * Profil complet d'une personne (P1-06b, D17, D18) : libellés et règles.
 *
 * Module pur, partagé par le serveur et le navigateur. Tout est déclaratif :
 * rien n'est vérifié, et le statut pro s'affiche toujours « déclaré ».
 * Listes alignées sur les enums Prisma (vérifié dans
 * `src/lib/prisma/actors/profile.ts`).
 */

export const PRO_STATUSES = ['AMATEUR', 'SEMI_PRO', 'PROFESSIONAL'] as const;
export type ProStatusValue = (typeof PRO_STATUSES)[number];

export const PRO_STATUS_INFO: Readonly<Record<ProStatusValue, { label: string; hint: string }>> = {
	AMATEUR: { label: 'Amateur·rice', hint: 'La musique est un loisir.' },
	SEMI_PRO: { label: 'Semi-pro', hint: 'Je suis rémunéré·e de temps en temps.' },
	PROFESSIONAL: {
		label: 'Professionnel·le',
		hint: 'Je vis de la musique (intermittent·e, enseignant·e, session…).'
	}
};

/** Libellé public, avec la mention obligatoire « (déclaré) » (D17). */
export function proStatusLabel(status: ProStatusValue): string {
	return `${PRO_STATUS_INFO[status].label} (déclaré)`;
}

export const LOOKING_FOR = [
	'BAND',
	'REPLACEMENTS',
	'JAMS',
	'STUDIO_SESSIONS',
	'LESSONS_GIVE',
	'LESSONS_TAKE',
	'COLLABORATION'
] as const;
export type LookingForValue = (typeof LOOKING_FOR)[number];

export const LOOKING_FOR_LABELS: Readonly<Record<LookingForValue, string>> = {
	BAND: 'Rejoindre ou monter un groupe',
	REPLACEMENTS: 'Faire des remplacements',
	JAMS: 'Jams',
	STUDIO_SESSIONS: 'Sessions studio',
	LESSONS_GIVE: 'Donner des cours',
	LESSONS_TAKE: 'Prendre des cours',
	COLLABORATION: 'Collaborations (composition, featuring)'
};

export const EQUIPMENT = ['PA_SYSTEM', 'REHEARSAL_SPACE', 'VEHICLE', 'HOME_STUDIO'] as const;
export type EquipmentValue = (typeof EQUIPMENT)[number];

export const EQUIPMENT_LABELS: Readonly<Record<EquipmentValue, string>> = {
	PA_SYSTEM: 'Sono',
	REHEARSAL_SPACE: 'Local de répétition',
	VEHICLE: 'Véhicule',
	HOME_STUDIO: 'Home studio'
};

/** Rayons de déplacement proposés, en km (tranches, jamais une distance exacte). */
export const TRAVEL_RADII = [10, 25, 50, 100] as const;
export type TravelRadius = (typeof TRAVEL_RADII)[number];

export function isTravelRadius(value: unknown): value is TravelRadius {
	return (TRAVEL_RADII as readonly unknown[]).includes(value);
}

export const MAX_BIO_LENGTH = 600;
export const FIRST_PRACTICE_YEAR = 1940;

/** Année de début de pratique plausible, jusqu'à l'année en cours. */
export function isPracticeYear(year: unknown, today = new Date()): year is number {
	return (
		Number.isInteger(year) &&
		(year as number) >= FIRST_PRACTICE_YEAR &&
		(year as number) <= today.getFullYear()
	);
}

/** Années de pratique affichées (« moins d'un an » compte pour 0). */
export function yearsOfPractice(since: number, today = new Date()): number {
	return Math.max(0, today.getFullYear() - since);
}

/**
 * Bio en texte brut : caractères de contrôle retirés (sauf retours à la
 * ligne), espaces de fin de ligne et lignes vides en excès réduits. Jamais de
 * HTML : l'affichage échappe le texte.
 */
export function normalizeBio(text: string): string {
	return (
		text
			.replace(/\r\n?/g, '\n')
			// eslint-disable-next-line no-control-regex -- on retire justement ces caractères
			.replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ')
			.split('\n')
			.map((line) => line.replace(/\s+/g, ' ').trim())
			.join('\n')
			.replace(/\n{3,}/g, '\n\n')
			.trim()
	);
}

export const LINK_KINDS = [
	'SPOTIFY',
	'YOUTUBE',
	'BANDCAMP',
	'SOUNDCLOUD',
	'INSTAGRAM',
	'WEBSITE'
] as const;
export type LinkKindValue = (typeof LINK_KINDS)[number];

export const LINK_INFO: Readonly<
	Record<LinkKindValue, { label: string; example: string; hosts: readonly string[] | null }>
> = {
	SPOTIFY: { label: 'Spotify', example: 'open.spotify.com/artist/…', hosts: ['open.spotify.com'] },
	YOUTUBE: {
		label: 'YouTube',
		example: 'youtube.com/@…',
		hosts: ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be']
	},
	BANDCAMP: {
		label: 'Bandcamp',
		example: 'nom.bandcamp.com',
		hosts: ['bandcamp.com', '*.bandcamp.com']
	},
	SOUNDCLOUD: {
		label: 'SoundCloud',
		example: 'soundcloud.com/…',
		hosts: ['soundcloud.com', 'm.soundcloud.com', 'on.soundcloud.com']
	},
	INSTAGRAM: {
		label: 'Instagram',
		example: 'instagram.com/…',
		hosts: ['instagram.com', 'www.instagram.com']
	},
	WEBSITE: { label: 'Site personnel', example: 'mon-site.fr', hosts: null }
};

export const MAX_LINK_LENGTH = 300;

export type LinkCheck =
	{ ok: true; url: string } | { ok: false; reason: 'format' | 'host' | 'too_long' };

export const LINK_MESSAGES: Record<Exclude<LinkCheck, { ok: true }>['reason'], string> = {
	format: 'Adresse invalide.',
	host: 'Cette adresse ne correspond pas à ce type de lien.',
	too_long: `Adresse trop longue (${MAX_LINK_LENGTH} caractères au plus).`
};

function hostMatches(host: string, allowed: readonly string[]): boolean {
	return allowed.some((pattern) =>
		pattern.startsWith('*.')
			? host.endsWith(pattern.slice(1)) && host.length > pattern.length - 1
			: host === pattern
	);
}

/**
 * Normalise un lien saisi : `https://` ajouté s'il manque, `http` relevé en
 * `https`, identifiants refusés, domaine contrôlé selon le type. Le site
 * personnel accepte tout domaine public (pas d'adresse IP ni de `localhost`).
 */
export function checkLink(kind: LinkKindValue, input: string): LinkCheck {
	const raw = input.trim();
	if (raw.length > MAX_LINK_LENGTH) return { ok: false, reason: 'too_long' };
	let url: URL;
	try {
		url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
	} catch {
		return { ok: false, reason: 'format' };
	}
	if (url.protocol !== 'https:' && url.protocol !== 'http:') return { ok: false, reason: 'format' };
	if (url.username || url.password) return { ok: false, reason: 'format' };
	url.protocol = 'https:';
	const host = url.hostname.toLowerCase();
	if (!host.includes('.') || /^[\d.]+$/.test(host) || host.startsWith('[')) {
		return { ok: false, reason: 'format' };
	}
	const allowed = LINK_INFO[kind].hosts;
	if (allowed && !hostMatches(host, allowed)) return { ok: false, reason: 'host' };
	return { ok: true, url: url.toString() };
}
