import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady, waitForPath } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { createMusician, deleteMusicians, setCity, skipOnboarding } from '../support/linkmusician';

/**
 * P4-13a — Coups de pouce (conception 07 §4.7) : rien ne bouge depuis un
 * moment ; mon espace propose « Un coup de pouce ». Mon morceau attend une
 * voix et Léa, de mon réseau, chante près de chez moi : l'écran me le dit,
 * sans reproche, et me mène au morceau.
 */
test.describe('LinkMusician — coups de pouce', () => {
	test.setTimeout(2 * 60_000);
	const toulouse = { code: '31555', nom: 'Toulouse', dep: '31', lat: 43.6007, lng: 1.4328 };

	test('un coup de pouce tiré de mon réseau', async ({ page, account }) => {
		const created: Awaited<ReturnType<typeof createMusician>>[] = [];
		try {
			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			await setCity(page);
			const me = await db.person.findUniqueOrThrow({
				where: { userId: (await requireUser(account.email)).id }
			});

			await test.step('1. Tant que j’avance, pas de coup de pouce', async () => {
				await page.goto('/espace');
				await waitForAppReady(page);
				await expect(page.getByRole('link', { name: /Un coup de pouce/ })).toHaveCount(0);
			});

			// Arrivé·e il y a un mois, sans rien depuis ; un morceau qui attend une
			// voix ; Léa, chanteuse gardée dans mon réseau après une jam.
			const lea = await createMusician({
				name: 'Lea',
				commune: toulouse,
				instrument: ['chant', 3]
			});
			created.push(lea);
			await db.musicalTie.create({ data: { ownerId: me.actorId, contactId: lea.actorId } });
			await db.domainEvent.deleteMany({ where: { actorIds: { has: me.actorId } } });
			await db.actor.update({
				where: { id: me.actorId },
				data: { createdAt: new Date(Date.now() - 30 * 86_400_000) }
			});
			const chant = await db.instrument.findUniqueOrThrow({ where: { slug: 'chant' } });
			const work = await db.work.create({
				data: {
					ownerId: me.actorId,
					createdById: me.actorId,
					title: 'Lumière',
					roles: { create: { kind: 'INSTRUMENT', instrumentId: chant.id } }
				}
			});

			await test.step('2. Mon espace propose un coup de pouce', async () => {
				await page.goto('/espace');
				await waitForAppReady(page);
				await page.getByRole('link', { name: /Un coup de pouce/ }).click();
				await waitForPath(page, '/espace/coups-de-pouce');
				await waitForAppReady(page);
			});

			await test.step('3. Léa, de mon réseau, peut chanter sur mon morceau', async () => {
				const list = page.getByRole('list', { name: 'Coups de pouce' });
				await expect(
					list.getByRole('heading', { name: '« Lumière » attend : chant' })
				).toBeVisible();
				await expect(list.getByText(/Lea, de ton réseau, en joue près de chez toi/)).toBeVisible();
				// Relecture : ni durée d'absence, ni reproche, ni XP.
				await expect(list).not.toContainText(/depuis|inactif|XP/);
				await expectNoA11yViolations(page, ['.cartButton']);
				await list.getByRole('link', { name: 'Voir le morceau' }).click();
				await waitForPath(page, `/morceaux/${work.id}`);
			});
		} finally {
			await deleteMusicians(created);
		}
	});
});
