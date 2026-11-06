import { test, expect } from '../support/fixtures';
import { makeAccount } from '../support/account';
import { signUpAndVerify } from '../support/admin';
import { db, deleteUser, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { createMusician, deleteMusicians, skipOnboarding } from '../support/linkmusician';
import type { Page } from '@playwright/test';

/**
 * P2-04 — Messagerie : demande, acceptation, échange réciproque ; un·e
 * mineur·e ne reçoit pas de nouvelle demande ; un TL0 est limité à 10
 * premiers messages par jour. P2-09a : la demande allume la cloche de
 * Malik, et ouvrir ses notifications l'éteint.
 */
test.describe('LinkMusician — messagerie', () => {
	test.setTimeout(6 * 60_000);
	// Bouton panier du boilerplate (boutique active en e2e), remontée n° 14.
	const A11Y_EXCLUDE = ['.cartButton'];

	async function personOf(email: string) {
		return db.person.findUniqueOrThrow({
			where: { userId: (await requireUser(email)).id },
			include: { actor: true }
		});
	}

	async function request(page: Page, handle: string, text: string) {
		await page.goto(`/messages/nouveau?a=${handle}`);
		await waitForAppReady(page);
		await page.getByLabel('Ton message').fill(text);
		await page.getByRole('button', { name: 'Envoyer la demande' }).click();
	}

	test('demande, acceptation, échange', async ({ page, account, browser }) => {
		const malikAccount = makeAccount();
		const malikContext = await browser.newContext();
		const malikPage = await malikContext.newPage();
		try {
			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			await signUpAndVerify(malikPage, malikAccount);
			await skipOnboarding(malikPage, malikAccount.email);
			const lea = await personOf(account.email);
			const malik = await personOf(malikAccount.email);

			await test.step('1. Mineur : pas de nouvelle demande, sans dire pourquoi', async () => {
				await db.person.update({
					where: { actorId: malik.actorId },
					data: { birthDate: new Date(Date.now() - 17 * 365.25 * 24 * 3600 * 1000) }
				});
				await request(page, malik.actor.handle, 'Salut !');
				await expect(page.getByRole('alert')).toContainText('ne reçoit pas de nouvelles demandes');
				await db.person.update({
					where: { actorId: malik.actorId },
					data: { birthDate: new Date('1994-03-12T00:00:00Z') }
				});
			});

			await test.step('2. Léa écrit à Malik depuis son profil : une demande', async () => {
				await page.goto(`/@${malik.actor.handle}`);
				await waitForAppReady(page);
				await page.getByRole('link', { name: `Écrire à ${malik.actor.displayName}` }).click();
				await page.getByLabel('Ton message').fill('Salut Malik, ça te dit une jam funk ?');
				await page.getByRole('button', { name: 'Envoyer la demande' }).click();
				await expect(page).toHaveURL(/\/messages\/c/);
				await expect(page.getByText('ça te dit une jam funk ?')).toBeVisible();
				await expect(page.getByText('Demande envoyée')).toBeVisible();
				await expect(page.getByRole('button', { name: 'Envoyer' })).toHaveCount(0);
			});

			await test.step('2b. Malik reçoit la demande : la cloche s’allume (P2-09a)', async () => {
				await malikPage.goto('/jouer');
				await waitForAppReady(malikPage);
				const bell = malikPage.getByRole('link', { name: 'Notifications : 1 nouvelle' });
				await expect(bell).toBeVisible();
				await bell.click();
				await expect(malikPage).toHaveURL(/\/notifications$/);
				const item = malikPage
					.getByRole('list', { name: 'Notifications' })
					.getByRole('link', { name: `${lea.actor.displayName} aimerait échanger avec toi.` });
				await expect(item).toBeVisible();
				await expectNoA11yViolations(malikPage, A11Y_EXCLUDE);
				// Vue : la cloche s'éteint.
				await expect(
					malikPage.getByRole('link', { name: 'Notifications', exact: true })
				).toBeVisible();
				// Le lien mène à la conversation (sans l'ouvrir : l'étape 3 compte le non-lu).
				await expect(item).toHaveAttribute('href', /^\/messages\/c/);
			});

			await test.step('3. Malik voit la demande, l’accepte et répond', async () => {
				await malikPage.goto('/messages');
				await waitForAppReady(malikPage);
				await expect(malikPage.getByRole('heading', { name: 'Demandes reçues (1)' })).toBeVisible();
				await expect(
					malikPage.getByRole('navigation', { name: 'Espace', exact: true }).getByLabel('1 non lu')
				).toBeVisible();
				await malikPage.getByRole('link', { name: new RegExp(lea.actor.displayName) }).click();
				await waitForAppReady(malikPage);
				await malikPage.getByRole('button', { name: 'Accepter' }).click();
				await malikPage.getByLabel('Ton message').fill('Carrément, jeudi soir ?');
				await malikPage.getByRole('button', { name: 'Envoyer' }).click();
				await expect(
					malikPage.getByRole('list', { name: 'Messages' }).getByText('Carrément, jeudi soir ?')
				).toBeVisible();
				await expectNoA11yViolations(malikPage, A11Y_EXCLUDE);
			});

			await test.step('4. Échange réciproque : tracé, sans XP hors annonce', async () => {
				const conversation = await db.conversation.findFirstOrThrow({
					where: { initiatorId: lea.actorId }
				});
				expect(conversation.reciprocatedAt).not.toBeNull();
				expect(
					await db.domainEvent.count({
						where: {
							type: 'conversation.reciprocated',
							actorIds: { has: lea.actorId }
						}
					})
				).toBe(2);
				expect(
					await db.xpTransaction.count({
						where: { actorId: lea.actorId, ruleId: 'conversation.reciprocated' }
					})
				).toBe(0);
			});

			await test.step('5. Léa voit la réponse sans recharger (polling léger)', async () => {
				// La page de Léa est restée ouverte : le rafraîchissement léger (15 s)
				// détecte le neuf et recharge le fil.
				await expect(page.getByText('Carrément, jeudi soir ?')).toBeVisible({ timeout: 25_000 });
				await expect(page.getByRole('button', { name: 'Envoyer' })).toBeVisible();
			});
		} finally {
			await malikContext.close();
			await deleteUser(malikAccount.email);
		}
	});

	test('quota TL0 : 10 premiers messages par jour', async ({ page, account }) => {
		await signUpAndVerify(page, account);
		await skipOnboarding(page, account.email);
		const commune = { code: '31555', nom: 'Toulouse', dep: '31', lat: 43.6007, lng: 1.4328 };
		const created: Awaited<ReturnType<typeof createMusician>>[] = [];
		try {
			for (let i = 1; i <= 11; i++) {
				const other = await createMusician({ name: `Contact${i}`, commune });
				created.push(other);
				await request(page, other.handle, `Bonjour n° ${i}`);
				if (i <= 10) {
					await expect(page).toHaveURL(/\/messages\/c/);
				} else {
					await expect(page.getByRole('alert')).toContainText('nombre de premiers messages');
				}
			}
		} finally {
			// Pas de pollution des recherches des autres specs.
			await deleteMusicians(created);
		}
	});
});
