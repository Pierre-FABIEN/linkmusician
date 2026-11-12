import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { skipOnboarding } from '../support/linkmusician';
import { db, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';

/** DASH-01 : contexte propre au compte, navigation réelle et clavier/mobile. */
test('navigation multirôle : métier actif, filtres conservés, droits et métiers bientôt', async ({
	page,
	account
}) => {
	test.setTimeout(5 * 60_000);
	await signUpAndVerify(page, account);
	await skipOnboarding(page, account.email);
	const person = await db.person.findUniqueOrThrow({
		where: { userId: (await requireUser(account.email)).id }
	});
	await db.personTrack.create({ data: { personId: person.actorId, track: 'SOUND_ENGINEER' } });
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/espace');
	await waitForAppReady(page);
	const selector = page.getByLabel('Mon espace', { exact: true });
	const change = page.getByRole('button', { name: 'Changer', exact: true });
	await expect(selector).toHaveValue('MUSICIAN');
	const nav = page.getByRole('navigation', { name: 'Navigation principale' });
	await expect(nav.getByRole('link')).toHaveText([
		'Accueil',
		'Découvrir',
		'Annonces',
		'Messages',
		'Profil'
	]);

	await test.step('clavier : ouvrir le métier du son puis recharger', async () => {
		await selector.selectOption('SOUND_ENGINEER');
		await selector.focus();
		await page.keyboard.press('Tab');
		await expect(change).toBeFocused();
		await page.keyboard.press('Enter');
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ingé son');
		await expect(
			page
				.getByRole('navigation', { name: 'Espace Ingé son' })
				.getByRole('link', { name: /^Mes studios/ })
		).toHaveAttribute('href', '/studios');
		await expect(
			page
				.getByRole('navigation', { name: 'Espace Ingé son' })
				.getByRole('link', { name: /Mon ambition|Ma carte de carrière/ })
		).toHaveCount(0);
		await page.reload();
		await expect(selector).toHaveValue('SOUND_ENGINEER');
		await expectNoA11yViolations(page, ['.cartButton']);
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
	});

	await test.step('conserver la recherche et adapter le lien de profil', async () => {
		await page.goto('/decouvrir?genre=funk&rayon=25');
		const before = new URL(page.url()).search;
		await selector.selectOption('MUSICIAN');
		await change.click();
		await expect(selector).toHaveValue('MUSICIAN');
		expect(new URL(page.url()).search).toBe(before);
		await expect(nav.getByRole('link', { name: 'Profil', exact: true })).toHaveAttribute(
			'href',
			'/profil/pratique'
		);
		await nav.getByRole('link', { name: 'Profil', exact: true }).click();
		await expect(page).toHaveURL(/\/profil\/pratique$/);
		await waitForAppReady(page);
		await selector.selectOption('SOUND_ENGINEER');
		await change.click();
		await expect(page).toHaveURL(/\/profil\/metier\/inge-son$/);
		// Le sélecteur est aussi disponible sur une page publique vue en membre.
		await page.goto('/aide');
		await expect(selector).toHaveValue('SOUND_ENGINEER');
		await page.getByRole('link', { name: 'Ouvrir mon espace', exact: true }).click();
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ingé son');
	});

	await test.step('le serveur refuse un autre métier ou une valeur inconnue', async () => {
		for (const [track, status] of [
			['MANAGER', 403],
			['INCONNU', 400]
		] as const) {
			const response = await page.request.post('/jouer?/switchTrack', {
				form: { track, returnTo: '/espace' },
				headers: { origin: new URL(page.url()).origin },
				maxRedirects: 0
			});
			expect(response.status()).toBe(status);
		}
		const primary = await db.personTrack.findFirstOrThrow({
			where: { personId: person.actorId, isPrimary: true }
		});
		expect(primary.track).toBe('MUSICIAN');
	});

	await test.step('chaque espace ouvre ses écrans livrés ; un métier bientôt reste explicite', async () => {
		await db.personTrack.createMany({
			data: ['PRODUCER', 'PROMOTER', 'MANAGER', 'BOOKER', 'LABEL_PRO'].map((track) => ({
				personId: person.actorId,
				track: track as 'PRODUCER' | 'PROMOTER' | 'MANAGER' | 'BOOKER' | 'LABEL_PRO'
			}))
		});
		await page.reload();
		for (const [track, title] of [
			['PRODUCER', 'Producteur·rice'],
			['PROMOTER', 'Organisateur·rice'],
			['MANAGER', 'Manager'],
			['BOOKER', 'Booker / programmateur·rice'],
			['LABEL_PRO', 'Professionnel·le de label']
		]) {
			await selector.selectOption(track);
			await change.click();
			await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
			await expectNoA11yViolations(page, ['.cartButton']);
		}
		await expect(
			page.getByText('Ce parcours métier arrive bientôt.', { exact: false })
		).toBeVisible();
		await expect(
			page
				.getByRole('navigation', { name: 'Espace Professionnel·le de label' })
				.getByRole('link', { name: /^Ma fiche métier/ })
		).toHaveCount(1);
		// Retirer un métier invalide le contexte au rechargement.
		await db.personTrack.delete({
			where: { personId_track: { personId: person.actorId, track: 'LABEL_PRO' } }
		});
		await page.reload();
		await expect(selector).toHaveValue('MUSICIAN');
	});
});
