import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { makeAccount } from '../support/account';
import { db, deleteUser, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { createMusician, deleteMusicians, setCity, skipOnboarding } from '../support/linkmusician';

/**
 * P5-11 — Écoles : la prof ouvre son école, crée un lien d'invitation et
 * publie un atelier jam ; Tom suit le lien, rejoint l'école, vient à
 * l'atelier (réservé aux élèves), puis à une jam publique du quartier.
 * Tom ne voit jamais la liste des élèves.
 */
test.describe('LinkMusician — écoles et ateliers', () => {
	test.setTimeout(6 * 60_000);
	const A11Y_EXCLUDE = ['.cartButton'];
	const toulouse = { code: '31555', nom: 'Toulouse', dep: '31', lat: 43.6007, lng: 1.4328 };

	test('la prof invite un élève, il rejoint l’atelier puis une jam publique', async ({
		page,
		account,
		browser
	}) => {
		const tomAccount = makeAccount();
		const tomContext = await browser.newContext();
		const tomPage = await tomContext.newPage();
		const suffix = Math.random().toString(36).slice(2, 8);
		const schoolName = `E2E École du Faubourg ${suffix}`;
		const host = await createMusician({ name: 'Hôte', commune: toulouse });
		let venueId = '';
		try {
			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			await setCity(page);
			await db.person.update({
				where: { userId: (await requireUser(account.email)).id },
				data: { birthDate: new Date('1985-03-03T00:00:00Z') }
			});
			await signUpAndVerify(tomPage, tomAccount);
			await skipOnboarding(tomPage, tomAccount.email);
			const tom = await db.person.findUniqueOrThrow({
				where: { userId: (await requireUser(tomAccount.email)).id },
				select: { actorId: true }
			});
			venueId = (
				await db.venue.create({
					data: {
						name: `E2E MJC du Faubourg ${suffix}`,
						nameKey: `e2e mjc du faubourg ${suffix}`,
						kind: 'MJC',
						communeCode: toulouse.code,
						communeName: toulouse.nom,
						departmentCode: toulouse.dep,
						lat: toulouse.lat,
						lng: toulouse.lng,
						createdById: host.actorId,
						validatedAt: new Date()
					}
				})
			).id;
			const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
			const startsAt = new Date(Date.now() + 2 * 86_400_000);
			const endsAt = new Date(startsAt.getTime() + 2 * 3600 * 1000);
			const publicJam = await db.opportunity.create({
				data: {
					issuerActorId: host.actorId,
					kind: 'JAM',
					title: `E2E Bœuf ouvert ${suffix}`,
					description: 'Tous niveaux.',
					startsAt,
					endsAt,
					expiresAt: endsAt,
					venueId
				}
			});

			let link = '';
			await test.step('1. La prof ouvre son école et crée un lien', async () => {
				await page.goto('/ecoles');
				await waitForAppReady(page);
				await page.getByLabel('Nom de l’école').fill(schoolName);
				await page.getByLabel('Type').selectOption('MUSIC_SCHOOL');
				await page.getByRole('button', { name: 'Ouvrir l’école' }).click();
				await expect(page.getByRole('heading', { name: schoolName })).toBeVisible();
				await page.getByRole('button', { name: 'Créer un lien' }).click();
				const field = page.getByLabel(/Ton lien/);
				await expect(field).toHaveValue(/\/ecole\//);
				link = await field.inputValue();
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
			});

			await test.step('2. Elle publie un atelier jam, réservé aux élèves', async () => {
				await page.getByRole('link', { name: 'Publier un atelier' }).click();
				await page.getByLabel('Lieu').selectOption(venueId);
				await page.getByLabel('Titre').fill('Atelier jam des guitares');
				await page.getByLabel('Jour').fill(tomorrow);
				await page.getByLabel('Début').fill('17:00');
				await page.getByLabel('Fin').fill('19:00');
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
				await page.getByRole('button', { name: 'Publier l’atelier' }).click();
				await expect(page.getByRole('heading', { name: 'Atelier jam des guitares' })).toBeVisible();
				await expect(page.getByText('Atelier réservé aux élèves')).toBeVisible();
			});

			await test.step('3. Tom suit le lien et rejoint l’école', async () => {
				await tomPage.goto(new URL(link).pathname);
				await expect(
					tomPage.getByRole('heading', { name: `Rejoindre ${schoolName}` })
				).toBeVisible();
				await expectNoA11yViolations(tomPage, A11Y_EXCLUDE);
				await tomPage.getByRole('button', { name: 'Rejoindre l’école' }).click();
				await expect(tomPage.getByRole('heading', { name: schoolName })).toBeVisible();
				// Aucune liste d'élèves pour un élève.
				await expect(tomPage.getByRole('heading', { name: /Mes élèves/ })).toHaveCount(0);
			});

			await test.step('4. Il vient à l’atelier', async () => {
				await tomPage.getByRole('link', { name: /Atelier jam des guitares/ }).click();
				await expect(tomPage.getByText('Atelier réservé aux élèves')).toBeVisible();
				await tomPage.getByRole('button', { name: 'Je viens' }).click();
				await expect(tomPage.getByText('Tu viens. On compte sur toi !')).toBeVisible();
			});

			await test.step('5. Puis à une jam publique', async () => {
				await tomPage.goto(`/jams/${publicJam.id}`);
				await waitForAppReady(tomPage);
				await tomPage.getByRole('button', { name: 'Je viens' }).click();
				await expect(tomPage.getByText('Tu viens. On compte sur toi !')).toBeVisible();
				const attendances = await db.jamAttendance.findMany({
					where: { actorId: tom.actorId },
					select: { opportunity: { select: { audience: true } } }
				});
				expect(attendances.map((a) => a.opportunity.audience).sort()).toEqual(['PUBLIC', 'SCHOOL']);
			});
			await test.step('6. Tom quitte l’école et garde son seul historique personnel', async () => {
				const school = await db.actor.findFirstOrThrow({ where: { displayName: schoolName } });
				await tomPage.goto(`/ecoles/${school.handle}`);
				await waitForAppReady(tomPage);
				await tomPage.getByRole('button', { name: 'Quitter l’école' }).click();
				await expect(tomPage).toHaveURL(/\/ecoles$/);
				const historyLink = tomPage.getByRole('link', { name: 'Historique de mes participations' });
				await historyLink.focus();
				await tomPage.keyboard.press('Enter');
				await expect(
					tomPage.getByRole('heading', { name: 'Historique de mes participations' })
				).toBeVisible();
				await expect(tomPage.getByText('Invitation acceptée', { exact: true })).toBeVisible();
				await expect(tomPage.getByText('Participation quittée', { exact: true })).toBeVisible();
				await expect(tomPage.locator('time[datetime]')).toHaveCount(2);
				await expect(tomPage.getByRole('button', { name: 'Quitter l’école' })).toHaveCount(0);
				await expectNoA11yViolations(tomPage, A11Y_EXCLUDE);
				await tomPage.setViewportSize({ width: 390, height: 844 });
				expect(
					await tomPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
				).toBe(true);
				await expectNoA11yViolations(tomPage, A11Y_EXCLUDE);
				const forbidden = await tomPage.goto(`/ecoles/${school.handle}`);
				expect(forbidden?.status()).toBe(404);
				await page.goto('/structure/historique');
				await expect(page.getByText(schoolName, { exact: true })).toHaveCount(0);
			});
		} finally {
			await tomContext.close();
			await db.actor.deleteMany({ where: { displayName: schoolName } });
			if (venueId) await db.venue.deleteMany({ where: { id: venueId } });
			await deleteMusicians([host]);
			await deleteUser(tomAccount.email).catch(() => {});
		}
	});
});
