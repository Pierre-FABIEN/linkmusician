import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { makeAccount } from '../support/account';
import { db, requireUser, deleteUser } from '../support/db';
import { skipOnboarding } from '../support/linkmusician';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';

/** D71 : envoi direct par l’agent autorisé, notification, vue et retrait artiste. */
test('candidature déléguée : mobile, clavier, faux droit refusé et retrait artiste', async ({
	page,
	account,
	browser
}) => {
	test.setTimeout(6 * 60_000);
	const artistAccount = makeAccount(),
		issuerAccount = makeAccount();
	const artistContext = await browser.newContext(),
		issuerContext = await browser.newContext();
	const artistPage = await artistContext.newPage(),
		issuerPage = await issuerContext.newPage();
	let opportunity = '';
	try {
		for (const [p, a] of [
			[page, account],
			[artistPage, artistAccount],
			[issuerPage, issuerAccount]
		] as const) {
			await signUpAndVerify(p, a);
			await skipOnboarding(p, a.email);
			await db.person.update({
				where: { userId: (await requireUser(a.email)).id },
				data: { birthDate: new Date('1990-01-01') }
			});
		}
		const person = async (email: string) =>
			db.person.findUniqueOrThrow({ where: { userId: (await requireUser(email)).id } });
		const agent = await person(account.email),
			artist = await person(artistAccount.email),
			issuer = await person(issuerAccount.email);
		await db.personTrack.create({ data: { personId: agent.actorId, track: 'MANAGER' } });
		opportunity = (
			await db.opportunity.create({
				data: {
					issuerActorId: issuer.actorId,
					kind: 'SESSION_WORK',
					title: 'Session accompagnée D71',
					description: 'Une session musicale pour préparer ensemble le prochain enregistrement.',
					expiresAt: new Date(Date.now() + 86400000)
				}
			})
		).id;
		const path = `/annonces/${opportunity}`;
		await test.step('Sans droit explicite, un POST forgé ne crée rien', async () => {
			await page.goto(path);
			await waitForAppReady(page);
			const response = await page.request.post(path + '?/applyDelegated', {
				form: {
					artistId: artist.actorId,
					message: 'Nous proposons un projet musical complet pour cette session.'
				},
				headers: { Origin: new URL(page.url()).origin }
			});
			expect(response.status()).toBe(403);
			expect(await db.application.count({ where: { opportunityId: opportunity } })).toBe(0);
			await expect(
				page.getByRole('heading', { name: 'Candidater au nom d’un artiste' })
			).toHaveCount(0);
		});
		// Accord de fixture : le parcours humain demande/accord est couvert par droit-de-candidater.
		const rep = await db.representation.create({
			data: {
				agentId: agent.actorId,
				artistId: artist.actorId,
				kind: 'MANAGER',
				status: 'CONFIRMED',
				confirmedAt: new Date(),
				confirmedById: artist.actorId,
				allowedActions: ['CAREER_SUPPORT']
			}
		});
		await db.applicationGrant.create({
			data: {
				representationId: rep.id,
				requestedById: agent.actorId,
				grantedById: artist.actorId,
				grantedAt: new Date(),
				expiresAt: new Date(Date.now() + 86400000),
				kinds: ['SESSION_WORK'],
				acts: {
					create: [
						{ kind: 'REQUESTED', byId: agent.actorId },
						{ kind: 'GRANTED', byId: artist.actorId }
					]
				}
			}
		});
		await test.step('Envoi sur mobile au clavier, information accessible et persistance', async () => {
			await page.setViewportSize({ width: 390, height: 844 });
			await page.reload();
			await waitForAppReady(page);
			const notice = page.getByRole('button', { name: 'Compris', exact: true });
			if (await notice.isVisible()) await notice.click();
			await expectNoA11yViolations(page, ['.cartButton']);
			expect(
				await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
			).toBe(true);
			await page
				.getByRole('combobox', { name: 'Artiste représenté', exact: true })
				.selectOption(artist.actorId);
			await page
				.getByLabel(/^Message à .+, au nom de l’artiste/)
				.fill('Nous proposons un projet musical complet pour cette session.');
			const submit = page.getByRole('button', { name: 'Envoyer au nom de l’artiste', exact: true });
			await submit.focus();
			await expect(submit).toBeFocused();
			await page.keyboard.press('Enter');
			await expect(
				page.getByText('Candidature envoyée au nom de l’artiste.', { exact: true })
			).toBeVisible();
			await page.reload();
			await expect(page.getByRole('heading', { name: 'Candidatures déléguées' })).toBeVisible();
			await expect(
				page.getByRole('heading', { name: 'Candidater au nom d’un artiste' })
			).toHaveCount(0);
			const app = await db.application.findFirstOrThrow({ where: { opportunityId: opportunity } });
			expect(app).toMatchObject({
				applicantActorId: artist.actorId,
				sentById: agent.actorId,
				delegated: true
			});
			expect(
				await db.applicationGrantAct.count({ where: { applicationId: app.id, kind: 'USED' } })
			).toBe(1);
		});
		await test.step('L’artiste est prévenu et retire, un tiers ne peut pas le faire', async () => {
			const app = await db.application.findFirstOrThrow({ where: { opportunityId: opportunity } });
			expect(
				await db.notification.count({
					where: { recipientActorId: artist.actorId, type: 'APPLICATION_SENT', href: path }
				})
			).toBe(1);
			await issuerPage.goto(path);
			await waitForAppReady(issuerPage);
			const forged = await issuerPage.request.post(path + '?/withdraw', {
				form: { applicationId: app.id },
				headers: { Origin: new URL(issuerPage.url()).origin }
			});
			expect(forged.status()).toBe(403);
			await artistPage.setViewportSize({ width: 390, height: 844 });
			await artistPage.goto(path);
			await waitForAppReady(artistPage);
			await expect(artistPage.getByText(/Envoyée en ton nom par/)).toBeVisible();
			await artistPage.getByRole('button', { name: 'Retirer ma candidature', exact: true }).click();
			await expect(artistPage.getByText('Candidature retirée.', { exact: true })).toBeVisible();
			expect(await db.application.findUnique({ where: { id: app.id } })).toMatchObject({
				status: 'WITHDRAWN',
				withdrawnById: artist.actorId,
				sentById: agent.actorId
			});
		});
	} finally {
		if (opportunity) await db.opportunity.deleteMany({ where: { id: opportunity } });
		await artistContext.close();
		await issuerContext.close();
		await deleteUser(artistAccount.email);
		await deleteUser(issuerAccount.email);
	}
});
