// DASH-07a (D71) : droit de candidater pour autrui, en base e2e.
// PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/representation/applicationGrants
import { beforeAll, afterAll, afterEach, describe, expect, it, vi } from 'vitest';
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
const g = await import('./applicationGrants');
const { endRepresentation } = await import('./service');
const bands = await import('../bands/service');
const { exportPersonData, personAnonymizationOps } = await import('#lib/prisma/actors/person');

const prefix = 'grant-test-';
const DAY = 86_400_000;
const now = new Date();
const on = (days: number) => new Date(now.getTime() + days * DAY);
const isoDay = (days: number) => on(days).toISOString().slice(0, 10);
const people: Record<string, string> = {};
const users: Record<string, string> = {};
const mandates: string[] = [];
let bandId = '';

async function cleanup() {
	await db.actor.deleteMany({
		where: {
			OR: [
				{ handle: { startsWith: prefix } },
				{ person: { user: { email: { startsWith: prefix } } } }
			]
		}
	});
	await db.user.deleteMany({ where: { email: { startsWith: prefix } } });
}

async function mandate(
	agent: string,
	artistId: string,
	kind: 'MANAGER' | 'BOOKER' = 'MANAGER',
	extra: Record<string, unknown> = {}
) {
	const row = await db.representation.create({
		data: {
			agentId: people[agent],
			artistId,
			kind,
			status: 'CONFIRMED',
			confirmedAt: now,
			allowedActions: [kind === 'BOOKER' ? 'BOOKING_CREDIT' : 'CAREER_SUPPORT'],
			expiresAt: on(365),
			...extra
		}
	});
	mandates.push(row.id);
	return row.id;
}

const request = (agent: string, representationId: string, kinds: string[], days = 60) =>
	g.requestGrant(people[agent], { representationId, kinds, expiresOn: isoDay(days) }, now);

const actsOf = async (grantId: string) =>
	(
		await db.applicationGrantAct.findMany({
			where: { grantId },
			orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
			select: { kind: true, byId: true }
		})
	).map((a) => a.kind);

const usable = (agent: string, artistId: string, kind: string, at = now) =>
	db.$transaction(async (tx) => {
		await g.lockGrantPair(tx, people[agent], artistId);
		return g.usableGrant(tx, people[agent], artistId, kind, at);
	});

describe.skipIf(!enabled)('droit de candidater pour autrui (e2e)', { timeout: 90000 }, () => {
	beforeAll(async () => {
		await cleanup();
		const tracks: Record<string, string> = {
			agent: 'MANAGER',
			booker: 'BOOKER',
			artist: 'MUSICIAN',
			bandAdmin: 'MUSICIAN',
			outsider: 'MUSICIAN',
			minorAdmin: 'MUSICIAN'
		};
		for (const [key, track] of Object.entries(tracks)) {
			const user = await db.user.create({
				data: { email: prefix + key + '@example.test', referralCode: prefix + key }
			});
			users[key] = user.id;
			const actor = await db.actor.create({
				data: {
					kind: 'PERSON',
					handle: prefix + key.toLowerCase(),
					displayName: key,
					person: {
						create: {
							userId: user.id,
							birthDate: new Date(key === 'minorAdmin' ? '2011-01-01' : '1990-01-01'),
							termsAcceptedAt: now,
							tracks: { create: { track: track as 'MUSICIAN', isPrimary: true } }
						}
					}
				}
			});
			people[key] = actor.id;
		}
		bandId = (
			await bands.createBand(people.bandAdmin, { name: prefix + 'groupe', title: 'guitare' })
		).id;
	}, 90000);
	afterEach(async () => {
		await db.representation.deleteMany({ where: { id: { in: mandates } } });
		mandates.length = 0;
	});
	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('le mandat seul n’autorise rien ; le droit naît de l’accord de l’artiste', async () => {
		const rep = await mandate('agent', people.artist);
		expect(await usable('agent', people.artist, 'JAM')).toBeNull();
		const id = await request('agent', rep, ['JAM', 'SESSION_WORK']);
		expect(await usable('agent', people.artist, 'JAM')).toBeNull();
		// L'agent ne s'accorde pas le droit ; un tiers non plus.
		await expect(g.answerGrant(id, people.agent, true, now)).rejects.toMatchObject({
			status: 403
		});
		await expect(g.answerGrant(id, people.outsider, true, now)).rejects.toMatchObject({
			status: 403
		});
		const notified = await db.notification.count({
			where: { recipientActorId: people.artist, type: 'APPLICATION_GRANT' }
		});
		expect(notified).toBe(1);
		await g.answerGrant(id, people.artist, true, now);
		expect(await usable('agent', people.artist, 'JAM')).toBe(id);
		expect(await usable('agent', people.artist, 'SESSION_WORK')).toBe(id);
		// Périmètre : ni plateau pour une personne, ni recrutement.
		expect(await usable('agent', people.artist, 'GIG_SLOT')).toBeNull();
		expect(await usable('agent', people.artist, 'RECRUIT_MEMBER')).toBeNull();
		expect(await actsOf(id)).toEqual(['REQUESTED', 'GRANTED']);
		// Un seul droit ouvert par mandat.
		await expect(request('agent', rep, ['JAM'])).rejects.toThrow(/déjà demandé ou accordé/);
	});

	it('périmètre et durée relus côté serveur', async () => {
		const rep = await mandate('agent', people.artist, 'MANAGER', { expiresAt: on(30) });
		await expect(request('outsider', rep, ['JAM'])).rejects.toMatchObject({ status: 404 });
		await expect(request('agent', rep, ['GIG_SLOT'])).rejects.toThrow(/ne peut pas être couvert/);
		await expect(request('agent', rep, ['RECRUIT_MEMBER'])).rejects.toThrow();
		await expect(request('agent', rep, ['JAM'], 31)).rejects.toThrow(/durée de l’accompagnement/);
		const longRep = await mandate('booker', bandId, 'BOOKER', { expiresAt: null });
		await expect(request('booker', longRep, ['GIG_SLOT'], 200)).rejects.toThrow(/Six mois/);
		// Booker d'une personne : rien à demander.
		const bookerOfPerson = await mandate('booker', people.artist, 'BOOKER');
		await expect(request('booker', bookerOfPerson, ['JAM'])).rejects.toMatchObject({
			status: 403
		});
		// Mandat proposé, pas encore confirmé : pas de droit.
		await db.representation.update({ where: { id: rep }, data: { status: 'PROPOSED' } });
		await expect(request('agent', rep, ['JAM'])).rejects.toMatchObject({ status: 403 });
	});

	it('groupe : la gestion majeure accorde, un plateau seulement', async () => {
		const rep = await mandate('booker', bandId, 'BOOKER');
		const id = await request('booker', rep, ['GIG_SLOT']);
		await expect(g.answerGrant(id, people.artist, true, now)).rejects.toMatchObject({
			status: 403
		});
		// Une admin mineure du groupe ne répond pas pour lui.
		await db.membership.create({
			data: { orgId: bandId, personId: people.minorAdmin, role: 'ADMIN', status: 'ACTIVE' }
		});
		await expect(g.answerGrant(id, people.minorAdmin, true, now)).rejects.toMatchObject({
			status: 403
		});
		await g.answerGrant(id, people.bandAdmin, true, now);
		expect(await usable('booker', bandId, 'GIG_SLOT')).toBe(id);
		expect(await usable('booker', bandId, 'JAM')).toBeNull();
		await db.membership.deleteMany({ where: { orgId: bandId, personId: people.minorAdmin } });
	});

	it('révocation, retrait, refus, échéance et fin du mandat coupent le droit', async () => {
		const rep = await mandate('agent', people.artist);
		const pending = await request('agent', rep, ['JAM']);
		await g.endGrant(pending, people.agent, now);
		expect(await actsOf(pending)).toEqual(['REQUESTED', 'WITHDRAWN']);
		const declined = await request('agent', rep, ['JAM']);
		await expect(g.endGrant(declined, people.artist, now)).rejects.toThrow(/Réponds/);
		await g.answerGrant(declined, people.artist, false, now);
		expect(await actsOf(declined)).toEqual(['REQUESTED', 'DECLINED']);
		await expect(g.answerGrant(declined, people.artist, true, now)).rejects.toThrow(/terminé/);

		const id = await request('agent', rep, ['JAM'], 20);
		await g.answerGrant(id, people.artist, true, now);
		expect(await usable('agent', people.artist, 'JAM', on(19))).toBe(id);
		expect(await usable('agent', people.artist, 'JAM', on(20))).toBeNull();
		await g.endGrant(id, people.artist, now);
		expect(await usable('agent', people.artist, 'JAM')).toBeNull();
		expect(await actsOf(id)).toEqual(['REQUESTED', 'GRANTED', 'REVOKED']);
		await expect(g.endGrant(id, people.agent, now)).rejects.toThrow(/déjà terminé/);

		// Une demande échue ne s'accorde plus ; on peut en refaire une.
		const late = await request('agent', rep, ['JAM'], 5);
		await expect(g.answerGrant(late, people.artist, true, on(6))).rejects.toThrow(/échue/);
		const again = await g.requestGrant(
			people.agent,
			{ representationId: rep, kinds: ['JAM'], expiresOn: isoDay(40) },
			on(6)
		);
		await g.answerGrant(again, people.artist, true, on(6));
		expect(await usable('agent', people.artist, 'JAM', on(7))).toBe(again);
		// Fin du mandat : le droit accordé reste écrit mais sans effet.
		await endRepresentation(rep, people.artist, on(7));
		expect(await usable('agent', people.artist, 'JAM', on(8))).toBeNull();
		const view = await g.grantsForRepresentation(rep, people.artist, on(8));
		expect(view?.usable).toBe(false);
		expect(view?.grants[0]).toMatchObject({ state: 'ACTIVE', effective: false, canEnd: true });
	});

	it('la révocation et l’usage du droit sont sérialisés par le verrou', async () => {
		const rep = await mandate('agent', people.artist);
		const id = await request('agent', rep, ['SESSION_WORK']);
		await g.answerGrant(id, people.artist, true, now);
		let revoked = false;
		let revocation: Promise<void> | null = null;
		const seen = await db.$transaction(
			async (tx) => {
				await g.lockGrantPair(tx, people.agent, people.artist);
				revocation = g.endGrant(id, people.artist, now).then(() => {
					revoked = true;
				});
				await new Promise((r) => setTimeout(r, 400));
				expect(revoked).toBe(false);
				return g.usableGrant(tx, people.agent, people.artist, 'SESSION_WORK', now);
			},
			{ timeout: 15000 }
		);
		expect(seen).toBe(id);
		await revocation;
		expect(revoked).toBe(true);
		expect(await usable('agent', people.artist, 'SESSION_WORK')).toBeNull();
	});

	it('vue réservée aux parties ; export et anonymisation', async () => {
		const rep = await mandate('agent', people.artist);
		const id = await request('agent', rep, ['JAM']);
		await g.answerGrant(id, people.artist, true, now);
		expect(await g.grantsForRepresentation(rep, people.outsider, now)).toBeNull();
		const view = await g.grantsForRepresentation(rep, people.agent, now);
		expect(view).toMatchObject({ isAgent: true, canRequest: false });
		expect(view?.grants[0].acts.map((a) => a.label)).toEqual(['Droit demandé', 'Droit accordé']);

		const exported = await exportPersonData(users.artist);
		expect(exported?.droits_de_candidater).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					agent: 'agent',
					types_d_annonces: ['JAM'],
					actes: [
						expect.objectContaining({ acte: 'REQUESTED', par: 'agent' }),
						expect.objectContaining({ acte: 'GRANTED', par: 'artist' })
					]
				})
			])
		);
		await db.$transaction(await personAnonymizationOps(users.agent));
		const row = await db.applicationGrant.findUniqueOrThrow({ where: { id } });
		expect(row.endedAt).toBeInstanceOf(Date);
		expect(row.requestedById).toBeNull();
		const acts = await db.applicationGrantAct.findMany({
			where: { grantId: id },
			orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]
		});
		expect(acts.map((a) => a.kind)).toEqual(['REQUESTED', 'GRANTED', 'REVOKED']);
		expect(acts.filter((a) => a.byId === people.agent)).toEqual([]);
		expect(acts[1].byId).toBe(people.artist);
	});
});
