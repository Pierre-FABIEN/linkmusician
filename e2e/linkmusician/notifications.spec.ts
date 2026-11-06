import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { clearMailbox, decodeQuotedPrintable, waitForEmailContaining } from '../support/mailbox';
import { createMusician, deleteMusicians, skipOnboarding } from '../support/linkmusician';

/**
 * P2-09b — Digest email : préférences par sujet dans `/reglages`, digest
 * envoyé par le job (déclenché comme Vercel Cron), lien de désinscription
 * suivi depuis l'email reçu, confirmation d'un clic.
 */
test.describe('LinkMusician — digest email', () => {
	test.setTimeout(5 * 60_000);
	// Bouton panier du boilerplate (boutique active en e2e), remontée n° 14.
	const A11Y_EXCLUDE = ['.cartButton'];

	test('préférences, digest reçu, désinscription', async ({ page, account }) => {
		const commune = { code: '31555', nom: 'Toulouse', dep: '31', lat: 43.6007, lng: 1.4328 };
		const max = await createMusician({ name: 'Maxime', commune });
		try {
			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			const lea = await db.person.findUniqueOrThrow({
				where: { userId: (await requireUser(account.email)).id }
			});

			await test.step('1. Préférences : couper un sujet par email', async () => {
				await page.goto('/reglages#notifications');
				await waitForAppReady(page);
				await page.getByLabel('Appréciations reçues par email').uncheck();
				await page.getByRole('button', { name: 'Enregistrer mes notifications' }).click();
				await expect(
					page.getByText('Tes préférences de notifications sont enregistrées.')
				).toBeVisible();
				await expect
					.poll(
						async () =>
							(
								await db.notificationPreference.findUnique({
									where: { actorId_type: { actorId: lea.actorId, type: 'ENDORSEMENT' } }
								})
							)?.email
					)
					.toBe(false);
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
			});

			let unsubscribePath = '';
			await test.step('2. Le job envoie le digest, une seule fois', async () => {
				await db.notification.create({
					data: {
						recipientActorId: lea.actorId,
						type: 'CONTACT_REQUEST',
						fromActorId: max.actorId,
						href: '/messages'
					}
				});
				await clearMailbox();
				const auth = { authorization: `Bearer ${process.env.CRON_SECRET}` };
				const first = await page.request.get('/api/jobs/digest', { headers: auth });
				expect(first.ok()).toBe(true);
				// Le décodage du puits rend l'UTF-8 octet par octet : on cherche de l'ASCII.
				const mail = await waitForEmailContaining(account.email, `${max.displayName} aimerait`);
				const body = decodeQuotedPrintable(mail.raw);
				const link = body.match(/\/notifications\/desinscription\?t=([A-Za-z0-9_.-]+)/g)?.at(-1);
				expect(link).toBeTruthy();
				unsubscribePath = link!;
				// Relancé aussitôt : pas de second email.
				const again = await page.request.get('/api/jobs/digest', { headers: auth });
				expect(((await again.json()) as { sent: number }).sent).toBe(0);
			});

			await test.step('3. Le lien de l’email : confirmer d’un clic', async () => {
				await page.goto(unsubscribePath);
				await waitForAppReady(page);
				await expect(page.getByRole('heading', { name: 'Moins d’emails ?' })).toBeVisible();
				// Ouvrir le lien ne coupe rien.
				expect(
					await db.notificationPreference.count({
						where: { actorId: lea.actorId, email: false }
					})
				).toBe(1);
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
				await page.getByRole('button', { name: 'Confirmer' }).click();
				await expect(page.getByRole('heading', { name: 'C’est fait' })).toBeVisible();
				await expect
					.poll(() =>
						db.notificationPreference.count({ where: { actorId: lea.actorId, email: true } })
					)
					.toBe(0);
			});
		} finally {
			await deleteMusicians([max]);
		}
	});
});
