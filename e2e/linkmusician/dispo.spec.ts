import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import {
	createAvailability,
	createMusician,
	deleteMusicians,
	setCity,
	skipOnboarding
} from '../support/linkmusician';

/**
 * P2-13 — « Je suis dispo » : se mettre dispo et l'annuler ; voir les dispos
 * adultes autour de soi, jamais un·e mineur·e ni une dispo échue.
 */
test.describe('LinkMusician — je suis dispo', () => {
	test.setTimeout(5 * 60_000);
	// Bouton panier du boilerplate (boutique active en e2e), remontée n° 14.
	const A11Y_EXCLUDE = ['.cartButton'];
	const blagnac = { code: '31069', nom: 'Blagnac', dep: '31', lat: 43.6459, lng: 1.3785 };

	test('se mettre dispo, voir qui l’est', async ({ page, account }) => {
		const adult = await createMusician({ name: 'Bassiste', commune: blagnac });
		const minor = await createMusician({
			name: 'Mineure',
			commune: blagnac,
			birthDate: '2010-03-01'
		});
		const expired = await createMusician({ name: 'Partie', commune: blagnac });
		try {
			await createAvailability(adult.actorId, 4, 'Envie d’un bœuf funk');
			await createAvailability(minor.actorId);
			await createAvailability(expired.actorId, -1);

			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			await setCity(page);
			const me = await db.person.findUniqueOrThrow({
				where: { userId: (await requireUser(account.email)).id }
			});

			await test.step('1. Les dispos adultes autour de moi, pas les autres', async () => {
				await page.goto('/jam');
				await waitForAppReady(page);
				const list = page.getByRole('list', { name: 'Musicien·nes dispos' });
				await expect(list.getByText(adult.displayName)).toBeVisible();
				await expect(list.getByText('Envie d’un bœuf funk')).toBeVisible();
				await expect(list.getByText(minor.displayName)).toHaveCount(0);
				await expect(list.getByText(expired.displayName)).toHaveCount(0);
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
			});

			await test.step('2. Je me mets dispo ce soir', async () => {
				await page.getByLabel('Ton envie (facultatif)').fill('Guitare, plutôt rock');
				await page.getByRole('button', { name: 'Je suis dispo' }).click();
				await expect(page.getByText('Tu es dispo ce soir')).toBeVisible();
				const saved = await db.availability.findUniqueOrThrow({ where: { actorId: me.actorId } });
				expect(saved.slot).toBe('TONIGHT');
				expect(saved.note).toBe('Guitare, plutôt rock');
			});

			await test.step('3. Je ne suis plus dispo', async () => {
				await page.getByRole('button', { name: 'Je ne suis plus dispo' }).click();
				await expect(page.getByRole('button', { name: 'Je suis dispo' })).toBeVisible();
				expect(await db.availability.count({ where: { actorId: me.actorId } })).toBe(0);
			});
		} finally {
			await deleteMusicians([adult, minor, expired]);
		}
	});
});
