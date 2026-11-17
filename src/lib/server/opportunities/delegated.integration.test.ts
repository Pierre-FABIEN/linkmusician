/** DASH-07b : règles réelles sur PostgreSQL e2e, sans simuler les permissions. */
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
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
const db = createPrismaClient(url.toString());
vi.mock('#lib/server', () => ({ prisma: db }));
const { applyDelegated, delegatedOptions, delegatedApplicationsFor } = await import('./delegated');
const { applyTo, withdrawApplication, decideApplication, listMyApplications } =
	await import('./applications');
const { endGrant, requestGrant, answerGrant } = await import('../representation/applicationGrants');
const { setActorLocation } = await import('../geo/queries');
const { E2E_COMMUNES } = await import('#lib/geo/communes-e2e');
const { sendMessage } = await import('../messaging/service');
const { exportPersonData, personAnonymizationOps } = await import('#lib/prisma/actors/person');
const { createBand } = await import('../bands/service');
const prefix = 'delegated-test-';
const ids: Record<string, string> = {},
	users: Record<string, string> = {};
const text = 'Un projet musical avec un répertoire prêt, disponible pour cette proposition.';
let band = '',
	opportunity = '',
	grant = '',
	representation = '';
const day = 86400000;
async function cleanup() {
	await db.actor.deleteMany({ where: { handle: { startsWith: prefix } } });
	await db.user.deleteMany({ where: { email: { startsWith: prefix } } });
}
async function right(artist = ids.artist, kinds: string[] = ['SESSION_WORK']) {
	const rep = await db.representation.create({
		data: {
			agentId: ids.agent,
			artistId: artist,
			kind: 'MANAGER',
			status: 'CONFIRMED',
			confirmedAt: new Date(),
			allowedActions: ['CAREER_SUPPORT']
		}
	});
	representation = rep.id;
	const g = await requestGrant(ids.agent, {
		representationId: rep.id,
		kinds,
		expiresOn: new Date(Date.now() + 30 * day).toISOString().slice(0, 10)
	});
	await answerGrant(g, artist === band ? ids.admin : ids.artist, true);
	grant = g;
}
describe.skipIf(!enabled)('candidatures déléguées (e2e)', { timeout: 90_000 }, () => {
	beforeAll(async () => {
		await cleanup();
		for (const name of ['agent', 'artist', 'issuer', 'admin', 'outsider']) {
			const u = await db.user.create({
				data: { email: `${prefix}${name}@example.test`, referralCode: prefix + name }
			});
			users[name] = u.id;
			ids[name] = (
				await db.actor.create({
					data: {
						kind: 'PERSON',
						handle: prefix + name,
						displayName: name,
						person: {
							create: {
								userId: u.id,
								birthDate: new Date('1990-01-01'),
								termsAcceptedAt: new Date(),
								tracks: {
									create: { track: name === 'agent' ? 'MANAGER' : 'MUSICIAN', isPrimary: true }
								}
							}
						}
					}
				})
			).id;
		}
		band = (await createBand(ids.admin, { name: prefix + 'groupe', title: 'guitare' })).id;
	}, 90_000);
	beforeEach(async () => {
		await db.opportunity.deleteMany({ where: { issuerActorId: ids.issuer } });
		await db.representation.deleteMany({ where: { agentId: ids.agent } });
		await db.block.deleteMany({
			where: {
				OR: [
					{ blockerActorId: { in: Object.values(ids) } },
					{ blockedActorId: { in: Object.values(ids) } }
				]
			}
		});
		await db.actor.update({ where: { id: ids.artist }, data: { hidden: false } });
		await db.person.update({
			where: { actorId: ids.artist },
			data: { birthDate: new Date('1990-01-01') }
		});
		opportunity = (
			await db.opportunity.create({
				data: {
					issuerActorId: ids.issuer,
					kind: 'SESSION_WORK',
					title: 'Session déléguée',
					description: text,
					expiresAt: new Date(Date.now() + day),
					slots: 5
				}
			})
		).id;
		await right();
	}, 90_000);
	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});
	it('envoie pour l’artiste, acte USED, notification et liste privée ; le tiers ne voit rien', async () => {
		expect((await delegatedOptions(ids.agent, opportunity)).map((x) => x.id)).toContain(ids.artist);
		const app = await applyDelegated(ids.agent, opportunity, ids.artist, text);
		expect(await db.application.findUnique({ where: { id: app.id } })).toMatchObject({
			applicantActorId: ids.artist,
			sentById: ids.agent,
			delegated: true
		});
		expect(
			await db.applicationGrantAct.count({
				where: { grantId: grant, kind: 'USED', applicationId: app.id, byId: ids.agent }
			})
		).toBe(1);
		expect(
			await db.notification.count({
				where: {
					recipientActorId: ids.artist,
					type: 'APPLICATION_SENT',
					href: `/annonces/${opportunity}`
				}
			})
		).toBe(1);
		expect(await delegatedApplicationsFor(ids.outsider, opportunity)).toEqual([]);
		expect((await listMyApplications(ids.artist))[0].sender).toBe('agent');
	});
	it('mandat seul, tiers et droit révoqué refusés, sans candidature ni acte USED', async () => {
		await expect(applyDelegated(ids.outsider, opportunity, ids.artist, text)).rejects.toMatchObject(
			{ status: 403 }
		);
		await endGrant(grant, ids.artist);
		await expect(applyDelegated(ids.agent, opportunity, ids.artist, text)).rejects.toMatchObject({
			status: 403
		});
		expect(await db.application.count({ where: { opportunityId: opportunity } })).toBe(0);
		expect(await db.applicationGrantAct.count({ where: { grantId: grant, kind: 'USED' } })).toBe(0);
	});
	it('échéance, fin du mandat et type hors périmètre refusés', async () => {
		await db.applicationGrant.update({
			where: { id: grant },
			data: { expiresAt: new Date(Date.now() - day) }
		});
		await expect(applyDelegated(ids.agent, opportunity, ids.artist, text)).rejects.toMatchObject({
			status: 403
		});
		await db.applicationGrant.update({
			where: { id: grant },
			data: { expiresAt: new Date(Date.now() + day) }
		});
		await db.opportunity.update({ where: { id: opportunity }, data: { kind: 'JAM' } });
		await expect(applyDelegated(ids.agent, opportunity, ids.artist, text)).rejects.toMatchObject({
			status: 403
		});
		await db.opportunity.update({ where: { id: opportunity }, data: { kind: 'SESSION_WORK' } });
		await db.representation.update({
			where: { id: representation },
			data: { status: 'ENDED', endedAt: new Date() }
		});
		await expect(applyDelegated(ids.agent, opportunity, ids.artist, text)).rejects.toMatchObject({
			status: 403
		});
	});
	it('mineur, recrutement et territoire inconnu dans un mandat limité refusés', async () => {
		await db.person.update({
			where: { actorId: ids.artist },
			data: { birthDate: new Date('2011-01-01') }
		});
		await expect(applyDelegated(ids.agent, opportunity, ids.artist, text)).rejects.toMatchObject({
			status: 403
		});
		await db.person.update({
			where: { actorId: ids.artist },
			data: { birthDate: new Date('1990-01-01') }
		});
		await db.opportunity.update({ where: { id: opportunity }, data: { kind: 'RECRUIT_MEMBER' } });
		await expect(applyDelegated(ids.agent, opportunity, ids.artist, text)).rejects.toMatchObject({
			status: 403
		});
		await db.opportunity.update({ where: { id: opportunity }, data: { kind: 'SESSION_WORK' } });
		await db.representation.update({
			where: { id: representation },
			data: { departmentCodes: ['31'] }
		});
		await expect(applyDelegated(ids.agent, opportunity, ids.artist, text)).rejects.toMatchObject({
			status: 403
		});
	});
	it('blocages de l’émetteur avec l’agent ou l’artiste, profil masqué et conditions artiste respectés', async () => {
		for (const blockedActorId of [ids.agent, ids.artist]) {
			await db.block.create({ data: { blockerActorId: ids.issuer, blockedActorId } });
			await expect(applyDelegated(ids.agent, opportunity, ids.artist, text)).rejects.toMatchObject({
				status: 404
			});
			await db.block.deleteMany({ where: { blockerActorId: ids.issuer } });
		}
		await db.actor.update({ where: { id: ids.artist }, data: { hidden: true } });
		await expect(applyDelegated(ids.agent, opportunity, ids.artist, text)).rejects.toMatchObject({
			status: 403
		});
		await db.actor.update({ where: { id: ids.artist }, data: { hidden: false } });
		await db.opportunity.update({
			where: { id: opportunity },
			data: { targetTrack: 'SOUND_ENGINEER', targetSpecialty: 'RECORDING' }
		});
		await expect(applyDelegated(ids.agent, opportunity, ids.artist, text)).rejects.toThrow(
			/ne peut pas candidater/
		);
	});
	it('l’artiste et l’agent ne peuvent pas candidater deux fois, même simultanément', async () => {
		const results = await Promise.allSettled([
			applyDelegated(ids.agent, opportunity, ids.artist, text),
			applyTo(ids.artist, opportunity, text)
		]);
		expect(results.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
		expect(
			await db.application.count({
				where: { opportunityId: opportunity, applicantActorId: ids.artist }
			})
		).toBe(1);
	});
	it('la révocation validée pendant l’attente interdit l’envoi', async () => {
		let release!: () => void, ready!: () => void;
		const gate = new Promise<void>((r) => {
			release = r;
		});
		const acquired = new Promise<void>((r) => {
			ready = r;
		});
		const holding = db.$transaction(
			async (tx) => {
				await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`band:${ids.artist}`}))`;
				// Révocation dans la transaction qui détient réellement le verrou.
				await tx.applicationGrant.update({
					where: { id: grant },
					data: { endedAt: new Date(), endedById: ids.artist }
				});
				await tx.applicationGrantAct.create({
					data: { grantId: grant, kind: 'REVOKED', byId: ids.artist }
				});
				ready();
				await gate;
			},
			{ timeout: 15000 }
		);
		await acquired;
		const pending = applyDelegated(ids.agent, opportunity, ids.artist, text).then(
			() => null,
			(e) => e
		);
		try {
			await vi.waitFor(
				async () => {
					const rows = await db.$queryRaw<
						{ count: bigint }[]
					>`SELECT count(*) FROM pg_locks WHERE locktype = 'advisory' AND NOT granted AND objid = hashtext(${`band:${ids.artist}`})::oid`;
					expect(Number(rows[0].count)).toBeGreaterThan(0);
				},
				{ timeout: 8000, interval: 50 }
			);
		} finally {
			release();
			await holding;
		}
		expect(await pending).toMatchObject({ status: 403 });
		expect(await db.application.count({ where: { opportunityId: opportunity } })).toBe(0);
	});
	it('révoquer après envoi conserve la candidature, retirable par l’artiste avec auteur et sans acceptation tardive', async () => {
		const app = await applyDelegated(ids.agent, opportunity, ids.artist, text);
		await endGrant(grant, ids.artist);
		await expect(withdrawApplication(ids.outsider, app.id)).rejects.toMatchObject({ status: 403 });
		await withdrawApplication(ids.artist, app.id);
		expect(await db.application.findUnique({ where: { id: app.id } })).toMatchObject({
			status: 'WITHDRAWN',
			withdrawnById: ids.artist,
			sentById: ids.agent
		});
		await expect(decideApplication(ids.issuer, app.id, 'accept')).rejects.toThrow(/déjà tranchée/);
	});
	it('groupe : droit GIG_SLOT, vue et retrait par sa gestion', async () => {
		await right(band, ['GIG_SLOT']);
		const commune = E2E_COMMUNES.find((c) => c.nom === 'Toulouse')!;
		await setActorLocation(band, commune, { db, schema: 'e2e' });
		await setActorLocation(ids.issuer, commune, { db, schema: 'e2e' });
		await db.opportunity.update({ where: { id: opportunity }, data: { kind: 'GIG_SLOT' } });
		const app = await applyDelegated(ids.agent, opportunity, band, text);
		expect((await delegatedApplicationsFor(ids.admin, opportunity))[0].id).toBe(app.id);
		await withdrawApplication(ids.admin, app.id);
		expect(await db.application.findUnique({ where: { id: app.id } })).toMatchObject({
			withdrawnById: ids.admin
		});
	});

	it('un blocage de l’artiste après envoi interdit aussi l’acceptation par l’agent', async () => {
		const app = await applyDelegated(ids.agent, opportunity, ids.artist, text);
		await db.block.create({ data: { blockerActorId: ids.artist, blockedActorId: ids.issuer } });
		await expect(decideApplication(ids.issuer, app.id, 'accept')).rejects.toThrow(
			/Impossible d’accepter/
		);
		expect(await db.application.findUnique({ where: { id: app.id } })).toMatchObject({
			status: 'SENT',
			conversationId: null
		});
	});
	it.each([false, true])(
		'acceptation (conversation réutilisée : %s) : agent, notification et aucune XP',
		async (reuse) => {
			if (reuse) {
				await db.conversation.updateMany({
					where: { participants: { some: { actorId: ids.agent } } },
					data: { delegated: false, reciprocatedAt: null }
				});
			}
			const app = await applyDelegated(ids.agent, opportunity, ids.artist, text);
			const { conversationId } = await decideApplication(ids.issuer, app.id, 'accept');
			expect(
				await db.conversation.findUnique({
					where: { id: conversationId! },
					include: { participants: true }
				})
			).toMatchObject({
				delegated: true,
				participants: expect.arrayContaining([
					expect.objectContaining({ actorId: ids.agent }),
					expect.objectContaining({ actorId: ids.issuer })
				])
			});
			const before = await db.xpTransaction.count({
				where: { actorId: { in: Object.values(ids) } }
			});
			await sendMessage(
				ids.issuer,
				conversationId!,
				'Merci pour la proposition, discutons des conditions.'
			);
			expect(await db.xpTransaction.count({ where: { actorId: { in: Object.values(ids) } } })).toBe(
				before
			);
			expect(
				await db.domainEvent.count({
					where: { type: 'conversation.reciprocated', actorIds: { has: ids.agent } }
				})
			).toBe(0);
			expect(
				await db.notification.count({
					where: {
						recipientActorId: ids.artist,
						type: 'APPLICATION_ACCEPTED',
						href: `/annonces/${opportunity}`
					}
				})
			).toBe(1);
			expect((await listMyApplications(ids.artist))[0].conversationId).toBeNull();
		}
	);
	it('RGPD : envois et retraits exportés, auteur oublié et marque déléguée conservée', async () => {
		const app = await applyDelegated(ids.agent, opportunity, ids.artist, text);
		await withdrawApplication(ids.agent, app.id);
		const exported = await exportPersonData(users.agent);
		expect(exported?.retraits_de_candidatures).toEqual(
			expect.arrayContaining([expect.objectContaining({ candidature: app.id })])
		);
		expect(exported?.candidatures_au_nom_d_un_groupe).toEqual(
			expect.arrayContaining([expect.objectContaining({ deleguee: true })])
		);
		await db.$transaction(await personAnonymizationOps(users.agent));
		expect(await db.application.findUnique({ where: { id: app.id } })).toMatchObject({
			sentById: null,
			withdrawnById: null,
			delegated: true
		});
	});
});
