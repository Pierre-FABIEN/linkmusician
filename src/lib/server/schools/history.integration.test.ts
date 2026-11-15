/** DASH-05i : vrais services et journal personnel, schéma e2e uniquement. */
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Prisma } from '@prisma/client';
import dotenv from 'dotenv';
import { createPrismaClient } from '../../../../prisma/client.js';
const enabled = process.env.PROGRESSION_INTEGRATION === '1';
const url = new URL(dotenv.config({ quiet: true }).parsed?.DATABASE_URL ?? 'postgresql://x/y');
url.searchParams.set('schema', 'e2e');
if (enabled) process.env.DATABASE_URL = url.toString();
const db = createPrismaClient(url.toString());
vi.mock('#lib/server', () => ({ prisma: db }));
const schools = await import('./service');
const { myComanagementHistory, myStructure } = await import('../organizations/structures');
const { exportPersonData, personAnonymizationOps } = await import('#lib/prisma/actors/person');
const prefix = `schoolhistory-${Date.now()}-`;
const people: Record<string, string> = {};
let school = { id: '', handle: '' },
	token = '';
const at = new Date('2026-11-15T12:00:00Z');
const decisions = () =>
	db.membershipDecision.findMany({
		where: { membership: { orgId: school.id } },
		orderBy: { occurredAt: 'asc' }
	});
const membership = () =>
	db.membership.findFirstOrThrow({
		where: { orgId: school.id, personId: people.student },
		orderBy: { createdAt: 'desc' }
	});

describe.skipIf(!enabled)('historique personnel des écoles', { timeout: 60000 }, () => {
	beforeEach(async () => {
		for (const name of ['owner', 'student', 'outsider']) {
			const user = await db.user.create({
				data: { email: `${prefix}${name}@example.test`, referralCode: prefix + name }
			});
			people[name] = (
				await db.actor.create({
					data: {
						kind: 'PERSON',
						handle: prefix + name,
						displayName: name,
						person: {
							create: {
								userId: user.id,
								birthDate: new Date(name === 'student' ? '2010-01-01' : '1990-01-01'),
								termsAcceptedAt: at
							}
						}
					}
				})
			).id;
		}
		school = await schools.createSchool(people.owner, { name: prefix + 'école', kind: 'MJC' }, at);
		token = await schools.createSchoolInvite(school.handle, people.owner, 3, at);
	});
	afterEach(async () => {
		vi.restoreAllMocks();
		await db.actor.deleteMany({
			where: { OR: [{ id: school.id }, { id: { in: Object.values(people) } }] }
		});
		await db.user.deleteMany({ where: { email: { startsWith: prefix } } });
	});
	afterAll(() => db.$disconnect());

	it('entrée par lien attribuée à l’élève mineur, sans inviter fictif ni notification ajoutée', async () => {
		const notifications = await db.notification.count();
		await schools.joinSchoolWithInvite(token, people.student, at);
		expect(await decisions()).toMatchObject([
			{ kind: 'ACCEPTED', authorId: people.student, occurredAt: at }
		]);
		expect((await membership()).invitedById).toBeNull();
		expect(await db.notification.count()).toBe(notifications);
		const history = await myComanagementHistory(people.student);
		expect(history).toMatchObject([
			{
				name: prefix + 'école',
				activity: [{ action: 'Invitation acceptée', author: 'student', occurredAt: at }]
			}
		]);
		expect(await myComanagementHistory(people.owner)).toEqual([]);
		expect(await myComanagementHistory(people.outsider)).toEqual([]);
		expect(JSON.stringify(history)).not.toContain(people.student);
		expect(JSON.stringify(history)).not.toContain(token);
	});

	it('entrées identiques concurrentes et rejouées : une période, un acte, un usage', async () => {
		await Promise.all([
			schools.joinSchoolWithInvite(token, people.student, at),
			schools.joinSchoolWithInvite(token, people.student, at)
		]);
		await schools.joinSchoolWithInvite(token, people.student, new Date(at.getTime() + 1000));
		expect(await decisions()).toHaveLength(1);
		expect(
			await db.membership.count({ where: { orgId: school.id, personId: people.student } })
		).toBe(1);
		expect((await db.schoolInvite.findFirstOrThrow({ where: { orgId: school.id } })).uses).toBe(1);
	});

	for (const self of [true, false])
		it(`${self ? 'départ' : 'retrait'} : auteur réel, date, lecture personnelle après perte des outils`, async () => {
			await schools.joinSchoolWithInvite(token, people.student, at);
			const row = await membership(),
				end = new Date(at.getTime() + 1000);
			const authorId = self ? people.student : people.owner;
			await schools.leaveOrRemoveStudent(school.handle, authorId, row.id, end);
			expect(await decisions()).toMatchObject([
				{ kind: 'ACCEPTED' },
				{ kind: self ? 'LEFT' : 'REMOVED', authorId, occurredAt: end }
			]);
			expect(await myStructure(school.id, people.student)).toBeNull();
			expect(await schools.schoolForMember(school.handle, people.student)).toBeNull();
			expect((await myComanagementHistory(people.student))[0].activity).toHaveLength(2);
			await expect(
				schools.leaveOrRemoveStudent(school.handle, authorId, row.id)
			).rejects.toMatchObject({ status: 404 });
			expect(await decisions()).toHaveLength(2);
			await schools.joinSchoolWithInvite(token, people.student, new Date(end.getTime() + 1000));
			expect((await membership()).id).not.toBe(row.id);
			expect(await myComanagementHistory(people.student)).toHaveLength(2);
		});

	it('départ et retrait concurrents : une seule clôture et auteur non écrasé', async () => {
		await schools.joinSchoolWithInvite(token, people.student, at);
		const row = await membership();
		const results = await Promise.allSettled([
			schools.leaveOrRemoveStudent(school.handle, people.student, row.id, at),
			schools.leaveOrRemoveStudent(school.handle, people.owner, row.id, at)
		]);
		expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
		expect(await decisions()).toHaveLength(2);
		const end = (await decisions()).find((d) => d.kind !== 'ACCEPTED')!;
		expect(end.authorId).toBe(end.kind === 'LEFT' ? people.student : people.owner);
	});

	it('tiers, mauvais handle et responsable protégés sans trace', async () => {
		await schools.joinSchoolWithInvite(token, people.student, at);
		const row = await membership();
		await expect(
			schools.leaveOrRemoveStudent(school.handle, people.outsider, row.id)
		).rejects.toMatchObject({ status: 403 });
		await expect(
			schools.leaveOrRemoveStudent('inconnue', people.student, row.id)
		).rejects.toMatchObject({ status: 404 });
		const owner = await db.membership.findFirstOrThrow({
			where: { orgId: school.id, personId: people.owner }
		});
		await expect(
			schools.leaveOrRemoveStudent(school.handle, people.owner, owner.id)
		).rejects.toThrow(/responsable/);
		expect(await decisions()).toHaveLength(1);
	});

	for (const state of ['dissolved', 'deleted', 'wrong-type'] as const)
		it(`école ${state} : entrée et départ refusés, historique exclu`, async () => {
			await schools.joinSchoolWithInvite(token, people.student, at);
			const row = await membership();
			if (state === 'deleted')
				await db.actor.update({ where: { id: school.id }, data: { deletedAt: at } });
			else
				await db.organization.update({
					where: { actorId: school.id },
					data: state === 'dissolved' ? { dissolvedAt: at } : { kind: 'PROMOTER' }
				});
			await expect(schools.joinSchoolWithInvite(token, people.outsider, at)).rejects.toMatchObject({
				status: 404
			});
			await expect(
				schools.leaveOrRemoveStudent(school.handle, people.student, row.id)
			).rejects.toMatchObject({ status: 404 });
			if (state !== 'wrong-type') expect(await myComanagementHistory(people.student)).toEqual([]);
			expect(await decisions()).toHaveLength(1);
		});

	it('une ancienne période sans trace ne produit aucun acte ; une période en attente garde ses traces', async () => {
		const row = await db.membership.create({
			data: {
				orgId: school.id,
				personId: people.student,
				role: 'MEMBER',
				status: 'REQUESTED',
				decisions: { create: { kind: 'JOIN_REQUESTED', authorId: people.student, occurredAt: at } }
			}
		});
		await schools.joinSchoolWithInvite(token, people.student, at);
		expect((await membership()).id).toBe(row.id);
		expect((await decisions()).map((d) => d.kind).sort()).toEqual(['ACCEPTED', 'JOIN_REQUESTED']);
		const old = await db.membership.create({
			data: {
				orgId: school.id,
				personId: people.outsider,
				role: 'MEMBER',
				status: 'LEFT',
				startedAt: at,
				endedAt: at
			}
		});
		expect(await myComanagementHistory(people.outsider)).toEqual([]);
		expect(await db.membershipDecision.count({ where: { membershipId: old.id } })).toBe(0);
	});

	it('école masquée consultable, acteur lecteur supprimé exclu', async () => {
		await schools.joinSchoolWithInvite(token, people.student, at);
		await db.actor.update({ where: { id: school.id }, data: { hidden: true } });
		expect(await myComanagementHistory(people.student)).toHaveLength(1);
		await db.actor.update({ where: { id: people.student }, data: { deletedAt: at } });
		expect(await myComanagementHistory(people.student)).toEqual([]);
	});

	for (const join of [true, false])
		it(`échec de trace : rollback ${join ? 'entrée et usage' : 'départ'}`, async () => {
			if (!join) await schools.joinSchoolWithInvite(token, people.student, at);
			const row = join ? null : await membership();
			const transaction = db.$transaction.bind(db);
			vi.spyOn(db, '$transaction').mockImplementationOnce((async (
				callback: (tx: Prisma.TransactionClient) => Promise<unknown>
			) =>
				transaction(async (tx) => {
					const write = vi
						.spyOn(tx.membership, join ? 'create' : 'update')
						.mockRejectedValueOnce(new Error('trace refusée'));
					try {
						return await callback(tx);
					} finally {
						write.mockRestore();
					}
				})) as unknown as typeof db.$transaction);
			await expect(
				join
					? schools.joinSchoolWithInvite(token, people.student, at)
					: schools.leaveOrRemoveStudent(school.handle, people.student, row!.id, at)
			).rejects.toThrow('trace refusée');
			expect((await db.schoolInvite.findFirstOrThrow({ where: { orgId: school.id } })).uses).toBe(
				join ? 0 : 1
			);
			expect(await decisions()).toHaveLength(join ? 0 : 1);
			if (!join) expect((await membership()).status).toBe('ACTIVE');
		});

	for (const invalid of ['revoked', 'expired', 'full'] as const)
		it(`lien ${invalid} : aucun acte ni période créés`, async () => {
			await db.schoolInvite.updateMany({
				where: { orgId: school.id },
				data:
					invalid === 'revoked'
						? { revokedAt: at }
						: invalid === 'expired'
							? { expiresAt: at }
							: { uses: 3 }
			});
			await expect(schools.joinSchoolWithInvite(token, people.student, at)).rejects.toMatchObject({
				status: 410
			});
			expect(await decisions()).toEqual([]);
			expect(
				await db.membership.count({ where: { orgId: school.id, personId: people.student } })
			).toBe(0);
		});

	it('les actes d’école restent uniques en base par période et type', async () => {
		await schools.joinSchoolWithInvite(token, people.student, at);
		await expect(
			db.membershipDecision.create({
				data: {
					membershipId: (await membership()).id,
					kind: 'ACCEPTED',
					authorId: people.owner,
					occurredAt: at
				}
			})
		).rejects.toMatchObject({ code: 'P2002' });
		expect(await decisions()).toMatchObject([{ kind: 'ACCEPTED', authorId: people.student }]);
	});

	it('exporte actes personnels et actes pour autrui, anonymise les auteurs sans inventer de succession', async () => {
		await schools.joinSchoolWithInvite(token, people.student, at);
		await schools.leaveOrRemoveStudent(school.handle, people.owner, (await membership()).id, at);
		const owner = await db.person.findUniqueOrThrow({ where: { actorId: people.owner } });
		const student = await db.person.findUniqueOrThrow({ where: { actorId: people.student } });
		expect((await exportPersonData(student.userId))?.actes_de_participation).toMatchObject([
			{ auteur: 'student' },
			{ auteur: 'owner' }
		]);
		const exported = (await exportPersonData(owner.userId))?.actes_de_participation;
		expect(exported).toMatchObject([{ role: 'auteur de décision', auteur: 'owner' }]);
		expect(JSON.stringify(exported)).not.toContain('student');
		await db.$transaction(await personAnonymizationOps(owner.userId));
		expect((await decisions()).find((d) => d.kind === 'REMOVED')?.authorId).toBeNull();
		expect(await decisions()).toHaveLength(2);
		expect(await myComanagementHistory(people.student)).toEqual([]);
		expect((await exportPersonData(student.userId))?.actes_de_participation).toContainEqual(
			expect.objectContaining({ auteur: null, acte: 'Participation retirée par la gestion' })
		);
	});
});
