/**
 * Écoles, MJC, conservatoires (P5-11, D29) : référentiel et règles. Module
 * pur, partagé par le serveur et le navigateur.
 *
 * Une école est une organisation `SCHOOL` : ses profs ou responsables la
 * gèrent (OWNER), ses élèves en sont membres (MEMBER), venus par un **lien
 * d'invitation**. **Aucune liste d'élèves n'est publique** : seule la
 * gestion la voit. L'école publie des **ateliers jam** réservés à ses
 * membres (`audience: SCHOOL`), dont le lead est la personne qui publie.
 */
import { z } from 'zod';

/** Alignés sur l'enum Prisma `SchoolKind`. */
export const SCHOOL_KINDS = ['MUSIC_SCHOOL', 'MJC', 'CONSERVATORY', 'ASSOCIATION'] as const;
export type SchoolKindValue = (typeof SCHOOL_KINDS)[number];

export const SCHOOL_KIND_LABELS: Readonly<Record<SchoolKindValue, string>> = {
	MUSIC_SCHOOL: 'École de musique',
	MJC: 'MJC, centre culturel',
	CONSERVATORY: 'Conservatoire',
	ASSOCIATION: 'Association, atelier'
};

export const MAX_SCHOOL_NAME = 80;
/** Écoles gérées par une même personne. */
export const MAX_MANAGED_SCHOOLS = 3;

/** Lien d'invitation : 30 jours, 30 usages par défaut, 200 au plus. */
export const INVITE_DAYS = 30;
export const DEFAULT_INVITE_USES = 30;
export const MAX_INVITE_USES = 200;
/** Liens actifs à la fois, par école. */
export const MAX_ACTIVE_INVITES = 5;

export const schoolSchema = z.object({
	name: z
		.string()
		.trim()
		.min(2, 'Un nom de 2 caractères au moins.')
		.max(MAX_SCHOOL_NAME, `${MAX_SCHOOL_NAME} caractères au plus.`),
	kind: z.enum(SCHOOL_KINDS, { message: 'Choisis le type de structure.' })
});
export type SchoolForm = z.infer<typeof schoolSchema>;

export const inviteUsesSchema = z.coerce
	.number()
	.int('Un nombre entier.')
	.min(1, 'Une personne au moins.')
	.max(MAX_INVITE_USES, `${MAX_INVITE_USES} personnes au plus.`);

export type InviteState = 'OK' | 'EXPIRED' | 'REVOKED' | 'FULL';

/** Le lien sert-il encore ? */
export function inviteState(
	invite: { expiresAt: Date; revokedAt: Date | null; uses: number; maxUses: number },
	now = new Date()
): InviteState {
	if (invite.revokedAt) return 'REVOKED';
	if (invite.expiresAt <= now) return 'EXPIRED';
	if (invite.uses >= invite.maxUses) return 'FULL';
	return 'OK';
}

export const INVITE_STATE_MESSAGES: Readonly<Record<Exclude<InviteState, 'OK'>, string>> = {
	EXPIRED: 'Ce lien a expiré : demande un nouveau lien à ton école.',
	REVOKED: 'Ce lien n’est plus valable : demande un nouveau lien à ton école.',
	FULL: 'Ce lien a servi autant de fois que prévu : demande un nouveau lien à ton école.'
};

/** Un jeton de lien : 32 caractères base64url (24 octets), sans ambiguïté dans une URL. */
export const INVITE_TOKEN = /^[A-Za-z0-9_-]{32}$/;
