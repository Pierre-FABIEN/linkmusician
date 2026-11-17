import { test, expect } from '../support/fixtures';
import { makeAccount } from '../support/account';
import { signUpAndVerify } from '../support/admin';
import { db, deleteUser, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { skipOnboarding } from '../support/linkmusician';

/**
 * DASH-06a (#51, D68) — Thomas, guitariste-chanteur sans métier d'ingé son,
 * prend lui-même l'enregistrement de « Midnight Groove » : home studio sans
 * adresse, À faire → En cours → Terminé (avec confirmation), persistance au
 * rechargement, réouverture tracée. Une autre personne ne peut rien forger.
 */
test.describe('LinkMusician — étapes autonomes', () => {
	test.setTimeout(4 * 60_000);
	const A11Y_EXCLUDE = ['.cartButton'];

	test('Thomas enregistre lui-même son morceau', async ({ page, account, browser }) => {
		const otherAccount = makeAccount();
		const otherContext = await browser.newContext();
		const otherPage = await otherContext.newPage();
		const title = `E2E Midnight Groove ${Math.random().toString(36).slice(2, 7)}`;
		try {
			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			await signUpAndVerify(otherPage, otherAccount);
			await skipOnboarding(otherPage, otherAccount.email);
			const thomas = await db.person.findUniqueOrThrow({
				where: { userId: (await requireUser(account.email)).id }
			});
			expect(
				await db.personTrack.count({
					where: { personId: thomas.actorId, track: 'SOUND_ENGINEER' }
				})
			).toBe(0);

			let workId = '';
			await test.step('1. Une idée, puis « Qui prend en charge ? »', async () => {
				await page.goto('/morceaux/nouveau');
				await waitForAppReady(page);
				await page.getByLabel('Titre (même provisoire)').fill(title);
				await page.getByLabel('Instrument ou voix').selectOption({ label: 'Guitare électrique' });
				await page.getByRole('button', { name: 'Noter l’idée' }).click();
				await expect(page.getByRole('heading', { name: title })).toBeVisible();
				workId = new URL(page.url()).pathname.split('/')[2];
				await expect(page.getByText('Enregistrement : personne pour l’instant')).toBeVisible();
				await page.getByRole('link', { name: /Qui prend en charge/ }).click();
				await expect(page).toHaveURL(`/morceaux/${workId}/etapes`);
				await expect(
					page.getByRole('heading', { name: 'Qui prend en charge ?', level: 1 })
				).toBeVisible();
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
			});

			await test.step('2. Je m’en charge, chez moi, au clavier et à 390 px', async () => {
				await page.setViewportSize({ width: 390, height: 844 });
				await page.getByRole('button', { name: 'Je m’en charge' }).focus();
				await page.keyboard.press('Enter');
				await expect(page.getByText('tu prends l’enregistrement en charge')).toBeVisible();
				await page.reload();
				await waitForAppReady(page);
				await expect(page.getByText('Toi (soi-même)')).toBeVisible();
				await expect(page.getByText('Mon home studio · aucune adresse enregistrée')).toBeVisible();
				await expect(page.locator('.lm-pill', { hasText: 'À faire' })).toBeVisible();
				const step = await db.workStep.findFirstOrThrow({ where: { workId } });
				expect(step).toMatchObject({
					mode: 'SELF',
					place: 'HOME',
					status: 'TODO',
					assigneeId: thomas.actorId,
					startedAt: null,
					doneAt: null
				});
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
				expect(
					await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
				).toBe(true);
			});

			await test.step('3. Commencer, puis terminer avec confirmation', async () => {
				await page.getByRole('button', { name: 'Commencer' }).click();
				await expect(page.locator('.lm-pill', { hasText: 'En cours' })).toBeVisible();
				const finish = page.getByRole('button', { name: 'Terminer' });
				await expect(finish).toBeDisabled();
				await page.getByLabel('Je confirme que l’enregistrement est terminé.').check();
				await finish.click();
				await expect(page.locator('.lm-pill', { hasText: 'Terminé' })).toBeVisible();
				await expect(page.getByText(/déclaré par toi/)).toBeVisible();
				const step = await db.workStep.findFirstOrThrow({ where: { workId } });
				expect(step.status).toBe('DONE');
				expect(step.startedAt).not.toBeNull();
				expect(step.doneAt).not.toBeNull();
				// Rien d'autre : ni enregistrement « prouvé », ni crédit du son.
				const work = await db.work.findUniqueOrThrow({ where: { id: workId } });
				expect(work.recordedAt).toBeNull();
				expect(await db.workRole.count({ where: { workId, kind: 'RECORDING' } })).toBe(0);
			});

			await test.step('4. Rouvrir, avec un historique', async () => {
				await page.getByRole('button', { name: 'Rouvrir' }).click();
				await expect(page.locator('.lm-pill', { hasText: 'En cours' })).toBeVisible();
				await page.getByText('Historique de l’étape').click();
				const history = page.getByRole('list', { name: 'Historique de l’étape Enregistrement' });
				await expect(history.locator('li')).toHaveCount(4);
				await expect(history.getByText('Rouverte')).toBeVisible();
				await page.setViewportSize({ width: 1280, height: 800 });
				await page.goto(`/morceaux/${workId}`);
				await expect(page.getByText('Enregistrement : toi · en cours')).toBeVisible();
			});

			await test.step('5. Une autre personne : ni lecture ni POST forgé', async () => {
				expect((await otherPage.request.get(`/morceaux/${workId}/etapes`)).status()).toBe(404);
				const forged = await otherPage.request.post(`/morceaux/${workId}/etapes?/step`, {
					form: { kind: 'RECORDING', action: 'finish', confirm: '1' },
					headers: { Origin: new URL(page.url()).origin }
				});
				expect(forged.status()).toBe(403);
				// Une révision dépassée (autre onglet) est refusée sans rien changer.
				const stale = await page.request.post(`/morceaux/${workId}/etapes?/step`, {
					form: { kind: 'RECORDING', action: 'reset', revision: '0' },
					headers: { Origin: new URL(page.url()).origin }
				});
				expect(stale.status()).toBe(409);
				// Un statut envoyé par le client est ignoré : seule l'intention compte.
				const { revision } = await db.workStep.findFirstOrThrow({ where: { workId } });
				const crafted = await page.request.post(`/morceaux/${workId}/etapes?/step`, {
					form: { kind: 'RECORDING', action: 'reset', status: 'DONE', revision: String(revision) },
					headers: { Origin: new URL(page.url()).origin }
				});
				expect(crafted.ok()).toBe(true);
				expect((await db.workStep.findFirstOrThrow({ where: { workId } })).status).toBe('TODO');
			});
		} finally {
			await otherContext.close();
			await deleteUser(otherAccount.email);
		}
	});
});
