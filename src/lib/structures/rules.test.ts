import { describe, expect, it } from 'vitest';
import { STRUCTURE_KINDS, participationLabel, structurePermissions } from './rules';

describe('capacités des structures (DASH-02a)', () => {
	it.each(STRUCTURE_KINDS)(
		'%s : seuls les responsables et la co-gestion actifs administrent',
		(kind) => {
			for (const role of ['OWNER', 'ADMIN']) {
				expect(structurePermissions(kind, 'ACTIVE', role)).toContain('manage');
				for (const status of ['INVITED', 'REQUESTED', 'DECLINED', 'LEFT', 'REMOVED']) {
					expect(structurePermissions(kind, status, role)).toEqual([]);
				}
			}
			expect(structurePermissions(kind, 'ACTIVE', 'MEMBER')).toEqual([]);
			expect(structurePermissions(kind, 'ACTIVE', 'MODERATOR')).toEqual([]);
			const permissions = structurePermissions(kind, 'ACTIVE', 'ADMIN');
			for (const other of STRUCTURE_KINDS.filter((k) => k !== kind)) {
				expect(permissions).not.toContain(`${other.toLowerCase()}.manage`);
			}
		}
	);
	it('une invitation ne se présente jamais comme une gestion déjà accordée', () => {
		expect(participationLabel('STUDIO', 'INVITED', 'ADMIN')).toBe('Invitation à accepter');
		expect(participationLabel('BAND', 'REQUESTED', 'MEMBER')).toBe('Demande en attente');
		expect(participationLabel('SCHOOL', 'ACTIVE', 'MEMBER')).toBe('Élève');
		expect(structurePermissions('SCHOOL', 'ACTIVE', 'MEMBER')).not.toContain(
			'school.students.read'
		);
	});
});
