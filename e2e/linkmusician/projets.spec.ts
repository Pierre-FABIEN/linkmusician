import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { makeAccount } from '../support/account';
import { pageOrigin, signUpAndVerify, sveltekitActionHeaders } from '../support/admin';
import { db, deleteUser, requireUser } from '../support/db';
import { waitForAppReady, waitForPath } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import {
	createMusician,
	deleteMusicians,
	horizontalOverflow,
	skipOnboarding
} from '../support/linkmusician';

/**
 * P2 — socle du projet (#71, D72, conception 19 §10) : une musicienne crée
 * « EP Lumière », y range son morceau, change son partage, retire le morceau
 * et supprime le projet ; le morceau et ses crédits n'ont pas bougé. Un
 * second compte (puis un simple membre du groupe) reçoit le même 404 et ne
 * peut rien forger. Projet porté par un groupe. 390 px, clavier, axe.
 */

async function forge(page: Page, path: string, form: Record<string, string>) {
	const response = await page.request.post(path, {
		form,
		headers: sveltekitActionHeaders(pageOrigin(page))
	});
	return (await response.json()) as { type: string; status?: number };
}

async function dismissCookies(page: Page) {
	const notice = page.getByRole('button', { name: 'Compris', exact: true });
	if (await notice.isVisible()) await notice.click();
}

test.describe('LinkMusician — projets (P2)', () => {
	test.setTimeout(6 * 60_000);
	const toulouse = { code: '31555', nom: 'Toulouse', dep: '31', lat: 43.6007, lng: 1.4328 };

	test('créer, ranger, partager, retirer, supprimer ; tiers et groupe', async ({
		page,
		account,
		browser
	}) => {
		const otherAccount = makeAccount();
		const otherContext = await browser.newContext();
		const other = await otherContext.newPage();
		const created: Awaited<ReturnType<typeof createMusician>>[] = [];
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
			await signUpAndVerify(other, otherAccount);
			await skipOnboarding(other, otherAccount.email);
			const intruder = await db.person.findUniqueOrThrow({
				where: { userId: (await requireUser(otherAccount.email)).id }
			});

			// Mon morceau composé, avec le crédit confirmé d'un autre musicien.
			const sam = await createMusician({ name: 'Sam', commune: toulouse });
			created.push(sam);
			const song = await db.work.create({
				data: {
					ownerId: me.actorId,
					createdById: me.actorId,
					title: 'Aube',
					state: 'COMPOSED',
					proof: 'CORROBORATED',
					composedAt: new Date('2026-10-01T12:00:00Z'),
					contributors: {
						create: [
							{ personId: me.actorId, confirmedAt: new Date('2026-10-01T12:00:00Z') },
							{ personId: sam.actorId, confirmedAt: new Date('2026-10-02T12:00:00Z') }
						]
					}
				}
			});
			const snapshot = () =>
				db.work.findUniqueOrThrow({
					where: { id: song.id },
					include: { contributors: { orderBy: { personId: 'asc' } }, roles: true }
				});
			const before = await snapshot();

			await page.setViewportSize({ width: 390, height: 844 });
			let projectId = '';

			await test.step('1. Depuis « ma musique », la liste vide dit que c’est facultatif', async () => {
				await page.goto('/espace');
				await waitForAppReady(page);
				await dismissCookies(page);
				const home = page.getByRole('navigation', { name: 'Mode carrière' });
				await home
					.getByRole('navigation', { name: /^Sections de/ })
					.getByRole('button', { name: 'ma musique' })
					.click();
				await home.getByRole('link', { name: /^Projets/ }).click();
				await waitForPath(page, '/projets');
				await waitForAppReady(page);
				await expect(page.getByRole('heading', { level: 1 })).toHaveText('Projets');
				await expect(page.getByText(/C’est facultatif/)).toBeVisible();
				expect(await horizontalOverflow(page)).toEqual([]);
				await expectNoA11yViolations(page, ['.cartButton']);
			});

			await test.step('2. Créer « EP Lumière » au clavier', async () => {
				await page.getByRole('link', { name: 'Nouveau projet' }).first().click();
				await waitForPath(page, '/projets/nouveau');
				await waitForAppReady(page);
				// Aucune structure gérée : pas de choix de porteur.
				await expect(page.getByText('Porté par')).toHaveCount(0);
				const name = page.getByLabel('Nom du projet');
				await name.focus();
				await page.keyboard.type('EP Lumière');
				const ep = page.getByRole('group', { name: 'Type de projet' }).getByRole('button', {
					name: 'EP',
					exact: true
				});
				// Espace active le bouton (T11 corrigé, `clavier-espace.spec.ts`).
				await ep.focus();
				await page.keyboard.press('Space');
				await expect(ep).toHaveAttribute('aria-pressed', 'true');
				expect(await horizontalOverflow(page)).toEqual([]);
				await expectNoA11yViolations(page, ['.cartButton']);
				await name.focus();
				await page.keyboard.press('Enter');
				await page.waitForURL(/\/projets\/[^/]+\?cree$/);
				await waitForAppReady(page);
				projectId = new URL(page.url()).pathname.split('/').pop()!;
				await expect(page.getByRole('heading', { level: 1 })).toHaveText('EP Lumière');
				await expect(page.locator('#main-content').getByRole('status')).toHaveText('Projet créé.');
				await expect(page.locator('#main-content')).not.toContainText(/XP|niveau|bravo/i);
			});

			await test.step('3. Ranger mon morceau : résumé proposé, jamais travail', async () => {
				await page.getByLabel('Morceau à ranger').selectOption(song.id);
				const shares = page.getByRole('group', { name: 'Partage' });
				await expect(shares.getByRole('button', { name: 'Résumé' })).toHaveAttribute(
					'aria-pressed',
					'true'
				);
				await expect(shares.getByRole('button', { name: 'Travail' })).toHaveAttribute(
					'aria-pressed',
					'false'
				);
				await page.getByRole('button', { name: 'Ranger', exact: true }).click();
				await expect(page.locator('#main-content').getByRole('status')).toContainText(
					'Morceau rangé'
				);
				await expect(page.getByRole('link', { name: 'Aube' })).toHaveAttribute(
					'href',
					`/morceaux/${song.id}`
				);
				await expect(page.getByText('Partage : Résumé')).toBeVisible();
			});

			await test.step('4. Changer le partage et la fiche le montre', async () => {
				await page.getByText('Changer le partage').click();
				await page.getByRole('radio', { name: /^Travail/ }).check();
				await page
					.getByLabel(/Titre affiché aux autres/)
					.first()
					.fill('Titre 1');
				await page.getByRole('button', { name: 'Enregistrer le partage' }).click();
				await expect(page.locator('#main-content').getByRole('status')).toHaveText(
					'Partage mis à jour.'
				);
				await page.reload();
				await waitForAppReady(page);
				await expect(page.getByText('Partage : Travail')).toBeVisible();
				await expect(page.getByText('Partage changé : « Aube » (Résumé → Travail)')).toBeVisible();
				expect(await horizontalOverflow(page)).toEqual([]);
				await expectNoA11yViolations(page, ['.cartButton']);
			});

			await test.step('5. Un second compte : 404 identique, rien de forgeable', async () => {
				const item = await db.projectItem.findFirstOrThrow({ where: { projectId } });
				const seen = await other.goto(`/projets/${projectId}`);
				expect(seen?.status()).toBe(404);
				const missing = await other.goto('/projets/inexistant');
				expect(missing?.status()).toBe(404);
				await expect(other.locator('body')).not.toContainText('EP Lumière');
				const html = await (await other.request.get(`/projets/${projectId}`)).text();
				expect(html).not.toContain('EP Lumière');
				expect(html).not.toContain('Aube');
				const theirSong = await db.work.create({
					data: { ownerId: intruder.actorId, createdById: intruder.actorId, title: 'Intrus' }
				});
				for (const [action, form] of [
					['retirer', { itemId: item.id }],
					['partage', { itemId: item.id, share: 'NONE' }],
					['ranger', { workId: theirSong.id }],
					['etat', { status: 'DONE' }],
					['supprimer', {}]
				] as const) {
					const result = await forge(other, `/projets/${projectId}?/${action}`, form);
					expect(result, action).toMatchObject({ type: 'failure', status: 404 });
				}
				// Mon morceau dans le projet d'autrui : refusé aussi.
				const theirs = await db.project.create({
					data: { ownerId: intruder.actorId, name: 'Leur projet', kind: 'EP' }
				});
				expect(
					await forge(other, `/projets/${theirs.id}?/ranger`, { workId: song.id })
				).toMatchObject({ type: 'failure', status: 404 });
				expect(await db.projectItem.count({ where: { projectId } })).toBe(1);
				expect(await db.project.findUniqueOrThrow({ where: { id: projectId } })).toMatchObject({
					status: 'ACTIVE'
				});
			});

			await test.step('6. Retirer le morceau, puis supprimer le projet', async () => {
				await page.getByRole('button', { name: /^Retirer du projet/ }).click();
				await expect(page.locator('#main-content').getByRole('status')).toContainText(
					'Le morceau lui-même n’a pas changé'
				);
				await expect(page.getByText(/Aucun morceau rangé/)).toBeVisible();
				await page.getByRole('button', { name: 'Supprimer le projet' }).click();
				const sheet = page.getByRole('dialog', { name: 'Supprimer ce projet ?' });
				await expect(sheet).toContainText('Les morceaux rangés restent intacts');
				await expectNoA11yViolations(page, ['.cartButton']);
				await sheet.getByRole('button', { name: 'Supprimer le projet' }).click();
				await waitForPath(page, '/projets');
				expect(await db.project.count({ where: { id: projectId } })).toBe(0);
				// I1 : le morceau et ses crédits sont inchangés.
				expect(await snapshot()).toEqual(before);
				await page.goto(`/morceaux/${song.id}`);
				await waitForAppReady(page);
				await expect(page.getByRole('heading', { level: 1 })).toContainText('Aube');
			});

			await test.step('7. Projet porté par un groupe ; un simple membre ne le voit pas', async () => {
				const band = await db.actor.create({
					data: {
						kind: 'ORGANIZATION',
						handle: `lumiere-${Date.now()}`,
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
											personId: intruder.actorId,
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
					data: { ownerId: band.id, createdById: me.actorId, title: 'Hymne du groupe' }
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
				const bandProject = new URL(page.url()).pathname.split('/').pop()!;
				await expect(page.getByText('Groupe Lumière', { exact: true })).toBeVisible();
				// Idée privée du groupe : « Rien » proposé.
				await page
					.getByLabel('Morceau à ranger')
					.selectOption({ label: 'Hymne du groupe · Idée · Groupe Lumière' });
				await expect(
					page.getByRole('group', { name: 'Partage' }).getByRole('button', { name: 'Rien' })
				).toHaveAttribute('aria-pressed', 'true');
				await page.getByRole('button', { name: 'Ranger', exact: true }).click();
				await expect(page.locator('#main-content').getByRole('status')).toContainText(
					'Morceau rangé'
				);
				expect(await horizontalOverflow(page)).toEqual([]);
				await expectNoA11yViolations(page, ['.cartButton']);

				const asMember = await other.goto(`/projets/${bandProject}`);
				expect(asMember?.status()).toBe(404);
				await other.goto('/projets');
				await waitForAppReady(other);
				await expect(other.locator('#main-content')).not.toContainText('Tournée d’hiver');
				expect(
					await forge(other, `/projets/nouveau`, { name: 'Pirate', kind: 'EP', owner: band.id })
				).toMatchObject({ type: 'failure', status: 403 });
			});
		} finally {
			await otherContext.close();
			if (bandId) await db.actor.deleteMany({ where: { id: bandId } });
			await deleteUser(otherAccount.email);
			await deleteMusicians(created);
		}
	});
});
