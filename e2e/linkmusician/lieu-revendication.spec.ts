import { test, expect } from '../support/fixtures';
import { makeAccount } from '../support/account';
import { signUpAndVerify } from '../support/admin';
import { db, deleteUser, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { skipOnboarding } from '../support/linkmusician';
import { expectNoA11yViolations } from '../support/a11y';

/**
 * P5-03a — Revendication d'un lieu, niveau 1 (D31) : la gérante d'un bar
 * trouve la fiche ajoutée par un membre, clique « C'est mon lieu », reçoit
 * un code, le publie sur le compte Instagram du bar (simulé) et colle le
 * lien. La modération approuve : la fiche porte « Géré par le lieu », et
 * l'organisation du lieu existe, gérée par elle.
 */
test.describe('LinkMusician — revendication d’un lieu', () => {
	test.setTimeout(6 * 60_000);

	test('un bar revendique sa fiche avec le code publié sur son compte', async ({
		page,
		account,
		browser
	}) => {
		const moderator = makeAccount();
		const modContext = await browser.newContext();
		const mod = await modContext.newPage();
		const venueName = `E2E Bar Revendiqué ${Date.now().toString(36)}`;
		let venueId = '';
		try {
			await test.step('1. La fiche du bar existe, ajoutée par un membre', async () => {
				await signUpAndVerify(page, account);
				await skipOnboarding(page, account.email);
				const author = await db.person.findUniqueOrThrow({
					where: { userId: (await requireUser(account.email)).id }
				});
				venueId = (
					await db.venue.create({
						data: {
							name: venueName,
							nameKey: venueName.toLowerCase(),
							kind: 'BAR',
							communeCode: '31555',
							communeName: 'Toulouse',
							departmentCode: '31',
							lat: 43.6,
							lng: 1.44,
							createdById: author.actorId,
							validatedAt: new Date()
						}
					})
				).id;
			});

			const claim = page.getByRole('region', { name: 'C’est ton lieu ?' });
			let code = '';

			await test.step('2. « C’est mon lieu » : un code à publier', async () => {
				await page.goto(`/lieux/${venueId}`);
				await waitForAppReady(page);
				await claim.getByRole('button', { name: 'C’est mon lieu' }).click();
				const shown = claim.getByTestId('claim-code');
				await expect(shown).toHaveText(/^LM-[A-Z2-9]{8}$/);
				code = (await shown.textContent())!.trim();
			});

			await test.step('3. Je colle le lien du compte où je l’ai publié', async () => {
				await claim
					.getByLabel('Lien où le code est publié')
					.fill('https://www.instagram.com/e2e-bar-revendique');
				await claim.getByRole('button', { name: 'Envoyer pour vérification' }).click();
				await expect(claim.getByRole('status')).toContainText('en cours d’examen');
				await expectNoA11yViolations(page, ['.cartButton']);
			});

			await test.step('4. La modération voit le code attendu et approuve', async () => {
				await signUpAndVerify(mod, moderator);
				await skipOnboarding(mod, moderator.email);
				await db.user.update({ where: { email: moderator.email }, data: { role: 'MODERATOR' } });
				await mod.goto('/moderation');
				await waitForAppReady(mod);
				const request = mod.getByRole('article', { name: `Revendication de ${venueName}` });
				await expect(request).toContainText(code);
				await expect(
					request.getByRole('link', { name: 'https://www.instagram.com/e2e-bar-revendique' })
				).toBeVisible();
				await request.getByRole('button', { name: 'Approuver' }).click();
				await expect
					.poll(
						async () =>
							(await db.venue.findUniqueOrThrow({ where: { id: venueId } })).claimedByActorId
					)
					.not.toBeNull();
			});

			await test.step('5. La fiche est « Géré par le lieu », gérée par moi', async () => {
				await page.reload();
				await waitForAppReady(page);
				await expect(page.getByText('Géré par le lieu')).toBeVisible();
				await expect(claim).toHaveCount(0);
				const venue = await db.venue.findUniqueOrThrow({
					where: { id: venueId },
					select: { claimedBy: { select: { organization: { include: { memberships: true } } } } }
				});
				expect(venue.claimedBy?.organization?.kind).toBe('VENUE');
				const me = await db.person.findUniqueOrThrow({
					where: { userId: (await requireUser(account.email)).id }
				});
				expect(venue.claimedBy?.organization?.memberships.map((m) => [m.personId, m.role])).toEqual(
					[[me.actorId, 'OWNER']]
				);
			});
		} finally {
			await modContext.close();
			if (venueId) {
				const venue = await db.venue.findUnique({ where: { id: venueId } });
				await db.venue.deleteMany({ where: { id: venueId } });
				if (venue?.claimedByActorId) {
					await db.actor.deleteMany({ where: { id: venue.claimedByActorId } });
				}
			}
			await deleteUser(moderator.email);
		}
	});
});
