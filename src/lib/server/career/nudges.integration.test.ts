/**
 * Coups de pouce (P4-13a) sur la base de `.env`, schéma `e2e` : ils
 * s'appuient sur le réseau réel (gens avec qui l'on a joué, proches), jamais
 * sur des inconnu·es ni sur des personnes bloquées. Désactivé par défaut :
 *
 *   GEO_INTEGRATION=1 npx vitest --run src/lib/server/career/nudges
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createPrismaClient } from '../../../../prisma/client.js';
import dotenv from 'dotenv';
import { E2E_COMMUNES } from '#lib/geo/communes-e2e';

const enabled = process.env.GEO_INTEGRATION === '1';
const url = new URL(
	dotenv.config({ quiet: true }).parsed?.DATABASE_URL ??
		process.env.DATABASE_URL ??
		'postgresql://x/y'
);
url.searchParams.set('schema', 'e2e');
const db = createPrismaClient(url.toString());

vi.mock('#lib/server', () => ({ prisma: db }));

const { nudgesFor } = await import('./nudges');
const { setActorLocation } = await import('#lib/server/geo/queries');

const PREFIX = 'nudges-test-';
const DAY = 86_400_000;
const geo = { db, schema: 'e2e' };
const commune = (nom: string) => E2E_COMMUNES.find((c) => c.nom === nom)!;

type Spec = { key: string; name: string; commune: string; instrument?: string; tie?: boolean };

const PEOPLE: Spec[] = [
	{ key: 'moi', name: 'Moi Test', commune: 'Toulouse', instrument: 'guitare-electrique' },
	// Une chanteuse de mon réseau, à Muret : la bonne suggestion.
	{ key: 'lea', name: 'Léa Test', commune: 'Muret', instrument: 'chant', tie: true },
	// Un chanteur tout près, mais pas dans mon réseau.
	{ key: 'inconnu', name: 'Inconnu Test', commune: 'Blagnac', instrument: 'chant' },
	// Une chanteuse de mon réseau, mais à Paris.
	{ key: 'loin', name: 'Loin Test', commune: 'Paris', instrument: 'chant', tie: true },
	// Un ingé son de mon réseau qui fait de la prise de son.
	{ key: 'sam', name: 'Sam Test', commune: 'Blagnac', tie: true }
];

describe.skipIf(!enabled)('coups de pouce (schéma e2e)', () => {
	const ids: Record<string, string> = {};
	const noJams = async () => 0;

	const cleanup = async () => {
		await db.actor.deleteMany({ where: { handle: { startsWith: PREFIX } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
	};

	beforeAll(async () => {
		await cleanup();
		for (const spec of PEOPLE) {
			const user = await db.user.create({
				data: { email: `${PREFIX}${spec.key}@example.test`, referralCode: `${PREFIX}${spec.key}` }
			});
			const instrument = spec.instrument
				? await db.instrument.findUniqueOrThrow({ where: { slug: spec.instrument } })
				: null;
			const actor = await db.actor.create({
				data: {
					kind: 'PERSON',
					handle: PREFIX + spec.key,
					displayName: spec.name,
					// Arrivé·e il y a deux mois.
					createdAt: new Date(Date.now() - 60 * DAY),
					person: {
						create: {
							userId: user.id,
							termsAcceptedAt: new Date(),
							onboardedAt: new Date(),
							birthDate: new Date('1995-01-01'),
							...(instrument
								? {
										instruments: {
											create: { instrumentId: instrument.id, declaredLevel: 3, isPrimary: true }
										}
									}
								: {})
						}
					}
				}
			});
			ids[spec.key] = actor.id;
			await setActorLocation(actor.id, commune(spec.commune), geo);
		}
		await db.soundEngineerProfile.create({
			data: { personId: ids.sam, specialties: ['RECORDING', 'MIXING'] }
		});
		for (const spec of PEOPLE.filter((p) => p.tie)) {
			await db.musicalTie.create({ data: { ownerId: ids.moi, contactId: ids[spec.key] } });
		}
		const chant = await db.instrument.findUniqueOrThrow({ where: { slug: 'chant' } });
		await db.work.create({
			data: {
				ownerId: ids.moi,
				createdById: ids.moi,
				title: 'Lumière',
				roles: { create: { kind: 'INSTRUMENT', instrumentId: chant.id } }
			}
		});
		await db.work.create({
			data: {
				ownerId: ids.moi,
				createdById: ids.moi,
				title: 'Nuit',
				state: 'COMPOSED',
				proof: 'DECLARED',
				composedAt: new Date()
			}
		});
	}, 120_000);

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('propose la chanteuse proche de mon réseau, jamais l’inconnu ni la lointaine', async () => {
		const { nudges } = await nudgesFor(ids.moi, { geo, countJamsSoon: noJams });
		const role = nudges.find((n) => n.kind === 'OPEN_ROLE');
		expect(role?.title).toBe('« Lumière » attend : chant');
		expect(role?.text).toContain('Léa, de ton réseau, en joue');
		const all = JSON.stringify(nudges);
		expect(all).not.toContain('Inconnu');
		expect(all).not.toContain('Loin');
	});

	it('propose l’ingé son de mon réseau pour le morceau composé', async () => {
		const { nudges } = await nudgesFor(ids.moi, { geo, countJamsSoon: noJams });
		const record = nudges.find((n) => n.kind === 'TO_RECORD');
		expect(record?.title).toBe('« Nuit » est prêt à enregistrer');
		expect(record?.text).toContain('Sam, ingé son de ton réseau');
		expect(record?.href).toBe(`/@${PREFIX}sam`);
	});

	it('une personne bloquée disparaît des coups de pouce', async () => {
		await db.block.create({ data: { blockerActorId: ids.lea, blockedActorId: ids.moi } });
		const { nudges } = await nudgesFor(ids.moi, { geo, countJamsSoon: noJams });
		expect(nudges.some((n) => n.kind === 'OPEN_ROLE')).toBe(false);
		await db.block.deleteMany({ where: { blockerActorId: ids.lea } });
	});

	it('n’avance plus : sans événement récent ; un progrès récent fait taire l’entrée', async () => {
		expect((await nudgesFor(ids.moi, { geo, countJamsSoon: noJams })).stalled).toBe(true);
		const event = await db.domainEvent.create({
			data: { type: 'jam.attended', payload: {}, actorIds: [ids.moi] }
		});
		const fresh = await nudgesFor(ids.moi, { geo, countJamsSoon: noJams, onlyIfStalled: true });
		expect(fresh).toEqual({ stalled: false, nudges: [] });
		await db.domainEvent.delete({ where: { id: event.id } });
	});

	it('les jams de la semaine s’ajoutent, sans rien dire de l’XP', async () => {
		const { nudges } = await nudgesFor(ids.moi, { geo, countJamsSoon: async () => 2 });
		expect(nudges.map((n) => n.kind)).toEqual(['OPEN_ROLE', 'TO_RECORD', 'JAMS_SOON']);
		expect(JSON.stringify(nudges)).not.toMatch(/xp|niveau|palier|confiance/i);
	});
});
