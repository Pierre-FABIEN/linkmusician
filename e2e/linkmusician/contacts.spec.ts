import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { createMusician, deleteMusicians, skipOnboarding } from '../support/linkmusician';

/**
 * P3-16b — Carnet de contacts (D45, D46) : Malik, gardé après une jam, est
 * dans mes contacts (onglet de Messages) ; je crée le groupe « Projet
 * funk », j'y ajoute Malik, et je peux lui écrire sans échanger de numéro.
 */
test.describe('LinkMusician — contacts', () => {
	test.setTimeout(2 * 60_000);
	const A11Y_EXCLUDE = ['.cartButton'];
	const toulouse = { code: '31555', nom: 'Toulouse', dep: '31', lat: 43.6007, lng: 1.4328 };

	test('mon carnet et mon groupe « Projet funk »', async ({ page, account }) => {
		const created: Awaited<ReturnType<typeof createMusician>>[] = [];
		try {
			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			const me = await db.person.findUniqueOrThrow({
				where: { userId: (await requireUser(account.email)).id }
			});
			const malik = await createMusician({
				name: 'Malik',
				commune: toulouse,
				instrument: ['batterie', 4]
			});
			created.push(malik);
			// Carnet (D82) : Malik enregistré, sans conversation (parcours couvert par carnet.spec.ts).
			await db.savedContact.create({ data: { ownerId: me.actorId, contactId: malik.actorId } });

			await test.step('1. Messages → Contacts : Malik est dans mon carnet', async () => {
				await page.goto('/messages');
				await waitForAppReady(page);
				await page
					.getByRole('navigation', { name: 'Messages' })
					.getByRole('link', { name: 'Contacts' })
					.click();
				await expect(page).toHaveURL(/\/messages\/contacts$/);
				const carnet = page.getByRole('list', { name: 'Mon carnet' });
				await expect(carnet).toContainText(malik.displayName);
				await expect(carnet).toContainText('Dans ton carnet');
				await expect(
					carnet.getByRole('link', { name: `Écrire à ${malik.displayName}` })
				).toHaveAttribute('href', `/messages/nouveau?a=${malik.handle}`);
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
			});

			await test.step('2. Je crée « Projet funk » et j’y ajoute Malik', async () => {
				await page.getByLabel('Nouveau groupe').fill('Projet funk');
				await page.getByRole('button', { name: 'Créer' }).click();
				await expect(page.getByText('Groupe créé.')).toBeVisible();
				await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
				await expect(page.getByText('Ajouté au groupe.')).toBeVisible();
				const groups = page.getByRole('list', { name: 'Groupes de contacts' });
				await expect(groups).toContainText('Projet funk');
				await expect(groups).toContainText(malik.displayName);
				await expect(page.getByRole('list', { name: 'Mon carnet' })).toContainText(
					'Dans Projet funk'
				);
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
			});
		} finally {
			await deleteMusicians(created);
		}
	});
});
