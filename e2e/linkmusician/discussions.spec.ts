import { test, expect } from '../support/fixtures';
import { makeAccount } from '../support/account';
import { signUpAndVerify } from '../support/admin';
import { db, deleteUser, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { createMusician, deleteMusicians, skipOnboarding } from '../support/linkmusician';

/**
 * P3-16c — Discussions de groupe (D46) : après une jam, j'ai gardé le contact
 * de Malik et Zoé, rangés dans « Projet funk ». J'ouvre une discussion :
 * chacun·e reçoit une invitation et ne voit rien avant de l'avoir acceptée ;
 * Malik rejoint et répond.
 */
test.describe('LinkMusician — discussions de groupe', () => {
	test.setTimeout(3 * 60_000);
	const A11Y_EXCLUDE = ['.cartButton'];
	const toulouse = { code: '31555', nom: 'Toulouse', dep: '31', lat: 43.6007, lng: 1.4328 };

	test('j’ouvre une discussion à trois avec « Projet funk », Malik la rejoint', async ({
		page,
		account,
		browser
	}) => {
		const zoe = await createMusician({ name: 'Zoé', commune: toulouse, instrument: ['basse', 3] });
		const malikAccount = makeAccount();
		const malikContext = await browser.newContext();
		const malikPage = await malikContext.newPage();
		try {
			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			await signUpAndVerify(malikPage, malikAccount);
			await skipOnboarding(malikPage, malikAccount.email);
			const person = async (email: string) =>
				db.person.findUniqueOrThrow({
					where: { userId: (await requireUser(email)).id },
					include: { actor: true }
				});
			const me = await person(account.email);
			const malik = await person(malikAccount.email);
			// « Garder le contact » après la jam (P2-16) et groupe de contacts (P3-16b,
			// parcours couvert par contacts.spec.ts).
			for (const contactId of [malik.actorId, zoe.actorId]) {
				await db.musicalTie.create({ data: { ownerId: me.actorId, contactId } });
			}
			await db.contactGroup.create({
				data: {
					ownerId: me.actorId,
					name: 'Projet funk',
					members: { create: [{ contactId: malik.actorId }, { contactId: zoe.actorId }] }
				}
			});

			await test.step('1. J’ouvre la discussion depuis le groupe et j’écris', async () => {
				await page.goto('/messages/contacts');
				await waitForAppReady(page);
				await page.getByRole('button', { name: 'Ouvrir une discussion avec Projet funk' }).click();
				await expect(page).toHaveURL(/\/messages\/groupes\/[^/]+$/);
				await expect(page.getByRole('heading', { name: 'Projet funk' })).toBeVisible();
				await page.getByText('Qui est là (1)').click();
				await expect(page.getByText('Invité·es, pas encore là')).toContainText(
					malik.actor.displayName
				);
				await page.getByLabel('Ton message au groupe').fill('On répète samedi ?');
				await page.getByRole('button', { name: 'Envoyer' }).click();
				await expect(page.getByRole('list', { name: 'Messages' })).toContainText(
					'On répète samedi ?'
				);
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
			});

			await test.step('2. Malik voit l’invitation, sans les messages, et la rejoint', async () => {
				await malikPage.goto('/messages');
				await waitForAppReady(malikPage);
				await malikPage.getByRole('link', { name: /Projet funk/ }).click();
				await expect(
					malikPage.getByRole('heading', {
						name: `${me.actor.displayName} t’invite à la discussion « Projet funk »`
					})
				).toBeVisible();
				await expect(malikPage.getByText('On répète samedi ?')).toHaveCount(0);
				await expectNoA11yViolations(malikPage, A11Y_EXCLUDE);
				await malikPage.getByRole('button', { name: 'Rejoindre' }).click();
				const thread = malikPage.getByRole('list', { name: 'Messages' });
				await expect(thread).toContainText('On répète samedi ?');
				await malikPage.getByLabel('Ton message au groupe').fill('Samedi ok');
				await malikPage.getByRole('button', { name: 'Envoyer' }).click();
				await expect(thread).toContainText('Samedi ok');
				await expectNoA11yViolations(malikPage, A11Y_EXCLUDE);
			});

			await test.step('3. Je vois sa réponse dans Messages', async () => {
				await page.goto('/messages');
				await waitForAppReady(page);
				const row = page.getByRole('link', { name: /Projet funk/ });
				await expect(row).toContainText('Samedi ok');
				await row.click();
				await expect(page.getByRole('list', { name: 'Messages' })).toContainText('Samedi ok');
			});
		} finally {
			await malikContext.close();
			await deleteUser(malikAccount.email);
			await deleteMusicians([zoe]);
		}
	});
});
