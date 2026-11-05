import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { createMusician, deleteMusicians, setCity, skipOnboarding } from '../support/linkmusician';

/**
 * P2-14a — Annuaire des lieux : voir les lieux autour de soi, ajouter un
 * lieu (commune seulement, jamais d'adresse), doublon refusé, recherche.
 */
test.describe('LinkMusician — annuaire des lieux', () => {
	test.setTimeout(5 * 60_000);
	// Bouton panier du boilerplate (boutique active en e2e), remontée n° 14.
	const A11Y_EXCLUDE = ['.cartButton'];
	const blagnac = { code: '31069', nom: 'Blagnac', dep: '31', lat: 43.6459, lng: 1.3785 };

	test('ajouter le Bar des Amis et le retrouver', async ({ page, account }) => {
		const other = await createMusician({ name: 'Batteuse', commune: blagnac });
		let myActorId: string | null = null;
		try {
			const venue = (
				name: string,
				communeCode: string,
				communeName: string,
				lat: number,
				lng: number
			) =>
				db.venue.create({
					data: {
						name,
						nameKey: name.toLowerCase(),
						kind: 'CAFE_CONCERT',
						communeCode,
						communeName,
						departmentCode: communeCode.slice(0, 2),
						lat,
						lng,
						createdById: other.actorId
					}
				});
			await venue('E2E Le Préau', blagnac.code, blagnac.nom, blagnac.lat, blagnac.lng);
			await venue('E2E La Cigale', '75056', 'Paris', 48.8589, 2.347);

			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			await setCity(page);
			myActorId = (
				await db.person.findUniqueOrThrow({
					where: { userId: (await requireUser(account.email)).id }
				})
			).actorId;

			await test.step('1. Les lieux autour de moi, pas les lointains', async () => {
				await page.goto('/jam');
				await waitForAppReady(page);
				const nearby = page.getByRole('list', { name: 'Lieux de jam autour de toi' });
				await expect(nearby.getByText('E2E Le Préau')).toBeVisible();
				await page.getByRole('link', { name: 'Tous les lieux' }).click();
				await expect(page.getByRole('heading', { name: 'Lieux de jam' })).toBeVisible();
				await expect(page.getByText('E2E Le Préau')).toBeVisible();
				await expect(page.getByText('E2E La Cigale')).toHaveCount(0);
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
			});

			await test.step('2. J’ajoute le Bar des Amis, à Toulouse par défaut', async () => {
				await page.getByRole('link', { name: 'Ajouter un lieu' }).click();
				await waitForAppReady(page);
				await expect(page.getByLabel('Commune du lieu')).toHaveValue('Toulouse (31)');
				await page.getByLabel('Nom du lieu').fill('  Le Bar  des Amis ');
				await page.getByLabel('Type de lieu').selectOption('BAR');
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
				await page.getByRole('button', { name: 'Ajouter à l’annuaire' }).click();
				await expect(page.getByRole('heading', { name: 'Le Bar des Amis' })).toBeVisible();
				await expect(page.getByText('Bar · Toulouse (31)')).toBeVisible();
				const saved = await db.venue.findFirstOrThrow({ where: { createdById: myActorId! } });
				expect(saved).toMatchObject({
					name: 'Le Bar des Amis',
					nameKey: 'bar des amis',
					kind: 'BAR',
					communeCode: '31555'
				});
			});

			await test.step('3. Le même lieu, écrit autrement, est refusé', async () => {
				await page.goto('/lieux/nouveau');
				await waitForAppReady(page);
				await page.getByLabel('Nom du lieu').fill('bar des amis');
				await page.getByLabel('Type de lieu').selectOption('BAR');
				await page.getByRole('button', { name: 'Ajouter à l’annuaire' }).click();
				await expect(page.getByText('Ce lieu est déjà dans l’annuaire.')).toBeVisible();
				await page.getByRole('link', { name: 'Voir ce lieu' }).click();
				await expect(page.getByRole('heading', { name: 'Le Bar des Amis' })).toBeVisible();
				expect(await db.venue.count({ where: { createdById: myActorId! } })).toBe(1);
			});

			await test.step('4. Je le retrouve en cherchant', async () => {
				await page.goto('/lieux?q=amis');
				await waitForAppReady(page);
				const results = page.getByRole('region', { name: 'Résultats pour « amis »' });
				await expect(results.getByRole('link', { name: /Le Bar des Amis/ })).toBeVisible();
			});
		} finally {
			await db.venue.deleteMany({
				where: { createdById: { in: [other.actorId, ...(myActorId ? [myActorId] : [])] } }
			});
			await deleteMusicians([other]);
		}
	});
});
