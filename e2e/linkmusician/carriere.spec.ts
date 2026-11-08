import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { setCity, skipOnboarding } from '../support/linkmusician';

/**
 * P3-12 — Écran de carrière en page-menu (D50) et ambition : je choisis
 * « Monter sur scène », l'objectif mis en avant change ; j'en change, rien
 * n'est retiré.
 */
test.describe('LinkMusician — écran de carrière', () => {
	test.setTimeout(2 * 60_000);
	const A11Y_EXCLUDE = ['.cartButton'];

	test('je choisis mon ambition, mes objectifs suivent', async ({ page, account }) => {
		await signUpAndVerify(page, account);
		await skipOnboarding(page, account.email);
		const person = await db.person.findUniqueOrThrow({
			where: { userId: (await requireUser(account.email)).id }
		});
		// Profil de base rempli en base : les objectifs d'ambition passent devant.
		const guitar = await db.instrument.findUniqueOrThrow({ where: { slug: 'guitare-electrique' } });
		const rock = await db.genre.findUniqueOrThrow({ where: { slug: 'rock' } });
		await db.personInstrument.create({
			data: { personId: person.actorId, instrumentId: guitar.id, declaredLevel: 3, isPrimary: true }
		});
		await db.actorGenre.create({ data: { actorId: person.actorId, genreId: rock.id } });
		await setCity(page);

		const menu = page.getByRole('navigation', { name: 'Mode carrière' });
		await test.step('1. Le menu de carrière : l’ambition est à choisir', async () => {
			await page.goto('/espace');
			await waitForAppReady(page);
			await expect(menu.getByRole('link', { name: /Mon ambition.*À choisir/ })).toBeVisible();
			await expectNoA11yViolations(page, A11Y_EXCLUDE);
		});

		await test.step('2. « Monter sur scène » : un groupe et un morceau d’abord', async () => {
			await menu.getByRole('link', { name: /Mon ambition/ }).click();
			await page.getByLabel(/Monter sur scène/).check();
			await page.getByRole('button', { name: 'Enregistrer' }).click();
			await expect(page.getByText(/C’est noté : « Monter sur scène »/)).toBeVisible();
			await page.goto('/espace/objectifs');
			await waitForAppReady(page);
			await expect(page.getByText('Rejoins ou monte un groupe')).toBeVisible();
		});

		await test.step('3. « Enregistrer et sortir » : la démo passe devant', async () => {
			await page.goto('/espace/ambition');
			await waitForAppReady(page);
			await page.getByLabel(/Enregistrer et sortir/).check();
			await page.getByRole('button', { name: 'Enregistrer' }).click();
			await expect(page.getByText(/C’est noté/)).toBeVisible();
			await page.goto('/espace/objectifs');
			await waitForAppReady(page);
			await expect(page.getByText('Publie ta première démo')).toBeVisible();
			expect(
				(await db.person.findUniqueOrThrow({ where: { actorId: person.actorId } })).ambition
			).toBe('RECORD');
		});
	});

	test('carte : un morceau composé à plusieurs franchit l’acte II, pas seul·e', async ({
		page,
		account
	}) => {
		await signUpAndVerify(page, account);
		await skipOnboarding(page, account.email);
		const person = await db.person.findUniqueOrThrow({
			where: { userId: (await requireUser(account.email)).id }
		});
		const work = (title: string, proof: 'DECLARED' | 'CORROBORATED') =>
			db.work.create({
				data: {
					ownerId: person.actorId,
					createdById: person.actorId,
					title,
					state: 'COMPOSED',
					proof,
					composedAt: new Date(),
					contributors: { create: [{ personId: person.actorId, confirmedAt: new Date() }] }
				}
			});
		const acts = page.getByRole('list', { name: 'Actes de la carrière' });

		await test.step('1. Composé seul·e : l’acte II reste à franchir', async () => {
			await work('Ma compo solo', 'DECLARED');
			await page.goto('/espace/carte');
			await waitForAppReady(page);
			await expect(page.getByText(/Tu as composé seul·e/)).toBeVisible();
			await expect(acts.locator('li').nth(1)).toContainText('Ouvert');
			await expectNoA11yViolations(page, A11Y_EXCLUDE);
		});

		await test.step('2. Composé à plusieurs : épreuve franchie', async () => {
			await work('Notre compo', 'CORROBORATED');
			await page.reload();
			await waitForAppReady(page);
			await expect(acts.locator('li').nth(1)).toContainText('Épreuve franchie');
			await expect(acts.locator('li').first()).toContainText('Acte en cours');
		});
	});

	test('fiche : les données privées restent privées, une carte souvenir se partage', async ({
		page,
		account
	}) => {
		await signUpAndVerify(page, account);
		await skipOnboarding(page, account.email);
		const person = await db.person.findUniqueOrThrow({
			where: { userId: (await requireUser(account.email)).id },
			include: { actor: true }
		});
		const peer = await db.actor.create({
			data: {
				kind: 'PERSON',
				handle: `fiche-peer-${Math.random().toString(36).slice(2, 9)}`,
				displayName: 'Fiche Peer'
			}
		});
		try {
			await db.work.create({
				data: {
					ownerId: person.actorId,
					createdById: person.actorId,
					title: 'Morceau à plusieurs',
					state: 'COMPOSED',
					proof: 'CORROBORATED',
					composedAt: new Date(),
					contributors: {
						create: [
							{ personId: person.actorId, confirmedAt: new Date() },
							{ personId: peer.id, confirmedAt: new Date() }
						]
					}
				}
			});

			await test.step('1. La fiche privée montre les détails personnels', async () => {
				await page.goto('/espace/fiche');
				await waitForAppReady(page);
				await expect(page.getByRole('heading', { name: 'Ma fiche de carrière' })).toBeVisible();
				await expect(page.getByText('Rien que pour toi')).toBeVisible();
				await expect(page.getByText('XP', { exact: true })).toBeVisible();
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
			});

			await test.step('2. La fiche publique ne présente que les faits confirmés', async () => {
				await page.goto(`/@${person.actor.handle}`);
				await waitForAppReady(page);
				const sheet = page.locator('section[aria-labelledby="career-sheet-title"]');
				await expect(sheet).toContainText('Morceaux à plusieurs');
				await expect(sheet).not.toContainText('XP');
				await expect(sheet).not.toContainText('Rien que pour toi');
				await expect(
					page.getByRole('link', { name: /Télécharger · Acte II · La création/ })
				).toBeVisible();
				await expectNoA11yViolations(page, A11Y_EXCLUDE);

				const response = await page.request.get(
					`/api/carriere/souvenir/${person.actor.handle}/2.png`
				);
				expect(response.status()).toBe(200);
				expect(response.headers()['content-type']).toBe('image/png');
				expect((await response.body()).subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
			});
		} finally {
			await db.actor.delete({ where: { id: peer.id } });
		}
	});
});
