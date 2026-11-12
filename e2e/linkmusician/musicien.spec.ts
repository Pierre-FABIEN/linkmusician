import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { finishRecap } from '../support/linkmusician';
import { waitForAppReady, waitForPath } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';

/**
 * ONB-03 — Thomas : guitariste et chanteur, niveau déclaré, rock, blues et
 * funk, Toulouse ; il propose de jouer en jam, cherche des partenaires et des
 * jams. Il précise sa voix et sa guitare, puis retrouve et modifie tout dans
 * « Ma pratique ». Rien n'est « vérifié » ; aucun métier « guitariste ».
 */
test.describe('LinkMusician — profil de musicien·ne', () => {
	test.setTimeout(8 * 60_000);

	test('Thomas s’inscrit, puis modifie sa pratique', async ({ page, account }) => {
		await signUpAndVerify(page, account);

		await test.step('1. Musicien·ne, guitare électrique et chant', async () => {
			await page.goto('/qui-es-tu');
			await waitForAppReady(page);
			await page.getByLabel('Musicien·ne').check();
			await page.getByRole('button', { name: 'Continuer' }).click();
			await waitForPath(page, '/demarrer/instruments');
			await waitForAppReady(page);
			for (const name of ['Guitare électrique', 'Chant']) {
				await page.getByLabel('Instrument à ajouter').selectOption({ label: name });
				await page.getByLabel(`Niveau en ${name}`).selectOption('3');
			}
			await page.getByRole('button', { name: 'Continuer' }).click();
		});

		await test.step('2. Rock, blues, funk ; Toulouse', async () => {
			await waitForPath(page, '/demarrer/genres');
			await waitForAppReady(page);
			// Un genre parent porte aussi une légende cachée du même nom : on vise l'étiquette.
			for (const g of ['Rock', 'Blues', 'Funk'])
				await page
					.locator('label')
					.filter({ has: page.getByRole('checkbox', { name: g, exact: true }) })
					.click();
			await page.getByRole('button', { name: 'Continuer' }).click();
			await waitForPath(page, '/demarrer/ville');
			await page.getByLabel('Ta commune').pressSequentially('toulou', { delay: 50 });
			await page.getByRole('option').first().getByRole('button').click();
			await page.getByRole('button', { name: 'Continuer' }).click();
		});

		await test.step('3. Profil de musicien·ne : requis, puis facultatif', async () => {
			await waitForPath(page, '/demarrer/intention');
			await waitForAppReady(page);
			await expectNoA11yViolations(page, ['.cartButton']);

			// Sans expérience ni engagement, l'envoi est refusé, avec un message par champ.
			await page.getByRole('button', { name: 'Juste explorer' }).click();
			await expect(page.getByText('Dis-nous où tu en es').first()).toBeVisible();
			await expect(page.getByText('Choisis l’engagement que tu cherches.').first()).toBeVisible();

			await page.getByRole('radio', { name: /^Avec d’autres/ }).check();
			await page.getByRole('radio', { name: /^Régulier/ }).check();
			await page.getByRole('checkbox', { name: /^Des partenaires/ }).check();
			await page.getByRole('checkbox', { name: /^Des jams/ }).check();
			await page.getByRole('checkbox', { name: /^Jouer en jam/ }).check();

			// Précisions : voix et guitare seulement (pas de batterie).
			await expect(page.locator('summary', { hasText: 'Ta batterie' })).toHaveCount(0);
			await page.locator('summary', { hasText: 'Ta voix' }).click();
			await page.getByRole('checkbox', { name: 'Français' }).check();
			await page.getByRole('checkbox', { name: 'Je ne sais pas' }).check();
			await page.locator('summary', { hasText: 'Ta guitare' }).click();
			await page.getByRole('checkbox', { name: 'Solo' }).check();

			await page.getByRole('button', { name: 'Continuer' }).click();
			await finishRecap(page);
		});

		const user = await requireUser(account.email);
		const read = () =>
			db.person.findUniqueOrThrow({
				where: { userId: user.id },
				include: {
					tracks: { include: { intents: true, attributes: true } },
					musicianProfile: true,
					instruments: { include: { instrument: true } }
				}
			});

		await test.step('4. Ce qui est enregistré', async () => {
			const thomas = await read();
			expect(thomas.onboardedAt).not.toBeNull();
			expect(thomas.tracks.map((t) => t.track)).toEqual(['MUSICIAN']);
			expect(thomas.instruments.map((i) => [i.instrument.slug, i.declaredLevel]).sort()).toEqual([
				['chant', 3],
				['guitare-electrique', 3]
			]);
			expect(thomas.musicianProfile).toMatchObject({
				practiceExperience: 'WITH_OTHERS',
				commitment: 'REGULAR'
			});
			const musician = thomas.tracks[0];
			expect(musician.intents.map((i) => `${i.direction}:${i.code}`).sort()).toEqual([
				'NEED:FIND_JAMS',
				'NEED:FIND_PARTNERS',
				'OFFER:PLAY_JAMS'
			]);
			expect(musician.attributes.map((a) => `${a.field}=${a.code}`).sort()).toEqual([
				'guitar_role=LEAD',
				'voice_languages=FR',
				'voice_range=UNKNOWN'
			]);
			// Copie lue par la recherche (`?recherche=JAMS`) et le profil public.
			expect(thomas.lookingFor).toEqual(['JAMS']);
		});

		await test.step('5. Ma pratique : relue, puis modifiée', async () => {
			await page.goto('/profil/pratique');
			await waitForAppReady(page);
			await expectNoA11yViolations(page, ['.cartButton']);
			await expect(page.getByRole('radio', { name: /^Avec d’autres/ })).toBeChecked();
			await expect(page.getByRole('checkbox', { name: /^Jouer en jam/ })).toBeChecked();
			await page.getByRole('radio', { name: /^Sur scène/ }).check();
			await page.getByRole('checkbox', { name: /^Donner des cours/ }).check();
			await page.getByRole('button', { name: 'Enregistrer' }).click();
			await expect(page.getByText('Ta pratique est enregistrée.').first()).toBeVisible();

			const thomas = await read();
			expect(thomas.musicianProfile?.practiceExperience).toBe('STAGE');
			expect(thomas.lookingFor).toEqual(['JAMS', 'LESSONS_GIVE']);
		});
	});
});
