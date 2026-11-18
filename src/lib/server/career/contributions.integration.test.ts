/**
 * « Mes contributions » (U1, #71, conception 20 §10.2) sur la base de `.env`,
 * schéma `e2e` : lignes issues de la lecture N1, déduplication avec les
 * collaborations, isolation entre personnes, blocages dans les deux sens,
 * retrait d'un crédit, morceau privé, groupe dissous, compte supprimé,
 * collaboration sans ligne en base ; nombre de requêtes SQL et durée pour cinq
 * profils. Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/career/contributions
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
const db = createPrismaClient(url.toString(), { log: [{ emit: 'event', level: 'query' }] });
let queries = 0;
db.$on('query' as never, () => {
	queries += 1;
});

vi.mock('#lib/server', () => ({ prisma: db }));

const { contributionsOf } = await import('./contributions');
const { emitAndProcess } = await import('#lib/server/progression/processor');

const PREFIX = 'contrib-test-';
const YEAR = 365.25 * 86_400_000;

async function measure<T>(fn: () => Promise<T>) {
	queries = 0;
	const start = performance.now();
	const result = await fn();
	return { result, queries, ms: Math.round(performance.now() - start) };
}

describe.skipIf(!enabled)('mes contributions (schéma e2e)', { timeout: 300_000 }, () => {
	const ids: Record<string, string> = {};
	const works: Record<string, string> = {};
	const collabs: Record<string, string> = {};

	const emit = (event: Parameters<typeof emitAndProcess>[1]) =>
		db.$transaction((tx) => emitAndProcess(tx, event), { timeout: 30_000, maxWait: 30_000 });

	async function cleanup() {
		const actors = await db.actor.findMany({
			where: { handle: { startsWith: PREFIX } },
			select: { id: true }
		});
		const list = actors.map((a) => a.id);
		// Les acteurs d'abord (collaborations, conversations et XP en cascade), puis leurs événements.
		await db.actor.deleteMany({ where: { id: { in: list } } });
		if (list.length > 0)
			await db.domainEvent.deleteMany({ where: { actorIds: { hasSome: list } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
	}

	async function person(name: string) {
		const user = await db.user.create({
			data: { email: `${PREFIX}${name}@example.test`, referralCode: `${PREFIX}${name}` }
		});
		ids[name] = (
			await db.actor.create({
				data: {
					kind: 'PERSON',
					handle: PREFIX + name,
					displayName: `Contrib ${name}`,
					person: {
						create: {
							userId: user.id,
							termsAcceptedAt: new Date(),
							onboardedAt: new Date(),
							birthDate: new Date(Date.now() - 30 * YEAR)
						}
					}
				}
			})
		).id;
	}

	async function band(name: string, members: string[], dissolved = false) {
		ids[name] = (
			await db.actor.create({
				data: {
					kind: 'ORGANIZATION',
					handle: PREFIX + name,
					displayName: `Contrib ${name}`,
					organization: {
						create: { kind: 'BAND', dissolvedAt: dissolved ? new Date() : null }
					}
				}
			})
		).id;
		for (const [i, m] of members.entries())
			await db.membership.create({
				data: {
					orgId: ids[name],
					personId: ids[m],
					role: i === 0 ? 'OWNER' : 'MEMBER',
					status: 'ACTIVE'
				}
			});
	}

	/** Un morceau composé (ou une idée), avec ses crédits confirmés. */
	async function work(
		key: string,
		owner: string,
		credits: { who: string; roles: ('COMPOSITION' | 'INSTRUMENT' | 'MIXING' | 'RECORDING')[] }[],
		opts: { state?: 'IDEA' | 'COMPOSED'; proof?: 'DECLARED' | 'CORROBORATED' } = {}
	) {
		const state = opts.state ?? 'COMPOSED';
		const w = await db.work.create({
			data: {
				ownerId: ids[owner],
				title: `${PREFIX}${key}`,
				state,
				proof: state === 'IDEA' ? null : (opts.proof ?? 'CORROBORATED'),
				composedAt: state === 'IDEA' ? null : new Date('2026-04-01T12:00:00Z')
			},
			select: { id: true }
		});
		works[key] = w.id;
		for (const c of credits) {
			const contributor = await db.workContributor.create({
				data: { workId: w.id, personId: ids[c.who], confirmedAt: new Date('2026-04-02T12:00:00Z') },
				select: { id: true }
			});
			await db.workRole.createMany({
				data: c.roles.map((kind) => ({ workId: w.id, kind, contributorId: contributor.id }))
			});
		}
		return w.id;
	}

	/** Une collaboration terminée et son événement (confirmée des deux côtés). */
	async function collab(
		key: string,
		a: string,
		b: string,
		opts: {
			kind?: 'RECORDING' | 'MIXING' | 'GIG' | 'REHEARSAL';
			workKey?: string;
			service?: 'MIXING' | 'RECORDING';
			conversation?: boolean;
			row?: boolean;
		} = {}
	) {
		let collaborationId = `${PREFIX}${key}`;
		if (opts.row !== false) {
			const conv = opts.conversation
				? await db.conversation.create({
						data: {
							pairKey: `${PREFIX}${key}`,
							initiatorId: ids[a],
							participants: {
								create: [
									{ actorId: ids[a], state: 'ACCEPTED' },
									{ actorId: ids[b], state: 'ACCEPTED' }
								]
							}
						}
					})
				: null;
			const row = await db.collaboration.create({
				data: {
					kind: opts.kind ?? 'RECORDING',
					status: 'COMPLETED',
					title: `${PREFIX}${key}`,
					happenedOn: new Date('2026-05-10'),
					completedAt: new Date('2026-05-11T12:00:00Z'),
					proposedById: ids[a],
					workId: opts.workKey ? works[opts.workKey] : null,
					conversationId: conv?.id ?? null,
					participants: {
						create: [
							{
								actorId: ids[a],
								acceptedAt: new Date(),
								confirmedCompletionAt: new Date(),
								service: opts.service ?? null
							},
							{ actorId: ids[b], acceptedAt: new Date(), confirmedCompletionAt: new Date() }
						]
					}
				}
			});
			collaborationId = row.id;
		}
		collabs[key] = collaborationId;
		await emit({
			type: 'collaboration.completed',
			collaborationId,
			participantIds: [ids[a], ids[b]],
			...(opts.service ? { services: { [ids[a]]: opts.service } } : {})
		});
	}

	beforeAll(async () => {
		await cleanup();
		for (const name of ['neuf', 'lea', 'ingé', 'malik', 'bloqueur', 'parti', 'multi', 'gros'])
			await person(name);
		await band('nuit', ['lea', 'malik']);
		await band('dissous', ['malik', 'lea'], true);

		// Musicienne : un morceau à plusieurs (composition et basse), un composé
		// seule, un morceau du groupe dissous, une idée de Malik où elle joue.
		await work('ensemble', 'nuit', [
			{ who: 'lea', roles: ['COMPOSITION', 'INSTRUMENT'] },
			{ who: 'malik', roles: ['COMPOSITION'] }
		]);
		await work('seule', 'lea', [{ who: 'lea', roles: ['COMPOSITION'] }], { proof: 'DECLARED' });
		await work('ancien', 'dissous', [
			{ who: 'lea', roles: ['INSTRUMENT'] },
			{ who: 'malik', roles: ['COMPOSITION'] }
		]);
		await work('idee', 'malik', [{ who: 'lea', roles: ['MIXING'] }], { state: 'IDEA' });

		// Ingé son : deux morceaux de Malik mixés lors d'une même séance (une
		// collaboration sur le premier, un crédit sur le second), un morceau
		// d'un bloqueur, un morceau dont le porteur a supprimé son compte, une
		// collaboration dont la ligne a disparu, une sans morceau.
		await work('titre2', 'malik', [
			{ who: 'malik', roles: ['COMPOSITION'] },
			{ who: 'ingé', roles: ['MIXING'] }
		]);
		await work('titre3', 'malik', [
			{ who: 'malik', roles: ['COMPOSITION'] },
			{ who: 'ingé', roles: ['MIXING'] }
		]);
		await collab('seance', 'ingé', 'malik', {
			kind: 'MIXING',
			workKey: 'titre2',
			service: 'MIXING',
			conversation: true
		});
		await work('cache', 'bloqueur', [
			{ who: 'bloqueur', roles: ['COMPOSITION'] },
			{ who: 'ingé', roles: ['RECORDING'] }
		]);
		await work('orphelin', 'parti', [
			{ who: 'parti', roles: ['COMPOSITION'] },
			{ who: 'ingé', roles: ['MIXING'] }
		]);
		await collab('fantome', 'ingé', 'malik', { row: false });
		await collab('repet', 'bloqueur', 'ingé', { kind: 'REHEARSAL', conversation: true });
		await db.block.create({
			data: { blockerActorId: ids.bloqueur, blockedActorId: ids['ingé'] }
		});
		await db.actor.update({
			where: { id: ids.parti },
			data: { deletedAt: new Date(), displayName: 'Ancien nom' }
		});

		// Multirôle : un concert joué, un enregistrement assuré.
		await collab('concert', 'multi', 'lea', { kind: 'GIG', conversation: true });
		await collab('prise', 'multi', 'malik', { kind: 'RECORDING', service: 'RECORDING' });

		// Historique important : 120 crédits et 30 collaborations.
		for (let i = 0; i < 120; i++)
			await work(`gros-${i}`, 'malik', [
				{ who: 'malik', roles: ['COMPOSITION'] },
				{ who: 'gros', roles: i % 2 ? ['MIXING'] : ['RECORDING'] }
			]);
		for (let i = 0; i < 30; i++)
			await collab(`gros-c${i}`, 'gros', 'malik', {
				kind: 'MIXING',
				service: 'MIXING',
				workKey: i < 10 ? `gros-${i}` : undefined
			});
	}, 600_000);

	afterAll(cleanup, 300_000);

	const byTitle = (lines: Awaited<ReturnType<typeof contributionsOf>>, key: string) =>
		lines.find((l) => l.title === `${PREFIX}${key}`);

	it('compte sans contribution : liste vide', async () => {
		expect(await contributionsOf(ids.neuf)).toEqual([]);
	});

	it('musicienne : crédits, preuve exacte, groupe dissous, idée, fait de groupe exclu', async () => {
		const lines = await contributionsOf(ids.lea);
		expect(byTitle(lines, 'ensemble')).toMatchObject({
			roles: ['Composition', 'Instrument'],
			proof: 'CREDITED',
			with: 'Contrib nuit',
			href: `/morceaux/${works.ensemble}`
		});
		expect(byTitle(lines, 'seule')).toMatchObject({ proof: 'DECLARED', with: null });
		expect(byTitle(lines, 'ancien')).toMatchObject({ notes: ['groupe dissous'], href: null });
		expect(byTitle(lines, 'idee')).toMatchObject({ notes: ['idée'], proof: 'CREDITED' });
		// Le concert de Multi où elle figure, confirmé.
		expect(byTitle(lines, 'concert')).toMatchObject({ proof: 'CONFIRMED', roles: ['Concert'] });
		expect(lines).toHaveLength(5);
	});

	it('ingé son : séance sur deux morceaux = deux lignes ; crédit + collaboration = une ligne confirmée', async () => {
		const lines = await contributionsOf(ids['ingé']);
		const t2 = byTitle(lines, 'titre2');
		expect(t2).toMatchObject({ proof: 'CONFIRMED', roles: ['Mixage'] });
		// Crédit, morceau composé où il est crédité, et la séance : trois faits N1, une ligne.
		expect(t2?.sources).toHaveLength(3);
		expect(t2?.sources).toEqual(
			expect.arrayContaining([
				`collab:${collabs.seance}`,
				`work:${works.titre2}:composed`,
				expect.stringMatching(/^credit:/)
			])
		);
		expect(byTitle(lines, 'titre3')).toMatchObject({ proof: 'CREDITED' });
		expect(lines.filter((l) => l.key === `work:${works.titre2}`)).toHaveLength(1);
	});

	it('blocage : le fait reste, sans nom ni lien, dans les deux sens', async () => {
		const check = async () => {
			const lines = await contributionsOf(ids['ingé']);
			expect(byTitle(lines, 'cache')).toMatchObject({ with: null, href: null });
			expect(byTitle(lines, 'repet')).toMatchObject({ with: null, href: null });
			expect(JSON.stringify(lines)).not.toContain('Contrib bloqueur');
		};
		await check();
		// Dans l'autre sens : c'est l'ingé qui bloque.
		await db.block.deleteMany({ where: { blockerActorId: ids.bloqueur } });
		await db.block.create({
			data: { blockerActorId: ids['ingé'], blockedActorId: ids.bloqueur }
		});
		await check();
		// Levée du blocage : nom et liens reviennent.
		await db.block.deleteMany({ where: { blockerActorId: ids['ingé'] } });
		const lines = await contributionsOf(ids['ingé']);
		expect(byTitle(lines, 'cache')).toMatchObject({ with: 'Contrib bloqueur' });
		expect(byTitle(lines, 'repet')?.href).toMatch(/^\/messages\//);
		await db.block.create({
			data: { blockerActorId: ids.bloqueur, blockedActorId: ids['ingé'] }
		});
	});

	it('compte supprimé : « Compte supprimé », jamais l’ancien nom, pas de lien', async () => {
		const lines = await contributionsOf(ids['ingé']);
		expect(byTitle(lines, 'orphelin')).toMatchObject({ with: 'Compte supprimé', href: null });
		expect(JSON.stringify(lines)).not.toContain('Ancien nom');
	});

	it('collaboration sans ligne en base : titre neutre, rien d’inventé', async () => {
		const lines = await contributionsOf(ids['ingé']);
		expect(lines.find((l) => l.key === `collab:${collabs.fantome}`)).toMatchObject({
			title: 'Collaboration terminée',
			with: null,
			href: null,
			proof: 'CONFIRMED'
		});
	});

	it('isolation : rien des contributions des autres ; aucune ligne d’autrui', async () => {
		const lea = await contributionsOf(ids.lea);
		expect(byTitle(lea, 'titre2')).toBeUndefined();
		expect(byTitle(lea, 'cache')).toBeUndefined();
		// Malik porte titre2 et a pris part à la séance : une ligne confirmée, qui nomme l'ingé.
		const malik = await contributionsOf(ids.malik);
		expect(byTitle(malik, 'titre2')).toMatchObject({ proof: 'CONFIRMED', with: 'Contrib ingé' });
	});

	it('retrait d’un crédit et départ du groupe : le crédit part, la participation au groupe ne crée rien', async () => {
		await db.membership.updateMany({
			where: { orgId: ids.nuit, personId: ids.lea },
			data: { status: 'LEFT' }
		});
		let lines = await contributionsOf(ids.lea);
		// Crédit conservé après changement d'organisation.
		expect(byTitle(lines, 'ensemble')).toBeDefined();
		await db.workContributor.deleteMany({ where: { workId: works.idee, personId: ids.lea } });
		lines = await contributionsOf(ids.lea);
		expect(byTitle(lines, 'idee')).toBeUndefined();
	});

	it('requêtes et durée : constantes, quel que soit le volume', async () => {
		const report: Record<string, { lines: number; queries: number; ms: number }> = {};
		for (const [label, who] of [
			['compte neuf', 'neuf'],
			['musicienne (crédits)', 'lea'],
			['ingé son (collaborations)', 'ingé'],
			['multirôle', 'multi'],
			['historique important', 'gros']
		] as const) {
			await contributionsOf(ids[who]); // préchauffage
			const m = await measure(() => contributionsOf(ids[who]));
			report[label] = { lines: m.result.length, queries: m.queries, ms: m.ms };
		}
		console.log('U1 — Mes contributions', report);
		expect(report['historique important'].lines).toBe(140);
		// Même nombre de requêtes pour 3 et pour 140 lignes : aucune requête par ligne.
		expect(report['historique important'].queries).toBeLessThanOrEqual(
			report['ingé son (collaborations)'].queries + 2
		);
		expect(report['historique important'].queries).toBeLessThanOrEqual(25);
	});
});
