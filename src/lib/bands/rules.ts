/**
 * Groupes et adhésions (P3-01) : règles pures, partagées par le serveur et
 * le navigateur. Le service (`#lib/server/bands/service`) les applique sous
 * verrou ; ici, rien ne lit la base.
 *
 * - Un groupe a toujours un OWNER tant qu'il n'est pas dissous : l'OWNER ne
 *   part pas sans transmettre le groupe, sauf s'il est seul (le groupe est
 *   alors dissous).
 * - OWNER et ADMIN gèrent (inviter, accepter une demande, retirer un
 *   membre) ; seul l'OWNER change les rôles et transmet le groupe.
 * - Créer un groupe ne rapporte rien (rien d'unilatéral) : il est **formé**
 *   à la 2ᵉ adhésion active, ce qui rapporte aux deux et vérifie l'étape
 *   « Formation ».
 */
import { z } from 'zod';

export const ORG_ROLES = ['OWNER', 'ADMIN', 'MEMBER'] as const;
export type OrgRoleValue = (typeof ORG_ROLES)[number];

export const MEMBERSHIP_STATUSES = [
	'INVITED',
	'REQUESTED',
	'ACTIVE',
	'LEFT',
	'REMOVED',
	'DECLINED'
] as const;
export type MembershipStatusValue = (typeof MEMBERSHIP_STATUSES)[number];

/** Statuts « ouverts » : au plus un par personne et par groupe (index en base). */
export const OPEN_STATUSES = [
	'INVITED',
	'REQUESTED',
	'ACTIVE'
] as const satisfies readonly MembershipStatusValue[];

export const ROLE_LABELS: Readonly<Record<OrgRoleValue, string>> = {
	OWNER: 'Responsable',
	ADMIN: 'Co-gestion',
	MEMBER: 'Membre'
};

export const MAX_BAND_NAME = 60;
export const MAX_MEMBER_TITLE = 60;
/** Groupes actifs par personne : au-delà, c'est rarement un vrai groupe. */
export const MAX_ACTIVE_BANDS = 10;
/** Invitations en attente par groupe (anti-spam). */
export const MAX_PENDING_INVITES = 20;

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

const memberTitle = z
	.string()
	.optional()
	.transform((v) => (v ? oneLine(v) : ''))
	.refine((v) => [...v].length <= MAX_MEMBER_TITLE, {
		message: `Ton rôle tient en ${MAX_MEMBER_TITLE} caractères.`
	})
	.transform((v) => v || null);

export const bandSchema = z.object({
	name: z
		.string({ required_error: 'Donne un nom au groupe.' })
		.transform(oneLine)
		.refine((v) => [...v].length >= 2, { message: 'Le nom du groupe fait au moins 2 caractères.' })
		.refine((v) => [...v].length <= MAX_BAND_NAME, {
			message: `Le nom du groupe tient en ${MAX_BAND_NAME} caractères.`
		}),
	title: memberTitle
});
export type BandForm = z.infer<typeof bandSchema>;

export const inviteSchema = z.object({
	handle: z
		.string({ required_error: 'Indique qui inviter.' })
		.transform((v) => v.trim().replace(/^@/, '').toLowerCase())
		.refine((v) => v.length > 0, { message: 'Indique qui inviter.' }),
	title: memberTitle
});

export function isManager(role: OrgRoleValue | null | undefined): boolean {
	return role === 'OWNER' || role === 'ADMIN';
}

/** Qui peut retirer qui : l'OWNER retire tout le monde sauf lui, un ADMIN les membres. */
export function canRemove(actor: OrgRoleValue, target: OrgRoleValue): boolean {
	if (target === 'OWNER') return false;
	if (actor === 'OWNER') return true;
	return actor === 'ADMIN' && target === 'MEMBER';
}

export type LeaveCheck =
	{ ok: true; dissolves: boolean } | { ok: false; reason: 'owner_must_transfer' };

/**
 * Quitter le groupe. L'OWNER ne part pas en laissant le groupe sans
 * responsable : il le transmet d'abord. Seul·e, il ou elle le dissout.
 */
export function leaveCheck(role: OrgRoleValue, activeMembers: number): LeaveCheck {
	if (role !== 'OWNER') return { ok: true, dissolves: false };
	if (activeMembers <= 1) return { ok: true, dissolves: true };
	return { ok: false, reason: 'owner_must_transfer' };
}

export const BAND_ERRORS = {
	owner_must_transfer:
		'Transmets d’abord le groupe à un autre membre : un groupe a toujours une personne responsable.'
} as const;

/** La 2ᵉ adhésion active forme le groupe (une seule fois). */
export function formsBand(input: { formedAt: Date | null; activeMembers: number }): boolean {
	return input.formedAt === null && input.activeMembers >= 2;
}

/** Période d'une adhésion, lisible (« depuis mars 2026 », « mars 2026 – juin 2026 »). */
export function periodLabel(
	startedAt: Date | null,
	endedAt: Date | null,
	locale = 'fr-FR'
): string {
	const month = (d: Date) =>
		d.toLocaleDateString(locale, { month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });
	if (!startedAt) return '';
	if (!endedAt) return `depuis ${month(startedAt)}`;
	const from = month(startedAt);
	const to = month(endedAt);
	return from === to ? from : `${from} – ${to}`;
}

/** Ordre d'affichage des membres : responsable, co-gestion, puis ancienneté. */
export function compareMembers(
	a: { role: OrgRoleValue; startedAt: Date | null },
	b: { role: OrgRoleValue; startedAt: Date | null }
): number {
	const rank = ORG_ROLES.indexOf(a.role) - ORG_ROLES.indexOf(b.role);
	if (rank !== 0) return rank;
	return (a.startedAt?.getTime() ?? 0) - (b.startedAt?.getTime() ?? 0);
}

/**
 * Successeur de l'OWNER qui supprime son compte : la co-gestion la plus
 * ancienne, sinon le membre le plus ancien. `null` : le groupe est dissous.
 */
export function successorOf<
	T extends { personId: string; role: OrgRoleValue; startedAt: Date | null }
>(ownerId: string, active: readonly T[]): T | null {
	const others = active.filter((m) => m.personId !== ownerId).sort(compareMembers);
	return others[0] ?? null;
}
