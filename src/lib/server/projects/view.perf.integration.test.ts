/**
 * P2 : coût de `projectView` sur le schéma e2e (`PROGRESSION_INTEGRATION=1`).
 * Garde-fou : un nombre de requêtes constant, quel que soit le nombre
 * d'éléments (pas de N+1), et aucun élément invisible chargé. Les latences
 * sont affichées (`PROJECT_PERF=1`), pas affirmées : elles dépendent du réseau.
 */
import { afterAll, describe, expect, it, vi } from 'vitest';
import dotenv from 'dotenv';
import { createPrismaClient } from '../../../../prisma/client.js';

const enabled = process.env.PROGRESSION_INTEGRATION === '1';
const url = new URL(
	dotenv.config({ quiet: true }).parsed?.DATABASE_URL ??
		process.env.DATABASE_URL ??
		'postgresql://x/y'
);
url.searchParams.set('schema', 'e2e');
if (enabled) process.env.DATABASE_URL = url.toString();
const base = createPrismaClient(url.toString());
const counter = { ops: 0, models: [] as string[] };
const db = base.$extends({
	query: {
		$allOperations({ model, operation, args, query }) {
			counter.ops++;
			counter.models.push(`${model ?? 'raw'}.${operation}`);
			return query(args);
		}
	}
});
vi.mock('#lib/server', () => ({ prisma: db }));
const { projectView } = await import('./view');
const { workAccess } = await import('../works/service');

const prefix = `perf-${Date.now()}-`;
const actors: string[] = [];
const users: string[] = [];
const report: string[] = [];
let n = 0;

async function person(name: string) {
	const tag = `${prefix}${name}-${n++}`;
	const user = await base.user.create({
		data: { email: `${tag}@example.test`, referralCode: tag }
	});
	users.push(user.id);
	const actor = await base.actor.create({
		data: {
			kind: 'PERSON',
			handle: tag,
			displayName: name,
			person: {
				create: { userId: user.id, birthDate: new Date('1990-01-01'), termsAcceptedAt: new Date() }
			}
		}
	});
	actors.push(actor.id);
	return actor.id;
}

async function works(ownerId: string, count: number, state: 'IDEA' | 'COMPOSED' = 'COMPOSED') {
	const ids = Array.from({ length: count }, (_, i) => `${prefix}w${n++}-${i}`);
	await base.work.createMany({
		data: ids.map((id, i) => ({ id, ownerId, createdById: ownerId, title: `Titre ${i}`, state }))
	});
	return ids;
}

async function project(ownerId: string, workIds: string[], share: 'NONE' | 'SUMMARY' = 'SUMMARY') {
	const p = await base.project.create({ data: { ownerId, name: 'Perf', kind: 'ALBUM' } });
	await base.projectItem.createMany({
		data: workIds.map((workId) => ({ projectId: p.id, workId, share }))
	});
	await base.projectAct.createMany({
		data: workIds.map((workId) => ({ projectId: p.id, kind: 'ITEM_ADDED' as const, workId }))
	});
	return p.id;
}

async function measure(label: string, projectId: string, reader: string) {
	await projectView(projectId, reader); // chauffe (connexion)
	const times: number[] = [];
	let ops = 0;
	let items = 0;
	for (let i = 0; i < 5; i++) {
		counter.ops = 0;
		counter.models = [];
		const t = performance.now();
		const view = await projectView(projectId, reader);
		times.push(performance.now() - t);
		ops = counter.ops;
		items = view?.items.length ?? -1;
	}
	times.sort((a, b) => a - b);
	report.push(
		`${label.padEnd(44)} ${String(items).padStart(4)} él. ${ops} req. médiane ${times[2].toFixed(0)} ms`
	);
	return { ops, items };
}

describe.skipIf(!enabled)('projectView : coût', { timeout: 300_000 }, () => {
	afterAll(async () => {
		vi.restoreAllMocks();
		if (process.env.PROJECT_PERF === '1') console.log(`\n${report.join('\n')}\n`);
		await base.project.deleteMany({ where: { ownerId: { in: actors } } });
		await base.actor.deleteMany({ where: { id: { in: actors } } });
		await base.user.deleteMany({ where: { id: { in: users } } });
		await base.$disconnect();
	});

	it('requêtes constantes de 0 à 100 éléments ; partage et éléments invisibles', async () => {
		const me = await person('lecteur');
		const other = await person('cogestion');
		const empty = await project(me, []);
		const ten = await project(me, await works(me, 10));
		const hundredWorks = await works(me, 100);
		const hundred = await project(me, hundredWorks);
		const sharedA = await project(me, hundredWorks.slice(0, 5));
		const sharedB = await project(me, hundredWorks.slice(0, 5));

		// Projet d'un groupe : 50 idées d'une autre gestion en « rien », 10 en résumé.
		const band = await base.actor.create({
			data: {
				kind: 'ORGANIZATION',
				handle: `${prefix}band`,
				displayName: 'Perf band',
				organization: {
					create: {
						kind: 'BAND',
						memberships: {
							create: [
								{ personId: me, role: 'OWNER', status: 'ACTIVE' },
								{ personId: other, role: 'ADMIN', status: 'ACTIVE' }
							]
						}
					}
				}
			}
		});
		actors.push(band.id);
		const hiddenIds = await works(other, 50, 'IDEA');
		const shownIds = await works(other, 10, 'IDEA');
		const mixed = await project(band.id, hiddenIds, 'NONE');
		await base.projectItem.createMany({
			data: shownIds.map((workId) => ({ projectId: mixed, workId, share: 'SUMMARY' as const }))
		});

		// P4a : 20 participant·es actif·ves et 5 invitations ; le lecteur participe.
		const crowded = await project(me, await works(me, 10));
		const reader = await person('participante');
		const guests = [];
		for (let i = 0; i < 25; i++) guests.push(await person(`p${i}`));
		await base.projectParticipant.createMany({
			data: [
				{ projectId: crowded, personId: reader, status: 'ACTIVE' as const },
				...guests.map((personId, i) => ({
					projectId: crowded,
					personId,
					status: i < 20 ? ('ACTIVE' as const) : ('INVITED' as const),
					capabilities: i < 2 ? ['COORDINATE' as const] : []
				}))
			]
		});
		await base.projectAct.createMany({
			data: guests.map((subjectId) => ({ projectId: crowded, kind: 'JOINED' as const, subjectId }))
		});

		const results = [
			await measure('projet vide', empty, me),
			await measure('10 éléments', ten, me),
			await measure('100 éléments', hundred, me),
			await measure('projet A (morceaux partagés avec B)', sharedA, me),
			await measure('projet B (mêmes morceaux que A)', sharedB, me),
			await measure('groupe : 50 invisibles + 10 résumés', mixed, me),
			await measure('20 participant·es, lu par la gestion', crowded, me),
			await measure('20 participant·es, lu par une participante', crowded, reader)
		];
		expect(results.map((r) => r.items)).toEqual([0, 10, 100, 5, 5, 10, 10, 10]);
		// L'équipe ne coûte qu'une requête, quel que soit le nombre de personnes.
		expect(results[6].ops).toBe(results[1].ops);
		expect(results[7].ops).toBe(results[1].ops);
		// Aucune requête par élément : le coût ne dépend pas du nombre d'éléments.
		// P4a : une requête de plus pour l'équipe (participant·es et invitations).
		// U3b-b : une de plus pour les besoins, en parallèle des autres.
		for (const r of results) expect(r.ops).toBeLessThanOrEqual(8);
		// Même coût à 10 et à 100 éléments. Des actes sur des morceaux invisibles
		// ajoutent une seule requête (ceux que le lecteur gère), jamais une par acte.
		expect(results[1].ops).toBe(results[2].ops);

		// Lectures indépendantes (un `workAccess` par élément) : 3 requêtes par
		// morceau, pour comparaison.
		counter.ops = 0;
		const t = performance.now();
		for (const id of hundredWorks.slice(0, 10)) await workAccess(id, me);
		report.push(
			`${'10 lectures indépendantes (workAccess)'.padEnd(44)}   10 él. ${counter.ops} req. total ${(performance.now() - t).toFixed(0)} ms`
		);
		expect(counter.ops).toBeGreaterThan(results[1].ops);
	});

	it('U3b-b : besoins, une seule requête quel que soit leur nombre (0, 5, 20)', async () => {
		const me = await person('besoins');
		const coord = await person('besoins-coord');
		const withNeeds = async (count: number) => {
			const id = await project(me, await works(me, 5));
			await base.projectNeed.createMany({
				data: Array.from({ length: count }, (_, i) => ({
					projectId: id,
					status: i % 2 === 0 ? ('OPEN' as const) : ('PROPOSED' as const),
					track: 'SOUND_ENGINEER' as const,
					specialty: 'MIXING',
					createdById: i % 2 === 0 ? me : coord,
					description: `Besoin ${i}`
				}))
			});
			const needs = await base.projectNeed.findMany({
				where: { projectId: id },
				select: { id: true }
			});
			await base.projectAct.createMany({
				data: needs.map((need) => ({
					projectId: id,
					kind: 'NEED_OPENED' as const,
					needId: need.id,
					authorId: me
				}))
			});
			return id;
		};
		const results = [
			await measure('5 éléments, 0 besoin', await withNeeds(0), me),
			await measure('5 éléments, 5 besoins', await withNeeds(5), me),
			await measure('5 éléments, 20 besoins', await withNeeds(20), me)
		];
		// Pas de N+1 : le coût ne dépend pas du nombre de besoins.
		expect(results[1].ops).toBe(results[0].ops);
		expect(results[2].ops).toBe(results[0].ops);
		for (const r of results) expect(r.ops).toBeLessThanOrEqual(8);
	});
});
