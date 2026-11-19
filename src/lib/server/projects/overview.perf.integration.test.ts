/**
 * P3 / U2 : coût de la projection « Mes projets » sur le schéma e2e
 * (`PROGRESSION_INTEGRATION=1`). Garde-fou : un nombre de requêtes constant,
 * quel que soit le nombre de projets et d'éléments (pas de N+1), et des
 * données minimales (aucun titre d'élément d'autrui). Les latences et le
 * volume sont affichés (`PROJECT_PERF=1`), pas affirmés : ils dépendent du
 * réseau.
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
const counter = { ops: 0 };
const db = base.$extends({
	query: {
		$allOperations({ args, query }) {
			counter.ops++;
			return query(args);
		}
	}
});
vi.mock('#lib/server', () => ({ prisma: db }));
const { projectsOverview, outsideCount } = await import('./overview');

const prefix = `ovperf-${Date.now()}-`;
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

async function project(
	ownerId: string,
	workIds: string[],
	opts: { share?: 'NONE' | 'SUMMARY'; author?: string; kind?: 'ALBUM' | 'TOUR' } = {}
) {
	const p = await base.project.create({
		data: { ownerId, name: 'Perf', kind: opts.kind ?? 'ALBUM' }
	});
	await base.projectItem.createMany({
		data: workIds.map((workId) => ({ projectId: p.id, workId, share: opts.share ?? 'SUMMARY' }))
	});
	await base.projectAct.createMany({
		data: [
			{ projectId: p.id, kind: 'CREATED' as const, authorId: opts.author ?? null },
			...workIds.map((workId) => ({
				projectId: p.id,
				kind: 'ITEM_ADDED' as const,
				workId,
				authorId: opts.author ?? null
			}))
		]
	});
	return p.id;
}

/** La lecture de `/projets` : la projection et le compteur « Hors projet ». */
async function measure(label: string, reader: string) {
	await projectsOverview(reader); // chauffe (connexion)
	const times: number[] = [];
	let ops = 0;
	let projects = 0;
	let bytes = 0;
	for (let i = 0; i < 5; i++) {
		counter.ops = 0;
		const t = performance.now();
		const [list] = await Promise.all([projectsOverview(reader), outsideCount(reader)]);
		times.push(performance.now() - t);
		ops = counter.ops;
		projects = list.length;
		bytes = JSON.stringify(list).length;
	}
	times.sort((a, b) => a - b);
	report.push(
		`${label.padEnd(40)} ${String(projects).padStart(3)} proj. ${ops} req. médiane ${times[2].toFixed(0)} ms · ${(bytes / 1024).toFixed(1)} Kio`
	);
	return { ops, projects, bytes };
}

describe.skipIf(!enabled)('projectsOverview : coût', { timeout: 300_000 }, () => {
	afterAll(async () => {
		vi.restoreAllMocks();
		if (process.env.PROJECT_PERF === '1') console.log(`\n${report.join('\n')}\n`);
		await base.project.deleteMany({ where: { ownerId: { in: actors } } });
		await base.actor.deleteMany({ where: { id: { in: actors } } });
		await base.user.deleteMany({ where: { id: { in: users } } });
		await base.$disconnect();
	});

	it('requêtes constantes, du compte neuf au groupe multirôle', async () => {
		const fresh = await person('neuf');
		const one = await person('un');
		await project(one, await works(one, 3), { author: one });
		const several = await person('plusieurs');
		const pool = await works(several, 40);
		for (let i = 0; i < 8; i++)
			await project(several, pool.slice(i * 5, i * 5 + 5), {
				author: several,
				kind: i % 2 ? 'TOUR' : 'ALBUM'
			});
		const many = await person('nombreux');
		await project(many, await works(many, 200), { author: many });

		// Groupe : deux gestions, 6 projets, 50 invisibles (rien) et 10 résumés
		// de la co-gestion, en plus des morceaux du lecteur ; historique de
		// rôles (un métier de plus, une ancienne adhésion close).
		const lead = await person('responsable');
		const coadmin = await person('cogestion');
		await base.personTrack.create({ data: { personId: lead, track: 'PRODUCER', isPrimary: true } });
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
								{ personId: lead, role: 'OWNER', status: 'ACTIVE' },
								{ personId: coadmin, role: 'ADMIN', status: 'ACTIVE' }
							]
						}
					}
				}
			}
		});
		actors.push(band.id);
		const hidden = await works(coadmin, 50, 'IDEA');
		const shown = await works(coadmin, 10, 'IDEA');
		const leads = await works(lead, 30);
		for (let i = 0; i < 6; i++) {
			const pid = await project(band.id, leads.slice(i * 5, i * 5 + 5), { author: lead });
			await base.projectItem.createMany({
				data: [
					...hidden
						.slice(i * 8, i * 8 + 8)
						.map((workId) => ({ projectId: pid, workId, share: 'NONE' as const })),
					...shown
						.slice(i, i + 2)
						.map((workId) => ({ projectId: pid, workId, share: 'SUMMARY' as const }))
				]
			});
			await base.projectAct.createMany({
				data: hidden.slice(i * 8, i * 8 + 8).map((workId) => ({
					projectId: pid,
					kind: 'ITEM_ADDED' as const,
					workId,
					authorId: coadmin
				}))
			});
		}

		const results = [
			await measure('compte neuf', fresh),
			await measure('un projet (3 éléments)', one),
			await measure('8 projets (5 éléments chacun)', several),
			await measure('un projet de 200 éléments', many),
			await measure('groupe : 6 projets, invisibles et résumés', lead)
		];
		expect(results.map((r) => r.projects)).toEqual([0, 1, 8, 1, 6]);
		// Compte neuf : la projection s'arrête à la liste vide (1 + le compteur).
		expect(results[0].ops).toBe(2);
		// Ensuite, constant : ni par projet, ni par élément ; une requête de plus
		// au plus quand le journal cite un morceau qui n'est plus visible.
		for (const r of results.slice(1)) expect(r.ops).toBeLessThanOrEqual(8);
		expect(results[1].ops).toBe(results[2].ops);
		expect(results[2].ops).toBe(results[3].ops);
		// Données minimales : quelques centaines d'octets par projet, jamais
		// proportionnelles au nombre d'éléments.
		expect(results[3].bytes).toBeLessThan(2048);
	});
});
