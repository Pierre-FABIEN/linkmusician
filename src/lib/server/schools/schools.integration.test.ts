/**
 * Écoles, MJC, conservatoires (P5-11) sur la base de `.env`, schéma `e2e` :
 * le lien d'invitation (haché, plafonné, révocable) fait d'une personne un·e
 * élève ; les ateliers ne se voient que des membres ; **un·e mineur·e ne voit
 * que les ateliers finis avant 22 h** ; aucune liste d'élèves hors de la
 * gestion ; l'école ne passe jamais à un·e élève. Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/schools
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createPrismaClient } from '../../../../prisma/client.js';
import dotenv from 'dotenv';

const enabled = process.env.PROGRESSION_INTEGRATION === '1';
const url = new URL(
	dotenv.config({ quiet: true }).parsed?.DATABASE_URL ??
		process.env.DATABASE_URL ??
		'postgresql://x/y'
);
url.searchParams.set('schema', 'e2e');
if (enabled) process.env.DATABASE_URL = url.toString();
const db = createPrismaClient(url.toString());

vi.mock('#lib/server', () => ({ prisma: db }));

const schools = await import('./service');
const jams = await import('../jam/publicJams');
const { exportPersonData, personAnonymizationOps } = await import('#lib/prisma/actors/person');

const PREFIX = 'school-test-';
const YEAR = 365.25 * 86_400_000;
/** Un jour civil dans 5 jours (AAAA-MM-JJ). */
const day = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10);

describe.skipIf(!enabled)('écoles et ateliers (schéma e2e)', { timeout: 120_000 }, () => {
	const ids: Record<string, string> = {};
	let school = { id: '', handle: '' };
	let venueId = '';
	let token = '';
	const workshops: Record<string, string> = {};

	async function cleanup() {
		const actors = await db.actor.findMany({
			where: {
				OR: [
					{ handle: { startsWith: PREFIX } },
					{ person: { user: { email: { startsWith: PREFIX } } } }
				]
			},
			select: { id: true }
		});
		await db.venue.deleteMany({ where: { name: { startsWith: PREFIX } } });
		await db.actor.deleteMany({ where: { id: { in: actors.map((a) => a.id) } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
	}

	async function person(name: string, age = 30) {
		const user = await db.user.create({
			data: { email: `${PREFIX}${name}@example.test`, referralCode: `${PREFIX}${name}` }
		});
		return (
			await db.actor.create({
				data: {
					kind: 'PERSON',
					handle: PREFIX + name,
					displayName: name,
					trustLevel: 1,
					person: {
						create: {
							userId: user.id,
							termsAcceptedAt: new Date(),
							onboardedAt: new Date(),
							birthDate: new Date(Date.now() - age * YEAR),
							tracks: { create: { track: 'MUSICIAN', isPrimary: true } }
						}
					}
				}
			})
		).id;
	}

	const form = (title: string, start: string, end: string) => ({
		venueId,
		day,
		start,
		end,
		title,
		description: '',
		spots: []
	});

	beforeAll(async () => {
		await cleanup();
		ids.prof = await person('prof');
		ids.eleve = await person('eleve');
		ids.jeune = await person('jeune', 16);
		ids.autre = await person('autre');
		const venue = await db.venue.create({
			data: {
				name: `${PREFIX}Salle`,
				nameKey: `${PREFIX}salle`,
				kind: 'MJC',
				communeCode: '31555',
				communeName: 'Toulouse',
				departmentCode: '31',
				lat: 43.6,
				lng: 1.44,
				createdById: ids.prof,
				validatedAt: new Date()
			}
		});
		venueId = venue.id;
	}, 120_000);

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('seule une personne majeure ouvre une école ; elle en est responsable', async () => {
		await expect(
			schools.createSchool(ids.jeune, { name: `${PREFIX}Jeune école`, kind: 'MJC' })
		).rejects.toThrow(/majeur/);
		school = await schools.createSchool(ids.prof, {
			name: `${PREFIX}École du Faubourg`,
			kind: 'MUSIC_SCHOOL'
		});
		expect(await schools.mySchools(ids.prof)).toMatchObject([
			{ handle: school.handle, manager: true }
		]);
		expect(await schools.schoolForMember(school.handle, ids.autre)).toBeNull();
	});

	it('le lien : seul son hachage est gardé, il fait des élèves, jusqu’à son plafond', async () => {
		token = await schools.createSchoolInvite(school.handle, ids.prof, 2);
		const row = await db.schoolInvite.findFirstOrThrow({ where: { orgId: school.id } });
		expect(row.tokenHash).not.toContain(token);
		expect(row.tokenHash).toBe(schools.hashInviteToken(token));
		await expect(schools.createSchoolInvite(school.handle, ids.eleve)).rejects.toThrow(/gèrent/);

		expect(await schools.previewSchoolInvite(token, ids.eleve)).toMatchObject({
			error: null,
			member: false
		});
		expect(await schools.joinSchoolWithInvite(token, ids.eleve)).toBe(school.handle);
		// Le suivre deux fois ne compte qu'une fois.
		await schools.joinSchoolWithInvite(token, ids.eleve);
		await schools.joinSchoolWithInvite(token, ids.jeune);
		await expect(schools.joinSchoolWithInvite(token, ids.autre)).rejects.toThrow(/autant de fois/);
		expect((await db.schoolInvite.findUniqueOrThrow({ where: { id: row.id } })).uses).toBe(2);
		expect(await schools.mySchools(ids.eleve)).toMatchObject([{ manager: false }]);
	});

	it('la liste des élèves : pour la gestion seulement', async () => {
		const students = await schools.schoolStudents(school.handle, ids.prof);
		expect(students.map((s) => s.displayName).sort()).toEqual(['eleve', 'jeune']);
		await expect(schools.schoolStudents(school.handle, ids.eleve)).rejects.toThrow(/gèrent/);
	});

	it('les ateliers : membres seulement ; mineur·e : finis avant 22 h', async () => {
		workshops.early = (
			await schools.createWorkshop(
				school.handle,
				ids.prof,
				form('Atelier du goûter', '17:00', '19:00')
			)
		).id;
		workshops.late = (
			await schools.createWorkshop(
				school.handle,
				ids.prof,
				form('Atelier du soir', '20:00', '23:00')
			)
		).id;
		await expect(
			schools.createWorkshop(school.handle, ids.eleve, form('Atelier pirate', '17:00', '18:00'))
		).rejects.toThrow(/gèrent/);
		const row = await db.opportunity.findUniqueOrThrow({ where: { id: workshops.early } });
		expect(row).toMatchObject({
			audience: 'SCHOOL',
			issuerActorId: school.id,
			leadActorId: ids.prof,
			postedById: ids.prof
		});

		const titles = async (viewer: string) =>
			(await jams.upcomingSchoolJams(school.id, ids[viewer])).map((j) => j.title).sort();
		expect(await titles('eleve')).toEqual(['Atelier du goûter', 'Atelier du soir']);
		expect(await titles('jeune')).toEqual(['Atelier du goûter']);
		expect(await titles('autre')).toEqual([]);
		expect(await jams.getJam(workshops.late, ids.jeune)).toBeNull();
		// Hors de l'école : ni dans l'agenda du lieu, ni sur la page, ni « Je viens ».
		expect(await jams.upcomingJamsAt(venueId, ids.autre)).toEqual([]);
		expect(await jams.getJam(workshops.early, ids.autre)).toBeNull();
		await expect(jams.comeToJam(workshops.early, ids.autre)).rejects.toThrow(/introuvable/);
	});

	it('« De l’atelier à la scène » : l’atelier, puis une jam publique', async () => {
		await jams.comeToJam(workshops.early, ids.eleve);
		expect(await schools.workshopQuestFacts(ids.eleve)).toEqual({
			schools: 1,
			workshops: 1,
			publicJams: 0
		});
		const open = await db.opportunity.create({
			data: {
				issuerActorId: ids.autre,
				kind: 'JAM',
				title: 'Bœuf public',
				description: '',
				venueId,
				startsAt: new Date(`${day}T17:00:00Z`),
				endsAt: new Date(`${day}T19:00:00Z`),
				expiresAt: new Date(`${day}T19:00:00Z`)
			}
		});
		expect((await jams.upcomingJamsAt(venueId, ids.autre)).map((j) => j.title)).toEqual([
			'Bœuf public'
		]);
		await jams.comeToJam(open.id, ids.eleve);
		expect((await schools.workshopQuestFacts(ids.eleve)).publicJams).toBe(1);
	});

	it('quitter l’école : plus d’ateliers ; un lien retiré ne sert plus', async () => {
		const mine = await schools.schoolForMember(school.handle, ids.eleve);
		await schools.leaveOrRemoveStudent(school.handle, ids.eleve, mine!.membershipId);
		expect(await jams.upcomingSchoolJams(school.id, ids.eleve)).toEqual([]);
		const invite = await db.schoolInvite.findFirstOrThrow({ where: { orgId: school.id } });
		await schools.revokeSchoolInvite(school.handle, ids.prof, invite.id);
		expect((await schools.previewSchoolInvite(token, ids.autre))?.error).toMatch(/plus valable/);
	});

	it('RGPD : l’école exportée ; à l’anonymisation de la responsable, elle ne passe pas à une élève', async () => {
		const { userId } = await db.person.findUniqueOrThrow({
			where: { actorId: ids.jeune },
			select: { userId: true }
		});
		expect((await exportPersonData(userId))?.ecoles).toMatchObject([{ role: 'élève' }]);
		const prof = await db.person.findUniqueOrThrow({
			where: { actorId: ids.prof },
			select: { userId: true }
		});
		await db.$transaction(await personAnonymizationOps(prof.userId));
		const org = await db.organization.findUniqueOrThrow({ where: { actorId: school.id } });
		expect(org.dissolvedAt).not.toBeNull();
		expect(
			await db.membership.count({ where: { orgId: school.id, role: 'OWNER', personId: ids.jeune } })
		).toBe(0);
	});
});
