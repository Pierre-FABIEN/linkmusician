import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { makeAccount } from '../support/account';
import { pageOrigin, signUpAndVerify, sveltekitActionHeaders } from '../support/admin';
import { db, deleteUser, requireUser } from '../support/db';
import { waitForAppReady, waitForPath } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { horizontalOverflow, skipOnboarding } from '../support/linkmusician';

/**
 * P4a — participant·es d'un projet (#71, #36, D72, conception 19 §6.2,
 * §9.1, §9.3). Une musicienne invite un producteur à coordonner son EP ;
 * avant d'accepter, il ne voit que le nom, le type, le porteur et ce qui
 * est proposé. Après, la fiche montre le morceau partagé, jamais l'idée
 * privée ; il change les dates, et un renommage forgé est refusé. Il quitte
 * le projet : 404. 390 px, axe.
 */

async function forge(page: Page, path: string, form: Record<string, string>) {
	const response = await page.request.post(path, {
		form,
		headers: sveltekitActionHeaders(pageOrigin(page))
	});
	return (await response.json()) as { type: string; status?: number };
}

async function dismissCookies(page: Page) {
	const notice = page.getByRole('button', { name: 'Compris', exact: true });
	if (await notice.isVisible()) await notice.click();
}

async function adult(email: string) {
	const person = await db.person.findUniqueOrThrow({
		where: { userId: (await requireUser(email)).id },
		include: { actor: { select: { handle: true } } }
	});
	await db.person.update({
		where: { actorId: person.actorId },
		data: { birthDate: new Date('1990-01-01') }
	});
	return { actorId: person.actorId, handle: person.actor.handle! };
}

test.describe('LinkMusician — équipe d’un projet (P4a)', () => {
	test.setTimeout(6 * 60_000);

	test('invitation acceptée, fiche partagée, morceau privé invisible, coordination des dates', async ({
		page,
		account,
		browser
	}) => {
		const guestAccount = makeAccount();
		const guestContext = await browser.newContext();
		const guest = await guestContext.newPage();
		try {
			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			const me = await adult(account.email);
			await signUpAndVerify(guest, guestAccount);
			await skipOnboarding(guest, guestAccount.email);
			const producer = await adult(guestAccount.email);

			// L'EP, un morceau composé partagé en résumé, une idée privée.
			const project = await db.project.create({
				data: {
					ownerId: me.actorId,
					name: 'EP Lumière',
					kind: 'EP',
					description: 'Sortie au printemps'
				}
			});
			for (const [title, state, share] of [
				['Aube', 'COMPOSED', 'SUMMARY'],
				['Inédit secret', 'IDEA', 'NONE']
			] as const) {
				const work = await db.work.create({
					data: { ownerId: me.actorId, createdById: me.actorId, title, state }
				});
				await db.projectItem.create({ data: { projectId: project.id, workId: work.id, share } });
			}
			await page.setViewportSize({ width: 390, height: 844 });
			await guest.setViewportSize({ width: 390, height: 844 });

			await test.step('1. La gestion invite le producteur à coordonner', async () => {
				await page.goto(`/projets/${project.id}`);
				await waitForAppReady(page);
				await dismissCookies(page);
				// U3 : l'invitation vit dans une feuille ; l'@identifiant reste possible.
				await page.getByRole('button', { name: 'Inviter quelqu’un' }).click();
				const form = page.getByTestId('invite-sheet');
				await form.getByText('Pas dans la liste ? Son identifiant').click();
				await form.getByLabel('Identifiant').fill(`@${producer.handle}`);
				await form.getByLabel('Son rôle dans le projet').fill('Réalisation');
				await form.getByRole('radio', { name: /^Coordonner/ }).check();
				await form.getByRole('button', { name: 'Inviter', exact: true }).click();
				await expect(page.locator('#main-content').getByRole('status')).toContainText(
					'Invitation envoyée'
				);
				await expect(page.getByTestId('team-member')).toContainText('Invitation en attente');
			});

			await test.step('2. Avant d’accepter : le minimum, et la fiche reste fermée', async () => {
				const before = await guest.goto(`/projets/${project.id}`);
				expect(before?.status()).toBe(404);
				await guest.goto('/projets');
				await waitForAppReady(guest);
				await dismissCookies(guest);
				const invitation = guest.getByTestId('project-invitation');
				await expect(invitation).toContainText('EP Lumière');
				await expect(invitation).toContainText('Coordination');
				await expect(invitation).toContainText('Réalisation');
				const text = await guest.locator('#main-content').innerText();
				for (const secret of ['Sortie au printemps', 'Aube', 'Inédit secret'])
					expect(text).not.toContain(secret);
				expect(await horizontalOverflow(guest)).toEqual([]);
				await expectNoA11yViolations(guest, ['.cartButton']);
			});

			await test.step('3. Il accepte : morceau partagé visible, idée privée invisible', async () => {
				await guest
					.getByTestId('project-invitation')
					.getByRole('button', { name: /^Rejoindre/ })
					.click();
				await waitForPath(guest, `/projets/${project.id}`);
				await waitForAppReady(guest);
				await expect(guest.getByTestId('project-role')).toHaveText('Je coordonne');
				const main = guest.locator('#main-content');
				await expect(main).toContainText('Aube');
				await expect(main).not.toContainText('Inédit secret');
				await expect(main.getByRole('link', { name: 'Aube' })).toHaveCount(0);
				// Ni supprimer, ni changer d'état : ce n'est pas la gestion.
				await expect(main.getByRole('button', { name: 'Supprimer le projet' })).toHaveCount(0);
				await expect(main.getByRole('button', { name: 'Marquer comme atteint' })).toHaveCount(0);
				expect(await horizontalOverflow(guest)).toEqual([]);
				await expectNoA11yViolations(guest, ['.cartButton']);
			});

			await test.step('4. La coordination change les dates ; un renommage forgé est refusé', async () => {
				await guest.getByText('Modifier le projet').click();
				await expect(guest.getByLabel('Nom du projet')).toHaveCount(0);
				await guest.getByLabel('Échéance').fill('2027-03-21');
				await guest.getByRole('button', { name: 'Enregistrer', exact: true }).click();
				await expect(guest.locator('#main-content').getByRole('status')).toHaveText(
					'Projet mis à jour.'
				);
				const saved = await db.project.findUniqueOrThrow({ where: { id: project.id } });
				expect(saved.dueOn?.toISOString().slice(0, 10)).toBe('2027-03-21');
				expect(saved.name).toBe('EP Lumière');
				expect(
					await forge(guest, `/projets/${project.id}?/modifier`, {
						name: 'Renommé',
						kind: 'EP'
					})
				).toMatchObject({ type: 'failure', status: 403 });
				expect(await forge(guest, `/projets/${project.id}?/supprimer`, {})).toMatchObject({
					type: 'failure',
					status: 403
				});
			});

			await test.step('5. Il quitte le projet : la fiche lui répond 404', async () => {
				await guest.getByRole('button', { name: 'Quitter le projet' }).click();
				// §8.2 : les effets sont dits avant le geste.
				const sheet = guest.getByRole('dialog', { name: 'Quitter ce projet ?' });
				await expect(sheet.getByTestId('leave-effects')).toContainText('Ta coordination s’arrête');
				await sheet.getByRole('button', { name: 'Quitter le projet' }).click();
				await waitForPath(guest, '/projets');
				const after = await guest.goto(`/projets/${project.id}`);
				expect(after?.status()).toBe(404);
			});
		} finally {
			await guestContext.close();
			await deleteUser(guestAccount.email);
		}
	});
});
