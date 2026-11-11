import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { makeAccount } from '../support/account';
import { db, deleteUser, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { skipOnboarding } from '../support/linkmusician';
import { expectNoA11yViolations } from '../support/a11y';

/**
 * P5-02 — Organisation vérifiée : un studio demande sa vérification. Un
 * SIRET fermé dans la base des entreprises est refusé tout de suite ; un
 * SIRET actif part en file, avec le nom trouvé. La modération accepte : le
 * studio est vérifié. Puis elle retire la vérification, avec un motif montré
 * à la gestion. (Recherche Sirene en mode e2e : la table seule.)
 */
test.describe('LinkMusician — organisation vérifiée', () => {
	test.setTimeout(6 * 60_000);

	/** SIRET fictifs (clé de Luhn valide), présents seulement dans la base e2e. */
	const ACTIVE = '99900000200025';
	const CLOSED = '99900000200033';
	const establishment = (siret: string, active: boolean) => ({
		siret,
		siren: siret.slice(0, 9),
		name: `E2E STUDIO VERIFIE ${active ? 'ACTIF' : 'FERME'}`,
		nameKey: `e2e studio verifie ${active ? 'actif' : 'ferme'}`,
		naf: '59.20Z',
		communeCode: '31555',
		communeName: 'Toulouse',
		departmentCode: '31',
		active
	});

	async function openStudio(page: Page, email: string, name: string) {
		await page.goto('/qui-es-tu');
		await waitForAppReady(page);
		await page.getByLabel('Ingé son').check();
		await page.getByRole('button', { name: 'Continuer' }).click();
		await page.waitForURL(/\/demarrer/);
		await db.person.update({
			where: { userId: (await requireUser(email)).id },
			data: { onboardedAt: new Date() }
		});
		await page.goto('/studios');
		await waitForAppReady(page);
		await page.getByLabel('Nom du studio').fill(name);
		await page.getByRole('button', { name: 'Créer la fiche' }).click();
		await page.waitForURL(/\/studios\/[^/?]+\?cree=1/);
		await waitForAppReady(page);
		return new URL(page.url()).pathname.split('/').pop()!;
	}

	test('un studio demande sa vérification, la modération l’accepte', async ({
		page,
		account,
		browser
	}) => {
		const moderator = makeAccount();
		const modContext = await browser.newContext();
		const mod = await modContext.newPage();
		const studioName = `Studio Vérifié ${Date.now().toString(36)}`;
		let studioHandle = '';
		await db.organizationVerification.deleteMany({ where: { siret: { in: [ACTIVE, CLOSED] } } });
		for (const [siret, active] of [
			[ACTIVE, true],
			[CLOSED, false]
		] as const) {
			await db.establishment.upsert({
				where: { siret },
				create: establishment(siret, active),
				update: { active }
			});
		}
		try {
			await test.step('1. J’ouvre mon studio', async () => {
				await signUpAndVerify(page, account);
				studioHandle = await openStudio(page, account.email, studioName);
			});

			const card = page.getByRole('region', { name: 'Studio vérifié' });

			await test.step('2. Un SIRET fermé est refusé tout de suite', async () => {
				await card.getByLabel('SIRET').fill(CLOSED);
				await card.getByLabel('Site ou réseau officiel').fill('https://www.instagram.com/e2e');
				await card.getByRole('button', { name: 'Demander la vérification' }).click();
				await expect(card.getByRole('alert')).toContainText('fermé');
			});

			await test.step('3. Avec un SIRET actif, la demande part en examen', async () => {
				await card.getByLabel('SIRET').fill(ACTIVE);
				await card.getByLabel('Site ou réseau officiel').fill('https://www.instagram.com/e2e');
				await card.getByRole('button', { name: 'Demander la vérification' }).click();
				await expect(card.getByRole('status')).toContainText('en cours d’examen');
				await expectNoA11yViolations(page, ['.cartButton']);
			});

			const studio = await db.actor.findUniqueOrThrow({ where: { handle: studioHandle } });

			await test.step('4. La modération voit le nom trouvé et accepte', async () => {
				await signUpAndVerify(mod, moderator);
				await skipOnboarding(mod, moderator.email);
				await db.user.update({ where: { email: moderator.email }, data: { role: 'MODERATOR' } });
				await mod.goto('/moderation');
				await waitForAppReady(mod);
				const request = mod.getByRole('article', { name: `Vérification de ${studioName}` });
				await expect(request).toContainText('E2E STUDIO VERIFIE ACTIF');
				await request.getByRole('button', { name: 'Vérifier' }).click();
				await expect
					.poll(async () =>
						(
							await db.organization.findUniqueOrThrow({ where: { actorId: studio.id } })
						).verifiedAt?.getTime()
					)
					.toBeTruthy();
			});

			await test.step('5. Le studio est vérifié', async () => {
				await page.reload();
				await waitForAppReady(page);
				await expect(card).toContainText('Le studio est vérifié');
			});

			await test.step('6. La modération retire la vérification, avec un motif', async () => {
				await mod.reload();
				await waitForAppReady(mod);
				const verified = mod.getByRole('region', { name: /Organisations vérifiées/ });
				await verified.getByLabel(`Motif du retrait pour ${studioName}`).fill('SIRET radié');
				await verified
					.getByRole('listitem')
					.filter({ hasText: studioName })
					.getByRole('button', { name: 'Retirer' })
					.click();
				await expect
					.poll(
						async () =>
							(await db.organization.findUniqueOrThrow({ where: { actorId: studio.id } }))
								.verifiedAt
					)
					.toBeNull();
				await page.reload();
				await waitForAppReady(page);
				await expect(card).toContainText('Vérification retirée : SIRET radié');
			});
		} finally {
			await modContext.close();
			if (studioHandle) await db.actor.deleteMany({ where: { handle: studioHandle } });
			await db.establishment.deleteMany({ where: { siret: { in: [ACTIVE, CLOSED] } } });
			await deleteUser(moderator.email);
		}
	});
});
