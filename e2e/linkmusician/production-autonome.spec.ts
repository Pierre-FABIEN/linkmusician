import { test, expect } from '../support/fixtures';
import { makeAccount } from '../support/account';
import { signUpAndVerify } from '../support/admin';
import { db, deleteUser, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { skipOnboarding } from '../support/linkmusician';

/**
 * DASH-06d (#54) — recette de bout en bout. Thomas, musicien sans métier
 * d'ingé son, part de Carrière, compose seul « Midnight Groove », prend
 * l'enregistrement chez lui (À faire → En cours → Terminé), ajoute « Prise de
 * son » à son crédit une seule fois, et se voit proposer le mixage.
 * Carrière et la fiche disent la même chose ; « déclaré », jamais vérifié ;
 * aucun point ; rien de visible hors de l'équipe ; une réouverture recalcule.
 */
test.describe('LinkMusician — enregistrement autonome de bout en bout', () => {
	test.setTimeout(5 * 60_000);
	const A11Y_EXCLUDE = ['.cartButton'];

	test('Thomas enregistre lui-même, se crédite et passe au mixage', async ({
		page,
		account,
		browser
	}) => {
		const otherAccount = makeAccount();
		const otherContext = await browser.newContext();
		const otherPage = await otherContext.newPage();
		const title = `E2E Midnight ${Math.random().toString(36).slice(2, 7)}`;
		try {
			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			await signUpAndVerify(otherPage, otherAccount);
			await skipOnboarding(otherPage, otherAccount.email);
			const thomas = await db.person.findUniqueOrThrow({
				where: { userId: (await requireUser(account.email)).id },
				select: { actorId: true, actor: { select: { displayName: true } } }
			});
			const name = thomas.actor.displayName;
			expect(
				await db.personTrack.count({ where: { personId: thomas.actorId, track: 'SOUND_ENGINEER' } })
			).toBe(0);
			const xp = () => db.xpTransaction.count({ where: { actorId: thomas.actorId } });
			// Une seule ligne de crédit pour Thomas, avec « Prise de son » une seule fois.
			const expectOnePrise = async () => {
				const mine = page
					.getByRole('region', { name: 'Crédits' })
					.getByRole('listitem')
					.filter({ hasText: name });
				await expect(mine).toHaveCount(1);
				expect((await mine.innerText()).match(/Prise de son/g)).toHaveLength(1);
			};
			const campaign = () => page.getByRole('list', { name: 'Mes campagnes' }).getByRole('link');

			let workId = '';
			await test.step('1. Depuis Carrière : une idée, une maquette, composé', async () => {
				await page.goto('/espace/campagnes');
				await waitForAppReady(page);
				await page.getByRole('link', { name: 'Nouvelle idée' }).first().click();
				await page.getByLabel('Titre (même provisoire)').fill(title);
				await page.getByLabel('Instrument ou voix').selectOption({ label: 'Guitare électrique' });
				await page.getByRole('button', { name: 'Noter l’idée' }).click();
				await expect(page.getByRole('heading', { name: title })).toBeVisible();
				workId = new URL(page.url()).pathname.split('/')[2];
				await page
					.getByLabel('Lien YouTube, SoundCloud ou Bandcamp')
					.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
				await page.getByRole('button', { name: 'Joindre', exact: true }).click();
				await expect(page.getByText('Maquette jointe.')).toBeVisible();
				await page.getByRole('button', { name: 'C’est composé' }).click();
				await expect(page.getByText('Bravo, le morceau est composé !')).toBeVisible();
				const suite = page.getByRole('region', { name: 'La suite du morceau' });
				await expect(suite).toContainText('prends l’enregistrement toi-même');
			});

			await test.step('2. Je m’en charge : persiste, plus de recrutement', async () => {
				await page.setViewportSize({ width: 390, height: 844 });
				await page.goto(`/morceaux/${workId}/etapes`);
				await waitForAppReady(page);
				await page.getByRole('button', { name: 'Je m’en charge' }).focus();
				await page.keyboard.press('Enter');
				await expect(page.getByText('tu prends l’enregistrement en charge')).toBeVisible();
				await page.reload();
				await waitForAppReady(page);
				await expect(page.getByText('Toi (soi-même)')).toBeVisible();
				await expect(page.getByText('Mon home studio · aucune adresse enregistrée')).toBeVisible();
				await page.goto(`/morceaux/${workId}`);
				await waitForAppReady(page);
				await expect(page.getByRole('region', { name: 'La suite du morceau' })).toContainText(
					'L’enregistrement est pris en charge'
				);
				await page.goto('/espace/campagnes');
				await waitForAppReady(page);
				await expect(campaign().filter({ hasText: title })).toContainText(
					'Enregistrement pris en charge'
				);
			});

			await test.step('3. Commencer : Carrière suit', async () => {
				await page.goto(`/morceaux/${workId}/etapes`);
				await waitForAppReady(page);
				await page.getByRole('button', { name: 'Commencer' }).click();
				await expect(page.locator('.lm-pill', { hasText: 'En cours' })).toBeVisible();
				await page.goto('/espace/campagnes');
				await waitForAppReady(page);
				await expect(campaign().filter({ hasText: title })).toContainText(
					'Enregistrement en cours'
				);
			});

			await test.step('4. Terminer, puis « Prise de son » une seule fois', async () => {
				await page.goto(`/morceaux/${workId}/etapes`);
				await waitForAppReady(page);
				await page.getByLabel('Je confirme que l’enregistrement est terminé.').check();
				await page.getByRole('button', { name: 'Terminer' }).click();
				await expect(page.locator('.lm-pill', { hasText: 'Terminé' })).toBeVisible();
				const next = page.getByLabel('Et maintenant');
				await next.getByRole('button', { name: 'Ajouter « Prise de son » à mon crédit' }).click();
				await expect(page.getByText('« Prise de son » est ajoutée à ton crédit.')).toBeVisible();
				await expect(next).toContainText('« Prise de son » figure dans ton crédit.');
				await expect(
					next.getByRole('link', { name: 'Trouver un·e ingé son pour le mixage' })
				).toBeVisible();
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
				expect(
					await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
				).toBe(true);
				// Rejouer la requête : rien de plus.
				const replay = await page.request.post(`/morceaux/${workId}/etapes?/creditRecording`, {
					form: {},
					headers: { Origin: new URL(page.url()).origin }
				});
				expect(replay.ok()).toBe(true);
				expect(await db.workContributor.count({ where: { workId } })).toBe(1);
				expect(await db.workRole.count({ where: { workId, kind: 'RECORDING' } })).toBe(1);
				expect(await db.workRoleAct.count({ where: { workId } })).toBe(1);
			});

			await test.step('5. Fiche et Carrière : enregistré, déclaré, sans point', async () => {
				await page.goto(`/morceaux/${workId}`);
				await waitForAppReady(page);
				const stages = page.getByRole('list', { name: 'Étapes du morceau' });
				await expect(stages).toContainText(new RegExp(`Enregistré le .* · déclaré par ${name}`));
				await expect(page.getByText(`Fait soi-même · déclaré par ${name}`)).toBeVisible();
				await expect(page.getByText(/A vérifié l’étape/)).toHaveCount(0);
				await expectOnePrise();
				const suite = page.getByRole('region', { name: 'La suite du morceau' });
				await expect(suite).toContainText('Place au mixage');
				await expect(suite).not.toContainText('prends l’enregistrement');
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
				await page.goto('/espace/campagnes');
				await waitForAppReady(page);
				await expect(campaign().filter({ hasText: title })).toContainText('Enregistré · déclaré');
				const work = await db.work.findUniqueOrThrow({ where: { id: workId } });
				expect(work.recordedAt).toBeNull();
				expect(work.proof).toBe('DECLARED');
				expect(await db.collaboration.count({ where: { workId } })).toBe(0);
				expect(await xp()).toBe(0);
			});

			await test.step('6. Hors de l’équipe : rien de déclaré, aucun POST', async () => {
				await otherPage.goto(`/morceaux/${workId}`);
				await waitForAppReady(otherPage);
				await expect(otherPage.getByRole('heading', { name: title })).toBeVisible();
				await expect(otherPage.getByText(/déclaré par/)).toHaveCount(0);
				const forged = await otherPage.request.post(`/morceaux/${workId}/etapes?/creditRecording`, {
					form: {},
					headers: { Origin: new URL(otherPage.url()).origin }
				});
				expect(forged.status()).toBe(403);
				const forgedRole = await otherPage.request.post(`/morceaux/${workId}?/addSoundRole`, {
					form: { kind: 'MIXING' },
					headers: { Origin: new URL(otherPage.url()).origin }
				});
				expect(forgedRole.status()).toBe(403);
			});

			await test.step('7. Rouvrir : la mention part, les besoins se recalculent', async () => {
				await page.goto(`/morceaux/${workId}/etapes`);
				await waitForAppReady(page);
				await page.getByRole('button', { name: 'Rouvrir' }).click();
				await expect(page.locator('.lm-pill', { hasText: 'En cours' })).toBeVisible();
				await page.goto(`/morceaux/${workId}`);
				await waitForAppReady(page);
				await expect(page.getByText(/déclaré par/)).toHaveCount(0);
				await expect(page.getByRole('region', { name: 'La suite du morceau' })).toContainText(
					'L’enregistrement est pris en charge'
				);
				// Le crédit de prise de son reste : c'est un rôle, pas une preuve.
				await expectOnePrise();
			});
		} finally {
			await otherContext.close();
			await deleteUser(otherAccount.email);
		}
	});
});
