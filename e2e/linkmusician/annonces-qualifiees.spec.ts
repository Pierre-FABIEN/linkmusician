import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { createMusician, deleteMusicians, setCity, skipOnboarding } from '../support/linkmusician';

/**
 * ONB-13b (#27, D63) — annonce qualifiée. Je publie une annonce avec une
 * rémunération et une fourchette, et un engagement régulier : ces conditions
 * s'affichent sur l'annonce et dans la liste. Face à l'annonce d'une autre
 * personne, un profil qui ne dit rien de son engagement peut postuler
 * (« non précisé ») ; un profil « de temps en temps » ne le peut pas, même
 * par un POST forgé : le serveur revérifie. Jamais l'XP.
 */
test.describe('LinkMusician — annonces qualifiées', () => {
	test.setTimeout(5 * 60_000);
	const A11Y_EXCLUDE = ['.cartButton'];

	test('conditions publiées, affichées et revérifiées', async ({ page, account }) => {
		const other = await createMusician({
			name: 'Batterie',
			commune: { code: '31069', nom: 'Blagnac', dep: '31', lat: 43.6459, lng: 1.3785 }
		});
		try {
			const theirs = await db.opportunity.create({
				data: {
					issuerActorId: other.actorId,
					kind: 'RECRUIT_MEMBER',
					title: `Rock régulier ${other.handle}`,
					description: 'Groupe de rock, répétition chaque semaine, cherche batteur ou batteuse.',
					radiusKm: 25,
					pay: 'PAID',
					payMinEuros: 200,
					commitment: 'REGULAR',
					expiresAt: new Date(Date.now() + 14 * 86_400_000)
				}
			});
			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			await setCity(page);
			const me = await db.person.findUniqueOrThrow({
				where: { userId: (await requireUser(account.email)).id }
			});
			await db.musicianProfile.deleteMany({ where: { personId: me.actorId } });

			await test.step('1. Je publie : rémunéré 150 à 300 €, engagement régulier', async () => {
				await page.setViewportSize({ width: 390, height: 844 });
				await page.goto('/annonces/nouvelle');
				await waitForAppReady(page);
				await page.getByLabel('Titre').fill('Groupe soul cherche basse');
				await page
					.getByLabel('Description')
					.fill('Groupe soul cherche un·e bassiste pour répéter chaque semaine.');
				const conditions = page.getByRole('group', { name: 'Conditions (facultatif)' });
				await conditions.getByLabel('Rémunération').selectOption({ label: 'Rémunéré' });
				await conditions.getByLabel('De (€, facultatif)').fill('150');
				await conditions.getByLabel('À (€, facultatif)').fill('300');
				await conditions.getByLabel('Engagement').selectOption({ label: 'Régulier' });
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
				expect(
					await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
				).toBe(true);
				await page.getByRole('button', { name: 'Publier' }).click();
				await expect(page).toHaveURL(/\/annonces\/c.*publiee=1/);
				const wanted = page.getByRole('region', { name: 'Ce qui est recherché' });
				await expect(wanted).toContainText(/Rémunération : Rémunéré · 150\s€ à 300\s€/);
				await expect(wanted).toContainText('Engagement : Régulier');
				const row = await db.opportunity.findFirstOrThrow({
					where: { issuerActorId: me.actorId },
					orderBy: { createdAt: 'desc' }
				});
				expect(row).toMatchObject({
					pay: 'PAID',
					payMinEuros: 150,
					payMaxEuros: 300,
					commitment: 'REGULAR',
					presence: null,
					formation: null
				});
				expect(await db.xpTransaction.count({ where: { actorId: me.actorId } })).toBe(0);
			});

			await test.step('2. La liste montre la rémunération', async () => {
				await page.goto('/annonces');
				await waitForAppReady(page);
				const card = page
					.getByRole('list', { name: 'Annonces autour de toi' })
					.getByRole('listitem')
					.filter({ hasText: theirs.title });
				await expect(card).toContainText(/Rémunéré · à partir de 200\s€/);
			});

			await test.step('3. Engagement non précisé : je peux postuler', async () => {
				await page.goto(`/annonces/${theirs.id}`);
				await waitForAppReady(page);
				await expect(
					page.getByText('Non précisé : ton engagement n’est pas précisé sur ton profil')
				).toBeVisible();
				await expect(page.getByRole('button', { name: 'Envoyer ma candidature' })).toBeVisible();
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
			});

			await test.step('4. « De temps en temps » : refusé, même par un POST forgé', async () => {
				await db.musicianProfile.create({
					data: { personId: me.actorId, commitment: 'OCCASIONAL' }
				});
				await page.reload();
				await waitForAppReady(page);
				await expect(page.getByText(/engagement régulier/)).toBeVisible();
				await expect(page.getByRole('button', { name: 'Envoyer ma candidature' })).toHaveCount(0);
				const forged = await page.request.post(`/annonces/${theirs.id}?/apply`, {
					form: { message: 'Je postule quand même, en forgeant la requête.' },
					headers: { Origin: new URL(page.url()).origin }
				});
				expect(forged.status()).toBe(400);
				expect(await db.application.count({ where: { opportunityId: theirs.id } })).toBe(0);
			});
		} finally {
			await deleteMusicians([other]);
		}
	});
});
