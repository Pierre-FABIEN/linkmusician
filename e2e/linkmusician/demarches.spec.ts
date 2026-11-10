import { readFile } from 'node:fs/promises';
import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { skipOnboarding } from '../support/linkmusician';

/**
 * Guide des démarches (P3-15a) : un visiteur ouvre la page-menu, lit la
 * fiche « Protéger un morceau » (en bref, date de vérification, sources
 * officielles, avertissement), passe à une fiche voisine, et la fiche des
 * mineur·es se lit sur mobile.
 */
test.describe('LinkMusician — démarches', () => {
	test.setTimeout(2 * 60_000);
	const A11Y_EXCLUDE = ['.cartButton'];

	test('un visiteur lit la fiche « Protéger un morceau »', async ({ browser }) => {
		const visitor = await browser.newContext();
		try {
			const page = await visitor.newPage();
			await page.goto('/demarches');
			await waitForAppReady(page);
			await expect(page.getByRole('heading', { level: 1 })).toHaveText('Les démarches');
			const create = page.getByRole('navigation', { name: 'Créer un morceau' });
			await expect(create.getByRole('link')).toHaveCount(2);
			await expectNoA11yViolations(page, A11Y_EXCLUDE);

			await create.getByRole('link', { name: /Protéger un morceau/ }).click();
			await expect(page).toHaveURL(/\/demarches\/proteger-un-morceau$/);
			await expect(page.getByRole('heading', { level: 1 })).toHaveText('Protéger un morceau');
			await expect(page.getByRole('complementary', { name: 'En bref' })).toBeVisible();
			await expect(page.getByText('Vérifiée le 10 novembre 2026')).toBeVisible();
			const sources = page.getByRole('heading', { name: 'Sources officielles' });
			await expect(sources).toBeVisible();
			await expect(
				page.getByRole('link', { name: /e-Soleau : protégez votre création/ })
			).toHaveAttribute('href', /^https:\/\/www\.inpi\.fr\//);
			await expect(page.getByText('pas un conseil personnalisé', { exact: false })).toBeVisible();
			await expectNoA11yViolations(page, A11Y_EXCLUDE);

			await page
				.getByRole('navigation', { name: 'Démarches voisines' })
				.getByRole('link', { name: /Écrire un morceau à plusieurs/ })
				.click();
			await expect(page.getByRole('heading', { level: 1 })).toHaveText(
				'Écrire un morceau à plusieurs'
			);

			await page.setViewportSize({ width: 390, height: 844 });
			await page.goto('/demarches/mineurs-sur-scene');
			await waitForAppReady(page);
			await expect(page.getByRole('heading', { level: 1 })).toHaveText(
				'Jouer sur scène avant 18 ans'
			);
			await expectNoA11yViolations(page, A11Y_EXCLUDE);

			const missing = await page.goto('/demarches/nexiste-pas');
			expect(missing?.status()).toBe(404);
		} finally {
			await visitor.close();
		}
	});

	test('je télécharge le bulletin de partage de notre morceau', async ({ page, account }) => {
		await signUpAndVerify(page, account);
		await skipOnboarding(page, account.email);
		const person = await db.person.findUniqueOrThrow({
			where: { userId: (await requireUser(account.email)).id }
		});
		const peer = await db.actor.create({
			data: {
				kind: 'PERSON',
				handle: `bulletin-peer-${Math.random().toString(36).slice(2, 9)}`,
				displayName: 'Bulletin Peer'
			}
		});
		try {
			const work = await db.work.create({
				data: {
					ownerId: person.actorId,
					createdById: person.actorId,
					title: 'Notre morceau',
					state: 'COMPOSED',
					proof: 'CORROBORATED',
					composedAt: new Date()
				}
			});
			for (const [personId, kind] of [
				[person.actorId, 'LYRICS'],
				[peer.id, 'COMPOSITION']
			] as const) {
				const credit = await db.workContributor.create({
					data: { workId: work.id, personId, confirmedAt: new Date() }
				});
				await db.workRole.create({ data: { workId: work.id, kind, contributorId: credit.id } });
			}

			await page.goto(`/morceaux/${work.id}`);
			await waitForAppReady(page);
			const nudge = page.getByRole('complementary', { name: 'Démarche' });
			await expect(nudge).toContainText('Vous l’avez écrit à plusieurs');
			await expectNoA11yViolations(page, A11Y_EXCLUDE);

			const [download] = await Promise.all([
				page.waitForEvent('download'),
				nudge.getByRole('link', { name: 'Télécharger le bulletin de partage' }).click()
			]);
			expect(download.suggestedFilename()).toBe('bulletin-de-partage-Notre-morceau.pdf');
			const pdf = await readFile((await download.path())!);
			expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');

			// « J'ai compris » : la démarche suivante prend la place, le lien permanent reste.
			await nudge.getByRole('button', { name: 'J’ai compris' }).click();
			await expect(nudge).toBeHidden();
			await page.reload();
			await waitForAppReady(page);
			await expect(nudge).toContainText('Garde une preuve de la date');
			await expect(page.getByRole('link', { name: /Bulletin de partage \(PDF\)/ })).toBeVisible();
			expect(
				(await db.person.findUniqueOrThrow({ where: { actorId: person.actorId } })).tipsDismissed
			).toContain('demarche:morceau-a-plusieurs');
		} finally {
			await db.actor.delete({ where: { id: peer.id } });
		}
	});
});
