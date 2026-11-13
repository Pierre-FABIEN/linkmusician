/** DASH-02a : capacités structurelles ; les règles par acte restent dans les services. */
export const STRUCTURE_KINDS = ['BAND', 'STUDIO', 'VENUE', 'PROMOTER', 'SCHOOL', 'AGENCY'] as const;
export type StructureKind = (typeof STRUCTURE_KINDS)[number];
export const STRUCTURE_LABELS: Record<StructureKind, string> = {
	BAND: 'Groupe',
	STUDIO: 'Studio',
	VENUE: 'Lieu',
	PROMOTER: 'Organisation',
	SCHOOL: 'École',
	AGENCY: 'Agence'
};
export type StructurePermission =
	| 'manage'
	| 'agency.manage'
	| 'band.manage'
	| 'studio.manage'
	| 'venue.manage'
	| 'promoter.manage'
	| 'school.manage'
	| 'school.students.read';
const SPECIALIZED: Record<StructureKind, readonly StructurePermission[]> = {
	BAND: ['band.manage'],
	STUDIO: ['studio.manage'],
	VENUE: ['venue.manage'],
	PROMOTER: ['promoter.manage'],
	SCHOOL: ['school.manage', 'school.students.read'],
	AGENCY: ['agency.manage']
};

export function structurePermissions(
	kind: StructureKind,
	status: string,
	role: string
): StructurePermission[] {
	if (status !== 'ACTIVE' || (role !== 'OWNER' && role !== 'ADMIN')) return [];
	return ['manage', ...SPECIALIZED[kind]];
}

export function participationLabel(kind: StructureKind, status: string, role: string): string {
	if (status === 'INVITED') return 'Invitation à accepter';
	if (status === 'REQUESTED') return 'Demande en attente';
	if (status !== 'ACTIVE') return 'Participation terminée';
	if (role === 'OWNER') return 'Responsable';
	if (role === 'ADMIN') return 'Co-gestion';
	return kind === 'SCHOOL' ? 'Élève' : kind === 'AGENCY' ? 'Collaborateur·rice' : 'Membre';
}
