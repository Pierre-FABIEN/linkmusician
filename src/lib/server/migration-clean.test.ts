/** DASH-05h : Prisma ne doit pas retirer l’unicité partielle des actes existants. */
import { expect, it } from 'vitest';
import { cleanMigrationSql } from '../../../scripts/migration-clean.mjs';

it('préserve les index partiels lors des prochaines migrations générées', () => {
	const sql = `DROP INDEX "membership_decisions_once_key";
DROP INDEX "memberships_open_key";
DROP INDEX "delegation_open_key";
ALTER TYPE "MembershipDecisionKind" ADD VALUE 'EXAMPLE';`;
	const cleaned = cleanMigrationSql(sql);
	expect(cleaned.removed).toHaveLength(3);
	expect(cleaned.sql).not.toContain('DROP INDEX');
	expect(cleaned.sql).toContain("ADD VALUE 'EXAMPLE'");
});
