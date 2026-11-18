/**
 * Lecture unifiée des réalisations (N1, #72, conception 21 §6.3) sur la base
 * de `.env`, schéma `e2e` : la carte et la fiche de carrière donnent les
 * mêmes résultats qu'avant N1 (valeurs relevées sur l'ancien calcul), un
 * même fait n'est compté qu'une fois, les étapes gelées ou retirées ne
 * comptent pas, un autre lecteur ne voit aucun objet privé, et le nombre de
 * requêtes SQL d'un chargement baisse. Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/career
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
// `qualifiedTable` (SQL brut des services appelés) lit le schéma ici.
if (enabled) process.env.DATABASE_URL = url.toString();
/** Client qui compte ses requêtes SQL (événement `query` de Prisma). */
const db = createPrismaClient(url.toString(), { log: [{ emit: 'event', level: 'query' }] });
let queries = 0;
db.$on('query' as never, () => {
	queries += 1;
});

vi.mock('#lib/server', () => ({ prisma: db }));

const map = await import('./map');
const sheetService = await import('./sheet');
const realisations = await import('./realisations');
const { emitAndProcess } = await import('#lib/server/progression/processor');

const PREFIX = 'realis-test-';
const YEAR = 365.25 * 86_400_000;
const DAY = 86_400_000;

/** Requêtes SQL lancées par `fn`. */
async function countQueries<T>(fn: () => Promise<T>) {
	queries = 0;
	const result = await fn();
	return { result, queries };
}

describe.skipIf(!enabled)('réalisations (schéma e2e)', { timeout: 120_000 }, () => {
	const ids: Record<string, string> = {};

	/** Émet un événement et le traite (délai large : base distante). */
	const emit = (event: Parameters<typeof emitAndProcess>[1]) =>
		db.$transaction((tx) => emitAndProcess(tx, event), { timeout: 30_000, maxWait: 30_000 });

	async function cleanup() {
		const actors = await db.actor.findMany({
			where: { handle: { startsWith: PREFIX } },
			select: { id: true }
		});
		const list = actors.map((a) => a.id);
		await db.actor.deleteMany({ where: { id: { in: list } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
		if (list.length > 0)
			await db.domainEvent.deleteMany({ where: { actorIds: { hasSome: list } } });
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
					displayName: `Réalis ${name}`,
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

	async function band(name: string, members: string[]) {
		const formedAt = new Date(Date.now() - 400 * DAY);
		ids[name] = (
			await db.actor.create({
				data: {
					kind: 'ORGANIZATION',
					handle: PREFIX + name,
					displayName: `Réalis ${name}`,
					organization: { create: { kind: 'BAND', formedAt } }
				}
			})
		).id;
		for (const [i, m] of members.entries()) {
			await db.membership.create({
				data: {
					orgId: ids[name],
					personId: ids[m],
					role: i === 0 ? 'OWNER' : 'MEMBER',
					status: 'ACTIVE',
					startedAt: formedAt
				}
			});
		}
	}

	/** Une étape de groupe, son attestation (créditant `memberIds`), gelée ou non. */
	async function milestone(
		bandName: string,
		key: 'FIRST_RECORDING' | 'FIRST_GIG' | 'FIRST_TOUR',
		proof: 'DECLARED' | 'CORROBORATED' | 'VERIFIED',
		memberIds: string[],
		opts: { frozen?: boolean; row?: boolean } = {}
	) {
		if (opts.row !== false) {
			await db.milestone.create({
				data: {
					definitionId: key,
					bandId: ids[bandName],
					proof,
					occurredAt: new Date('2026-06-01T12:00:00Z'),
					definitionVersion: 1,
					frozenAt: opts.frozen ? new Date() : null
				}
			});
		}
		await emit({
			type: 'milestone.attested',
			bandId: ids[bandName],
			milestone: key,
			from: null,
			to: proof,
			memberIds: memberIds.map((m) => ids[m])
		});
	}

	async function work(data: {
		owner: string;
		title: string;
		state?: 'IDEA' | 'COMPOSED';
		proof?: 'DECLARED' | 'CORROBORATED' | null;
		produced?: boolean;
		credits: { who: string; roles: ('COMPOSITION' | 'INSTRUMENT' | 'MIXING')[] }[];
	}) {
		const w = await db.work.create({
			data: {
				ownerId: ids[data.owner],
				createdById: ids.lea,
				title: PREFIX + data.title,
				state: data.state ?? 'COMPOSED',
				proof: data.proof === undefined ? 'CORROBORATED' : data.proof,
				composedAt: data.state === 'IDEA' ? null : new Date('2026-05-01T12:00:00Z'),
				producedAt: data.produced ? new Date('2026-07-01T12:00:00Z') : null
			},
			select: { id: true }
		});
		for (const c of data.credits) {
			const contributor = await db.workContributor.create({
				data: { workId: w.id, personId: ids[c.who], confirmedAt: new Date() },
				select: { id: true }
			});
			for (const kind of c.roles) {
				await db.workRole.create({ data: { workId: w.id, kind, contributorId: contributor.id } });
			}
		}
		return w.id;
	}

	beforeAll(async () => {
		await cleanup();
		for (const name of ['lea', 'malik', 'nora', 'zoe', 'sam']) await person(name);
		await band('nuit', ['lea', 'malik']);
		await band('aube', ['lea']);

		// Morceaux : un à plusieurs, produit, porté par le groupe de Léa où elle
		// est aussi créditée (une seule production) ; un composé seule ; une
		// idée de Malik où Léa a mixé (rôle du son) ; un produit du groupe
		// sans crédit de Léa (membre) ; un produit de Zoé sans Léa.
		await work({
			owner: 'nuit',
			title: 'ensemble',
			produced: true,
			credits: [
				{ who: 'lea', roles: ['COMPOSITION', 'INSTRUMENT'] },
				{ who: 'malik', roles: ['COMPOSITION'] }
			]
		});
		await work({
			owner: 'lea',
			title: 'seule',
			proof: 'DECLARED',
			credits: [{ who: 'lea', roles: ['COMPOSITION'] }]
		});
		await work({
			owner: 'malik',
			title: 'idee',
			state: 'IDEA',
			proof: null,
			credits: [{ who: 'lea', roles: ['MIXING'] }]
		});
		await work({ owner: 'nuit', title: 'groupe', produced: true, credits: [] });
		await work({
			owner: 'zoe',
			title: 'zoe',
			produced: true,
			credits: [{ who: 'zoe', roles: ['COMPOSITION'] }]
		});

		// Étapes : un enregistrement corroboré et un concert vérifié comptent ;
		// une tournée gelée (contestée) ne compte pas ; l'enregistrement d'Aube
		// a été retiré (plus de ligne) ; le concert d'Aube a été attesté sans Léa.
		await milestone('nuit', 'FIRST_RECORDING', 'CORROBORATED', ['lea', 'malik']);
		await milestone('nuit', 'FIRST_GIG', 'VERIFIED', ['lea', 'malik']);
		await milestone('nuit', 'FIRST_TOUR', 'VERIFIED', ['lea', 'malik'], { frozen: true });
		await milestone('aube', 'FIRST_RECORDING', 'CORROBORATED', ['lea'], { row: false });
		await milestone('aube', 'FIRST_GIG', 'VERIFIED', ['malik']);

		// Une collaboration confirmée, une appréciation après une jam.
		await emit({
			type: 'collaboration.completed',
			collaborationId: `${PREFIX}collab`,
			participantIds: [ids.lea, ids.nora]
		});
		await emit({
			type: 'endorsement.received',
			actorId: ids.lea,
			endorserId: ids.malik,
			skill: 'bon groove',
			jamId: `${PREFIX}jam`
		});
	}, 120_000);

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	/** Valeurs relevées sur l'ancien calcul (avant N1), même scénario. */
	const BEFORE_N1 = {
		facts: {
			jamAppreciations: 1,
			collaborations: 1,
			worksTogether: 1,
			worksSolo: 1,
			recordings: 1,
			productions: 2,
			verifiedGigs: 1,
			tours: 0
		},
		sheet: {
			jamsAppreciated: 0,
			peopleMet: 0,
			collaborations: 1,
			worksTogether: 1,
			credits: 3,
			gigs: 1,
			cities: [],
			appreciatedBy: 1,
			bands: 2,
			actsPassed: [1, 2, 3, 4, 5]
		},
		privateExtras: { jamsAttended: 0, worksSolo: 1 },
		/** Requêtes SQL avant N1 : faits de la carte, fiche publique, privée, carte souvenir. */
		queries: { facts: 8, pub: 17, priv: 20, gig: 13 }
	};

	it('carte et fiche : mêmes résultats qu’avant N1, moins de requêtes', async () => {
		const facts = await countQueries(() => map.careerFacts(ids.lea));
		const pub = await countQueries(() => sheetService.publicCareerSheet(ids.lea, ids.zoe));
		const priv = await countQueries(() => sheetService.careerSheet(ids.lea));
		const gig = await countQueries(() => map.firstVerifiedGig(ids.lea));
		expect(facts.result).toEqual(BEFORE_N1.facts);
		expect(pub.result).toEqual(BEFORE_N1.sheet);
		expect(priv.result).toMatchObject({ ...BEFORE_N1.sheet, ...BEFORE_N1.privateExtras });
		expect(gig.result).toEqual({
			bandName: 'Réalis nuit',
			hostName: null,
			occurredAt: new Date('2026-06-01T12:00:00Z')
		});
		const after = { facts: facts.queries, pub: pub.queries, priv: priv.queries, gig: gig.queries };
		console.log('Requêtes SQL avant N1', BEFORE_N1.queries, 'après', after);
		// Au moins une requête de moins par chargement (conception 21 §15, N1).
		for (const k of Object.keys(after) as (keyof typeof after)[]) {
			expect(after[k]).toBeLessThan(BEFORE_N1.queries[k]);
		}
	});

	it('un même fait vu de deux contextes ne compte qu’une fois', async () => {
		const all = await realisations.realisationsOf(ids.lea, { actorId: ids.lea });
		const keys = all.map((r) => r.key);
		expect(new Set(keys).size).toBe(keys.length);
		// « ensemble » : créditée et membre du groupe porteur, une seule production.
		const produced = all.filter((r) => r.kind === 'PRODUCTION_STAGE');
		expect(produced).toHaveLength(2);
		expect(produced.map((r) => r.roles).sort()).toEqual([
			['BAND_MEMBER'],
			['CREDITED', 'BAND_MEMBER']
		]);
	});

	it('étapes : gelée et retirée visibles de l’acteur, jamais comptées', async () => {
		const all = await realisations.realisationsOf(ids.lea, { actorId: ids.lea });
		const milestone = (band: string, def: string) =>
			all.find((r) => r.key === `milestone:${ids[band]}:${def}`);
		expect(milestone('nuit', 'FIRST_RECORDING')).toMatchObject({
			status: 'ACTIVE',
			proof: 'CORROBORATED',
			roles: ['BAND_MEMBER'],
			firstTime: true
		});
		expect(milestone('nuit', 'FIRST_TOUR')?.status).toBe('FROZEN');
		expect(milestone('aube', 'FIRST_RECORDING')?.status).toBe('RETIRED');
		// Concert d'Aube attesté sans Léa : pas sa réalisation.
		expect(milestone('aube', 'FIRST_GIG')).toBeUndefined();
		expect(all.find((r) => r.kind === 'COLLABORATION')?.roles).toEqual(['PARTICIPANT']);
		const nora = await realisations.realisationsOf(ids.nora, { actorId: ids.nora });
		expect(nora.map((r) => r.key)).toEqual([`collab:${PREFIX}collab`]);
	});

	it('un autre lecteur ne voit que des faits publics, confirmés et actifs', async () => {
		const seen = await realisations.realisationsOf(ids.lea, { actorId: ids.zoe });
		expect(seen.length).toBeGreaterThan(0);
		for (const r of seen) {
			expect(r.status).toBe('ACTIVE');
			expect(r.proof).not.toBe('DECLARED');
			expect(r.visibility).toBe('PUBLIC');
		}
		expect(seen.some((r) => r.kind === 'COLLABORATION')).toBe(false);
		// Le crédit du son sur l'idée de Malik (privée) ne sort pas.
		expect(seen.some((r) => r.object.type === 'WORK_ROLE' && r.object.roleKind === 'MIXING')).toBe(
			false
		);
		const visitor = await realisations.realisationsOf(ids.lea, { actorId: null });
		expect(visitor.map((r) => r.key)).toEqual(seen.map((r) => r.key));
		// Blocage : plus rien.
		await db.block.create({ data: { blockerActorId: ids.lea, blockedActorId: ids.zoe } });
		try {
			expect(await realisations.realisationsOf(ids.lea, { actorId: ids.zoe })).toEqual([]);
		} finally {
			await db.block.delete({
				where: {
					blockerActorId_blockedActorId: { blockerActorId: ids.lea, blockedActorId: ids.zoe }
				}
			});
		}
	});

	it('aucune réalisation : liste vide, faits à zéro', async () => {
		expect(await realisations.realisationsOf(ids.sam, { actorId: ids.sam })).toEqual([]);
		expect(await map.careerFacts(ids.sam)).toEqual({
			jamAppreciations: 0,
			collaborations: 0,
			worksTogether: 0,
			worksSolo: 0,
			recordings: 0,
			productions: 0,
			verifiedGigs: 0,
			tours: 0
		});
	});

	it('retrait du groupe : la production du groupe part, les étapes datées restent', async () => {
		await db.membership.updateMany({
			where: { orgId: ids.nuit, personId: ids.lea },
			data: { status: 'LEFT', endedAt: new Date() }
		});
		const facts = await map.careerFacts(ids.lea);
		expect(facts.productions).toBe(1);
		expect(facts.recordings).toBe(1);
		expect(facts.verifiedGigs).toBe(1);
		const all = await realisations.realisationsOf(ids.lea, { actorId: ids.lea });
		expect(all.filter((r) => r.kind === 'PRODUCTION_STAGE').map((r) => r.roles)).toEqual([
			['CREDITED']
		]);
	});

	it('révocation : étape retirée et appréciation reprise ne comptent plus', async () => {
		await db.milestone.delete({
			where: { bandId_definitionId: { bandId: ids.nuit, definitionId: 'FIRST_GIG' } }
		});
		await emit({
			type: 'milestone.revoked',
			bandId: ids.nuit,
			milestone: 'FIRST_GIG',
			memberIds: [ids.lea, ids.malik],
			reason: 'contested'
		});
		const endorsement = await db.domainEvent.findFirstOrThrow({
			where: { type: 'endorsement.received', actorIds: { has: ids.lea } },
			select: { id: true }
		});
		await emit({
			type: 'endorsement.revoked',
			actorId: ids.lea,
			endorserId: ids.malik,
			endorsementEventId: endorsement.id
		});
		const facts = await map.careerFacts(ids.lea);
		expect(facts.verifiedGigs).toBe(0);
		expect(facts.jamAppreciations).toBe(0);
		expect(await map.firstVerifiedGig(ids.lea)).toBeNull();
		const all = await realisations.realisationsOf(ids.lea, { actorId: ids.lea });
		expect(all.find((r) => r.key === `milestone:${ids.nuit}:FIRST_GIG`)?.status).toBe('RETIRED');
	});
});
