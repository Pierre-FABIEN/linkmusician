/**
 * Recrutement d'un groupe (P3-03) sur la base de `.env`, schéma `e2e` : le
 * groupe publie « cherche un membre », la gestion est prévenue et tranche ;
 * accepter ouvre la conversation et fait entrer la candidate dans le groupe
 * (XP d'adhésion, formation). Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/opportunities
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createPrismaClient } from '../../../../prisma/client.js';
import dotenv from 'dotenv';
import { E2E_COMMUNES } from '#lib/geo/communes-e2e';

const enabled = process.env.PROGRESSION_INTEGRATION === '1';
const url = new URL(
	dotenv.config({ quiet: true }).parsed?.DATABASE_URL ??
		process.env.DATABASE_URL ??
		'postgresql://x/y'
);
url.searchParams.set('schema', 'e2e');
// Le SQL brut (villes, PostGIS) lit son schéma dans l'URL de connexion.
if (enabled) process.env.DATABASE_URL = url.toString();
const db = createPrismaClient(url.toString());

vi.mock('#lib/server', () => ({ prisma: db }));

const bands = await import('../bands/service');
const { createOpportunity, closeOpportunity, listMine } = await import('./service');
const { applyTo, decideApplication, listForIssuer } = await import('./applications');
const { setActorLocation } = await import('../geo/queries');

const PREFIX = 'recrut-test-';
const YEAR = 365.25 * 86_400_000;
const toulouse = E2E_COMMUNES.find((c) => c.nom === 'Toulouse')!;

describe.skipIf(!enabled)('recrutement d’un groupe (schéma e2e)', () => {
	const ids: Record<string, string> = {};
	let band = { id: '', handle: '' };
	let opportunityId = '';

	async function cleanup() {
		const actors = await db.actor.findMany({
			where: {
				OR: [
					{ handle: { startsWith: PREFIX } },
					{ person: { user: { email: { startsWith: PREFIX } } } }
				]
			},
			select: { id: true }
		});
		const list = actors.map((a) => a.id);
		await db.conversation.deleteMany({
			where: { participants: { some: { actorId: { in: list } } } }
		});
		await db.actor.deleteMany({ where: { id: { in: list } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
		if (list.length > 0) {
			await db.domainEvent.deleteMany({ where: { actorIds: { hasSome: list } } });
		}
	}

	const form = {
		kind: 'RECRUIT_MEMBER' as const,
		title: 'Les Rats cherchent une batteuse',
		description: 'Rock garage, deux répètes par semaine à Toulouse.',
		instrument: 'batterie',
		radiusKm: 25,
		durationDays: 14,
		slots: 1
	};

	beforeAll(async () => {
		await cleanup();
		const drums = await db.instrument.findUniqueOrThrow({ where: { slug: 'batterie' } });
		for (const name of ['lea', 'malik', 'nina', 'theo']) {
			const user = await db.user.create({
				data: { email: `${PREFIX}${name}@example.test`, referralCode: `${PREFIX}${name}` }
			});
			ids[name] = (
				await db.actor.create({
					data: {
						kind: 'PERSON',
						handle: PREFIX + name,
						displayName: name,
						trustLevel: 1,
						person: {
							create: {
								userId: user.id,
								termsAcceptedAt: new Date(),
								onboardedAt: new Date(),
								birthDate: new Date(Date.now() - 30 * YEAR),
								// Nina joue de la batterie : elle remplit la condition.
								...(name === 'nina'
									? {
											instruments: {
												create: { instrumentId: drums.id, declaredLevel: 3, isPrimary: true }
											}
										}
									: {})
							}
						}
					}
				})
			).id;
		}
		band = await bands.createBand(ids.lea, { name: `${PREFIX}Les Rats`, title: 'guitare' });
		// Malik est en co-gestion, Théo simple membre.
		for (const who of ['malik', 'theo']) {
			await bands.inviteToBand(band.id, ids.lea, { handle: PREFIX + who, title: null });
			const row = await db.membership.findFirstOrThrow({
				where: { orgId: band.id, personId: ids[who], status: 'INVITED' }
			});
			await bands.answerInvite(row.id, ids[who], true);
		}
		const malik = await db.membership.findFirstOrThrow({
			where: { orgId: band.id, personId: ids.malik, status: 'ACTIVE' }
		});
		await bands.setRole(malik.id, ids.lea, 'ADMIN');
	}, 120_000);

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('au nom du groupe : recrutement seulement, gestion seulement, ville du groupe exigée', async () => {
		await expect(createOpportunity(ids.lea, form, new Date(), band.id)).rejects.toThrow(
			/ville du groupe/
		);
		await setActorLocation(band.id, toulouse, { db, schema: 'e2e' });
		await expect(
			createOpportunity(ids.lea, { ...form, kind: 'SESSION_WORK' }, new Date(), band.id)
		).rejects.toThrow(/seulement un recrutement/);
		await expect(createOpportunity(ids.theo, form, new Date(), band.id)).rejects.toThrow(
			/gèrent le groupe/
		);
		opportunityId = (await createOpportunity(ids.lea, form, new Date(), band.id)).id;
		const row = await db.opportunity.findUniqueOrThrow({ where: { id: opportunityId } });
		expect(row).toMatchObject({ issuerActorId: band.id, postedById: ids.lea });
		// Toute la gestion la retrouve dans « Mes annonces ».
		expect((await listMine(ids.malik)).map((o) => o.band)).toEqual([`${PREFIX}Les Rats`]);
	}, 60_000);

	it('un membre ne postule pas à son propre groupe ; la gestion est prévenue d’une candidature', async () => {
		await expect(
			applyTo(ids.theo, opportunityId, 'Je suis déjà là mais je veux jouer de la batterie.')
		).rejects.toThrow(/déjà partie de ce groupe/);
		await applyTo(ids.nina, opportunityId, 'Batteuse rock, dispo deux soirs par semaine.');
		for (const manager of [ids.lea, ids.malik]) {
			expect(
				await db.notification.count({
					where: { recipientActorId: manager, type: 'APPLICATION_RECEIVED' }
				})
			).toBe(1);
		}
		expect(await listForIssuer(ids.theo, opportunityId)).toEqual([]);
		expect(await listForIssuer(ids.malik, opportunityId)).toHaveLength(1);
	}, 60_000);

	it('accepter fait entrer Nina dans le groupe, avec la conversation et l’XP d’adhésion', async () => {
		const [app] = await listForIssuer(ids.malik, opportunityId);
		await expect(decideApplication(ids.theo, app.id, 'accept')).rejects.toThrow(/introuvable/);
		const { conversationId, joinedBand } = await decideApplication(ids.malik, app.id, 'accept');
		expect(joinedBand).toBe(true);

		const membership = await db.membership.findFirstOrThrow({
			where: { orgId: band.id, personId: ids.nina, status: 'ACTIVE' }
		});
		expect(membership.title).toBe('batterie');
		const xp = await db.xpTransaction.aggregate({
			where: { actorId: ids.nina, ruleId: 'membership.accepted' },
			_sum: { amount: true }
		});
		expect(xp._sum.amount).toBe(200);
		// La conversation relie Nina à Malik, qui a accepté.
		const participants = await db.conversationParticipant.findMany({
			where: { conversationId: conversationId! },
			select: { actorId: true }
		});
		expect(participants.map((p) => p.actorId).sort()).toEqual([ids.malik, ids.nina].sort());
		const o = await db.opportunity.findUniqueOrThrow({ where: { id: opportunityId } });
		expect(o.status).toBe('FILLED');
		expect(
			await db.notification.count({ where: { recipientActorId: ids.lea, type: 'BAND_JOINED' } })
		).toBeGreaterThanOrEqual(1);
	}, 60_000);

	it('la gestion clôture une annonce du groupe, pas un simple membre', async () => {
		const second = (
			await createOpportunity(
				ids.malik,
				{ ...form, title: 'Les Rats cherchent un chanteur' },
				new Date(),
				band.id
			)
		).id;
		await expect(closeOpportunity(ids.theo, second)).rejects.toThrow(/plus ouverte/);
		await closeOpportunity(ids.lea, second);
		expect((await db.opportunity.findUniqueOrThrow({ where: { id: second } })).status).toBe(
			'CLOSED'
		);
	}, 60_000);
});
