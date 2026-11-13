import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { makeAccount } from '../support/account';
import { db, requireUser, deleteUser } from '../support/db';
import { skipOnboarding } from '../support/linkmusician';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
test('affectation : double accord, retrait et action métier autorisée', async ({
	page,
	account,
	browser
}) => {
	test.setTimeout(8 * 60_000);
	const artistAccount = makeAccount(),
		delegateAccount = makeAccount();
	const artistContext = await browser.newContext(),
		delegateContext = await browser.newContext();
	const artistPage = await artistContext.newPage(),
		delegatePage = await delegateContext.newPage();
	let agencyId = '',
		parentId = '';
	try {
		for (const [p, a] of [
			[page, account],
			[artistPage, artistAccount],
			[delegatePage, delegateAccount]
		] as const) {
			await signUpAndVerify(p, a);
			await skipOnboarding(p, a.email);
			await db.person.update({
				where: { userId: (await requireUser(a.email)).id },
				data: { birthDate: new Date('1990-01-01') }
			});
		}
		const person = async (email: string) =>
			db.person.findUniqueOrThrow({
				where: { userId: (await requireUser(email)).id },
				include: { actor: true }
			});
		const agent = await person(account.email),
			artist = await person(artistAccount.email),
			delegate = await person(delegateAccount.email);
		await db.personTrack.create({ data: { personId: agent.actorId, track: 'MANAGER' } });
		const agency = await db.actor.create({
			data: {
				kind: 'ORGANIZATION',
				handle: 'e2e-delegation-' + Math.random().toString(36).slice(2, 8),
				displayName: 'Agence des affectations',
				hidden: true,
				organization: {
					create: {
						kind: 'AGENCY',
						memberships: {
							create: [
								{ personId: agent.actorId, role: 'OWNER', status: 'ACTIVE' },
								{ personId: delegate.actorId, role: 'MEMBER', status: 'ACTIVE' }
							]
						}
					}
				}
			}
		});
		agencyId = agency.id;
		parentId = (
			await db.representation.create({
				data: {
					agentId: agent.actorId,
					artistId: artist.actorId,
					kind: 'MANAGER',
					status: 'CONFIRMED',
					confirmedById: artist.actorId,
					confirmedAt: new Date(),
					allowedActions: ['CAREER_SUPPORT'],
					departmentCodes: ['31'],
					message: 'Message confidentiel à ne pas exposer'
				}
			})
		).id;
		const propose = async () => {
			await page.goto(`/delegations/nouvelle?mandat=${parentId}`);
			await waitForAppReady(page);
			await page.getByLabel('Collaborateur', { exact: true }).fill(delegate.actor.handle);
			await page.getByLabel('Autoriser aussi à mettre fin à cet accompagnement').check();
			await page.getByRole('button', { name: 'Soumettre l’affectation' }).click();
			await expect(page).toHaveURL(/\/delegations\/[^/?]+$/);
			return new URL(page.url()).pathname;
		};
		let path = '';
		await test.step('Proposer puis refuser toute action avant les deux accords', async () => {
			path = await propose();
			await delegatePage.goto(path);
			await waitForAppReady(delegatePage);
			await expect(delegatePage.getByText('Accords en attente', { exact: true })).toBeVisible();
			await expect(
				delegatePage.getByText(/Les conditions du mandat sont accessibles après/)
			).toBeVisible();
			expect(await delegatePage.locator('body').textContent()).not.toContain(
				'Message confidentiel'
			);
			const forbidden = await delegatePage.request.post('/accompagnement?/end', {
				form: { id: parentId },
				headers: { Origin: new URL(delegatePage.url()).origin }
			});
			expect(forbidden.status()).toBe(403);
			await artistPage.goto(path);
			await waitForAppReady(artistPage);
			await artistPage.getByRole('button', { name: 'Approuver ces droits' }).click();
			await expect(artistPage.getByText('Décision enregistrée.')).toBeVisible();
			await delegatePage.reload();
			await waitForAppReady(delegatePage);
			await delegatePage.getByRole('button', { name: 'Accepter l’affectation' }).click();
			await expect(delegatePage.getByText('Affectation active', { exact: true })).toBeVisible();
			await expect(delegatePage.getByText(/Départements 31/)).toBeVisible();
		});
		await test.step('La révocation de l’adhésion retire les droits sans les réactiver au retour', async () => {
			await db.membership.updateMany({
				where: { orgId: agencyId, personId: delegate.actorId, status: 'ACTIVE' },
				data: { status: 'REMOVED', endedAt: new Date() }
			});
			await delegatePage.reload();
			await waitForAppReady(delegatePage);
			await expect(delegatePage.getByText('Affectation inactive', { exact: true })).toBeVisible();
			await expect(delegatePage.getByText(/Départements 31/)).toHaveCount(0);
			const denied = await delegatePage.request.post(path + '?/end', {
				form: { confirm: '1' },
				headers: { Origin: new URL(delegatePage.url()).origin }
			});
			expect(denied.status()).toBe(403);
			await db.membership.create({
				data: { orgId: agencyId, personId: delegate.actorId, role: 'MEMBER', status: 'ACTIVE' }
			});
			await delegatePage.reload();
			await waitForAppReady(delegatePage);
			await expect(delegatePage.getByText('Affectation inactive', { exact: true })).toBeVisible();
			await page.goto(path);
			await waitForAppReady(page);
			await page.getByRole('button', { name: 'Retirer l’affectation' }).click();
			await expect(page.getByText('Affectation retirée', { exact: true })).toBeVisible();
		});
		await test.step('Un nouvel accord autorise l’action exacte, avec auteur réel et mobile accessible', async () => {
			path = await propose();
			await delegatePage.goto(path);
			await waitForAppReady(delegatePage);
			await delegatePage.getByRole('button', { name: 'Accepter l’affectation' }).click();
			await expect(delegatePage.getByText('Réponse enregistrée.')).toBeVisible();
			await artistPage.goto(path);
			await waitForAppReady(artistPage);
			await artistPage.getByRole('button', { name: 'Approuver ces droits' }).click();
			await expect(artistPage.getByText('Décision enregistrée.')).toBeVisible();
			await delegatePage.setViewportSize({ width: 390, height: 844 });
			await delegatePage.reload();
			await waitForAppReady(delegatePage);
			const notice = delegatePage.getByRole('button', { name: 'Compris', exact: true });
			if (await notice.isVisible()) await notice.click();
			await expectNoA11yViolations(delegatePage, ['.cartButton']);
			expect(
				await delegatePage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
			).toBe(true);
			await delegatePage.getByRole('checkbox', { name: /Je confirme la fin/ }).check();
			await delegatePage
				.getByRole('button', { name: 'Terminer l’accompagnement', exact: true })
				.click();
			await expect(delegatePage.getByText('Accompagnement terminé.')).toBeVisible();
			expect(await db.representation.findUnique({ where: { id: parentId } })).toMatchObject({
				status: 'ENDED',
				endedById: delegate.actorId
			});
		});
	} finally {
		await artistContext.close();
		await delegateContext.close();
		if (parentId) await db.representation.deleteMany({ where: { id: parentId } });
		if (agencyId) await db.actor.deleteMany({ where: { id: agencyId } });
		await deleteUser(artistAccount.email).catch(() => {});
		await deleteUser(delegateAccount.email).catch(() => {});
	}
});
