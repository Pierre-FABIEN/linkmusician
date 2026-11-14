import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { createMusician, deleteMusicians, skipOnboarding } from '../support/linkmusician';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';

test('historique privé : proposition, confirmation et fin du mandat', async ({ page, account }) => {
	test.setTimeout(4 * 60_000);
	await signUpAndVerify(page, account);
	await skipOnboarding(page, account.email);
	const artist = await db.person.update({
		where: { userId: (await requireUser(account.email)).id },
		data: { birthDate: new Date('1990-01-01') },
		include: { actor: true }
	});
	const agent = await createMusician({
		name: 'Agentjournal',
		commune: { code: '31555', nom: 'Toulouse', dep: '31', lat: 43.6, lng: 1.43 }
	});
	let id = '';
	try {
		await db.personTrack.create({ data: { personId: agent.actorId, track: 'MANAGER' } });
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/accompagnement');
		await waitForAppReady(page);
		await page.getByRole('link', { name: 'Historique des accompagnements', exact: true }).click();
		await expect(page.getByText('Aucun accompagnement conservé pour l’instant.')).toBeVisible();
		id = (
			await db.representation.create({
				data: {
					agentId: agent.actorId,
					artistId: artist.actorId,
					kind: 'MANAGER',
					allowedActions: ['CAREER_SUPPORT'],
					departmentCodes: ['31'],
					message: 'MESSAGE PRIVE DU MANDAT'
				}
			})
		).id;
		await page.reload();
		await waitForAppReady(page);
		const link = page
			.getByRole('navigation', { name: 'Mes accompagnements conservés' })
			.getByRole('link');
		await link.focus();
		await page.keyboard.press('Enter');
		await expect(page).toHaveURL(`/accompagnement/${id}/historique`);
		const history = page.getByRole('region', { name: 'Actes conservés' });
		await expect(history.locator('li')).toHaveCount(1);
		await expect(history.getByText(agent.displayName, { exact: true })).toBeVisible();
		await expect(history.locator('time')).toHaveAttribute('datetime', /T.*Z$/);
		expect(await page.locator('body').textContent()).not.toMatch(/MESSAGE PRIVE|Départements 31/);
		await page.goto('/accompagnement');
		await waitForAppReady(page);
		await page.getByRole('button', { name: 'Confirmer', exact: true }).click();
		await expect(page.getByRole('region', { name: 'Qui m’accompagne' })).toContainText(
			agent.displayName
		);
		await page.goto(`/accompagnement/${id}/historique`);
		await waitForAppReady(page);
		await expect(history.locator('li')).toHaveCount(2);
		await expect(history.getByText(artist.actor.displayName, { exact: true })).toBeVisible();
		await page.goto('/accompagnement');
		await waitForAppReady(page);
		await page
			.getByRole('region', { name: 'Qui m’accompagne' })
			.getByRole('button', { name: 'Mettre fin', exact: true })
			.click();
		await expect(page.getByRole('region', { name: 'Qui m’accompagne' })).toHaveCount(0);
		await page.getByRole('link', { name: 'Historique des accompagnements', exact: true }).click();
		await page
			.getByRole('navigation', { name: 'Mes accompagnements conservés' })
			.getByRole('link')
			.click();
		await expect(history.locator('li')).toHaveCount(3);
		await expect(history.getByText('Accompagnement terminé', { exact: true })).toBeVisible();
		const notice = page.getByRole('button', { name: 'Compris', exact: true });
		if (await notice.isVisible()) await notice.click();
		await expectNoA11yViolations(page, ['.cartButton']);
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
		).toBe(true);
		await db.representation.update({ where: { id }, data: { artistId: agent.actorId } });
		expect((await page.request.get(`/accompagnement/${id}/historique`)).status()).toBe(404);
	} finally {
		if (id) await db.representation.deleteMany({ where: { id } });
		await deleteMusicians([agent]);
	}
});
