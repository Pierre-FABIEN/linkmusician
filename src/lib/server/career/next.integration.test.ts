/**
 * Prochaines actions (N3, #72, conception 21 §8–§9) sur la base de `.env`,
 * schéma `e2e` : droits réévalués côté serveur (gestion du morceau relue,
 * révocation, blocage, mineur·e), besoins qui disparaissent une fois
 * satisfaits, aucune fuite dans `title`, `why`, `href` ou `subject`, aucune
 * jam, et budget de requêtes d'un chargement. Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/career/next
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
// `qualifiedTable` (SQL brut de la recherche géographique) lit le schéma ici.
if (enabled) process.env.DATABASE_URL = url.toString();
const db = createPrismaClient(url.toString(), { log: [{ emit: 'event', level: 'query' }] });
let queries = 0;
db.$on('query' as never, () => {
	queries += 1;
});

vi.mock('#lib/server', () => ({ prisma: db }));

const { nextActionsFor, nextFactsFor, suggestionView } = await import('./next');
const { careerMapFor } = await import('./map');
const { spacePriorities } = await import('#lib/server/space/inbox');

const PREFIX = 'next-test-';
/** Requêtes SQL ajoutées à l'accueil par N3, au plus (mesurées le 18/11/2026). */
const BUDGET = { fresh: 6, busy: 20 };
const DAY = 86_400_000;
const geo = { db, schema: 'e2e' };
const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * DAY);
const dayOnly = (d: Date) => new Date(d.toISOString().slice(0, 10));

async function measure<T>(fn: () => Promise<T>) {
	queries = 0;
	const start = performance.now();
	const result = await fn();
	return { result, queries, ms: Math.round(performance.now() - start) };
}

describe.skipIf(!enabled)('prochaines actions (schéma e2e)', { timeout: 120_000 }, () => {
	const ids: Record<string, string> = {};
	const works: Record<string, string> = {};
	let bandId = '';
	let managerMembership = '';

	const reader = (key: string, ambition: 'RECORD' | null = 'RECORD', birth = '1995-01-01') => ({
		actorId: ids[key],
		birthDate: new Date(birth),
		ambition
	});

	const cleanup = async () => {
		await db.collaboration.deleteMany({ where: { title: { startsWith: PREFIX } } });
		await db.conversation.deleteMany({ where: { pairKey: { startsWith: PREFIX } } });
		await db.actor.deleteMany({ where: { handle: { startsWith: PREFIX } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
	};

	const person = async (key: string, name: string, birthDate = '1995-01-01') => {
		const user = await db.user.create({
			data: { email: `${PREFIX}${key}@example.test`, referralCode: `${PREFIX}${key}` }
		});
		const actor = await db.actor.create({
			data: {
				kind: 'PERSON',
				handle: PREFIX + key,
				displayName: name,
				person: {
					create: {
						userId: user.id,
						termsAcceptedAt: now,
						onboardedAt: now,
						birthDate: new Date(birthDate)
					}
				}
			}
		});
		ids[key] = actor.id;
	};

	const work = async (key: string, data: Record<string, unknown>) => {
		const w = await db.work.create({
			data: { createdById: ids.moi, ownerId: ids.moi, title: `${key}`, ...data }
		});
		works[key] = w.id;
	};

	beforeAll(async () => {
		await cleanup();
		await person('moi', 'Moi Test');
		await person('ines', 'Inès Test');
		await person('mineur', 'Mineur Test', '2012-01-01');
		await person('lea', 'Léa Test');
		await person('bloque', 'Bloqué Test');
		await person('neuf', 'Neuf Test');
		for (const k of ['ines', 'mineur'])
			await db.soundEngineerProfile.create({
				data: { personId: ids[k], specialties: ['RECORDING', 'MIXING'] }
			});
		for (const k of ['ines', 'mineur'])
			await db.savedContact.create({ data: { ownerId: ids.moi, contactId: ids[k] } });
		await db.block.create({ data: { blockerActorId: ids.bloque, blockedActorId: ids.moi } });

		// Rang 1 : Inès a confirmé la prise de son, elle attend la mienne.
		const conv = await db.conversation.create({
			data: {
				pairKey: `${PREFIX}moi-ines`,
				initiatorId: ids.ines,
				participants: {
					create: [
						{ actorId: ids.moi, state: 'ACCEPTED' },
						{ actorId: ids.ines, state: 'ACCEPTED' }
					]
				}
			}
		});
		await db.collaboration.create({
			data: {
				kind: 'RECORDING',
				status: 'ACCEPTED',
				title: `${PREFIX}Prise de son Titre 1`,
				happenedOn: dayOnly(daysAgo(3)),
				proposedById: ids.ines,
				conversationId: conv.id,
				participants: {
					create: [
						{ actorId: ids.moi, acceptedAt: daysAgo(10) },
						{
							actorId: ids.ines,
							acceptedAt: daysAgo(10),
							confirmedCompletionAt: daysAgo(1),
							service: 'RECORDING'
						}
					]
				}
			}
		});
		// Une collaboration dans une conversation avec une personne qui m'a bloqué·e : jamais montrée.
		const blockedConv = await db.conversation.create({
			data: {
				pairKey: `${PREFIX}moi-bloque`,
				initiatorId: ids.bloque,
				participants: {
					create: [
						{ actorId: ids.moi, state: 'ACCEPTED' },
						{ actorId: ids.bloque, state: 'ACCEPTED' }
					]
				}
			}
		});
		await db.collaboration.create({
			data: {
				kind: 'SESSION_WORK',
				status: 'PROPOSED',
				title: `${PREFIX}Session secrète`,
				happenedOn: dayOnly(new Date(now.getTime() + 10 * DAY)),
				proposedById: ids.bloque,
				conversationId: blockedConv.id,
				participants: {
					create: [{ actorId: ids.moi }, { actorId: ids.bloque, acceptedAt: daysAgo(1) }]
				}
			}
		});

		// Rang 4 : morceau enregistré, mixage libre ; Inès (adulte) le mixe, le mineur aussi.
		await work('Titre 2', {
			state: 'COMPOSED',
			proof: 'DECLARED',
			composedAt: daysAgo(30),
			recordedAt: daysAgo(5)
		});
		// Rang 3 : un enregistrement pris en charge par moi.
		await work('Titre 3', { state: 'COMPOSED', proof: 'DECLARED', composedAt: daysAgo(20) });
		await db.workStep.create({
			data: {
				workId: works['Titre 3'],
				kind: 'RECORDING',
				mode: 'SELF',
				assigneeId: ids.moi,
				status: 'IN_PROGRESS',
				startedAt: daysAgo(2)
			}
		});
		// Rang 2 : un crédit sur le morceau de Léa ; un autre chez la personne qui m'a bloqué·e.
		for (const [owner, title] of [
			['lea', 'Nuit'],
			['bloque', 'Secret']
		] as const) {
			const w = await db.work.create({
				data: { createdById: ids[owner], ownerId: ids[owner], title: `${PREFIX}${title}` }
			});
			works[title] = w.id;
			await db.workContributor.create({ data: { workId: w.id, personId: ids.moi } });
		}
		// Un groupe que je gère, avec un morceau composé à enregistrer.
		const band = await db.actor.create({
			data: {
				kind: 'ORGANIZATION',
				handle: `${PREFIX}groupe`,
				displayName: 'Groupe Test',
				organization: { create: { kind: 'BAND' } }
			}
		});
		bandId = band.id;
		managerMembership = (
			await db.membership.create({
				data: { orgId: bandId, personId: ids.moi, role: 'OWNER', status: 'ACTIVE' }
			})
		).id;
		const bandWork = await db.work.create({
			data: {
				createdById: ids.moi,
				ownerId: bandId,
				title: `${PREFIX}Hymne`,
				state: 'COMPOSED',
				proof: 'DECLARED',
				composedAt: daysAgo(15)
			}
		});
		works.Hymne = bandWork.id;
	}, 120_000);

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('classe une attente réelle au rang 1, puis les demandes, le travail et les besoins', async () => {
		const out = await nextActionsFor(reader('moi'), { scope: 'DETAIL', geo, perRule: 3 });
		expect(out[0]).toMatchObject({ rank: 1, rule: 'collab.confirm' });
		expect(out[0].why).toMatch(/Inès Test a confirmé/);
		const rules = out.map((s) => `${s.rank}:${s.rule}:${s.subject.id}`);
		expect(rules).toContain(`2:credit.confirm:${works.Nuit}`);
		expect(rules).toContain(`3:work.step:${works['Titre 3']}`);
		expect(rules).toContain(`4:prod.mix:${works['Titre 2']}`);
		// Stable : même ordre à faits égaux.
		const again = await nextActionsFor(reader('moi'), { scope: 'DETAIL', geo, perRule: 3 });
		expect(again.map((s) => s.key)).toEqual(out.map((s) => s.key));
	});

	it('nomme seulement un·e adulte du réseau réel, jamais une personne mineure', async () => {
		const facts = await nextFactsFor(reader('moi'), { geo });
		const titre2 = facts.works.find((w) => w.workId === works['Titre 2'])!;
		expect(titre2.pros.map((p) => p.handle)).toEqual([`${PREFIX}ines`]);
		const out = await nextActionsFor(reader('moi'), { scope: 'DETAIL', geo, perRule: 3 });
		const mix = out.find((s) => s.rule === 'prod.mix')!;
		expect(mix.href).toBe(`/@${PREFIX}ines`);
		expect(JSON.stringify(out)).not.toMatch(/Mineur/);
	});

	it('une étape prise en charge n’est plus un besoin d’enregistrement', async () => {
		const facts = await nextFactsFor(reader('moi'), { geo });
		expect(facts.works.find((w) => w.workId === works['Titre 3'])?.need).toBeNull();
	});

	it('blocage : ni la collaboration ni le crédit de la personne qui m’a bloqué·e, nulle part', async () => {
		const out = await nextActionsFor(reader('moi'), {
			scope: 'DETAIL',
			geo,
			limit: 50,
			perRule: 50
		});
		const text =
			JSON.stringify(out.map(suggestionView)) + JSON.stringify(out.map((s) => s.subject));
		expect(text).not.toMatch(/Secret|secrète|Bloqué/);
		expect(out.some((s) => s.subject.id === works.Secret)).toBe(false);
	});

	it('blocage : l’épreuve à portée ne repropose pas la collaboration écartée', async () => {
		await db.block.create({ data: { blockerActorId: ids.ines, blockedActorId: ids.moi } });
		try {
			const all = { scope: 'DETAIL' as const, geo, limit: 50, perRule: 50, maxOptional: 50 };
			const out = await nextActionsFor(reader('moi'), all);
			expect(JSON.stringify(out)).not.toMatch(/Prise de son/);
			// U0 : la carte ne la propose plus non plus (déclencheurs filtrés par blocage).
			const map = await careerMapFor(ids.moi, 'RECORD');
			expect(map.withinReach.some((a) => a.reach?.subject?.type === 'COLLABORATION')).toBe(false);
		} finally {
			await db.block.deleteMany({ where: { blockerActorId: ids.ines } });
		}
	});

	it('Collab ≠ Rencontre : aucune suggestion ne mène à une jam', async () => {
		const out = await nextActionsFor(reader('moi'), {
			scope: 'DETAIL',
			geo,
			limit: 50,
			perRule: 50
		});
		for (const s of out) expect(s.href).not.toMatch(/jam/i);
	});

	it('ambition : l’enregistrement du groupe est un besoin si on le vise, facultatif sinon', async () => {
		const all = { scope: 'DETAIL' as const, geo, limit: 50, perRule: 50, maxOptional: 50 };
		const rec = (await nextActionsFor(reader('moi'), all)).find(
			(s) => s.subject.id === works.Hymne
		);
		expect(rec).toMatchObject({ rule: 'prod.record', rank: 4 });
		const none = (await nextActionsFor(reader('moi', null), all)).find(
			(s) => s.subject.id === works.Hymne
		);
		expect(none?.rank).toBe(5);
	});

	it('révocation : sans la gestion du groupe, son morceau ne produit plus de besoin', async () => {
		await db.membership.update({
			where: { id: managerMembership },
			data: { role: 'MEMBER' }
		});
		try {
			const out = await nextActionsFor(reader('moi'), {
				scope: 'DETAIL',
				geo,
				limit: 50,
				perRule: 50,
				maxOptional: 50
			});
			expect(out.some((s) => s.subject.id === works.Hymne)).toBe(false);
		} finally {
			await db.membership.update({ where: { id: managerMembership }, data: { role: 'OWNER' } });
		}
	});

	it('le besoin disparaît une fois satisfait (mixage fait)', async () => {
		await db.work.update({ where: { id: works['Titre 2'] }, data: { mixedAt: now } });
		try {
			const out = await nextActionsFor(reader('moi'), { scope: 'DETAIL', geo, limit: 50 });
			expect(out.some((s) => s.rule === 'prod.mix')).toBe(false);
		} finally {
			await db.work.update({ where: { id: works['Titre 2'] }, data: { mixedAt: null } });
		}
	});

	it('mineur·e : aucune recherche d’inconnu ni demande de contact', async () => {
		const out = await nextActionsFor(reader('moi', 'RECORD', '2012-01-01'), {
			scope: 'DETAIL',
			geo,
			limit: 50,
			perRule: 50
		});
		for (const s of out) expect(s.href).not.toMatch(/^\/decouvrir/);
		expect(out.some((s) => s.rule === 'contact.respond')).toBe(false);
	});

	it('compte neuf : aucune suggestion', async () => {
		expect(await nextActionsFor(reader('neuf'), { geo })).toEqual([]);
	});

	it('budget de requêtes et mutualisation par requête HTTP', async () => {
		const { representationsForMeOnce: myRepresentations } = await import('#lib/server/space/inbox');
		// Ce que l'accueil lisait déjà avant N3 (carte, priorités, accompagnement).
		const before = (key: string, request?: object) =>
			Promise.all([
				careerMapFor(ids[key], 'RECORD', now, request),
				spacePriorities(reader(key), 'MUSICIAN', now, request),
				myRepresentations(ids[key], request)
			]);
		const withNext = (key: string, request?: object) =>
			Promise.all([before(key, request), nextActionsFor(reader(key), { geo, request })]);
		const row = async (key: string) => {
			const base = await measure(() => before(key, {}));
			const alone = await measure(() => withNext(key));
			const shared = await measure(() => withNext(key, {}));
			return {
				avantN3: base.queries,
				sansPortee: alone.queries,
				avecPortee: shared.queries,
				marginal: shared.queries - base.queries,
				ms: { avantN3: base.ms, sansPortee: alone.ms, avecPortee: shared.ms }
			};
		};
		const fresh = await row('neuf');
		const busy = await row('moi');
		console.log('N3 requêtes SQL et latences', { compteNeuf: fresh, compteActif: busy });
		// La portée de requête évite de relire carte, priorités et accompagnement.
		expect(fresh.avecPortee).toBeLessThan(fresh.sansPortee);
		expect(busy.avecPortee).toBeLessThan(busy.sansPortee);
		// Seuils fixés au lot N3 (conception 21 §13.2, point 7) : coût ajouté à l'accueil.
		expect(fresh.marginal).toBeLessThanOrEqual(BUDGET.fresh);
		expect(busy.marginal).toBeLessThanOrEqual(BUDGET.busy);
	});
});
