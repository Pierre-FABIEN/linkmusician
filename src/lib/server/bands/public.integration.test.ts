/**
 * Page publique d'un groupe (P3-02) sur la base de `.env`, schéma `e2e` :
 * effectif actuel et passé avec leurs dates, mineure anonyme pour un
 * visiteur, profil masqué anonyme, aucune donnée interne dans la réponse,
 * groupe formé indexable. Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/bands
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

const enabled = process.env.PROGRESSION_INTEGRATION === '1';
const url = new URL(
	dotenv.config({ quiet: true }).parsed?.DATABASE_URL ??
		process.env.DATABASE_URL ??
		'postgresql://x/y'
);
url.searchParams.set('schema', 'e2e');
const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });

vi.mock('#lib/server', () => ({ prisma: db }));

const service = await import('./service');
const { getPublicBand, bandsOfPerson, indexableBands } = await import('./public');

const PREFIX = 'bandpub-test-';
const YEAR = 365.25 * 86_400_000;

describe.skipIf(!enabled)('page publique d’un groupe (schéma e2e)', () => {
	const ids: Record<string, string> = {};
	let band = { id: '', handle: '' };

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
		await db.actor.deleteMany({ where: { id: { in: list } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
		if (list.length > 0)
			await db.domainEvent.deleteMany({ where: { actorIds: { hasSome: list } } });
	}

	const invite = async (who: string) => {
		await service.inviteToBand(band.id, ids.lea, {
			handle: PREFIX + who,
			title: who === 'zoe' ? 'chant' : 'batterie'
		});
		const row = await db.membership.findFirstOrThrow({
			where: { orgId: band.id, personId: ids[who], status: 'INVITED' }
		});
		await service.answerInvite(row.id, ids[who], true);
	};

	beforeAll(async () => {
		await cleanup();
		for (const [name, age] of [
			['lea', 30],
			['malik', 28],
			['zoe', 17],
			['sam', 40],
			['visiteur', 33]
		] as const) {
			const user = await db.user.create({
				data: { email: `${PREFIX}${name}@example.test`, referralCode: `${PREFIX}${name}` }
			});
			ids[name] = (
				await db.actor.create({
					data: {
						kind: 'PERSON',
						handle: PREFIX + name,
						displayName: name,
						person: {
							create: {
								userId: user.id,
								termsAcceptedAt: new Date(),
								onboardedAt: new Date(),
								birthDate: new Date(Date.now() - age * YEAR)
							}
						}
					}
				})
			).id;
		}
		band = await service.createBand(ids.lea, { name: `${PREFIX}Les Rats`, title: 'guitare' });
		await invite('malik');
		await service.leaveBand(band.id, ids.malik);
		// La mineure connaît Léa : elles ont une conversation acceptée.
		await db.conversation.create({
			data: {
				pairKey: [ids.lea, ids.zoe].sort().join(':'),
				initiatorId: ids.lea,
				participants: {
					create: [
						{ actorId: ids.lea, state: 'ACCEPTED' },
						{ actorId: ids.zoe, state: 'ACCEPTED' }
					]
				}
			}
		});
		await invite('zoe');
		await invite('sam');
		await db.actor.update({ where: { id: ids.sam }, data: { hidden: true } });
	}, 120_000);

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('effectif actuel et passé, avec leurs dates', async () => {
		const page = (await getPublicBand(band.handle, new Date(), ids.visiteur))!;
		expect(page.formedAt).not.toBeNull();
		expect(page.indexable).toBe(true);
		expect(page.members.map((m) => m.name)).toEqual(['lea', 'zoe', 'Un·e musicien·ne']);
		expect(page.past).toHaveLength(1);
		expect(page.past[0]).toMatchObject({
			name: 'malik',
			handle: PREFIX + 'malik',
			title: 'batterie'
		});
		expect(page.past[0].startedAt).not.toBeNull();
		expect(page.past[0].endedAt).not.toBeNull();
	});

	it('un visiteur ne voit pas le nom de la mineure ; elle n’est pas dans les données structurées', async () => {
		const page = (await getPublicBand(band.handle, new Date(), null))!;
		const zoe = page.members[1];
		expect(zoe).toMatchObject({
			name: 'Un·e musicien·ne',
			handle: null,
			title: 'chant',
			listed: false
		});
		expect(page.members.filter((m) => m.listed).map((m) => m.name)).toEqual(['lea']);
	});

	it('aucune donnée interne dans la réponse', async () => {
		const json = JSON.stringify(await getPublicBand(band.handle, new Date(), ids.visiteur));
		for (const secret of ['birthDate', 'trustLevel', 'xp', ids.lea, ids.zoe, ids.malik]) {
			expect(json).not.toContain(secret);
		}
	});

	it('sur le profil de Léa, ses groupes ; le groupe est dans le sitemap', async () => {
		expect((await bandsOfPerson(ids.lea)).map((b) => b.handle)).toEqual([band.handle]);
		expect((await indexableBands()).map((b) => b.handle)).toContain(band.handle);
	});

	it('la gestion modifie la fiche ; un membre ne peut pas', async () => {
		const rock = await db.genre.findUniqueOrThrow({ where: { slug: 'rock' } });
		await expect(
			service.updateBandProfile(band.id, ids.zoe, {
				name: 'X',
				bio: null,
				genreIds: [],
				commune: null
			})
		).rejects.toThrow(/gèrent/);
		await service.updateBandProfile(band.id, ids.lea, {
			name: `${PREFIX}Les Rats`,
			bio: 'Rock garage.',
			genreIds: [rock.id],
			commune: null
		});
		const page = (await getPublicBand(band.handle, new Date(), null))!;
		expect(page).toMatchObject({ bio: 'Rock garage.', genres: ['Rock'] });
		// Sans genre : accepté (facultatif pour un groupe).
		await service.updateBandProfile(band.id, ids.lea, {
			name: `${PREFIX}Les Rats`,
			bio: null,
			genreIds: [],
			commune: null
		});
		expect((await getPublicBand(band.handle, new Date(), null))!.genres).toEqual([]);
	}, 60_000);
});
