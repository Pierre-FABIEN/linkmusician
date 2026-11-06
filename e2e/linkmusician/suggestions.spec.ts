import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { createMusician, deleteMusicians, setCity, skipOnboarding } from '../support/linkmusician';

/**
 * P2-18 — Suggestions : une guitariste rock de niveau 3 à Toulouse voit une
 * batteuse rock de son niveau dans « Des musicien·nes pour toi », avec la
 * raison ; « Pas intéressé·e » la retire pour de bon.
 */
test.describe('LinkMusician — suggestions de musicien·nes', () => {
	test.setTimeout(5 * 60_000);
	// Bouton panier du boilerplate (boutique active en e2e), remontée n° 14.
	const A11Y_EXCLUDE = ['.cartButton'];

	test('je vois une batteuse rock de mon niveau', async ({ page, account }) => {
		const drummer = await createMusician({
			name: 'Batteuse',
			commune: { code: '31069', nom: 'Blagnac', dep: '31', lat: 43.6459, lng: 1.3785 },
			instrument: ['batterie', 3],
			genre: 'rock'
		});
		try {
			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			await setCity(page);
			const me = await db.person.findUniqueOrThrow({
				where: { userId: (await requireUser(account.email)).id }
			});
			const [guitar, rock] = await Promise.all([
				db.instrument.findUniqueOrThrow({ where: { slug: 'guitare-electrique' } }),
				db.genre.findUniqueOrThrow({ where: { slug: 'rock' } })
			]);
			await db.personInstrument.create({
				data: { personId: me.actorId, instrumentId: guitar.id, declaredLevel: 3, isPrimary: true }
			});
			await db.actorGenre.create({ data: { actorId: me.actorId, genreId: rock.id } });

			const list = page.getByRole('list', { name: 'Des musicien·nes pour toi' });
			await test.step('1. Dans mon espace, avec la raison', async () => {
				await page.goto('/espace');
				await waitForAppReady(page);
				const card = list.getByRole('listitem').filter({ hasText: drummer.displayName });
				await expect(card).toBeVisible();
				await expect(card).toContainText('Rock en commun · batterie · niveau proche');
				await expect(card).toContainText('5 à 10 km · Blagnac');
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
			});

			await test.step('2. « Pas intéressé·e » : retirée, et pour de bon', async () => {
				await page
					.getByRole('button', { name: `Pas intéressé·e par ${drummer.displayName}` })
					.click();
				await expect(page.getByText(drummer.displayName)).toHaveCount(0);
				await expect
					.poll(() => db.suggestionDismissal.count({ where: { ownerId: me.actorId } }))
					.toBe(1);
				await page.reload();
				await waitForAppReady(page);
				await expect(page.getByText(drummer.displayName)).toHaveCount(0);
			});
		} finally {
			await deleteMusicians([drummer]);
		}
	});
});
