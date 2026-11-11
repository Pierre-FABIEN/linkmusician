import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady, waitForPath } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { createMusician, deleteMusicians, setCity } from '../support/linkmusician';

/**
 * P5-05b — Organisation d'organisateur·rices : une organisatrice crée la
 * fiche de son association, la complète (ville, ce qu'elle organise),
 * invite une co-organisatrice, puis publie un plateau au nom de
 * l'association. La page publique de l'association montre le plateau ; le
 * plateau dit qui le propose.
 */
test.describe('LinkMusician — organisation d’organisateur·rices', () => {
	test.setTimeout(6 * 60_000);
	const A11Y_EXCLUDE = ['.cartButton'];
	const toulouse = { code: '31555', nom: 'Toulouse', dep: '31', lat: 43.6007, lng: 1.4328 };

	test('l’association publie un plateau', async ({ page, account }) => {
		const suffix = Math.random().toString(36).slice(2, 8);
		const orgName = `E2E Asso Bruit Rose ${suffix}`;
		const venueName = `E2E Le Bikini ${suffix}`;
		const zoe = await createMusician({ name: 'Zoé', commune: toulouse });
		await db.personTrack.create({
			data: { personId: zoe.actorId, track: 'PROMOTER', isPrimary: false }
		});
		let venueId = '';
		let orgHandle = '';
		try {
			await test.step('1. Organisatrice majeure, ma ville', async () => {
				await signUpAndVerify(page, account);
				await page.goto('/qui-es-tu');
				await waitForAppReady(page);
				await page.getByLabel('Organisateur·rice').check();
				await page.getByRole('button', { name: 'Continuer' }).click();
				await page.waitForURL(/\/demarrer/);
				const user = await requireUser(account.email);
				await db.person.update({
					where: { userId: user.id },
					data: { onboardedAt: new Date(), birthDate: new Date('1988-05-02T00:00:00Z') }
				});
				await setCity(page);
			});
			const me = await db.person.findUniqueOrThrow({
				where: { userId: (await requireUser(account.email)).id }
			});
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
						validatedAt: new Date()
					}
				})
			).id;

			await test.step('2. Je crée l’association depuis mon profil', async () => {
				await page.goto('/profil');
				await waitForAppReady(page);
				await page.getByRole('link', { name: /Mes organisations/ }).click();
				await waitForPath(page, '/organisations');
				await waitForAppReady(page);
				await page.getByLabel('Nom de l’organisation').fill(orgName);
				await page.getByRole('button', { name: 'Créer' }).click();
				await expect(page).toHaveURL(/\/organisations\/[a-z0-9-]+\?cree=1/);
				orgHandle = new URL(page.url()).pathname.split('/').pop()!;
				await expect(page.getByText(/indique d’abord la ville de l’organisation/)).toBeVisible();
			});

			await test.step('3. Je complète la fiche', async () => {
				await page.getByLabel('Ville de l’organisation').pressSequentially('toulou', { delay: 50 });
				await page.getByRole('option').first().getByRole('button').click();
				await page.getByRole('checkbox', { name: /Concerts/ }).check();
				await page.getByLabel('Jauge habituelle (facultatif)').fill('300');
				await page.getByRole('button', { name: 'Enregistrer la fiche' }).click();
				await expect(page.getByText('La fiche est enregistrée.')).toBeVisible();
				await expect(page.getByRole('link', { name: 'Publier un plateau' })).toBeVisible();
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
			});

			await test.step('4. J’invite Zoé à la co-gestion', async () => {
				await page.getByLabel('Inviter à gérer').fill(`@${zoe.handle}`);
				await page.getByRole('button', { name: 'Inviter', exact: true }).click();
				await expect(page.getByText(`Invitation envoyée à ${zoe.displayName}.`)).toBeVisible();
				await expect(page.getByText(/invitation envoyée/).first()).toBeVisible();
			});

			await test.step('5. Je publie un plateau au nom de l’association', async () => {
				await page.getByRole('link', { name: 'Publier un plateau' }).click();
				await waitForPath(page, '/plateaux/nouveau');
				await waitForAppReady(page);
				await expect(page.getByRole('combobox', { name: 'Publier au nom de' })).toHaveValue(
					orgHandle
				);
				await page.getByLabel('Lieu').selectOption(venueId);
				const day = new Date(Date.now() + 15 * 86_400_000).toISOString().slice(0, 10);
				await page.getByLabel('Date').fill(day);
				await page.getByLabel('Titre').fill('Plateau de l’asso');
				await page
					.getByLabel('Description')
					.fill('Deux groupes, chapeau et repas, le son est assuré par l’association.');
				await page.getByRole('button', { name: 'Publier le plateau' }).click();
				await expect(page).toHaveURL(/\/annonces\/c/);
				await expect(page.getByText(/Plateau proposé par/)).toContainText(orgName);
			});

			await test.step('6. La page publique de l’association montre le plateau', async () => {
				await page.goto(`/@${orgHandle}`);
				await waitForAppReady(page);
				await expect(page.getByRole('heading', { name: orgName, level: 1 })).toBeVisible();
				await expect(page.getByRole('link', { name: /Plateau de l’asso/ })).toBeVisible();
				await expect(page.getByText('Jauge habituelle : 300 personnes')).toBeVisible();
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
			});
		} finally {
			if (orgHandle) await db.actor.deleteMany({ where: { handle: orgHandle } });
			if (venueId) await db.venue.deleteMany({ where: { id: venueId } });
			await deleteMusicians([zoe]);
		}
	});
});
