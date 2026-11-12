/**
 * LINKMUSICIAN: reconnaître les erreurs de base que le code rattrape (DT-01a).
 *
 * Prisma 7 passe par un adaptateur (`@prisma/adapter-pg`) et deux formes
 * d'erreur ont changé par rapport à Prisma 5, mesuré le 12/11/2026 :
 *
 * - un conflit de transaction sérialisable remonte en `DriverAdapterError`
 *   brut (`cause.kind = 'TransactionWriteConflict'`, SQLSTATE 40001), et non
 *   plus en `PrismaClientKnownRequestError` `P2034` ;
 * - une violation d'unicité (`P2002`) ne porte plus `meta.target` (les
 *   champs) : seul le nom de l'index (`actors_handle_key`) est donné, dans
 *   `meta.driverAdapterError.cause.constraint`.
 *
 * Les deux formes sont reconnues, pour rester juste si Prisma rétablit
 * l'ancienne.
 */
import { Prisma } from '@prisma/client';

type AdapterCause = {
	kind?: string;
	originalCode?: string;
	constraint?: { index?: string; fields?: string[] };
};

function adapterCauseOf(err: unknown): AdapterCause | undefined {
	if (!(err instanceof Error)) return undefined;
	if (err.name === 'DriverAdapterError') return err.cause as AdapterCause | undefined;
	if (err instanceof Prisma.PrismaClientKnownRequestError) {
		const nested = (err.meta as { driverAdapterError?: { cause?: AdapterCause } } | undefined)
			?.driverAdapterError;
		return nested?.cause;
	}
	return undefined;
}

/** Conflit d'écriture ou interblocage d'une transaction sérialisable : à rejouer. */
export function isWriteConflict(err: unknown): boolean {
	if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034') return true;
	const cause = adapterCauseOf(err);
	return cause?.kind === 'TransactionWriteConflict' || cause?.originalCode === '40001';
}

/**
 * Violation d'unicité portant sur `field`.
 *
 * Prisma 5 donnait les champs (`meta.target`). Prisma 7 donne l'index, nommé
 * par défaut `<table>_<champ>[_<champ>…]_key` : on y cherche le champ comme
 * segment entier, pour que `id` ne corresponde pas à `userId`.
 */
export function isUniqueViolation(err: unknown, field: string): boolean {
	if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') return false;
	const target = (err.meta as { target?: unknown } | undefined)?.target;
	if (Array.isArray(target)) return target.includes(field);
	if (typeof target === 'string') return target.split('_').includes(field);
	const constraint = adapterCauseOf(err)?.constraint;
	if (constraint?.fields) return constraint.fields.some((f) => f.replace(/"/g, '') === field);
	return constraint?.index?.split('_').includes(field) ?? false;
}
