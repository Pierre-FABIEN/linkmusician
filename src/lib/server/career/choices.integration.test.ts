/**
 * « Plus tard » et « Pas pour moi » (N4, #72, conception 21 §8.6) sur la base
 * de `.env`, schéma `e2e` : persistance, isolation entre personnes, clés
 * forgées refusées, rangs 1 et 2 protégés, concurrence, export et
 * anonymisation RGPD, choix obsolètes, session absente et coût de lecture.
 * Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/career/choices
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
// Chaque geste recalcule les prochaines actions sur une base distante : plus de 5 s sous charge.
vi.setConfig({ testTimeout: 60_000 });

const choices = await import('./choices');
const { nextActionsFor } = await import('./next');
const { exportPersonData, personAnonymizationOps } = await import('#lib/prisma/actors/person');
const { fingerprint } = await import('#lib/career/next');

const PREFIX = 'choices-test-';
const DAY = 86_400_000;
const geo = { db, schema: 'e2e' };
const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * DAY);
const ALL = { scope: 'DETAIL' as const, geo, limit: 50, perRule: 50, maxOptional: 50 };

async function measure<T>(fn: () => Promise<T>) {
	queries = 0;
	const start = performance.now();
	const result = await fn();
	return { result, queries, ms: Math.round(performance.now() - start) };
}

describe.skipIf(!enabled)('choix des prochaines actions (schéma e2e)', { timeout: 120_000 }, () => {
	const ids: Record<string, string> = {};
	const users: Record<string, string> = {};
	const works: Record<string, string> = {};
	let conversationId = '';
	const reader = (key: string) => ({
		actorId: ids[key],
		birthDate: new Date('1995-01-01'),
		ambition: 'RECORD' as const
	});
	const mine = (key: string) =>
		db.suggestionChoice.findMany({ where: { ownerId: ids[key] }, orderBy: { target: 'asc' } });

	const cleanup = async () => {
		await db.collaboration.deleteMany({ where: { title: { startsWith: PREFIX } } });
		await db.conversation.deleteMany({ where: { pairKey: { startsWith: PREFIX } } });
		await db.actor.deleteMany({ where: { handle: { startsWith: PREFIX } } });
		// L'anonymisation renomme l'acteur : on le retrouve par son identifiant.
		await db.actor.deleteMany({ where: { id: { in: Object.values(ids) } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
	};

	const person = async (key: string, name: string) => {
		const user = await db.user.create({
			data: { email: `${PREFIX}${key}@example.test`, referralCode: `${PREFIX}${key}` }
		});
		users[key] = user.id;
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
						birthDate: new Date('1995-01-01')
					}
				}
			}
		});
		ids[key] = actor.id;
	};

	const composed = async (owner: string, title: string, data: Record<string, unknown> = {}) => {
		const w = await db.work.create({
			data: {
				createdById: ids[owner],
				ownerId: ids[owner],
				title: `${PREFIX}${title}`,
				state: 'COMPOSED',
				proof: 'DECLARED',
				composedAt: daysAgo(10),
				...data
			}
		});
		works[title] = w.id;
	};

	beforeAll(async () => {
		await cleanup();
		await person('moi', 'Moi Test');
		await person('autre', 'Autre Test');
		await person('ines', 'Inès Test');
		// Deux besoins de mixage (rang 4) et un enregistrement (rang 4, ambition RECORD).
		await composed('moi', 'Aube', { recordedAt: daysAgo(3) });
		await composed('moi', 'Brume', { recordedAt: daysAgo(2) });
		await composed('moi', 'Ciel');
		// Un morceau d'une autre personne, invisible pour moi.
		await composed('autre', 'Secret', { recordedAt: daysAgo(2) });
		// Rang 1 : Inès a confirmé, elle attend ma confirmation.
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
		conversationId = conv.id;
		await db.collaboration.create({
			data: {
				kind: 'RECORDING',
				status: 'ACCEPTED',
				title: `${PREFIX}Prise de son`,
				happenedOn: new Date(daysAgo(3).toISOString().slice(0, 10)),
				proposedById: ids.ines,
				conversationId,
				participants: {
					create: [
						{ actorId: ids.moi, acceptedAt: daysAgo(9) },
						{
							actorId: ids.ines,
							acceptedAt: daysAgo(9),
							confirmedCompletionAt: daysAgo(1),
							service: 'RECORDING'
						}
					]
				}
			}
		});
	}, 120_000);

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('Plus tard : enregistré en base, la suggestion disparaît et laisse sa place', async () => {
		const before = await nextActionsFor(reader('moi'), ALL);
		const aube = `prod.mix:WORK:${works.Aube}`;
		expect(before.map((s) => s.key)).toContain(aube);
		expect(await choices.postpone(reader('moi'), aube, { geo })).toMatchObject({ changed: true });
		const [row] = await mine('moi');
		expect(row).toMatchObject({ kind: 'LATER', target: aube });
		// 30 jours, à l'heure du serveur.
		expect(Math.round((row.until!.getTime() - Date.now()) / DAY)).toBe(30);
		const after = await nextActionsFor(reader('moi'), ALL);
		expect(after.map((s) => s.key)).not.toContain(aube);
		expect(after.map((s) => s.key)).toContain(`prod.mix:WORK:${works.Brume}`);
		// Rejouer le même report ne crée rien et ne prolonge rien.
		expect(await choices.postpone(reader('moi'), aube, { geo })).toMatchObject({ changed: false });
		expect(await mine('moi')).toHaveLength(1);
		expect((await mine('moi'))[0].until).toEqual(row.until);
	});

	it('un fait nouveau sur l’objet fait revenir la suggestion reportée', async () => {
		const aube = `prod.mix:WORK:${works.Aube}`;
		// Une ingé son de mon réseau, qui mixe : le fait change.
		await db.soundEngineerProfile.create({
			data: { personId: ids.ines, specialties: ['MIXING'] }
		});
		await db.savedContact.create({ data: { ownerId: ids.moi, contactId: ids.ines } });
		try {
			const out = await nextActionsFor(reader('moi'), ALL);
			expect(out.map((s) => s.key)).toContain(aube);
		} finally {
			await db.savedContact.deleteMany({ where: { ownerId: ids.moi } });
			await db.soundEngineerProfile.deleteMany({ where: { personId: ids.ines } });
		}
		// Sans ce fait, le report s'applique de nouveau.
		expect((await nextActionsFor(reader('moi'), ALL)).map((s) => s.key)).not.toContain(aube);
	});

	it('un report échu ne masque plus rien et se purge au passage', async () => {
		const aube = `prod.mix:WORK:${works.Aube}`;
		await db.suggestionChoice.updateMany({
			where: { ownerId: ids.moi, target: aube },
			data: { until: daysAgo(1) }
		});
		expect((await nextActionsFor(reader('moi'), ALL)).map((s) => s.key)).toContain(aube);
		await choices.choicesPage(ids.moi);
		expect(await mine('moi')).toHaveLength(0);
	});

	it('Pas pour moi : la règle disparaît durablement, puis revient à la réactivation', async () => {
		await choices.declineSuggestion(reader('moi'), `prod.mix:WORK:${works.Brume}`, { geo });
		const [row] = await mine('moi');
		expect(row).toMatchObject({ kind: 'NOT_FOR_ME', target: 'rule:prod.mix', until: null });
		const hidden = await nextActionsFor(reader('moi'), ALL);
		expect(hidden.some((s) => s.rule === 'prod.mix')).toBe(false);
		// Une préférence, pas une restriction : le morceau et sa page restent.
		expect(await db.work.count({ where: { id: works.Brume } })).toBe(1);
		// Les rangs 1 et 2 restent.
		expect(hidden[0]).toMatchObject({ rank: 1, rule: 'collab.confirm' });
		const page = await choices.choicesPage(ids.moi);
		expect(page.declined.map((d) => d.label)).toEqual(['Trouver qui mixe un morceau']);
		await choices.reactivate(ids.moi, page.declined[0].id);
		expect((await nextActionsFor(reader('moi'), ALL)).some((s) => s.rule === 'prod.mix')).toBe(
			true
		);
	});

	it('refuse les mutations forgées : rang 1, objet d’autrui, règle inconnue, forme invalide', async () => {
		const forged = [
			// Rang 1 : une vraie demande ne se reporte pas.
			(await nextActionsFor(reader('moi'), ALL))[0].key,
			// Le morceau d'une autre personne, que je ne vois pas.
			`prod.mix:WORK:${works.Secret}`,
			'admin.delete:WORK:x',
			'prod.mix:WORK:',
			`prod.mix:WORK:${works.Aube}; DROP TABLE x`
		];
		for (const key of forged) {
			await expect(choices.postpone(reader('moi'), key, { geo })).rejects.toMatchObject({
				status: 404
			});
			await expect(choices.declineSuggestion(reader('moi'), key, { geo })).rejects.toThrow();
		}
		// Le message ne dit rien de l'objet visé.
		await expect(
			choices.postpone(reader('moi'), `prod.mix:WORK:${works.Secret}`, { geo })
		).rejects.toThrow('Cette suggestion n’est plus proposée.');
		for (const target of ['rule:credit.confirm', 'rule:collab.confirm', 'branch:X', 'rule:'])
			await expect(choices.declineTarget(ids.moi, target)).rejects.toThrow();
		expect(await mine('moi')).toHaveLength(0);
	});

	it('isolation : ni lire, ni réactiver le choix d’une autre personne', async () => {
		await choices.declineTarget(ids.autre, 'branch:SCENE');
		const [theirs] = await mine('autre');
		await expect(choices.reactivate(ids.moi, theirs.id)).rejects.toMatchObject({ status: 404 });
		expect(await mine('autre')).toHaveLength(1);
		expect((await choices.choicesPage(ids.moi)).declined).toEqual([]);
		// Mon morceau n'est pas affecté par le choix d'autrui.
		const out = await nextActionsFor(reader('moi'), ALL);
		expect(out.some((s) => s.rule === 'prod.mix')).toBe(true);
	});

	it('concurrence : deux reports simultanés donnent une seule ligne', async () => {
		const key = `prod.mix:WORK:${works.Brume}`;
		const results = await Promise.allSettled([
			choices.postpone(reader('moi'), key, { geo }),
			choices.postpone(reader('moi'), key, { geo }),
			choices.postpone(reader('moi'), key, { geo })
		]);
		expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
		expect(await db.suggestionChoice.count({ where: { ownerId: ids.moi, target: key } })).toBe(1);
		await Promise.all([
			choices.declineTarget(ids.moi, 'branch:CREATION'),
			choices.declineTarget(ids.moi, 'branch:CREATION')
		]);
		expect(
			await db.suggestionChoice.count({ where: { ownerId: ids.moi, target: 'branch:CREATION' } })
		).toBe(1);
	});

	it('un choix devenu obsolète (cible inconnue) n’a aucun effet et n’est pas affiché', async () => {
		await db.suggestionChoice.create({
			data: { ownerId: ids.moi, kind: 'NOT_FOR_ME', target: 'rule:regle.retiree' }
		});
		await db.suggestionChoice.create({
			data: {
				ownerId: ids.moi,
				kind: 'LATER',
				target: 'prod.mix:WORK:objet-disparu',
				version: fingerprint('x'),
				until: new Date(now.getTime() + 10 * DAY)
			}
		});
		const page = await choices.choicesPage(ids.moi);
		expect(page.declined.map((d) => d.label)).not.toContain('rule:regle.retiree');
		expect(JSON.stringify(page)).not.toMatch(/objet-disparu|Secret|Aube/);
	});

	it('export RGPD : les choix y sont, sans texte de suggestion ni donnée d’autrui', async () => {
		const exported = await exportPersonData(users.moi);
		const rows = exported!.prochaines_actions_choix;
		expect(rows.length).toBeGreaterThan(0);
		expect(rows.map((r) => r.choix)).toEqual(expect.arrayContaining(['Plus tard', 'Pas pour moi']));
		expect(JSON.stringify(rows)).not.toMatch(/Brume|place au mixage|Inès/);
	});

	it('coût : une seule lecture des choix, avec zéro ou plusieurs dizaines de choix', async () => {
		const reading = () => nextActionsFor(reader('autre'), { geo });
		await db.suggestionChoice.deleteMany({ where: { ownerId: ids.autre } });
		const none = await measure(reading);
		await db.suggestionChoice.createMany({
			data: Array.from({ length: 40 }, (_, i) => ({
				ownerId: ids.autre,
				kind: 'LATER' as const,
				target: `prod.mix:WORK:obj${i}`,
				version: 'v',
				until: new Date(now.getTime() + 10 * DAY)
			}))
		});
		const forty = await measure(reading);
		console.log('N4 requêtes et latences', {
			aucunChoix: { requetes: none.queries, ms: none.ms },
			quaranteChoix: { requetes: forty.queries, ms: forty.ms }
		});
		expect(forty.queries).toBe(none.queries);
	});

	it('anonymisation : les choix de la personne sont supprimés', async () => {
		await db.$transaction(await personAnonymizationOps(users.autre));
		expect(await mine('autre')).toHaveLength(0);
		expect(await db.suggestionChoice.count({ where: { ownerId: ids.moi } })).toBeGreaterThan(0);
	});

	it('session absente ou sans personne : refus avant toute lecture', async () => {
		await expect(choices.chooserOf({} as App.Locals)).rejects.toMatchObject({ status: 302 });
		await expect(
			choices.chooserOf({ user: { id: 'inconnu', emailVerified: false } } as App.Locals)
		).rejects.toMatchObject({ status: 302 });
	});
});
