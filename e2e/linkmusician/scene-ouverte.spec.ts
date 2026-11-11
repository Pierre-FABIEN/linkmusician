import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { makeAccount } from '../support/account';
import { db, deleteUser, requireUser } from '../support/db';
import { waitForAppReady, waitForPath } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { setCity, skipOnboarding } from '../support/linkmusician';

/**
 * P5-04a — Scène ouverte récurrente : le patron d'un bar dont la fiche est
 * publiée (préparée en base) publie « tous les jeudis, 20 h-23 h » depuis la
 * gestion du lieu. Léa, musicienne à Toulouse, trouve la scène ouverte du
 * jeudi dans le calendrier du mode jam, hébergée par le lieu.
 */
test.describe('LinkMusician — scène ouverte du jeudi', () => {
	test.setTimeout(6 * 60_000);
	const A11Y_EXCLUDE = ['.cartButton'];
	const toulouse = { code: '31555', nom: 'Toulouse', dep: '31', lat: 43.6007, lng: 1.4328 };

	test('le bar publie sa scène ouverte, une musicienne la trouve', async ({
		page,
		account,
		browser
	}) => {
		const leaAccount = makeAccount();
		const leaContext = await browser.newContext();
		const leaPage = await leaContext.newPage();
		const suffix = Math.random().toString(36).slice(2, 8);
		const venueName = `E2E Le Bœuf ${suffix}`;
		let venueId = '';
		let orgId = '';
		try {
			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			const me = await db.person.update({
				where: { userId: (await requireUser(account.email)).id },
				data: { birthDate: new Date('1978-06-21T00:00:00Z') }
			});
			// Revendication approuvée (P5-03a) et fiche publiée (P5-03b), en base.
			venueId = (
				await db.venue.create({
					data: {
						name: venueName,
						nameKey: venueName.toLowerCase(),
						kind: 'BAR',
						communeCode: toulouse.code,
						communeName: toulouse.nom,
						departmentCode: toulouse.dep,
						lat: toulouse.lat,
						lng: toulouse.lng,
						createdById: me.actorId,
						validatedAt: new Date(),
						backline: ['DRUMS', 'BASS_AMP']
					}
				})
			).id;
			orgId = (
				await db.actor.create({
					data: {
						kind: 'ORGANIZATION',
						handle: `e2e-boeuf-${suffix}`,
						displayName: venueName,
						organization: {
							create: {
								kind: 'VENUE',
								memberships: {
									create: {
										personId: me.actorId,
										role: 'OWNER',
										status: 'ACTIVE',
										startedAt: new Date()
									}
								},
								venueProfile: {
									create: {
										capacity: 60,
										stage: 'Petite scène, batterie et ampli basse.',
										conditions: ['HAT'],
										days: [4],
										publishedAt: new Date()
									}
								}
							}
						}
					}
				})
			).id;
			await db.venue.update({ where: { id: venueId }, data: { claimedByActorId: orgId } });

			await test.step('1. Depuis la gestion du lieu, je publie une scène ouverte', async () => {
				await page.goto(`/lieux/${venueId}/gerer`);
				await waitForAppReady(page);
				await page.getByRole('link', { name: 'Publier une scène ouverte' }).click();
				await waitForPath(page, `/lieux/${venueId}/gerer/scene-ouverte`);
				await waitForAppReady(page);
				// Le jour de la fiche (jeudi) et le titre sont préremplis.
				await expect(page.getByLabel('Chaque')).toHaveValue('4');
				await expect(page.getByLabel('Titre')).toHaveValue('Scène ouverte du jeudi');
				await page.getByLabel('Instrument à ajouter').selectOption('batterie');
				await page.getByRole('button', { name: 'Ajouter' }).click();
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
				await page.getByRole('button', { name: 'Publier la scène ouverte' }).click();
				await waitForPath(page, `/lieux/${venueId}/gerer`);
				await waitForAppReady(page);
				const list = page.getByRole('list', { name: 'Scènes ouvertes du lieu' });
				await expect(list.getByText('Scène ouverte du jeudi').first()).toBeVisible();
				await expect(list.getByText(/Tous les jeudis, 20 h–23 h\. Prochaine/)).toBeVisible();
				expect(await db.opportunity.count({ where: { issuerActorId: orgId, kind: 'JAM' } })).toBe(
					4
				);
			});

			await test.step('2. Léa trouve la scène ouverte du jeudi dans le mode jam', async () => {
				await signUpAndVerify(leaPage, leaAccount);
				await skipOnboarding(leaPage, leaAccount.email);
				await setCity(leaPage);
				await leaPage.goto('/jam/agenda');
				await waitForAppReady(leaPage);
				const jams = leaPage.getByRole('list', { name: 'Jams à venir' });
				const card = jams.getByRole('link', { name: /Scène ouverte du jeudi/ });
				await expect(card).toContainText('Tous les jeudis');
				await expect(card).toContainText(venueName);
				await expectNoA11yViolations(leaPage, A11Y_EXCLUDE);
				await card.click();
				await waitForAppReady(leaPage);
				await expect(
					leaPage.getByRole('heading', { name: 'Scène ouverte du jeudi' })
				).toBeVisible();
				// L'hôte est le lieu : son lien mène à la page du lieu.
				await expect(leaPage.getByRole('link', { name: venueName }).first()).toHaveAttribute(
					'href',
					`/lieux/${venueId}`
				);
				await leaPage.getByRole('button', { name: 'Je viens' }).first().click();
				await expect(leaPage.getByText(/Tu viens/).first()).toBeVisible();
			});

			await test.step('3. J’arrête la scène ouverte : les jams à venir sont annulées', async () => {
				await page.reload();
				await waitForAppReady(page);
				await page.getByRole('button', { name: /Arrêter/ }).click();
				await expect(page.getByText(/Scène ouverte arrêtée/).first()).toBeVisible();
				expect(
					await db.opportunity.count({
						where: { issuerActorId: orgId, kind: 'JAM', status: 'OPEN' }
					})
				).toBe(0);
			});
		} finally {
			await leaContext.close();
			if (venueId) await db.venue.deleteMany({ where: { id: venueId } });
			if (orgId) await db.actor.deleteMany({ where: { id: orgId } });
			await deleteUser(leaAccount.email).catch(() => {});
		}
	});
});
