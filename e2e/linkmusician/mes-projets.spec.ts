import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { makeAccount } from '../support/account';
import { signUpAndVerify } from '../support/admin';
import { db, deleteUser, requireUser } from '../support/db';
import { waitForAppReady, waitForPath } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { horizontalOverflow, skipOnboarding } from '../support/linkmusician';

/**
 * P3 + U2 — « Mes projets » (#71, conception 20 §6 et §7). Cinq parcours,
 * joués par la même musicienne, dans l'ordre :
 *
 * - S1 compte neuf : accueil inchangé (« Commence ici »), « Mes projets »
 *   vide et facultatif ;
 * - S2 artiste solo : un EP créé au clavier (Espace, T11), héros « projet »
 *   de l'accueil, rangement d'un morceau depuis la prochaine action ;
 * - S3 groupe : projet porté par le groupe, fiche « scène » (dates d'abord),
 *   un simple membre ne voit rien et ne range pas le morceau du groupe ;
 * - S4 plusieurs projets : album et tournée indépendants, tournée atteinte,
 *   même morceau dans deux projets sans contaminer l'autre ;
 * - S5 plusieurs morceaux : « Hors projet », rangement depuis la liste, fil
 *   d'Ariane.
 *
 * 390 px et desktop, axe, aucune XP.
 */

async function dismissCookies(page: Page) {
	const notice = page.getByRole('button', { name: 'Compris', exact: true });
	if (await notice.isVisible()) await notice.click();
}

async function checkPage(page: Page) {
	expect(await horizontalOverflow(page)).toEqual([]);
	await expectNoA11yViolations(page, ['.cartButton']);
}

const main = (page: Page) => page.locator('#main-content');

test.describe('LinkMusician — Mes projets (P3, U2)', () => {
	test.setTimeout(8 * 60_000);

	test('S1 à S5 : compte neuf, solo, groupe, plusieurs projets, plusieurs morceaux', async ({
		page,
		account,
		browser
	}) => {
		const memberAccount = makeAccount();
		const memberContext = await browser.newContext();
		const member = await memberContext.newPage();
		let bandId = '';
		try {
			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			const me = await db.person.findUniqueOrThrow({
				where: { userId: (await requireUser(account.email)).id }
			});
			await db.person.update({
				where: { actorId: me.actorId },
				data: { birthDate: new Date('1990-01-01') }
			});
			await signUpAndVerify(member, memberAccount);
			await skipOnboarding(member, memberAccount.email);
			const mate = await db.person.findUniqueOrThrow({
				where: { userId: (await requireUser(memberAccount.email)).id }
			});
			const xpBefore = await db.xpTransaction.count({ where: { actorId: me.actorId } });
			await page.setViewportSize({ width: 390, height: 844 });
			const home = page.getByRole('navigation', { name: 'Mode carrière' });
			let epId = '';

			await test.step('S1. Compte neuf : « Commence ici », « Mes projets » facultatif', async () => {
				await page.goto('/espace');
				await waitForAppReady(page);
				await dismissCookies(page);
				await expect(page.getByTestId('start-hero')).toBeVisible();
				const projects = page.getByTestId('home-projects');
				await expect(projects.getByRole('link', { name: /^Mes projets/ })).toHaveAttribute(
					'href',
					'/projets'
				);
				await expect(projects.getByRole('link', { name: /^Créer un projet/ })).toBeVisible();
				await expect(projects.getByRole('link', { name: /^Hors projet/ })).toHaveCount(0);
				await expect(page.getByTestId('project-tile')).toHaveCount(0);
				await checkPage(page);

				await projects.getByRole('link', { name: /^Mes projets/ }).click();
				await waitForPath(page, '/projets');
				await waitForAppReady(page);
				await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mes projets');
				await expect(main(page)).toContainText('Ce que tu prépares, construis et réalises.');
				await expect(main(page)).toContainText(/C’est facultatif/);
				await expect(
					page.getByRole('link', { name: /^Hors projet.*Tout est rangé/ })
				).toBeVisible();
				await checkPage(page);
			});

			await test.step('S2. Solo : un EP au clavier, sans groupe, puis le héros de l’accueil', async () => {
				await page.getByRole('link', { name: 'Créer un projet' }).first().click();
				await waitForPath(page, '/projets/nouveau');
				await waitForAppReady(page);
				await expect(page.getByText('Porté par')).toHaveCount(0);
				const name = page.getByLabel('Nom du projet');
				await name.focus();
				await page.keyboard.type('EP Lumière');
				const ep = page
					.getByRole('group', { name: 'Type de projet' })
					.getByRole('button', { name: 'EP', exact: true });
				await ep.focus();
				await page.keyboard.press('Space');
				await expect(ep).toHaveAttribute('aria-pressed', 'true');
				await name.focus();
				await page.keyboard.press('Enter');
				await page.waitForURL(/\/projets\/[^/]+\?cree$/);
				await waitForAppReady(page);
				epId = new URL(page.url()).pathname.split('/').pop()!;
				const next = page.getByTestId('project-next');
				await expect(next).toContainText('Créer un morceau');
				await expect(next).not.toContainText(/Inviter|Confier|annonce/);
				await expect(main(page)).toContainText('Bientôt dans un projet');
				// P4a : inviter existe dans le bloc « Équipe », jamais comme prochaine action ;
				// confier une tâche (P13) n'a toujours pas de bouton.
				await expect(main(page).getByRole('button', { name: /Confier/ })).toHaveCount(0);
				await checkPage(page);

				// Sans demande N3, le héros de l'accueil est le projet (D74, étape 2).
				await page.goto('/espace');
				await waitForAppReady(page);
				const hero = page.getByTestId('project-hero');
				await expect(hero).toContainText('Ton projet en cours');
				await expect(hero).toContainText('EP Lumière');
				await expect(hero.getByRole('link', { name: /Créer un morceau/ })).toHaveAttribute(
					'href',
					'/morceaux/nouveau'
				);
				await expect(page.getByTestId('start-hero')).toHaveCount(0);
				// Le héros n'est pas répété en tuile.
				await expect(page.getByTestId('project-tile')).toHaveCount(0);
				await expect(home.getByRole('link', { name: /^Mes projets.*1 en cours/ })).toBeVisible();
				await checkPage(page);
			});

			const aube = await db.work.create({
				data: {
					ownerId: me.actorId,
					createdById: me.actorId,
					title: 'Aube',
					state: 'COMPOSED',
					composedAt: new Date(),
					contributors: { create: { personId: me.actorId, confirmedAt: new Date() } }
				}
			});
			const brume = await db.work.create({
				data: { ownerId: me.actorId, createdById: me.actorId, title: 'Brume' }
			});

			await test.step('S2 bis. La prochaine action range un morceau existant', async () => {
				await page.goto(`/projets/${epId}`);
				await waitForAppReady(page);
				const next = page.getByTestId('project-next');
				await expect(next).toContainText('Ranger un morceau');
				await next.getByRole('link', { name: /J’y vais/ }).click();
				await expect(page.locator('#ranger')).toBeFocused();
				await page.getByLabel('Morceau à ranger').selectOption(aube.id);
				await page.getByRole('button', { name: 'Ranger', exact: true }).click();
				await expect(main(page).getByRole('status')).toContainText('Morceau rangé');
				await expect(main(page)).toContainText('1 morceau rangé, composé');
			});

			await test.step('S3. Groupe : la gestion range, le simple membre ne voit rien', async () => {
				const band = await db.actor.create({
					data: {
						kind: 'ORGANIZATION',
						handle: `u2-lumiere-${Date.now()}`,
						displayName: 'Groupe Lumière',
						organization: {
							create: {
								kind: 'BAND',
								memberships: {
									create: [
										{
											personId: me.actorId,
											role: 'OWNER',
											status: 'ACTIVE',
											startedAt: new Date()
										},
										{
											personId: mate.actorId,
											role: 'MEMBER',
											status: 'ACTIVE',
											startedAt: new Date()
										}
									]
								}
							}
						}
					}
				});
				bandId = band.id;
				await db.work.create({
					data: { ownerId: band.id, createdById: me.actorId, title: 'Hymne', state: 'COMPOSED' }
				});
				await page.goto(`/projets/nouveau?porteur=${band.id}`);
				await waitForAppReady(page);
				await expect(page.getByRole('radio', { name: 'Groupe Lumière' })).toBeChecked();
				await page.getByLabel('Nom du projet').fill('Tournée d’hiver');
				await page
					.getByRole('group', { name: 'Type de projet' })
					.getByRole('button', { name: 'Tournée' })
					.click();
				await page.getByRole('button', { name: 'Créer le projet' }).click();
				await page.waitForURL(/\/projets\/[^/]+\?cree$/);
				await waitForAppReady(page);
				const tourId = new URL(page.url()).pathname.split('/').pop()!;
				// Fiche « scène » : les dates d'abord, sans concert simulé.
				const headings = await main(page).locator('h2').allInnerTexts();
				const dates = headings.findIndex((h) => /^Dates/i.test(h));
				const songs = headings.findIndex((h) => /^Morceaux/i.test(h));
				expect(dates).toBeGreaterThanOrEqual(0);
				expect(dates).toBeLessThan(songs);
				await expect(main(page)).toContainText('Aucune date posée');
				await expect(page.getByTestId('project-next')).toContainText('Ranger un morceau');
				await page
					.getByLabel('Morceau à ranger')
					.selectOption({ label: 'Hymne · Composé · Groupe Lumière' });
				await page.getByRole('button', { name: 'Ranger', exact: true }).click();
				await expect(main(page).getByRole('status')).toContainText('Morceau rangé');
				await checkPage(page);

				// Le simple membre : ni le projet, ni le droit de ranger le morceau du groupe.
				expect((await member.goto(`/projets/${tourId}`))?.status()).toBe(404);
				await member.goto('/projets');
				await waitForAppReady(member);
				await expect(member.locator('#main-content')).not.toContainText('Tournée d’hiver');
				await expect(member.getByTestId('project-tile')).toHaveCount(0);
				await member.goto('/espace/campagnes');
				await waitForAppReady(member);
				const others = member.getByRole('list', { name: 'Morceaux gérés par d’autres' });
				await expect(others).toContainText('Hymne');
				await expect(member.getByText(/Ranger dans un projet/)).toHaveCount(0);
				await expect(member.locator('#main-content')).not.toContainText('Tournée d’hiver');
			});

			await test.step('S4. Plusieurs projets : indépendants, un atteint, un morceau dans deux', async () => {
				const album = await db.project.create({
					data: { ownerId: me.actorId, name: 'Album Nuit', kind: 'ALBUM' }
				});
				// La tournée est atteinte : elle quitte les projets en cours.
				const tour = await db.project.findFirstOrThrow({ where: { ownerId: bandId } });
				await page.goto(`/projets/${tour.id}`);
				await waitForAppReady(page);
				await page.getByRole('button', { name: 'Marquer comme atteint' }).click();
				await expect(main(page).getByRole('status')).toContainText('État du projet mis à jour');

				// Le même morceau dans l'album, présélectionné depuis l'adresse.
				await page.goto(`/projets/${album.id}?ranger=${aube.id}#ranger`);
				await waitForAppReady(page);
				await expect(page.getByLabel('Morceau à ranger')).toHaveValue(aube.id);
				await page.getByRole('button', { name: 'Ranger', exact: true }).click();
				await expect(main(page).getByRole('status')).toContainText('Morceau rangé');

				await page.goto('/projets');
				await waitForAppReady(page);
				const current = page.getByRole('list', { name: 'Projets en cours' });
				await expect(current.getByTestId('project-tile')).toHaveCount(2);
				const epTile = current.getByTestId('project-tile').filter({ hasText: 'EP Lumière' });
				const albumTile = current.getByTestId('project-tile').filter({ hasText: 'Album Nuit' });
				await expect(epTile).toContainText('1 morceau rangé');
				await expect(epTile).toContainText('Je gère');
				await expect(albumTile).toContainText('1 morceau rangé');
				await expect(current).not.toContainText('Tournée d’hiver');
				const done = page.locator('details').filter({ hasText: 'Atteints · 1' });
				await done.locator('summary').focus();
				await page.keyboard.press('Space');
				await expect(done).toHaveAttribute('open', '');
				await expect(done.getByTestId('project-tile')).toContainText('Groupe Lumière');
				await expect(done.getByTestId('project-tile')).toContainText('Atteint');
				await checkPage(page);
				// Au clavier, Entrée ouvre la fiche depuis une tuile.
				await albumTile.focus();
				await page.keyboard.press('Enter');
				await waitForPath(page, `/projets/${album.id}`);
			});

			await test.step('S5. Plusieurs morceaux : hors projet, rangement, fil d’Ariane', async () => {
				await page.goto('/espace/campagnes');
				await waitForAppReady(page);
				await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hors projet');
				const outside = page.getByRole('list', { name: 'Morceaux hors projet' });
				await expect(outside.getByRole('listitem')).toHaveCount(1);
				await expect(outside).toContainText('Brume');
				const ranged = page.getByRole('list', { name: 'Morceaux rangés' });
				const aubeRow = ranged.getByTestId('ranged-work').filter({ hasText: 'Aube' });
				await expect(aubeRow).toContainText('EP Lumière');
				await expect(aubeRow).toContainText('Album Nuit');
				// Hymne est rangé dans la tournée, atteinte : il reste rangé.
				await expect(ranged.getByTestId('ranged-work').filter({ hasText: 'Hymne' })).toContainText(
					'(atteint)'
				);
				const trail = page.getByRole('navigation', { name: 'Fil d’Ariane' });
				await expect(trail.getByRole('link', { name: 'Mes projets' })).toHaveAttribute(
					'href',
					'/projets'
				);
				await checkPage(page);

				// Ranger Brume : seuls mes projets en cours sont proposés.
				const summary = outside.locator('summary');
				await summary.focus();
				await page.keyboard.press('Space');
				const targets = outside.getByRole('link');
				await expect(outside.getByRole('link', { name: /EP Lumière/ })).toBeVisible();
				await expect(outside.getByRole('link', { name: /Tournée/ })).toHaveCount(0);
				expect(await targets.count()).toBeGreaterThanOrEqual(3);
				await outside.getByRole('link', { name: /EP Lumière/ }).click();
				await waitForPath(page, `/projets/${epId}`);
				await waitForAppReady(page);
				await expect(page.getByLabel('Morceau à ranger')).toHaveValue(brume.id);
				// Idée : « Rien » proposé, jamais « Travail ».
				await expect(
					page.getByRole('group', { name: 'Partage' }).getByRole('button', { name: 'Rien' })
				).toHaveAttribute('aria-pressed', 'true');
				await page.getByRole('button', { name: 'Ranger', exact: true }).click();
				await expect(main(page).getByRole('status')).toContainText('Morceau rangé');
				// L'idée rangée devient la prochaine action : la reprendre.
				await expect(page.getByTestId('project-next')).toContainText('Continuer « Brume »');

				await page.goto('/espace/campagnes');
				await waitForAppReady(page);
				await expect(page.getByRole('list', { name: 'Morceaux hors projet' })).toHaveCount(0);
				await expect(main(page)).toContainText('Tous les morceaux que tu gères sont rangés');
			});

			await test.step('Desktop et non-régression : accueil, projets, XP inchangée', async () => {
				await page.setViewportSize({ width: 1280, height: 900 });
				await page.goto('/espace');
				await waitForAppReady(page);
				await expect(page.getByTestId('home-projects')).toBeVisible();
				await expect(
					page
						.getByTestId('home-projects')
						.getByRole('link', { name: /^Hors projet.*Tout est rangé/ })
				).toBeVisible();
				await checkPage(page);
				await page.goto('/projets');
				await waitForAppReady(page);
				await checkPage(page);
				expect(await db.xpTransaction.count({ where: { actorId: me.actorId } })).toBe(xpBefore);
				// Les morceaux sont intacts, rangés ou non.
				expect(await db.work.count({ where: { id: { in: [aube.id, brume.id] } } })).toBe(2);
			});
		} finally {
			await memberContext.close();
			if (bandId) await db.actor.deleteMany({ where: { id: bandId } });
			await deleteUser(memberAccount.email);
		}
	});
});
