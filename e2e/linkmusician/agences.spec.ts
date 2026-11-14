import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { makeAccount } from '../support/account';
import { db, requireUser, deleteUser } from '../support/db';
import { skipOnboarding } from '../support/linkmusician';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';

test('agence : invitations, collaborateur, co-gestion et révocation', async ({
	page,
	account,
	browser
}) => {
	test.setTimeout(7 * 60_000);
	const otherAccount = makeAccount();
	const context = await browser.newContext();
	const otherPage = await context.newPage();
	let orgId = '';
	try {
		for (const [p, a] of [
			[page, account],
			[otherPage, otherAccount]
		] as const) {
			await signUpAndVerify(p, a);
			await skipOnboarding(p, a.email);
			const user = await requireUser(a.email);
			const person = await db.person.update({
				where: { userId: user.id },
				data: { birthDate: new Date('1990-01-01') }
			});
			await db.personTrack.create({ data: { personId: person.actorId, track: 'MANAGER' } });
		}
		const other = await db.person.findUniqueOrThrow({
			where: { userId: (await requireUser(otherAccount.email)).id },
			include: { actor: true }
		});
		const name = 'E2E Agence ' + Math.random().toString(36).slice(2, 8);
		await test.step('Créer l’agence depuis Mes structures', async () => {
			await page.setViewportSize({ width: 390, height: 844 });
			await page.goto('/structure');
			await waitForAppReady(page);
			const notice = page.getByRole('button', { name: 'Compris', exact: true });
			if (await notice.isVisible()) await notice.click();
			await page.getByRole('link', { name: /Ouvrir une agence/ }).click();
			await page.getByRole('link', { name: /Créer une agence/ }).click();
			await page.getByLabel('Nom de l’agence').fill(name);
			await page.getByRole('button', { name: 'Créer l’agence' }).click();
			await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
			orgId = (
				await db.actor.findFirstOrThrow({ where: { displayName: name }, select: { id: true } })
			).id;
			await page.getByRole('link', { name: /Équipe/ }).click();
			await page.getByLabel('Nom d’utilisateur').fill(other.actor.handle);
			await page.getByRole('button', { name: 'Inviter', exact: true }).click();
			await expect(page.getByText('Invitation envoyée.')).toBeVisible();
		});
		await test.step('Accepter comme collaborateur sans accès à l’équipe', async () => {
			await otherPage.goto(`/agences/${orgId}/participation`);
			await waitForAppReady(otherPage);
			await expect(otherPage.getByText(/Ce rôle de collaborateur/)).toBeVisible();
			await otherPage.getByRole('button', { name: 'Accepter l’invitation' }).click();
			await expect(otherPage).toHaveURL(/\/agences$/);
			await otherPage.goto(`/agences/${orgId}`);
			await waitForAppReady(otherPage);
			await expect(otherPage.getByRole('link', { name: /Équipe/ })).toHaveCount(0);
			const denied = await otherPage.request.get(`/agences/${orgId}/equipe`);
			expect(denied.status()).toBe(404);
			expect(await denied.text()).not.toContain(account.email);
			const forbidden = await otherPage.request.post(`/agences/${orgId}/equipe?/invite`, {
				form: { handle: other.actor.handle, role: 'ADMIN' },
				headers: { Origin: new URL(otherPage.url()).origin }
			});
			expect(forbidden.status()).toBe(403);
			await otherPage.goto(`/agences/${orgId}/participation`);
			await waitForAppReady(otherPage);
			await otherPage.getByRole('button', { name: 'Quitter l’agence' }).click();
			await expect(otherPage).toHaveURL(/\/agences$/);
		});
		await test.step('Retrouver sa période après départ sans équipe ni outils', async () => {
			expect((await otherPage.request.get(`/structure/${orgId}`)).status()).toBe(404);
			await otherPage.setViewportSize({ width: 390, height: 844 });
			await otherPage.goto('/structure');
			await waitForAppReady(otherPage);
			await otherPage.getByRole('link', { name: /^Historique de mes participations/ }).focus();
			await otherPage.keyboard.press('Enter');
			await expect(otherPage).toHaveURL('/structure/historique');
			const history = otherPage.getByRole('region', { name, exact: true });
			await expect(history.locator('li')).toHaveCount(3);
			await expect(history.getByText('Invitation acceptée', { exact: true })).toBeVisible();
			await expect(history.getByText('Participation quittée', { exact: true })).toBeVisible();
			await expect(history.locator('time').last()).toHaveAttribute('datetime', /T.*Z$/);
			await expectNoA11yViolations(otherPage, ['.cartButton']);
			expect(
				await otherPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
			).toBe(true);
		});
		await test.step('Accepter la co-gestion puis vérifier la révocation en GET et POST', async () => {
			await page.goto(`/agences/${orgId}/equipe`);
			await waitForAppReady(page);
			await page.getByLabel('Nom d’utilisateur').fill(other.actor.handle);
			await page.getByLabel('Rôle proposé').selectOption('ADMIN');
			await page.getByRole('button', { name: 'Inviter', exact: true }).click();
			await expect(page.getByText('Invitation envoyée.')).toBeVisible();
			await otherPage.goto(`/agences/${orgId}/participation`);
			await waitForAppReady(otherPage);
			await otherPage.getByRole('button', { name: 'Accepter l’invitation' }).click();
			await expect(otherPage).toHaveURL(/\/agences$/);
			await otherPage.goto(`/agences/${orgId}/equipe`);
			await waitForAppReady(otherPage);
			await expect(otherPage.getByRole('heading', { level: 1 })).toHaveText('Équipe');
			await expect(otherPage.getByRole('option', { name: 'Co-gestion', exact: true })).toHaveCount(
				0
			);
			await page.reload();
			await waitForAppReady(page);
			await page.getByRole('button', { name: 'Retirer', exact: true }).click();
			await expect(page.getByText('Participation retirée.')).toBeVisible();
			expect((await otherPage.request.get(`/agences/${orgId}/equipe`)).status()).toBe(404);
			const revoked = await otherPage.request.post(`/agences/${orgId}/equipe?/invite`, {
				form: { handle: other.actor.handle, role: 'MEMBER' },
				headers: { Origin: new URL(otherPage.url()).origin }
			});
			expect(revoked.status()).toBe(404);
			await otherPage.goto('/structure/historique');
			await waitForAppReady(otherPage);
			const periods = otherPage.getByRole('region', { name, exact: true });
			await expect(periods).toHaveCount(2);
			await expect(
				periods.getByText('Participation retirée par la gestion', { exact: true })
			).toBeVisible();
			const owner = await db.person.findUniqueOrThrow({
				where: { userId: (await requireUser(account.email)).id },
				include: { actor: true }
			});
			await expect(
				periods
					.filter({ hasText: 'Participation retirée par la gestion' })
					.getByText(owner.actor.displayName, { exact: true })
			).toHaveCount(2);
			await page.goto('/structure/historique');
			await waitForAppReady(page);
			await expect(page.getByRole('region', { name, exact: true })).toHaveCount(0);
			await expectNoA11yViolations(page, ['.cartButton']);
			expect(
				await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
			).toBe(true);
			const publicProfile = await page.request.get(
				`/@${(await db.actor.findUniqueOrThrow({ where: { id: orgId }, select: { handle: true } })).handle}`
			);
			expect(publicProfile.status()).toBe(404);
		});
	} finally {
		await context.close();
		if (orgId) await db.actor.deleteMany({ where: { id: orgId } });
		await deleteUser(otherAccount.email).catch(() => {});
	}
});
