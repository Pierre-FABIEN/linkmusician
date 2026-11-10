import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { makeAccount } from '../support/account';
import { db, deleteUser, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { setCity, skipOnboarding } from '../support/linkmusician';

/**
 * P4-05 — Annonces par métier : une musicienne publie « cherche ingé son,
 * prise de son » ; un ingé son qui fait de la prise de son la voit dans
 * « Autour de moi » et peut y répondre ; s'il ne garde que le mixage, elle
 * disparaît de sa liste (le refus de réponse est couvert par
 * `targeted.integration.test.ts`).
 */
test.describe('LinkMusician — annonces par métier', () => {
	test.setTimeout(6 * 60_000);

	test('seuls les profils du métier visé voient l’annonce', async ({ page, account, browser }) => {
		const engineerAccount = makeAccount();
		const engineerContext = await browser.newContext();
		const engineerPage = await engineerContext.newPage();
		const title = `Ingé son pour un titre ${Math.random().toString(36).slice(2, 6)}`;
		try {
			await test.step('1. Je publie une annonce « cherche ingé son, prise de son »', async () => {
				await signUpAndVerify(page, account);
				await skipOnboarding(page, account.email);
				await setCity(page);
				await page.goto('/annonces/nouvelle');
				await waitForAppReady(page);
				await page.getByLabel('Un·e ingé son').check();
				await expect(page.getByText('Seules les personnes de ce métier')).toBeVisible();
				await page.getByLabel('Spécialité').selectOption('RECORDING');
				await page.getByLabel('Titre').fill(title);
				await page
					.getByLabel('Description')
					.fill('Une voix et une guitare, un après-midi, dans le quartier Saint-Cyprien.');
				await expectNoA11yViolations(page, ['.cartButton']);
				await page.getByRole('button', { name: 'Publier' }).click();
				await page.waitForURL(/\/annonces\/[a-z0-9]+\?publiee=1/);
				await expect(page.getByText('Un·e ingé son · Prise de son')).toBeVisible();
			});

			await test.step('2. Un ingé son qui fait de la prise de son la voit', async () => {
				await signUpAndVerify(engineerPage, engineerAccount);
				await skipOnboarding(engineerPage, engineerAccount.email);
				const user = await requireUser(engineerAccount.email);
				const person = await db.person.findUniqueOrThrow({ where: { userId: user.id } });
				await db.personTrack.create({
					data: { personId: person.actorId, track: 'SOUND_ENGINEER', isPrimary: false }
				});
				await db.soundEngineerProfile.create({
					data: { personId: person.actorId, specialties: ['RECORDING', 'MIXING'] }
				});
				await setCity(engineerPage);
				await engineerPage.goto('/annonces');
				await waitForAppReady(engineerPage);
				const card = engineerPage.getByRole('link', { name: new RegExp(title) });
				await expect(card).toBeVisible();
				await expect(card).toContainText('Cherche : Un·e ingé son · Prise de son');
				await card.click();
				await waitForAppReady(engineerPage);
				await expect(engineerPage.getByText('Cette annonce demande des conditions')).toHaveCount(0);
			});

			await test.step('3. Sans la prise de son, l’annonce disparaît', async () => {
				const user = await requireUser(engineerAccount.email);
				const person = await db.person.findUniqueOrThrow({ where: { userId: user.id } });
				await db.soundEngineerProfile.update({
					where: { personId: person.actorId },
					data: { specialties: ['MIXING'] }
				});
				await engineerPage.goto('/annonces');
				await waitForAppReady(engineerPage);
				await expect(engineerPage.getByRole('link', { name: new RegExp(title) })).toHaveCount(0);
			});
		} finally {
			await engineerContext.close();
			await deleteUser(engineerAccount.email).catch(() => {});
		}
	});
});
