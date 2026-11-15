import { test, expect } from '../support/fixtures';
import { makeAccount } from '../support/account';
import { signUpAndVerify } from '../support/admin';
import { db, deleteUser, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { setCity, skipOnboarding } from '../support/linkmusician';

/**
 * P2-03 — Candidatures : conditions vérifiées, candidature, acceptation qui
 * ouvre une conversation liée à l'annonce, annonce complète, et premiers
 * points sociaux quand l'échange devient réciproque. Puis appréciation
 * après la collaboration confirmée, et sa reprise (P2-07).
 */
test.describe('LinkMusician — candidatures', () => {
	test.setTimeout(9 * 60_000);
	// Bouton panier du boilerplate (boutique active en e2e), remontée n° 14.
	const A11Y_EXCLUDE = ['.cartButton'];

	test('postuler, être accepté·e, gagner ses premiers points', async ({
		page,
		account,
		browser
	}) => {
		const malikAccount = makeAccount();
		const malikContext = await browser.newContext();
		const malikPage = await malikContext.newPage();
		try {
			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			await setCity(page);
			await signUpAndVerify(malikPage, malikAccount);
			await skipOnboarding(malikPage, malikAccount.email);
			const person = async (email: string) =>
				db.person.findUniqueOrThrow({
					where: { userId: (await requireUser(email)).id },
					include: { actor: true }
				});
			const lea = await person(account.email);
			const malik = await person(malikAccount.email);
			let opportunityUrl = '';

			await test.step('1. Léa publie : batterie, Confirmé ou plus, une place', async () => {
				await page.goto('/annonces/nouvelle');
				await waitForAppReady(page);
				await page.getByLabel('Titre').fill('Groupe funk cherche batteur');
				await page
					.getByLabel('Description')
					.fill('Groupe funk, répètes le mardi soir, on cherche un batteur groovy.');
				await page.getByLabel('Instrument recherché').selectOption('batterie');
				await page.getByLabel('Niveau minimal').selectOption('3');
				await page.getByRole('button', { name: 'Publier' }).click();
				await expect(page).toHaveURL(/\/annonces\/c/);
				opportunityUrl = new URL(page.url()).pathname;
			});

			await test.step('2. Malik ne remplit pas la condition : il sait pourquoi', async () => {
				await malikPage.goto(opportunityUrl);
				await waitForAppReady(malikPage);
				await expect(malikPage.getByText('tu ne joues pas l’instrument recherché')).toBeVisible();
				await expect(malikPage.getByRole('button', { name: 'Envoyer ma candidature' })).toHaveCount(
					0
				);
			});

			await test.step('3. Profil à jour : Malik postule', async () => {
				const drums = await db.instrument.findUniqueOrThrow({ where: { slug: 'batterie' } });
				await db.personInstrument.create({
					data: {
						personId: malik.actorId,
						instrumentId: drums.id,
						declaredLevel: 4,
						isPrimary: true
					}
				});
				await malikPage.reload();
				await waitForAppReady(malikPage);
				await malikPage
					.getByLabel(`Ton message à ${lea.actor.displayName}`)
					.fill('Batteur funk depuis 10 ans, dispo le mardi !');
				await malikPage.getByRole('button', { name: 'Envoyer ma candidature' }).click();
				await expect(malikPage.getByText('Ta candidature : Envoyée')).toBeVisible();
				await expectNoA11yViolations(malikPage, A11Y_EXCLUDE);
			});

			await test.step('4. Léa voit la candidature et l’accepte', async () => {
				await page.goto('/annonces');
				await waitForAppReady(page);
				await expect(
					page.getByRole('list', { name: 'Mes annonces' }).getByText('1 candidature')
				).toBeVisible();
				await page.goto(opportunityUrl);
				await waitForAppReady(page);
				const card = page.getByRole('list', { name: 'Candidatures reçues' }).getByRole('listitem');
				await expect(card).toContainText('Batteur funk depuis 10 ans');
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
				await card.getByRole('button', { name: 'Accepter' }).click();
				await expect(card.getByRole('link', { name: 'Ouvrir la conversation' })).toBeVisible();
				await expect(page.getByText('Complète', { exact: true })).toBeVisible();
			});

			await test.step('5. Léa répond : premiers points sociaux pour les deux', async () => {
				await page
					.getByRole('list', { name: 'Candidatures reçues' })
					.getByRole('link', { name: 'Ouvrir la conversation' })
					.click();
				await expect(page.getByText('Candidature à « Groupe funk cherche batteur »')).toBeVisible();
				await page.getByLabel('Ton message').fill('Génial, viens mardi à 20 h !');
				await page.getByRole('button', { name: 'Envoyer' }).click();
				await expect(page.getByText('Génial, viens mardi à 20 h !')).toBeVisible();
				for (const actorId of [lea.actorId, malik.actorId]) {
					await expect
						.poll(() =>
							db.xpTransaction.findFirst({
								where: { actorId, ruleId: 'conversation.reciprocated' },
								select: { amount: true, reason: true }
							})
						)
						.toEqual({ amount: 30, reason: 'Échange abouti sur une annonce' });
				}
			});

			await test.step('6. Malik voit l’acceptation', async () => {
				await malikPage.goto(opportunityUrl);
				await waitForAppReady(malikPage);
				await expect(malikPage.getByText('Ta candidature : Acceptée')).toBeVisible();
				await expect(malikPage.getByRole('link', { name: 'Ouvrir la conversation' })).toBeVisible();
			});

			await test.step('7. Léa propose une collaboration (jam d’aujourd’hui)', async () => {
				await page.goto('/messages');
				await waitForAppReady(page);
				await page.getByRole('link', { name: new RegExp(malik.actor.displayName) }).click();
				await waitForAppReady(page);
				await page.getByText('Proposer une collaboration').click();
				await page.getByLabel('Titre').fill('Jam funk au local');
				await page.getByRole('button', { name: 'Proposer' }).click();
				await expect(
					page.getByText(`En attente de la confirmation de ${malik.actor.displayName}`)
				).toBeVisible();
				// Pas encore confirmée : pas d'appréciation possible (P2-07).
				await expect(page.getByRole('form', { name: /^Apprécier/ })).toHaveCount(0);
			});

			await test.step('8. Malik confirme depuis son tableau de bord : XP pour les deux', async () => {
				// Écran de carrière : la priorité « Collaborations à valider ».
				await malikPage.goto('/espace');
				await waitForAppReady(malikPage);
				await malikPage
					.getByRole('navigation', { name: 'Mode carrière' })
					.getByRole('link', { name: /Collaborations à valider/ })
					.click();
				const toConfirm = malikPage.getByRole('list', { name: 'Collaborations à confirmer' });
				await expect(toConfirm).toContainText('Jam funk au local');
				await expectNoA11yViolations(malikPage, A11Y_EXCLUDE);
				await toConfirm.getByRole('link').click();
				await waitForAppReady(malikPage);
				await malikPage.getByRole('button', { name: 'Confirmer' }).click();
				await expect(malikPage.getByText('Confirmée par vous deux ✓')).toBeVisible();
				for (const actorId of [lea.actorId, malik.actorId]) {
					// Comptes neufs (TL0) : le poids de confiance de l'autre vaut 0,1.
					await expect
						.poll(() =>
							db.xpTransaction.findFirst({
								where: { actorId, ruleId: 'collaboration.completed' },
								select: { amount: true, reason: true }
							})
						)
						.toEqual({ amount: 40, reason: 'Collaboration confirmée ×0,1' });
				}
				await page.goto(`/@${lea.actor.handle}`);
				await waitForAppReady(page);
				await expect(page.getByText('1 collaboration confirmée avec 1 personne')).toBeVisible();
			});

			await test.step('9. Malik apprécie Léa : « à l’heure » (P2-07)', async () => {
				// La confiance est recalculée après chaque événement : TL1 pour apprécier.
				await db.actor.update({ where: { id: malik.actorId }, data: { trustLevel: 1 } });
				await malikPage.reload();
				await waitForAppReady(malikPage);
				const form = malikPage.getByRole('form', { name: `Apprécier ${lea.actor.displayName}` });
				await expectNoA11yViolations(malikPage, A11Y_EXCLUDE);
				await form.getByRole('button', { name: 'à l’heure' }).click();
				await expect(
					malikPage.getByText(`Tu as apprécié ${lea.actor.displayName} :`, { exact: false })
				).toBeVisible();
				await expect
					.poll(() =>
						db.xpTransaction.findFirst({
							where: { actorId: lea.actorId, ruleId: 'endorsement.received' },
							select: { amount: true, reason: true }
						})
					)
					.toEqual({ amount: 40, reason: 'Appréciation : à l’heure' });
				await page.goto(`/@${lea.actor.handle}`);
				await waitForAppReady(page);
				await expect(
					page.getByRole('list', { name: 'Appréciations reçues' }).getByText('à l’heure')
				).toBeVisible();
			});

			await test.step('10. Malik reprend son appréciation : l’XP est repris', async () => {
				await malikPage.getByRole('button', { name: 'Reprendre' }).click();
				await expect(
					malikPage.getByText(`Tu as apprécié ${lea.actor.displayName} :`, { exact: false })
				).toHaveCount(0);
				await expect
					.poll(async () => {
						const sum = await db.xpTransaction.aggregate({
							where: { actorId: lea.actorId, ruleId: { startsWith: 'endorsement.received' } },
							_sum: { amount: true }
						});
						return sum._sum.amount;
					})
					.toBe(0);
				await page.reload();
				await waitForAppReady(page);
				await expect(page.getByRole('list', { name: 'Appréciations reçues' })).toHaveCount(0);
			});
		} finally {
			await malikContext.close();
			await deleteUser(malikAccount.email);
		}
	});
});
