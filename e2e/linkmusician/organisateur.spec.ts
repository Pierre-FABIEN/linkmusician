import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { makeAccount } from '../support/account';
import { db, deleteUser, requireUser } from '../support/db';
import { waitForAppReady, waitForPath } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { setCity, skipOnboarding } from '../support/linkmusician';

/**
 * P5-05a — Organisateur·rice : une organisatrice choisit le métier, remplit
 * sa fiche et publie un plateau depuis la fiche d'un lieu (rang « Live »,
 * rock). Le groupe de Malik, qui n'a pas encore joué, ne peut pas candidater
 * et voit pourquoi ; une fois son premier concert corroboré, il candidate au
 * nom du groupe ; l'organisatrice accepte, et la conversation s'ouvre.
 */
test.describe('LinkMusician — organisateur·rice', () => {
	test.setTimeout(7 * 60_000);
	const A11Y_EXCLUDE = ['.cartButton'];
	const toulouse = { code: '31555', nom: 'Toulouse', dep: '31', lat: 43.6007, lng: 1.4328 };

	test('un plateau, un groupe hors conditions, puis une candidature acceptée', async ({
		page,
		account,
		browser
	}) => {
		const malikAccount = makeAccount();
		const malikContext = await browser.newContext();
		const malikPage = await malikContext.newPage();
		const suffix = Math.random().toString(36).slice(2, 8);
		const bandName = `E2E Les Rats ${suffix}`;
		const venueName = `E2E Le Saint-Des-Seins ${suffix}`;
		let bandId = '';
		let venueId = '';
		try {
			await test.step('1. Je choisis le métier « Organisateur·rice »', async () => {
				await signUpAndVerify(page, account);
				await page.goto('/qui-es-tu');
				await waitForAppReady(page);
				await page.getByLabel('Organisateur·rice').check();
				await page.getByRole('button', { name: 'Continuer' }).click();
				await page.waitForURL(/\/demarrer/);
				const user = await requireUser(account.email);
				// Majeure (D5) : une date inconnue vaut mineur·e.
				await db.person.update({
					where: { userId: user.id },
					data: { onboardedAt: new Date(), birthDate: new Date('1990-03-01T00:00:00Z') }
				});
				await setCity(page);
			});

			const me = await db.person.findUniqueOrThrow({
				where: { userId: (await requireUser(account.email)).id },
				include: { actor: true }
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

			await test.step('2. Je remplis ma fiche d’organisateur·rice', async () => {
				await page.goto('/profil');
				await waitForAppReady(page);
				await page.getByRole('link', { name: /Mon profil d’organisateur·rice/ }).click();
				await waitForPath(page, '/profil/organisateur');
				await waitForAppReady(page);
				await page.getByRole('checkbox', { name: /Concerts/ }).check();
				await page.getByLabel('Rock', { exact: true }).check();
				await page.getByLabel('Ma jauge habituelle').fill('120');
				await page.getByRole('button', { name: 'Enregistrer' }).click();
				// D62 (ONB-13a) : une spécialité ne suffit pas, il faut une offre cochée.
				await expect(page.getByText(/Coche ce que tu proposes/).first()).toBeVisible();
				await expect(page.getByTestId('completude')).toContainText('Ce que tu proposes');
				// L'écran du métier est couvert par onboarding-metiers.spec.ts : l'offre en base.
				await db.personTrackIntent.create({
					data: {
						personId: me.actorId,
						track: 'PROMOTER',
						direction: 'OFFER',
						code: 'CONCERT_DATES'
					}
				});
				await page.getByRole('button', { name: 'Enregistrer' }).click();
				await expect(page.getByText(/on te trouve dans la recherche/).first()).toBeVisible();
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
			});

			let plateauUrl = '';
			await test.step('3. Je publie un plateau depuis la fiche du lieu', async () => {
				await page.goto(`/lieux/${venueId}`);
				await waitForAppReady(page);
				await page.getByRole('link', { name: 'Publier un plateau ici' }).click();
				await waitForPath(page, '/plateaux/nouveau');
				await waitForAppReady(page);
				await expect(page.getByLabel('Lieu')).toHaveValue(venueId);
				const day = new Date(Date.now() + 12 * 86_400_000).toISOString().slice(0, 10);
				await page.getByLabel('Date').fill(day);
				await page.getByLabel('Titre').fill('Plateau rock du vendredi');
				await page
					.getByLabel('Description')
					.fill('Deux groupes, sets de quarante minutes, chapeau et repas offerts.');
				await page.getByLabel('Rang minimal du groupe').selectOption('FIRST_GIG');
				await page.getByLabel('Genre').selectOption('rock');
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
				await page.getByRole('button', { name: 'Publier le plateau' }).click();
				await expect(page).toHaveURL(/\/annonces\/c/);
				plateauUrl = new URL(page.url()).pathname;
				await expect(page.getByText('Rang du groupe : Live ou plus')).toBeVisible();
				await expect(page.getByRole('link', { name: venueName })).toBeVisible();
			});

			await test.step('4. Le groupe de Malik n’a pas encore joué : il voit pourquoi', async () => {
				await signUpAndVerify(malikPage, malikAccount);
				await skipOnboarding(malikPage, malikAccount.email);
				const malik = await db.person.update({
					where: { userId: (await requireUser(malikAccount.email)).id },
					data: { birthDate: new Date('1994-09-12T00:00:00Z') }
				});
				const rock = await db.genre.findUniqueOrThrow({ where: { slug: 'rock' } });
				bandId = (
					await db.actor.create({
						data: {
							kind: 'ORGANIZATION',
							handle: `e2e-rats-${suffix}`,
							displayName: bandName,
							genres: { create: { genreId: rock.id } },
							organization: {
								create: {
									kind: 'BAND',
									memberships: {
										create: {
											personId: malik.actorId,
											role: 'OWNER',
											status: 'ACTIVE',
											startedAt: new Date()
										}
									}
								}
							}
						}
					})
				).id;
				await db.$executeRawUnsafe(
					`INSERT INTO "e2e"."actor_locations" ("actorId", "communeCode", "communeName", "departmentCode", "point", "updatedAt")
					 VALUES ($1, $2, $3, $4, public.ST_SetSRID(public.ST_MakePoint($5, $6), 4326)::public.geography, now())`,
					bandId,
					toulouse.code,
					toulouse.nom,
					toulouse.dep,
					toulouse.lng,
					toulouse.lat
				);
				await malikPage.goto(plateauUrl);
				await waitForAppReady(malikPage);
				await expect(
					malikPage.getByRole('region', { name: 'Groupes hors conditions' })
				).toContainText('le rang du groupe n’est pas encore celui demandé');
				await expect(malikPage.getByRole('button', { name: /Envoyer la candidature/ })).toHaveCount(
					0
				);
			});

			await test.step('5. Premier concert corroboré : Malik candidate au nom du groupe', async () => {
				const def = await db.milestoneDefinition.findUniqueOrThrow({ where: { id: 'FIRST_GIG' } });
				await db.milestone.create({
					data: {
						bandId,
						definitionId: 'FIRST_GIG',
						definitionVersion: def.version,
						proof: 'CORROBORATED',
						occurredAt: new Date('2026-06-21T12:00:00Z')
					}
				});
				await malikPage.reload();
				await waitForAppReady(malikPage);
				await expect(malikPage.getByRole('combobox', { name: 'Groupe' })).toContainText(bandName);
				await malikPage
					.getByLabel(/Ton message à/)
					.fill('Rock garage, set de quarante minutes, on est autonomes sur le matériel.');
				await expectNoA11yViolations(malikPage, A11Y_EXCLUDE);
				await malikPage.getByRole('button', { name: 'Envoyer la candidature du groupe' }).click();
				await expect(
					malikPage.getByRole('heading', { name: 'Candidatures de tes groupes' })
				).toBeVisible();
				await expect(malikPage.getByText(`${bandName} : Envoyée`)).toBeVisible();
			});

			await test.step('6. J’accepte : la conversation s’ouvre avec Malik', async () => {
				await page.goto(plateauUrl);
				await waitForAppReady(page);
				const card = page.getByRole('list', { name: 'Candidatures reçues' }).getByRole('listitem');
				await expect(card).toContainText(bandName);
				await expect(card).toContainText('rang Live');
				await card.getByRole('button', { name: 'Accepter' }).click();
				await expect(card.getByRole('link', { name: 'Ouvrir la conversation' })).toBeVisible();
				await card.getByRole('link', { name: 'Ouvrir la conversation' }).click();
				await expect(page).toHaveURL(/\/messages\/c/);
				await expect(page.getByText(`au nom de ${bandName}`)).toBeVisible();
			});

			await test.step('7. Malik me trouve par métier ; mes objectifs avancent', async () => {
				await setCity(malikPage);
				await malikPage.goto('/decouvrir?metier=organisateur&specialite=concerts&genre=rock');
				await waitForAppReady(malikPage);
				const result = malikPage
					.getByRole('list', { name: 'Résultats' })
					.getByRole('link', { name: new RegExp(me.actor.displayName) });
				await expect(result).toContainText('Organisateur·rice');

				await malikPage.goto(`/@${me.actor.handle}`);
				await waitForAppReady(malikPage);
				await expect(
					malikPage.getByRole('heading', { name: 'Organisateur·rice', level: 2 })
				).toBeVisible();
				await expect(malikPage.getByText('120 personnes')).toBeVisible();

				await page.goto('/espace/objectifs');
				await waitForAppReady(page);
				const section = page.getByRole('region', { name: /Organisateur·rice/ });
				await expect(section.getByText('Tiens un premier événement')).toBeVisible();
				await expect(section.getByText('Publie un premier plateau')).toHaveCount(0);
			});
		} finally {
			await malikContext.close();
			if (bandId) await db.actor.deleteMany({ where: { id: bandId } });
			if (venueId) await db.venue.deleteMany({ where: { id: venueId } });
			await deleteUser(malikAccount.email).catch(() => {});
		}
	});
});
