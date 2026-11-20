import { test, expect } from '../support/fixtures';
import { makeAccount } from '../support/account';
import { signUpAndVerify } from '../support/admin';
import { db, deleteUser, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { skipOnboarding } from '../support/linkmusician';

/**
 * D81 (conception 23) — « Tu partages ta musique, pas tes déplacements. »
 * Léa et Ami étaient à la même jam. Par défaut, personne ne voit personne.
 * Léa partage ses jams passées avec Ami, puis les lui masque depuis son
 * profil. Pendant une jam, les deux se rendent visibles sur place, l'une se
 * masque. Le partage public exige un consentement explicite.
 */
test.describe('LinkMusician — confidentialité des jams', () => {
	test.setTimeout(6 * 60_000);
	const A11Y_EXCLUDE = ['.cartButton'];

	test('partage choisi, masquage et visibilité sur place', async ({ page, account, browser }) => {
		const amiAccount = makeAccount();
		const amiContext = await browser.newContext();
		const ami = await amiContext.newPage();
		let leaId: string | null = null;
		try {
			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			await signUpAndVerify(ami, amiAccount);
			await skipOnboarding(ami, amiAccount.email);
			const person = async (email: string) =>
				db.person.findUniqueOrThrow({
					where: { userId: (await requireUser(email)).id },
					include: { actor: true }
				});
			const lea = await person(account.email);
			const amiPerson = await person(amiAccount.email);
			leaId = lea.actorId;
			const venue = await db.venue.create({
				data: {
					name: 'E2E Bar Discret',
					nameKey: 'e2e bar discret',
					kind: 'BAR',
					communeCode: '31555',
					communeName: 'Toulouse',
					departmentCode: '31',
					lat: 43.6,
					lng: 1.44,
					createdById: lea.actorId,
					validatedAt: new Date()
				}
			});
			const now = Date.now();
			const jam = (title: string, start: number, end: number) =>
				db.opportunity.create({
					data: {
						issuerActorId: lea.actorId,
						kind: 'JAM',
						title,
						description: '',
						startsAt: new Date(start),
						endsAt: new Date(end),
						expiresAt: new Date(end),
						venueId: venue.id
					}
				});
			const past = await jam('E2E Jam passée', now - 26 * 3_600_000, now - 23 * 3_600_000);
			const live = await jam('E2E Jam en cours', now - 3_600_000, now + 2 * 3_600_000);
			await db.jamAttendance.createMany({
				data: [past, live].flatMap((j) =>
					[lea.actorId, amiPerson.actorId].map((actorId) => ({
						opportunityId: j.id,
						actorId,
						attendedAt: new Date()
					}))
				)
			});
			const presents = ami.getByRole('list', { name: 'Présent·es' });

			await test.step('1. Par défaut, Ami ne voit pas Léa', async () => {
				await ami.goto(`/jams/${past.id}/presents`);
				await waitForAppReady(ami);
				await expect(ami.getByText(/les présences sont privées/)).toBeVisible();
				await expect(presents).toHaveCount(0);
			});

			await test.step('2. Léa partage ses jams passées avec Ami', async () => {
				await page.goto('/reglages/confidentialite');
				await waitForAppReady(page);
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
				await page.getByLabel(/Mes jams passées/).selectOption('SELECTED');
				await page.getByRole('button', { name: 'Enregistrer' }).click();
				await expect(page.getByText('Partage enregistré.')).toBeVisible();
				await page
					.getByRole('region', { name: 'Personnes que j’autorise' })
					.getByLabel('Identifiant')
					.fill(`@${amiPerson.actor.handle}`);
				await page.getByRole('button', { name: 'Autoriser' }).click();
				await expect(page.getByRole('list', { name: 'Personnes autorisées' })).toContainText(
					amiPerson.actor.displayName
				);
			});

			await test.step('3. Ami voit maintenant Léa, sur cette jam passée', async () => {
				await ami.reload();
				await waitForAppReady(ami);
				await expect(presents.getByText(lea.actor.displayName, { exact: true })).toBeVisible();
			});

			await test.step('4. Le public exige un consentement explicite', async () => {
				const origin = new URL(page.url()).origin;
				const forced = await page.request.post('/reglages/confidentialite?/modes', {
					form: { past: 'PUBLIC', future: 'PRIVATE' },
					headers: { origin, 'x-sveltekit-action': 'true' }
				});
				expect(await forced.text()).toContain('Coche la case');
				expect(
					(
						await db.activityVisibilityPreference.findUniqueOrThrow({
							where: { actorId: lea.actorId }
						})
					).past
				).toBe('SELECTED');
			});

			await test.step('5. Léa masque ses jams à Ami depuis son profil, sans le prévenir', async () => {
				await page.goto(`/@${amiPerson.actor.handle}`);
				await waitForAppReady(page);
				await page.getByText(`Mes jams et ${amiPerson.actor.displayName}`).click();
				await page.getByRole('button', { name: 'Masquer mes jams' }).click();
				await expect(page.getByText(/Tes jams lui sont masquées/).first()).toBeVisible();
				await ami.reload();
				await waitForAppReady(ami);
				await expect(presents).toHaveCount(0);
				expect(
					await db.notification.count({ where: { recipientActorId: amiPerson.actorId } })
				).toBe(0);
				await page.getByRole('button', { name: 'Ne plus masquer' }).click();
				await expect(page.getByRole('button', { name: 'Masquer mes jams' })).toBeVisible();
				expect(
					await db.activityVisibilityExclusion.count({ where: { ownerId: lea.actorId } })
				).toBe(0);
			});

			await test.step('6. Sur place : visibilité réciproque, puis Léa se masque', async () => {
				// Léa revient au privé : seule la découverte sur place peut la montrer.
				await db.activityVisibilityPreference.update({
					where: { actorId: lea.actorId },
					data: { past: 'PRIVATE' }
				});
				await ami.goto(`/jams/${live.id}/presents`);
				await waitForAppReady(ami);
				await ami.getByRole('button', { name: 'Me rendre visible ici' }).click();
				await expect(ami.getByText('Tu es visible ici, jusqu’à la fin de la jam.')).toBeVisible();
				// Seul·e visible : Ami ne voit encore personne.
				await expect(presents).toHaveCount(0);
				await page.goto(`/jams/${live.id}/presents`);
				await waitForAppReady(page);
				await page.getByRole('button', { name: 'Me rendre visible ici' }).click();
				await expect(
					page.getByRole('list', { name: 'Présent·es' }).getByText(amiPerson.actor.displayName, {
						exact: true
					})
				).toBeVisible();
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
				await ami.reload();
				await waitForAppReady(ami);
				await expect(presents.getByText(lea.actor.displayName, { exact: true })).toBeVisible();
				await page.getByRole('button', { name: 'Me masquer' }).click();
				await expect(page.getByText('Tu n’es plus visible ici.')).toBeVisible();
				await ami.reload();
				await waitForAppReady(ami);
				await expect(presents).toHaveCount(0);
				// Aucune XP née de la visibilité sur place.
				expect(
					await db.xpTransaction.count({
						where: { actorId: { in: [lea.actorId, amiPerson.actorId] } }
					})
				).toBe(0);
			});
		} finally {
			await amiContext.close();
			if (leaId) {
				await db.opportunity.deleteMany({ where: { issuerActorId: leaId } });
				await db.venue.deleteMany({ where: { createdById: leaId } });
			}
			await deleteUser(amiAccount.email);
		}
	});
});
