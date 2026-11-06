/**
 * Morceau minimal (P3-11, D35) : règles pures, partagées par le serveur et le
 * navigateur. Conception 06 §4.2 à §4.5, et docs/morceaux/README.md.
 *
 * - Idée : visible de son équipe seulement.
 * - Composé : le porteur (ou la gestion du groupe) le déclare, maquette
 *   jointe. Seul·e : déclaré, sans XP. Avec ≥2 crédits confirmés :
 *   corroboré, chaque contributeur confirmé reçoit sa part.
 */
import { z } from 'zod';

export const WORK_ROLE_KINDS = ['INSTRUMENT', 'COMPOSITION', 'LYRICS', 'ARRANGEMENT'] as const;
export type WorkRoleKindValue = (typeof WORK_ROLE_KINDS)[number];

export const WORK_ROLE_LABELS: Readonly<Record<Exclude<WorkRoleKindValue, 'INSTRUMENT'>, string>> =
	{
		COMPOSITION: 'Composition',
		LYRICS: 'Paroles',
		ARRANGEMENT: 'Arrangement'
	};

export const MAX_WORK_TITLE = 80;
export const MAX_WORK_GENRES = 3;
export const MAX_CONTRIBUTORS = 12;
export const MAX_ROLES = 24;
/** Crédits en attente de confirmation sur un même morceau. */
export const MAX_PENDING_CREDITS = 8;
/** Crédits confirmés nécessaires pour qu'un morceau composé soit corroboré. */
export const CORROBORATION_CREDITS = 2;

/** Libellé d'un rôle (« Guitare », « Paroles »). */
export function roleLabel(role: { kind: WorkRoleKindValue; instrument?: { name: string } | null }) {
	if (role.kind === 'INSTRUMENT') return role.instrument?.name ?? 'Instrument';
	return WORK_ROLE_LABELS[role.kind];
}

/** Niveau de preuve d'un morceau composé selon ses crédits confirmés. */
export function proofFor(confirmedCredits: number): 'DECLARED' | 'CORROBORATED' {
	return confirmedCredits >= CORROBORATION_CREDITS ? 'CORROBORATED' : 'DECLARED';
}

/**
 * Ce qui se passe quand une personne confirme son rôle (`null` : rien pour
 * la progression). `confirmed` compte la confirmation en cours.
 */
export function onConfirm(work: {
	state: 'IDEA' | 'COMPOSED';
	proof: 'DECLARED' | 'CORROBORATED' | null;
	confirmed: number;
}): 'corroborate' | 'share' | null {
	if (work.state !== 'COMPOSED') return null;
	if (work.proof === 'CORROBORATED') return 'share';
	return proofFor(work.confirmed) === 'CORROBORATED' ? 'corroborate' : null;
}

/** Ce qui manque pour déclarer le morceau composé (`null` : rien). */
export function composeBlocker(work: {
	state: 'IDEA' | 'COMPOSED';
	hasDemo: boolean;
}): string | null {
	if (work.state === 'COMPOSED') return 'Ce morceau est déjà composé.';
	if (!work.hasDemo) return 'Joins d’abord une maquette (un lien suffit).';
	return null;
}

/** Un rôle saisi : « INSTRUMENT:guitare » ou « LYRICS ». */
export const roleInputSchema = z
	.string()
	.trim()
	.transform((v, ctx) => {
		const [kind, slug] = v.split(':');
		if (!(WORK_ROLE_KINDS as readonly string[]).includes(kind)) {
			ctx.addIssue({ code: 'custom', message: 'Choisis un rôle dans la liste.' });
			return z.NEVER;
		}
		if (kind === 'INSTRUMENT' && !slug) {
			ctx.addIssue({ code: 'custom', message: 'Choisis un instrument.' });
			return z.NEVER;
		}
		return {
			kind: kind as WorkRoleKindValue,
			instrumentSlug: kind === 'INSTRUMENT' ? slug : null
		};
	});
export type RoleInput = z.infer<typeof roleInputSchema>;

/** Clé d'un rôle, pour comparer deux saisies. */
export function roleKey(role: { kind: WorkRoleKindValue; instrumentSlug: string | null }) {
	return role.kind === 'INSTRUMENT' ? `INSTRUMENT:${role.instrumentSlug}` : role.kind;
}

export function uniqueRoles(roles: RoleInput[]): RoleInput[] {
	const seen = new Set<string>();
	return roles.filter((r) => {
		const key = roleKey(r);
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

const title = z
	.string()
	.trim()
	.min(1, { message: 'Donne un titre au morceau (même provisoire).' })
	.max(MAX_WORK_TITLE, { message: `Le titre tient en ${MAX_WORK_TITLE} caractères.` });

const genreIds = z
	.array(z.string().min(1))
	.max(MAX_WORK_GENRES, { message: `${MAX_WORK_GENRES} genres au maximum.` });

/** Nouveau morceau : titre, genres, porteur, mes rôles. */
export const newWorkSchema = z.object({
	title,
	genreIds,
	/** @handle d'un groupe que je gère ; vide : le morceau est à moi. */
	band: z
		.string()
		.optional()
		.transform((v) => v?.trim() || null),
	roles: z
		.array(roleInputSchema)
		.min(1, { message: 'Indique au moins ton rôle sur ce morceau.' })
		.transform(uniqueRoles)
});
export type NewWorkInput = z.infer<typeof newWorkSchema>;

export const editWorkSchema = z.object({ title, genreIds });

/** Créditer une personne : son @handle et ses rôles. */
export const creditSchema = z.object({
	handle: z
		.string()
		.trim()
		.transform((v) => v.replace(/^@/, '').toLowerCase())
		.pipe(z.string().min(1, { message: 'Indique son @identifiant.' })),
	roles: z
		.array(roleInputSchema)
		.min(1, { message: 'Choisis au moins un rôle.' })
		.transform(uniqueRoles)
});

/** Maquette : un lien, ou un média déjà publié du porteur. */
export const demoSchema = z.union([
	z.object({
		mediaId: z.string().min(1)
	}),
	z.object({
		url: z.string().trim().min(1, { message: 'Colle le lien de la maquette.' }),
		title: z
			.string()
			.optional()
			.transform((v) => v?.trim() || '')
	})
]);

/**
 * Lien « Recruter » depuis un rôle à pourvoir : l'annonce est préremplie
 * (P3-03 : `?groupe=`). Un groupe cherche un membre ; une personne, une
 * session.
 */
export function recruitHref(input: {
	workTitle: string;
	bandHandle: string | null;
	instrumentSlug: string | null;
	roleLabel: string;
}) {
	const params = new URLSearchParams();
	params.set('type', input.bandHandle ? 'RECRUIT_MEMBER' : 'SESSION_WORK');
	if (input.bandHandle) params.set('groupe', input.bandHandle);
	if (input.instrumentSlug) params.set('instrument', input.instrumentSlug);
	params.set('titre', `${input.roleLabel} pour « ${input.workTitle} »`.slice(0, 100));
	return `/annonces/nouvelle?${params}`;
}
