/**
 * « À traiter » et lectures privées de l'accueil (U0, #71) sur la base de
 * `.env`, schéma `e2e` : blocage dans les deux sens (collaborations à
 * confirmer et à venir, crédits, propositions d'accompagnement, déclencheurs
 * de la carte, pastille des crédits), retrait d'une gestion, compteurs sans
 * fuite, et aucun droit déduit du métier affiché. Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/space/inbox
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
vi.setConfig({ testTimeout: 60_000 });

const { inboxFor, spacePriorities } = await import('./inbox');
const { careerBranchFor } = await import('#lib/server/career/map');
const { agenda } = await import('#lib/server/career/service');
const { pendingCredits } = await import('#lib/server/works/service');
const { nextActionsFor } = await import('#lib/server/career/next');
const { careerMapFor } = await import('#lib/server/career/map');

const PREFIX = 'inbox-test-';
const DAY = 86_400_000;
const now = new Date();
const day = (offset: number) =>
	new Date(new Date(now.getTime() + offset * DAY).toISOString().slice(0, 10));
/** Les trois autres : une amie, une personne qui m'a bloqué·e, une que j'ai bloquée. */
const OTHERS = ['amie', 'bloqueuse', 'bloquee'] as const;

describe.skipIf(!enabled)('« À traiter » et blocages (schéma e2e)', () => {
	const ids: Record<string, string> = {};
	let bandId = '';
	let membershipId = '';
	const me = () => ({ actorId: ids.moi, birthDate: new Date('1990-01-01') });

	const cleanup = async () => {
		await db.collaboration.deleteMany({ where: { title: { startsWith: PREFIX } } });
		await db.conversation.deleteMany({ where: { pairKey: { startsWith: PREFIX } } });
		await db.actor.deleteMany({ where: { handle: { startsWith: PREFIX } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
	};

	beforeAll(async () => {
		await cleanup();
		for (const key of ['moi', ...OTHERS]) {
			const user = await db.user.create({
				data: { email: `${PREFIX}${key}@example.test`, referralCode: `${PREFIX}${key}` }
			});
			const actor = await db.actor.create({
				data: {
					kind: 'PERSON',
					handle: PREFIX + key,
					displayName: `${key} Test`,
					person: {
						create: {
							userId: user.id,
							termsAcceptedAt: now,
							onboardedAt: now,
							birthDate: new Date('1990-01-01'),
							tracks: { create: { track: 'MANAGER', isPrimary: true } }
						}
					}
				}
			});
			ids[key] = actor.id;
		}
		await db.block.create({ data: { blockerActorId: ids.bloqueuse, blockedActorId: ids.moi } });
		await db.block.create({ data: { blockerActorId: ids.moi, blockedActorId: ids.bloquee } });

		// Un groupe que je gère : une proposition d'accompagnement lui est faite.
		const band = await db.actor.create({
			data: {
				kind: 'ORGANIZATION',
				handle: `${PREFIX}groupe`,
				displayName: 'Groupe Test',
				organization: { create: { kind: 'BAND' } }
			}
		});
		bandId = band.id;
		membershipId = (
			await db.membership.create({
				data: { orgId: bandId, personId: ids.moi, role: 'OWNER', status: 'ACTIVE' }
			})
		).id;

		for (const key of OTHERS) {
			const other = ids[key];
			const conv = await db.conversation.create({
				data: {
					pairKey: `${PREFIX}${key}`,
					initiatorId: other,
					participants: {
						create: [
							{ actorId: ids.moi, state: 'ACCEPTED' },
							{ actorId: other, state: 'ACCEPTED' }
						]
					}
				}
			});
			const both = (confirmed: boolean) => ({
				create: [
					{ actorId: ids.moi, acceptedAt: day(-9) },
					{ actorId: other, acceptedAt: day(-9), confirmedCompletionAt: confirmed ? day(-1) : null }
				]
			});
			// Passée, à confirmer de mon côté (carte et « À traiter »).
			await db.collaboration.create({
				data: {
					kind: 'SESSION_WORK',
					status: 'ACCEPTED',
					title: `${PREFIX}passee-${key}`,
					happenedOn: day(-3),
					proposedById: other,
					conversationId: conv.id,
					participants: both(true)
				}
			});
			// À venir (agenda).
			await db.collaboration.create({
				data: {
					kind: 'REHEARSAL',
					status: 'ACCEPTED',
					title: `${PREFIX}avenir-${key}`,
					happenedOn: day(5),
					proposedById: other,
					conversationId: conv.id,
					participants: both(false)
				}
			});
			// Un crédit sur son morceau.
			const work = await db.work.create({
				data: { ownerId: other, createdById: other, title: `${PREFIX}morceau-${key}` }
			});
			await db.workContributor.create({ data: { workId: work.id, personId: ids.moi } });
			// Une proposition d'accompagnement, à moi et à mon groupe.
			await db.representation.create({
				data: { agentId: other, artistId: ids.moi, kind: 'MANAGER' }
			});
			await db.representation.create({
				data: { agentId: other, artistId: bandId, kind: 'BOOKER' }
			});
			// Mon morceau composé, déclaré : son rôle à elle attend sa confirmation (carte, Création).
			const mine = await db.work.create({
				data: {
					ownerId: ids.moi,
					createdById: ids.moi,
					title: `${PREFIX}compo-${key}`,
					state: 'COMPOSED',
					proof: 'DECLARED',
					composedAt: day(-20)
				}
			});
			await db.workContributor.createMany({
				data: [
					{ workId: mine.id, personId: ids.moi, confirmedAt: day(-20) },
					{ workId: mine.id, personId: other }
				]
			});
		}
	}, 180_000);

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	const text = (v: unknown) => JSON.stringify(v);

	it('« À traiter » : rien d’une personne bloquée, dans un sens ou dans l’autre', async () => {
		const inbox = await inboxFor(me());
		expect(inbox.collaborations.map((c) => c.title)).toEqual([`${PREFIX}passee-amie`]);
		expect(inbox.credits.map((c) => c.title)).toEqual([`${PREFIX}morceau-amie`]);
		// Une pour moi, une pour mon groupe : toutes deux de l'amie.
		expect(inbox.representations).toHaveLength(2);
		expect(inbox.answers).toBe(1 + 1 + 2);
		expect(text(inbox)).not.toMatch(/bloqueuse|bloquee/);
	});

	it('carte : ses déclencheurs ignorent les personnes bloquées (deux sens)', async () => {
		const equipe = await careerBranchFor(ids.moi, null, 'EQUIPE');
		expect(equipe.reach.toConfirm.map((c) => c.title)).toEqual([`${PREFIX}passee-amie`]);
		expect(text(equipe.map)).not.toMatch(/bloqueuse|bloquee/);
		const creation = await careerBranchFor(ids.moi, null, 'CREATION');
		expect(creation.reach.pendingCoauthors.map((w) => w.title)).toEqual([`${PREFIX}compo-amie`]);
	});

	it('agenda Collab : ni jam, ni collaboration avec une personne bloquée', async () => {
		const items = await agenda(ids.moi, now);
		expect(items.map((i) => i.title)).toEqual([`${PREFIX}avenir-amie`]);
		expect(items.every((i) => i.kind === 'COLLAB')).toBe(true);
	});

	it('compteurs : la pastille des crédits et la tuile « À traiter » ne trahissent rien', async () => {
		expect(await pendingCredits(ids.moi)).toBe(1);
		const [tile] = (await spacePriorities(me(), 'MANAGER')).filter(
			(t) => t.kind === 'confirmations'
		);
		expect(tile.summary).toBe('4 dans l’aperçu');
	});

	it('lever un blocage rend les demandes : la donnée est conservée, seule la lecture filtrait', async () => {
		await db.block.deleteMany({ where: { blockerActorId: ids.moi, blockedActorId: ids.bloquee } });
		try {
			const inbox = await inboxFor(me());
			expect(inbox.credits.map((c) => c.title).sort()).toEqual([
				`${PREFIX}morceau-amie`,
				`${PREFIX}morceau-bloquee`
			]);
		} finally {
			await db.block.create({ data: { blockerActorId: ids.moi, blockedActorId: ids.bloquee } });
		}
	});

	it('retrait de la gestion du groupe : ses propositions d’accompagnement disparaissent', async () => {
		await db.membership.update({ where: { id: membershipId }, data: { role: 'MEMBER' } });
		try {
			expect((await inboxFor(me())).representations).toHaveLength(1);
		} finally {
			await db.membership.update({ where: { id: membershipId }, data: { role: 'OWNER' } });
		}
	});

	it('aucun droit déduit du métier affiché : mêmes demandes quel que soit le métier', async () => {
		const counts = await Promise.all(
			(['MUSICIAN', 'MANAGER', 'SOUND_ENGINEER'] as const).map(async (track) => {
				const tiles = await spacePriorities(me(), track);
				return tiles.find((t) => t.kind === 'confirmations')?.summary;
			})
		);
		expect(new Set(counts).size).toBe(1);
	});

	it('compte multirôle (musicien et manager, groupe, demandes) : une lecture par requête', async () => {
		await db.personTrack.create({ data: { personId: ids.moi, track: 'MUSICIAN' } });
		const home = (track: 'MUSICIAN' | 'MANAGER', request?: object) =>
			Promise.all([
				careerMapFor(ids.moi, null, now, request),
				spacePriorities(me(), track, now, request),
				inboxFor(me(), now, request),
				nextActionsFor({ ...me(), ambition: null }, { request })
			]);
		const measure = async (fn: () => Promise<unknown>) => {
			queries = 0;
			const start = performance.now();
			await fn();
			return { requetes: queries, ms: Math.round(performance.now() - start) };
		};
		const result = {
			musicienAvecPortee: await measure(() => home('MUSICIAN', {})),
			managerAvecPortee: await measure(() => home('MANAGER', {})),
			managerSansPortee: await measure(() => home('MANAGER'))
		};
		console.log('U0 compte multirôle', result);
		// Le métier affiché ne change pas les lectures.
		expect(result.managerAvecPortee.requetes).toBe(result.musicienAvecPortee.requetes);
		expect(result.managerAvecPortee.requetes).toBeLessThan(result.managerSansPortee.requetes);
	});
});
