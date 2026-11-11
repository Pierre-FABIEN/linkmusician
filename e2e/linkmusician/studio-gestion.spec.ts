import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { makeAccount } from '../support/account';
import { db, deleteUser, requireUser } from '../support/db';
import { waitForAppReady, waitForPath } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';

/**
 * P4-03b — Co-gestion du studio : l'ingé son qui a ouvert le studio invite
 * une productrice à le gérer ; elle accepte depuis « Mes studios » et peut
 * modifier la fiche. Puis la ou le responsable quitte la gestion : le
 * studio lui est transmis, il ne reste jamais sans responsable. (Les photos
 * ne se testent pas ici : pas de Cloudinary en e2e.)
 */
test.describe('LinkMusician — co-gestion du studio', () => {
	test.setTimeout(6 * 60_000);

	/** Inscription avec un métier du son, onboarding marqué terminé en base. */
	async function joinAs(page: Page, email: string, track: 'Ingé son' | 'Producteur·rice') {
		await page.goto('/qui-es-tu');
		await waitForAppReady(page);
		await page.getByLabel(track).check();
		await page.getByRole('button', { name: 'Continuer' }).click();
		await page.waitForURL(/\/demarrer/);
		const user = await requireUser(email);
		const person = await db.person.update({
			where: { userId: user.id },
			data: { onboardedAt: new Date() },
			include: { actor: true }
		});
		return person.actor;
	}

	test('j’invite une productrice à gérer mon studio', async ({ page, account, browser }) => {
		const nora = makeAccount();
		const noraContext = await browser.newContext();
		const noraPage = await noraContext.newPage();
		const studioName = `Studio Gestion ${Date.now().toString(36)}`;
		let studioHandle = '';
		try {
			await test.step('1. J’ouvre mon studio', async () => {
				await signUpAndVerify(page, account);
				await joinAs(page, account.email, 'Ingé son');
				await page.goto('/studios');
				await waitForAppReady(page);
				await page.getByLabel('Nom du studio').fill(studioName);
				await page.getByRole('button', { name: 'Créer la fiche' }).click();
				await page.waitForURL(/\/studios\/[^/?]+\?cree=1/);
				studioHandle = new URL(page.url()).pathname.split('/').pop()!;
				await waitForAppReady(page);
			});

			const noraActor = await test.step('2. Nora s’inscrit comme productrice', async () => {
				await signUpAndVerify(noraPage, nora);
				return joinAs(noraPage, nora.email, 'Producteur·rice');
			});

			await test.step('3. Je l’invite à gérer le studio', async () => {
				const gestion = page.getByRole('region', { name: 'Gestion' });
				await gestion.getByLabel('Inviter à gérer').fill(`@${noraActor.handle}`);
				await gestion.getByRole('button', { name: 'Inviter' }).click();
				await expect(gestion.getByText(/invitation envoyée/)).toBeVisible();
				await expect(gestion.getByRole('link', { name: noraActor.displayName })).toBeVisible();
			});

			await test.step('4. Nora accepte depuis « Mes studios »', async () => {
				await noraPage.goto('/studios');
				await waitForAppReady(noraPage);
				const invites = noraPage.getByRole('region', { name: 'Invitations' });
				await expect(invites).toContainText(studioName);
				await expectNoA11yViolations(noraPage, ['.cartButton']);
				await invites.getByRole('button', { name: 'Accepter' }).click();
				await expect(noraPage.getByText('Tu gères maintenant ce studio.').first()).toBeVisible();
				await noraPage.getByRole('link', { name: studioName }).first().click();
				await waitForPath(noraPage, `/studios/${studioHandle}`);
				await waitForAppReady(noraPage);
				await expect(noraPage.getByRole('button', { name: 'Enregistrer la fiche' })).toBeVisible();
			});

			await test.step('5. Je quitte la gestion : Nora devient responsable', async () => {
				await page.reload();
				await waitForAppReady(page);
				const gestion = page.getByRole('region', { name: 'Gestion' });
				await gestion.getByRole('button', { name: 'Quitter la gestion' }).click();
				await waitForPath(page, '/studios');

				const studio = await db.actor.findUniqueOrThrow({ where: { handle: studioHandle } });
				const active = await db.membership.findMany({
					where: { orgId: studio.id, status: 'ACTIVE' },
					select: { personId: true, role: true }
				});
				expect(active).toEqual([{ personId: noraActor.id, role: 'OWNER' }]);

				const response = await page.goto(`/studios/${studioHandle}`);
				expect([403, 404]).toContain(response?.status());
			});
		} finally {
			await noraContext.close();
			if (studioHandle) await db.actor.deleteMany({ where: { handle: studioHandle } });
			await deleteUser(nora.email);
		}
	});
});
