import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady, waitForPath } from '../support/flows';
import { skipOnboarding } from '../support/linkmusician';

/**
 * RV-01 (#100) — Une action de formulaire s'exécute avant les `load` : la
 * garde du layout `(app)` ne suffisait pas. Un compte suspendu alors qu'une
 * page est ouverte ne peut plus rien écrire, ni par le bouton (`use:enhance`),
 * ni par un POST direct sur l'action.
 */
test.describe('LinkMusician — suspension et écritures', () => {
	test.setTimeout(4 * 60_000);

	test('un compte suspendu ne peut plus écrire', async ({ page, account }) => {
		await signUpAndVerify(page, account);
		await skipOnboarding(page, account.email);
		const user = await requireUser(account.email);
		const me = await db.person.findUniqueOrThrow({ where: { userId: user.id } });

		await test.step('1. La page est ouverte, puis le compte est suspendu', async () => {
			await page.goto('/jam/dispos');
			await waitForAppReady(page);
			await expect(page.getByRole('button', { name: 'Je suis dispo' })).toBeVisible();
			await db.sanction.create({
				data: {
					actorId: me.actorId,
					kind: 'SUSPENSION',
					reason: 'Test RV-01',
					createdByUserId: user.id
				}
			});
		});

		await test.step('2. Le bouton renvoie vers /suspendu, sans rien écrire', async () => {
			await page.getByRole('button', { name: 'Je suis dispo' }).click();
			await waitForPath(page, '/suspendu');
			expect(await db.availability.count({ where: { actorId: me.actorId } })).toBe(0);
		});

		await test.step('3. Un POST direct sur l’action est refusé', async () => {
			const origin = new URL(page.url()).origin;
			const response = await page.request.post('/jam/dispos?/dispo', {
				form: { slot: 'TONIGHT', note: '' },
				headers: { origin },
				maxRedirects: 0
			});
			expect(response.status()).toBe(303);
			expect(response.headers()['location']).toBe('/suspendu');
			expect(await db.availability.count({ where: { actorId: me.actorId } })).toBe(0);
		});
	});
});
