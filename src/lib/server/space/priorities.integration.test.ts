/** DASH-03 : compteur de candidatures en lecture seule sur le schéma e2e. */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import dotenv from 'dotenv';
import { createPrismaClient } from '../../../../prisma/client.js';
const enabled = process.env.PROGRESSION_INTEGRATION === '1';
const url = new URL(
	dotenv.config({ quiet: true }).parsed?.DATABASE_URL ??
		process.env.DATABASE_URL ??
		'postgresql://x/y'
);
url.searchParams.set('schema', 'e2e');
const db = createPrismaClient(url.toString());
vi.mock('#lib/server', () => ({ prisma: db }));
const { pendingVisibleApplications } = await import('../opportunities/applications');
const { visibleJamIds } = await import('../jam/publicJams');
const prefix = `dash03-${Date.now()}-`;
const ids: string[] = [];
const adIds: string[] = [];
let membershipId = '';

describe.skipIf(!enabled)(
	'candidatures prioritaires : permissions réelles',
	{ timeout: 60_000 },
	() => {
		beforeAll(async () => {
			for (const name of ['owner', 'applicant', 'foreign', 'group']) {
				const actor = await db.actor.create({
					data: {
						kind: name === 'group' ? 'ORGANIZATION' : 'PERSON',
						handle: prefix + name,
						displayName: name,
						...(name === 'group' ? { organization: { create: { kind: 'SCHOOL' } } } : {})
					}
				});
				ids.push(actor.id);
			}
			const membership = await db.membership.create({
				data: { orgId: ids[3], personId: ids[0], role: 'OWNER', status: 'ACTIVE' }
			});
			membershipId = membership.id;
			for (const issuerActorId of [ids[0], ids[2], ids[3]]) {
				const ad = await db.opportunity.create({
					data: {
						issuerActorId,
						kind: 'SESSION_WORK',
						title: 'Candidature réelle',
						description: 'Test lecture seule',
						expiresAt: new Date('2030-01-01'),
						applications: { create: { applicantActorId: ids[1], message: 'Candidature de test' } }
					}
				});
				adIds.push(ad.id);
			}
		});
		afterAll(async () => {
			await db.actor.deleteMany({ where: { id: { in: ids } } });
			await db.$disconnect();
		});
		it('ignore une annonce étrangère, un membre sans gestion, un groupe dissous et une candidature tranchée', async () => {
			const count = () => pendingVisibleApplications(ids[0], adIds, new Date('2026-11-12'));
			expect(await count()).toBe(2);
			expect(
				await db.application.count({ where: { opportunityId: { in: adIds }, status: 'SENT' } })
			).toBe(3);
			await db.membership.update({ where: { id: membershipId }, data: { role: 'MEMBER' } });
			expect(await count()).toBe(1);
			await db.membership.update({ where: { id: membershipId }, data: { role: 'ADMIN' } });
			await db.organization.update({
				where: { actorId: ids[3] },
				data: { dissolvedAt: new Date() }
			});
			expect(await count()).toBe(1);
			await db.organization.update({ where: { actorId: ids[3] }, data: { dissolvedAt: null } });
			await db.application.updateMany({
				where: { opportunityId: adIds[2] },
				data: { status: 'DECLINED' }
			});
			expect(await count()).toBe(1);
			for (const reverse of [false, true]) {
				await db.block.create({
					data: { blockerActorId: ids[reverse ? 0 : 1], blockedActorId: ids[reverse ? 1 : 0] }
				});
				expect(await count()).toBe(0);
				await db.block.deleteMany({ where: { blockerActorId: { in: ids } } });
			}
			await db.actor.update({ where: { id: ids[1] }, data: { hidden: true } });
			expect(await count()).toBe(0);
			await db.actor.update({ where: { id: ids[1] }, data: { hidden: false } });
			await db.opportunity.update({
				where: { id: adIds[0] },
				data: { expiresAt: new Date('2026-01-01') }
			});
			expect(await count()).toBe(0);
		});
		it('applique le couvre-feu, la visibilité du lieu et la présence actuelle dans une école aux dates', async () => {
			const venue = await db.venue.create({
				data: {
					name: prefix + 'lieu',
					nameKey: prefix + 'lieu',
					kind: 'CAFE_CONCERT',
					communeCode: '31555',
					communeName: 'Toulouse',
					departmentCode: '31',
					lat: 43.6,
					lng: 1.43,
					createdById: ids[0],
					validatedAt: new Date()
				}
			});
			const start = new Date(Date.now() + 7 * 86_400_000);
			start.setUTCHours(10, 0, 0, 0);
			const normalEnd = new Date(start.getTime() + 2 * 3_600_000);
			const lateEnd = new Date(start);
			lateEnd.setUTCHours(23);
			const jamIds: string[] = [];
			for (const kind of ['normal', 'late', 'school']) {
				const endsAt = kind === 'late' ? lateEnd : normalEnd;
				const jam = await db.opportunity.create({
					data: {
						issuerActorId: kind === 'school' ? ids[3] : ids[1],
						kind: 'JAM',
						title: kind,
						description: 'Date de test',
						audience: kind === 'school' ? 'SCHOOL' : 'PUBLIC',
						startsAt: start,
						endsAt,
						expiresAt: endsAt,
						venueId: venue.id
					}
				});
				jamIds.push(jam.id);
			}
			// Âge inconnu : mêmes protections que pour une personne mineure.
			expect(await visibleJamIds(jamIds, ids[0])).toEqual(
				expect.arrayContaining([jamIds[0], jamIds[2]])
			);
			expect(await visibleJamIds(jamIds, ids[0])).not.toContain(jamIds[1]);
			await db.membership.update({ where: { id: membershipId }, data: { status: 'LEFT' } });
			expect(await visibleJamIds(jamIds, ids[0])).toEqual([jamIds[0]]);
			await db.venue.update({ where: { id: venue.id }, data: { removedAt: new Date() } });
			expect(await visibleJamIds(jamIds, ids[0])).toEqual([]);
		});
	}
);
