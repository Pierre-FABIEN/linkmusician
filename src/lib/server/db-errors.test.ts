import { describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import { isUniqueViolation, isWriteConflict } from './db-errors';

/** Erreur de l'adaptateur telle que Prisma 7.10 la lève (relevé du 12/11/2026). */
function adapterError(cause: Record<string, unknown>): Error {
	const err = new Error(String(cause.kind), { cause });
	err.name = 'DriverAdapterError';
	return err;
}

function known(code: string, meta?: Record<string, unknown>) {
	return new Prisma.PrismaClientKnownRequestError('erreur', { code, clientVersion: 'test', meta });
}

/** `P2002` de Prisma 7 : l'index seul, sans `meta.target`. */
function unique7(index: string) {
	return known('P2002', {
		modelName: 'Actor',
		driverAdapterError: {
			name: 'DriverAdapterError',
			cause: { originalCode: '23505', kind: 'UniqueConstraintViolation', constraint: { index } }
		}
	});
}

describe('conflit de transaction sérialisable', () => {
	it('reconnaît la forme Prisma 7 (DriverAdapterError brut)', () => {
		expect(
			isWriteConflict(adapterError({ kind: 'TransactionWriteConflict', originalCode: '40001' }))
		).toBe(true);
	});

	it('reconnaît la forme Prisma 5 (P2034)', () => {
		expect(isWriteConflict(known('P2034'))).toBe(true);
	});

	it('ignore les autres erreurs', () => {
		expect(isWriteConflict(adapterError({ kind: 'UniqueConstraintViolation' }))).toBe(false);
		expect(isWriteConflict(known('P2002'))).toBe(false);
		expect(isWriteConflict(new Error('autre'))).toBe(false);
		expect(isWriteConflict(null)).toBe(false);
	});
});

describe('violation d’unicité par champ', () => {
	it('Prisma 7 : lit le champ dans le nom de l’index', () => {
		expect(isUniqueViolation(unique7('actors_handle_key'), 'handle')).toBe(true);
		expect(isUniqueViolation(unique7('persons_userId_key'), 'userId')).toBe(true);
		expect(isUniqueViolation(unique7('persons_userId_key'), 'handle')).toBe(false);
	});

	it('Prisma 7 : un segment entier, pas une sous-chaîne', () => {
		expect(isUniqueViolation(unique7('persons_userId_key'), 'id')).toBe(false);
	});

	it('Prisma 7 : liste de champs quand l’adaptateur la donne', () => {
		const err = known('P2002', {
			driverAdapterError: { cause: { constraint: { fields: ['"handle"'] } } }
		});
		expect(isUniqueViolation(err, 'handle')).toBe(true);
	});

	it('Prisma 5 : lit meta.target', () => {
		expect(isUniqueViolation(known('P2002', { target: ['handle'] }), 'handle')).toBe(true);
		expect(isUniqueViolation(known('P2002', { target: ['userId'] }), 'handle')).toBe(false);
	});

	it('ignore une autre erreur', () => {
		expect(isUniqueViolation(known('P2025'), 'handle')).toBe(false);
		expect(isUniqueViolation(new Error('x'), 'handle')).toBe(false);
	});
});
