import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { createMusician, deleteMusicians, skipOnboarding } from '../support/linkmusician';

/**
 * D82 (#99) — Un musicien trouve un ingénieur du son sans jam ni
 * collaboration commune. Il l'enregistre dans son carnet sans lui écrire ;
 * l'ingénieur n'est pas prévenu. Puis, séparément, il lui envoie une demande
 * de conversation. Retirer du carnet ne touche pas à la conversation, et un
 * blocage reste plus fort que le carnet.
 */
test.describe('LinkMusician — carnet de contacts volontaire', () => {
	test.setTimeout(5 * 60_000);
	const A11Y_EXCLUDE = ['.cartButton'];
	const toulouse = { code: '31555', nom: 'Toulouse', dep: '31', lat: 43.6045, lng: 1.444 };

	test('enregistrer sans écrire, écrire sans enregistrer', async ({ page, account }) => {
		const inge = await createMusician({ name: 'Ingeson', commune: toulouse });
		try {
			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			const me = await db.person.findUniqueOrThrow({
				where: { userId: (await requireUser(account.email)).id }
			});

			await test.step('1. Depuis son profil, l’ajouter au carnet sans lui écrire', async () => {
				await page.goto(`/@${inge.handle}`);
				await waitForAppReady(page);
				await page
					.getByRole('button', { name: `Ajouter ${inge.displayName} à mes contacts` })
					.click();
				await expect(page.getByText('Dans tes contacts')).toBeVisible();
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
				expect(
					await db.savedContact.count({ where: { ownerId: me.actorId, contactId: inge.actorId } })
				).toBe(1);
				// Ni notification, ni conversation, ni réciprocité.
				expect(await db.notification.count({ where: { recipientActorId: inge.actorId } })).toBe(0);
				expect(await db.conversationParticipant.count({ where: { actorId: inge.actorId } })).toBe(
					0
				);
				expect(
					await db.savedContact.count({ where: { ownerId: inge.actorId, contactId: me.actorId } })
				).toBe(0);
			});

			await test.step('2. Il est dans « Mon carnet »', async () => {
				await page.goto('/messages/contacts');
				await waitForAppReady(page);
				await expect(
					page
						.getByRole('list', { name: 'Mon carnet' })
						.getByRole('link', { name: inge.displayName, exact: true })
				).toBeVisible();
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
			});

			await test.step('3. Séparément, lui envoyer une demande de conversation', async () => {
				await page.goto(`/messages/nouveau?a=${inge.handle}`);
				await waitForAppReady(page);
				await page.getByLabel('Ton message').fill('Bonjour, tu mixerais notre EP ?');
				await page.getByRole('button', { name: 'Envoyer la demande' }).click();
				await expect
					.poll(() => db.conversationParticipant.count({ where: { actorId: inge.actorId } }))
					.toBe(1);
				const seat = await db.conversationParticipant.findFirstOrThrow({
					where: { actorId: inge.actorId }
				});
				// Une demande, pas une conversation acceptée : le carnet n'a rien contourné.
				expect(seat.state).toBe('REQUEST');
			});

			await test.step('4. Le retirer du carnet ne touche pas à la conversation', async () => {
				await page.goto(`/@${inge.handle}`);
				await waitForAppReady(page);
				await page.getByRole('button', { name: 'Retirer de mes contacts' }).click();
				await expect(
					page.getByRole('button', { name: `Ajouter ${inge.displayName} à mes contacts` })
				).toBeVisible();
				expect(await db.savedContact.count({ where: { ownerId: me.actorId } })).toBe(0);
				expect(await db.conversationParticipant.count({ where: { actorId: inge.actorId } })).toBe(
					1
				);
			});

			await test.step('5. Un blocage l’emporte : ni profil, ni ajout direct', async () => {
				await db.block.create({
					data: { blockerActorId: inge.actorId, blockedActorId: me.actorId }
				});
				const origin = new URL(page.url()).origin;
				const forced = await page.request.post(`/@${inge.handle}?/saveContact`, {
					form: { confirm: '1' },
					headers: { origin, 'x-sveltekit-action': 'true' }
				});
				expect(await forced.text()).toContain('Personne inconnue.');
				expect(await db.savedContact.count({ where: { ownerId: me.actorId } })).toBe(0);
			});
		} finally {
			await deleteMusicians([inge]);
		}
	});
});
