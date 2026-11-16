import type { APIRequestContext } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { makeAccount } from '../support/account';
import { signUpAndVerify } from '../support/admin';
import { db, deleteUser, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { setCity, skipOnboarding } from '../support/linkmusician';

/**
 * P3-11 — Morceau minimal (D35) : je note une idée, je crédite Malik, je
 * joins une maquette et je déclare le morceau composé (sans point tant que
 * je suis seul·e à avoir confirmé). Malik confirme son rôle : le morceau est
 * corroboré et nous gagnons des points tous les deux. Il apparaît sur mon
 * profil public ; un rôle à pourvoir ouvre une annonce préremplie.
 */
test.describe('LinkMusician — morceaux', () => {
	test.setTimeout(4 * 60_000);
	// Bouton panier du boilerplate (boutique active en e2e), remontée n° 14.
	const A11Y_EXCLUDE = ['.cartButton'];

	test('une idée, deux crédits, un morceau composé', async ({ page, account, browser }) => {
		const malikAccount = makeAccount();
		const malikContext = await browser.newContext();
		const malikPage = await malikContext.newPage();
		const title = `E2E Nuit blanche ${Math.random().toString(36).slice(2, 7)}`;
		try {
			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			await signUpAndVerify(malikPage, malikAccount);
			await skipOnboarding(malikPage, malikAccount.email);
			const person = async (email: string) =>
				db.person.findUniqueOrThrow({
					where: { userId: (await requireUser(email)).id },
					include: { actor: true }
				});
			const me = await person(account.email);
			const malik = await person(malikAccount.email);
			const xp = async (actorId: string) =>
				(
					await db.xpTransaction.aggregate({
						where: { actorId, ruleId: { startsWith: 'work.' } },
						_sum: { amount: true }
					})
				)._sum.amount ?? 0;

			await test.step('1. Je note une idée : elle reste dans l’équipe', async () => {
				await page.goto('/morceaux');
				await waitForAppReady(page);
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
				await page.getByRole('link', { name: 'Nouvelle idée' }).click();
				await page.getByLabel('Titre (même provisoire)').fill(title);
				await page.getByLabel('Instrument ou voix').selectOption({ label: 'Guitare électrique' });
				await page.getByLabel('Paroles').check();
				await page.getByRole('button', { name: 'Noter l’idée' }).click();
				await expect(page.getByRole('heading', { name: title })).toBeVisible();
				await expect(page.getByText('Idée · visible de l’équipe')).toBeVisible();
				await expect(page.getByText('Ton idée est notée.')).toBeVisible();
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
			});
			const workUrl = page.url().replace(/\?.*$/, '');
			// ARCH-MET-02b : une requête forgée atteint réellement les gardes du service.
			const denied = async (
				request: APIRequestContext,
				url: string,
				form: Record<string, string>
			) => {
				const response = await request.post(url, {
					form,
					headers: { origin: new URL(workUrl).origin, accept: 'application/json' }
				});
				expect(response.status()).toBe(403);
				expect(await response.json()).toMatchObject({ type: 'failure', status: 403 });
			};
			await test.step('Un tiers ne peut pas renommer par POST forgé', async () => {
				await denied(malikPage.request, `${workUrl}?/edit`, { title: 'Titre forgé' });
				expect((await db.work.findFirstOrThrow({ where: { title } })).title).toBe(title);
			});

			await test.step('2. Je crédite Malik : il est prévenu', async () => {
				await page.getByText('Créditer quelqu’un').click();
				const credit = page.locator('form[action="?/credit"]');
				await credit.getByLabel('Son @identifiant').fill(`@${malik.actor.handle}`);
				await credit.getByLabel('Instrument ou voix').selectOption({ label: 'Basse électrique' });
				await credit.getByRole('button', { name: 'Créditer' }).click();
				await expect(page.getByText('est prévenu·e', { exact: false })).toBeVisible();
				await expect(page.getByText('en attente de confirmation')).toBeVisible();
				// DASH-05m : refus réel puis nouvelle attribution, sans consentement reconstruit.
				await malikPage.goto('/morceaux');
				await waitForAppReady(malikPage);
				await malikPage.getByRole('button', { name: 'Ce n’est pas moi' }).click();
				await expect(malikPage.getByText('C’est noté, ton nom n’y figure pas.')).toBeVisible();
				await malikPage.getByText('Historique personnel des crédits', { exact: true }).click();
				const history = malikPage.getByRole('region', { name: 'Tes actes de crédits' });
				await expect(
					history.getByText('Crédit refusé personnellement', { exact: true })
				).toBeVisible();
				await expect(history.getByRole('link')).toHaveCount(0);
				await expect(history.getByText(title, { exact: true })).toHaveCount(0);
				await page.goto(workUrl);
				await waitForAppReady(page);
				await page.getByText('Créditer quelqu’un').click();
				await credit.getByLabel('Son @identifiant').fill(`@${malik.actor.handle}`);
				await credit.getByLabel('Instrument ou voix').selectOption({ label: 'Basse électrique' });
				await credit.getByRole('button', { name: 'Créditer' }).click();
				await expect(page.getByText('est prévenu·e', { exact: false })).toBeVisible();
			});

			await test.step('3. Maquette et « C’est composé » : déclaré, sans point', async () => {
				await page
					.getByLabel('Lien YouTube, SoundCloud ou Bandcamp')
					.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
				await page.getByRole('button', { name: 'Joindre', exact: true }).click();
				await expect(page.getByText('Maquette jointe.')).toBeVisible();
				await page.getByRole('button', { name: 'C’est composé' }).click();
				await expect(page.getByText('Bravo, le morceau est composé !')).toBeVisible();
				await expect(page.getByText('Composé', { exact: true })).toBeVisible();
				expect(await xp(me.actorId)).toBe(0);
			});

			await test.step('4. Malik confirme : corroboré, des points pour les deux', async () => {
				await malikPage.goto('/morceaux');
				await waitForAppReady(malikPage);
				await expect(malikPage.getByRole('heading', { name: 'On te crédite' })).toBeVisible();
				await expectNoA11yViolations(malikPage, A11Y_EXCLUDE);
				// La confiance est recalculée après chaque événement : on la fixe juste avant.
				await db.actor.updateMany({
					where: { id: { in: [me.actorId, malik.actorId] } },
					data: { trustLevel: 2 }
				});
				await malikPage.getByRole('button', { name: 'C’est bien moi' }).click();
				await expect(
					malikPage.getByText('C’est confirmé : ton nom figure sur le morceau.')
				).toBeVisible();
				await expect
					.poll(async () => [await xp(me.actorId), await xp(malik.actorId)])
					.toEqual([150, 150]);
				const work = await db.work.findFirstOrThrow({ where: { title } });
				expect(work.proof).toBe('CORROBORATED');
			});

			await test.step('Un crédit confirmé ne donne aucun droit de gestion par POST', async () => {
				const work = await db.work.findFirstOrThrow({ where: { title } });
				const credit = await db.workContributor.findUniqueOrThrow({
					where: { workId_personId: { workId: work.id, personId: malik.actorId } }
				});
				for (const [action, form] of [
					['edit', { title: 'Titre forgé' }],
					['delete', {}],
					['compose', {}],
					['openRole', { roles: 'LYRICS' }],
					['removeRole', { roleId: 'forged' }],
					['withdrawCredit', { contributorId: credit.id }],
					['credit', { handle: me.actor.handle, roles: 'LYRICS' }],
					['demo', { mediaId: work.demoMediaId! }],
					['demo', { url: 'https://youtu.be/dQw4w9WgXcQ', demoTitle: 'Forgé' }]
				] as [string, Record<string, string>][])
					await denied(malikPage.request, `${workUrl}?/${action}`, form);
				expect((await db.work.findUniqueOrThrow({ where: { id: work.id } })).title).toBe(title);
			});

			await test.step('Un MEMBER ne peut ni créer ni gérer un morceau de groupe', async () => {
				const group = await db.actor.create({
					data: {
						kind: 'ORGANIZATION',
						handle: `e2e-work-${Date.now()}`,
						displayName: 'Groupe de recette Work',
						organization: {
							create: {
								kind: 'BAND',
								memberships: {
									create: [
										{
											personId: me.actorId,
											status: 'ACTIVE',
											role: 'OWNER',
											startedAt: new Date()
										},
										{
											personId: malik.actorId,
											status: 'ACTIVE',
											role: 'MEMBER',
											startedAt: new Date()
										}
									]
								}
							}
						}
					}
				});
				try {
					const work = await db.work.create({
						data: { ownerId: group.id, title: 'Idée du groupe' }
					});
					await malikPage.goto(`/morceaux/${work.id}`);
					await waitForAppReady(malikPage);
					await expect(malikPage.getByRole('heading', { name: 'Idée du groupe' })).toBeVisible();
					await expect(malikPage.locator('form[action="?/edit"]')).toHaveCount(0);
					await denied(malikPage.request, new URL(`/morceaux/${work.id}?/edit`, workUrl).href, {
						title: 'Titre forgé'
					});
					await denied(malikPage.request, new URL('/morceaux/nouveau', workUrl).href, {
						title: 'Idée forgée',
						band: group.handle,
						roles: 'LYRICS'
					});
					expect(await db.work.count({ where: { ownerId: group.id } })).toBe(1);
				} finally {
					await db.actor.delete({ where: { id: group.id } });
				}
			});

			await test.step('5. Le morceau figure sur mon profil public', async () => {
				const visitor = await browser.newContext();
				try {
					const v = await visitor.newPage();
					await v.goto(`/@${me.actor.handle}`);
					await waitForAppReady(v);
					const works = v.getByRole('list', { name: 'Morceaux composés' });
					await expect(works).toContainText(title);
					await expect(works).toContainText('Guitare électrique, Paroles');
				} finally {
					await visitor.close();
				}
			});

			await test.step('Historique privé : attribution et consentement restent distincts', async () => {
				await page.goto('/morceaux');
				await waitForAppReady(page);
				await page.getByText('Historique personnel des crédits', { exact: true }).click();
				const mine = page.getByRole('region', { name: 'Tes actes de crédits' });
				await expect(
					mine.getByText('Crédit personnel à la création du morceau', { exact: true })
				).toBeVisible();
				await expect(
					mine.getByText(
						'Crédit attribué par la gestion, en attente de consentement (pour autrui)',
						{ exact: true }
					)
				).toHaveCount(2);
				await expect(
					mine.getByText('Crédit confirmé personnellement', { exact: true })
				).toHaveCount(0);
				await malikPage.goto('/morceaux');
				await waitForAppReady(malikPage);
				await malikPage.getByText('Historique personnel des crédits', { exact: true }).click();
				const his = malikPage.getByRole('region', { name: 'Tes actes de crédits' });
				await expect(
					his.getByText('Crédit confirmé personnellement', { exact: true })
				).toBeVisible();
				await expect(his.getByRole('link')).toHaveCount(0);
				await expectNoA11yViolations(malikPage, A11Y_EXCLUDE);
			});

			await test.step('6. Un rôle à pourvoir ouvre une annonce préremplie', async () => {
				// Une annonce se diffuse autour de sa ville : je l'indique d'abord.
				await setCity(page);
				await page.goto(workUrl);
				await waitForAppReady(page);
				const open = page.locator('form[action="?/openRole"]');
				await open.getByLabel('Instrument ou voix').selectOption({ label: 'Batterie' });
				await open.getByRole('button', { name: 'Ajouter' }).click();
				await expect(page.getByText('Rôle ajouté.')).toBeVisible();
				await page.getByRole('link', { name: 'Recruter' }).click();
				await expect(page).toHaveURL(/\/annonces\/nouvelle\?/);
				await expect(page.getByLabel('Titre', { exact: true })).toHaveValue(
					`Batterie pour « ${title} »`
				);
			});
		} finally {
			await malikContext.close();
			await deleteUser(malikAccount.email);
		}
	});
});
