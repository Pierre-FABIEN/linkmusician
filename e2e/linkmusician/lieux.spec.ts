import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { createMusician, deleteMusicians, setCity, skipOnboarding } from '../support/linkmusician';

/**
 * P2-14a — Annuaire des lieux : voir les lieux autour de soi, ajouter un
 * lieu (commune seulement, jamais d'adresse), doublon refusé, recherche.
 * P2-14c — Validation (D26) : le lieu d'un compte TL0 reste en attente,
 * invisible des autres, jusqu'à la confirmation d'un second membre TL1.
 * P2-14d — SIRET (D30) : un établissement connu est vérifié tout de suite.
 */
test.describe('LinkMusician — annuaire des lieux', () => {
	test.setTimeout(5 * 60_000);
	// Bouton panier du boilerplate (boutique active en e2e), remontée n° 14.
	const A11Y_EXCLUDE = ['.cartButton'];
	const blagnac = { code: '31069', nom: 'Blagnac', dep: '31', lat: 43.6459, lng: 1.3785 };

	/** SIRET fictif (clé de Luhn valide), présent seulement dans la base e2e. */
	const SIRET = '99900000100019';

	test('ajouter le Bar des Amis et le retrouver', async ({ page, account }) => {
		const other = await createMusician({ name: 'Batteuse', commune: blagnac });
		let myActorId: string | null = null;
		try {
			const venue = (
				name: string,
				communeCode: string,
				communeName: string,
				lat: number,
				lng: number,
				validated = true
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
						createdById: other.actorId,
						validatedAt: validated ? new Date() : null
					}
				});
			await venue('E2E Le Préau', blagnac.code, blagnac.nom, blagnac.lat, blagnac.lng);
			await venue('E2E La Cigale', '75056', 'Paris', 48.8589, 2.347);
			// Proposé par un compte récent : en attente de confirmation.
			const mimi = await venue(
				'E2E Chez Mimi',
				blagnac.code,
				blagnac.nom,
				blagnac.lat,
				blagnac.lng,
				false
			);

			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			await setCity(page);
			myActorId = (
				await db.person.findUniqueOrThrow({
					where: { userId: (await requireUser(account.email)).id }
				})
			).actorId;

			await test.step('1. Les lieux autour de moi, pas les lointains', async () => {
				await page.goto('/jam/agenda');
				await waitForAppReady(page);
				const nearby = page.getByRole('list', { name: 'Lieux de jam autour de toi' });
				await expect(nearby.getByText('E2E Le Préau')).toBeVisible();
				await page.getByRole('link', { name: 'Tous les lieux' }).click();
				await expect(page.getByRole('heading', { name: 'Lieux de jam' })).toBeVisible();
				await expect(page.getByText('E2E Le Préau')).toBeVisible();
				await expect(page.getByText('E2E La Cigale')).toHaveCount(0);
				// Lieu en attente : invisible d'un compte TL0 comme moi.
				await expect(page.getByText('E2E Chez Mimi')).toHaveCount(0);
				expect((await page.goto(`/lieux/${mimi.id}`))?.status()).toBe(404);
				await page.goto('/lieux');
				await waitForAppReady(page);
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
				// Compte TL0 : le lieu attend une confirmation (D26).
				await expect(
					page.getByRole('heading', { name: 'En attente de confirmation' })
				).toBeVisible();
				await expect(page.getByRole('link', { name: 'Publier une jam ici' })).toHaveCount(0);
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
				const saved = await db.venue.findFirstOrThrow({ where: { createdById: myActorId! } });
				expect(saved).toMatchObject({
					name: 'Le Bar des Amis',
					nameKey: 'bar des amis',
					kind: 'BAR',
					communeCode: '31555',
					validatedAt: null
				});
			});

			await test.step('3. Le même lieu, écrit autrement, est refusé', async () => {
				await page.goto('/lieux/nouveau');
				await waitForAppReady(page);
				await page.getByLabel('Nom du lieu').fill('bar des amis');
				await page.getByLabel('Type de lieu').selectOption('BAR');
				await page.getByRole('button', { name: 'Ajouter à l’annuaire' }).click();
				await expect(
					page.getByText('Tu as déjà proposé ce lieu : il attend une confirmation.')
				).toBeVisible();
				await page.getByRole('link', { name: 'Voir ce lieu' }).click();
				await expect(page.getByRole('heading', { name: 'Le Bar des Amis' })).toBeVisible();
				expect(await db.venue.count({ where: { createdById: myActorId! } })).toBe(1);
			});

			await test.step('4. En attente, il n’est pas dans la recherche, mais dans mes lieux', async () => {
				await page.goto('/lieux?q=amis');
				await waitForAppReady(page);
				const results = page.getByRole('region', { name: 'Résultats pour « amis »' });
				await expect(results.getByRole('link', { name: /Le Bar des Amis/ })).toHaveCount(0);
				const mine = page.getByRole('region', { name: 'Tes lieux en attente' });
				await expect(mine.getByRole('link', { name: /Le Bar des Amis/ })).toBeVisible();
			});

			await test.step('4 bis. Un bar connu, avec son SIRET, est validé tout de suite', async () => {
				await db.establishment.upsert({
					where: { siret: SIRET },
					create: {
						siret: SIRET,
						siren: SIRET.slice(0, 9),
						name: 'E2E Le Comptoir Sonore',
						nameKey: 'e2e comptoir sonore',
						naf: '56.30Z',
						communeCode: '31555',
						communeName: 'Toulouse',
						departmentCode: '31',
						active: true
					},
					update: {}
				});
				await page.goto('/lieux/nouveau');
				await waitForAppReady(page);
				// Un SIRET faux est refusé.
				await page.getByLabel('Nom du lieu').fill('Le Faux Comptoir');
				await page.getByLabel('Type de lieu').selectOption('BAR');
				await page.getByLabel(/Numéro SIRET/).fill('123 456 789 01234');
				await page.getByRole('button', { name: 'Ajouter à l’annuaire' }).click();
				await expect(page.getByText(/Ce numéro SIRET n’est pas valide/)).toBeVisible();
				// Suggestion d'établissement : nom, type, commune et SIRET remplis.
				await page.getByLabel('Nom du lieu').fill('');
				await page.getByLabel('Nom du lieu').pressSequentially('comptoir son');
				const suggestions = page.getByRole('list', { name: 'Établissements connus' });
				await suggestions.getByRole('button', { name: /E2E Le Comptoir Sonore/ }).click();
				await expect(page.getByLabel(/Numéro SIRET/)).toHaveValue(SIRET);
				await expect(page.getByLabel('Type de lieu')).toHaveValue('BAR');
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
				await page.getByRole('button', { name: 'Ajouter à l’annuaire' }).click();
				await expect(page.getByRole('heading', { name: 'E2E Le Comptoir Sonore' })).toBeVisible();
				await expect(page.getByText('Établissement vérifié (existe à l’Insee)')).toBeVisible();
				// D51 (Q30) : sans « prêt·e à organiser des jams », pas de « Publier une jam ici ».
				await expect(page.getByRole('link', { name: 'Publier une jam ici' })).toHaveCount(0);
				const verified = await db.venue.findUniqueOrThrow({ where: { siret: SIRET } });
				expect(verified.createdById).toBe(myActorId);
				expect(verified.validatedAt).not.toBeNull();
				expect(verified.verifiedAt).not.toBeNull();
			});

			await test.step('5. Devenu·e TL1, je confirme le lieu proposé par une autre', async () => {
				await db.actor.update({ where: { id: myActorId! }, data: { trustLevel: 1 } });
				await page.goto('/lieux');
				await waitForAppReady(page);
				const toConfirm = page.getByRole('region', { name: 'À confirmer près de toi' });
				await toConfirm.getByRole('link', { name: /E2E Chez Mimi/ }).click();
				await expect(page.getByRole('heading', { name: 'E2E Chez Mimi' })).toBeVisible();
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
				await page.getByRole('button', { name: 'Je confirme ce lieu' }).click();
				await expect(page.getByText(/Merci|confirmé/).first()).toBeVisible();
				await expect(page.getByRole('link', { name: 'Publier une jam ici' })).toHaveCount(0);
				const confirmed = await db.venue.findUniqueOrThrow({ where: { id: mimi.id } });
				expect(confirmed.confirmedById).toBe(myActorId);
				expect(confirmed.validatedAt).not.toBeNull();
				await page.goto('/lieux?q=mimi');
				await waitForAppReady(page);
				const results = page.getByRole('region', { name: 'Résultats pour « mimi »' });
				await expect(results.getByRole('link', { name: /E2E Chez Mimi/ })).toBeVisible();
			});
		} finally {
			await db.venue.deleteMany({
				where: { createdById: { in: [other.actorId, ...(myActorId ? [myActorId] : [])] } }
			});
			await db.establishment.deleteMany({ where: { siret: SIRET } });
			await deleteMusicians([other]);
		}
	});
});
