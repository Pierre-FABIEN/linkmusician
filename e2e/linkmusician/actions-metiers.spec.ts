import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import {
	createMusician,
	createOpportunity,
	deleteMusicians,
	skipOnboarding
} from '../support/linkmusician';
import { db, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { TRACKS } from '../../src/lib/actors/tracks';
import { E2E_COMMUNES } from '../../src/lib/geo/communes-e2e';

/** DASH-03 : lectures réelles, sans mutation des demandes depuis l'accueil. */
test('priorités multirôles : vides, données, permissions, blocage et âge', async ({
	page,
	account
}, testInfo) => {
	test.setTimeout(7 * 60_000);
	await signUpAndVerify(page, account);
	await skipOnboarding(page, account.email);
	const person = await db.person.findUniqueOrThrow({
		where: { userId: (await requireUser(account.email)).id }
	});
	await db.person.update({
		where: { actorId: person.actorId },
		data: { birthDate: new Date('1990-01-01') }
	});
	const tracks = [
		'MUSICIAN',
		'SOUND_ENGINEER',
		'PRODUCER',
		'PROMOTER',
		'MANAGER',
		'BOOKER'
	] as const;
	await db.personTrack.createMany({
		data: tracks.slice(1).map((track) => ({ personId: person.actorId, track }))
	});
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/espace');
	await waitForAppReady(page);
	const cookieNotice = page.getByRole('button', { name: 'Compris', exact: true });
	if (await cookieNotice.isVisible()) await cookieNotice.click();
	const section = page.getByRole('region', { name: 'Actions prioritaires' });
	const tile = (title: string) => section.getByRole('link', { name: new RegExp(`^${title}`) });
	// DASH-01 (5e7f982) : sélecteur « Rôle » compact, envoyé dès le changement.
	const selector = page.getByLabel('Rôle', { exact: true });
	const switchTo = async (track: (typeof tracks)[number]) => {
		if ((await selector.inputValue()) !== track)
			await Promise.all([
				page.waitForResponse(
					(response) =>
						response.request().method() === 'POST' && new URL(response.url()).pathname === '/jouer'
				),
				selector.selectOption(track)
			]);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(
			track === 'MUSICIAN' ? /^Salut/ : TRACKS[track].label
		);
		await waitForAppReady(page);
		await expect(selector).toHaveValue(track);
	};
	await test.step('six espaces vides : explication et liens utilisables', async () => {
		for (const track of tracks) {
			await switchTo(track);
			await expect(section.getByRole('link')).toHaveCount(4);
			await expect(section.getByText(/Aucune/)).toHaveCount(4);
			await expect(section.getByText(/dans l’aperçu$/, { exact: false })).toHaveCount(0);
		}
		await expectNoA11yViolations(page, ['.cartButton']);
	});
	const peers: Awaited<ReturnType<typeof createMusician>>[] = [];
	let orgId = '';
	try {
		peers.push(
			await createMusician({
				name: 'Demande',
				commune: {
					code: E2E_COMMUNES[0].code,
					nom: E2E_COMMUNES[0].nom,
					dep: E2E_COMMUNES[0].codeDepartement,
					...E2E_COMMUNES[0].centre
				}
			})
		);
		peers.push(
			await createMusician({
				name: 'Collaboration',
				commune: {
					code: E2E_COMMUNES[0].code,
					nom: E2E_COMMUNES[0].nom,
					dep: E2E_COMMUNES[0].codeDepartement,
					...E2E_COMMUNES[0].centre
				}
			})
		);
		const [requester, partner] = peers;
		const now = new Date();
		const later = new Date(now.getTime() + 7 * 86_400_000);
		const conversation = async (other: string, state: 'REQUEST' | 'ACCEPTED') =>
			db.conversation.create({
				data: {
					pairKey: [person.actorId, other].sort().join(':'),
					initiatorId: other,
					participants: {
						create: [
							{ actorId: other, state: 'ACCEPTED' },
							{ actorId: person.actorId, state }
						]
					}
				}
			});
		const request = await conversation(requester.actorId, 'REQUEST');
		const accepted = await conversation(partner.actorId, 'ACCEPTED');
		await db.collaboration.create({
			data: {
				kind: 'RECORDING',
				title: 'À confirmer pour de vrai',
				proposedById: partner.actorId,
				happenedOn: now,
				conversationId: accepted.id,
				participants: {
					create: [{ actorId: partner.actorId, acceptedAt: now }, { actorId: person.actorId }]
				}
			}
		});
		await db.collaboration.create({
			data: {
				kind: 'RECORDING',
				status: 'ACCEPTED',
				title: 'Session prévue',
				proposedById: partner.actorId,
				happenedOn: later,
				conversationId: accepted.id,
				participants: {
					create: [
						{ actorId: partner.actorId, acceptedAt: now },
						{ actorId: person.actorId, acceptedAt: now }
					]
				}
			}
		});
		const own = await createOpportunity(person.actorId, {
			title: 'Mon annonce',
			kind: 'SESSION_WORK'
		});
		const foreign = await createOpportunity(partner.actorId, {
			title: 'Annonce étrangère',
			kind: 'SESSION_WORK'
		});
		const org = await db.actor.create({
			data: {
				kind: 'ORGANIZATION',
				handle: `dash03-${person.actorId}`,
				displayName: 'Structure test',
				organization: { create: { kind: 'BAND' } }
			}
		});
		orgId = org.id;
		const membership = await db.membership.create({
			data: { orgId, personId: person.actorId, role: 'OWNER', status: 'ACTIVE' }
		});
		const groupAd = await createOpportunity(orgId, {
			title: 'Annonce gérée',
			kind: 'SESSION_WORK'
		});
		await db.application.createMany({
			data: [own, foreign, groupAd].map((o) => ({
				opportunityId: o.id,
				applicantActorId: requester.actorId,
				message: 'Une vraie candidature en base.'
			}))
		});

		await test.step('les six métiers lisent les faits partagés sans les modifier', async () => {
			for (const track of tracks) {
				await switchTo(track);
				await expect(tile('Candidatures reçues')).toContainText('2 dans l’aperçu');
				await expect(tile('Demandes de contact')).toContainText('1 dans l’aperçu');
				await expect(tile('À traiter')).toContainText('1 dans l’aperçu');
				await expect(tile('Agenda')).not.toContainText('Aucune collaboration prévue');
			}
			expect(await db.application.count({ where: { opportunityId: own.id, status: 'SENT' } })).toBe(
				1
			);
			expect(
				(
					await db.conversationParticipant.findUniqueOrThrow({
						where: {
							conversationId_actorId: { conversationId: request.id, actorId: person.actorId }
						}
					})
				).state
			).toBe('REQUEST');
			await expectNoA11yViolations(page, ['.cartButton']);
			expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
				true
			);
			await waitForAppReady(page);
			await testInfo.attach('priorités-mobile', {
				body: await page.screenshot(),
				contentType: 'image/png'
			});
			await section.getByRole('link').first().focus();
			await page.keyboard.press('Tab');
			await expect(section.getByRole('link').nth(1)).toBeFocused();
			await tile('Demandes de contact').focus();
			await expect(tile('Demandes de contact')).toBeFocused();
			await page.keyboard.press('Enter');
			await expect(page).toHaveURL(/\/messages$/);
			await page.goto('/espace');
		});
		await test.step('le contexte ne donne aucun droit sur une structure', async () => {
			await db.membership.update({ where: { id: membership.id }, data: { role: 'MEMBER' } });
			await page.reload();
			await expect(tile('Candidatures reçues')).toContainText('1 dans l’aperçu');
			await db.membership.update({
				where: { id: membership.id },
				data: { role: 'ADMIN', status: 'LEFT' }
			});
			await page.reload();
			await expect(tile('Candidatures reçues')).toContainText('1 dans l’aperçu');
		});
		await test.step('blocages dans les deux sens, visibilité et âge', async () => {
			for (const reverse of [false, true]) {
				await db.block.create({
					data: {
						blockerActorId: reverse ? person.actorId : partner.actorId,
						blockedActorId: reverse ? partner.actorId : person.actorId
					}
				});
				await page.reload();
				await expect(tile('À traiter')).toContainText('Aucune demande');
				await expect(tile('Agenda')).toContainText('Aucune collaboration prévue');
				await db.block.deleteMany({
					where: { OR: [{ blockerActorId: partner.actorId }, { blockedActorId: partner.actorId }] }
				});
			}
			await db.actor.update({ where: { id: requester.actorId }, data: { hidden: true } });
			await page.reload();
			await expect(tile('Demandes de contact')).toContainText('Aucune demande');
			await expect(tile('Candidatures reçues')).toContainText('Aucune candidature');
			await db.actor.update({ where: { id: requester.actorId }, data: { hidden: false } });
			await db.person.update({
				where: { actorId: person.actorId },
				data: { birthDate: new Date(`${new Date().getFullYear() - 17}-01-01`) }
			});
			await page.reload();
			await expect(tile('Demandes de contact')).toContainText('réservées aux adultes');
			await expect(tile('Demandes de contact')).not.toContainText('1 dans l’aperçu');
		});
		await page.setViewportSize({ width: 1280, height: 900 });
		await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
		await expectNoA11yViolations(page, ['.cartButton']);
		await waitForAppReady(page);
		await testInfo.attach('priorités-bureau', {
			body: await page.screenshot(),
			contentType: 'image/png'
		});
	} finally {
		if (orgId) await db.actor.deleteMany({ where: { id: orgId } });
		await deleteMusicians(peers);
	}
});
