import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { makeAccount } from '../support/account';
import { db, deleteUser, requireUser } from '../support/db';
import { waitForAppReady, waitForPath } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { setCity, skipOnboarding } from '../support/linkmusician';

/**
 * ONB-12b — Profil : complétude et visibilité par métier (D61). Un compte
 * musicien·ne + organisateur·rice voit une fiche par métier, la ville comptée
 * une fois ; il règle « Qui voit quoi » ; sa page publique ne montre à un·e
 * visiteur·se que le public, à un membre le public et les membres, jamais le
 * privé (ni à l'écran ni dans les données de la page). Un métier non détenu
 * ne se règle pas.
 */
test.describe('LinkMusician — profil par métier', () => {
	test.setTimeout(5 * 60_000);
	const A11Y_EXCLUDE = ['.cartButton'];

	test('complétude séparée, visibilité respectée, réglage d’un autre métier refusé', async ({
		page,
		account,
		browser
	}) => {
		const memberAccount = makeAccount();
		const memberContext = await browser.newContext();
		const anonContext = await browser.newContext();
		try {
			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			const user = await requireUser(account.email);
			const me = await db.person.findUniqueOrThrow({
				where: { userId: user.id },
				include: { actor: true }
			});
			// Genres : donnée commune, demandée une fois (l'écran est passé par `skipOnboarding`).
			const rock = await db.genre.findUniqueOrThrow({ where: { slug: 'rock' } });
			await db.actorGenre.create({ data: { actorId: me.actorId, genreId: rock.id } });
			// Deuxième métier, déjà renseigné (l'écran est couvert par organisateur.spec.ts).
			await db.personTrack.create({ data: { personId: me.actorId, track: 'PROMOTER' } });
			await db.personTrackSpecialization.create({
				data: { personId: me.actorId, track: 'PROMOTER', code: 'CONCERTS' }
			});
			await db.personTrackIntent.createMany({
				data: [
					{ personId: me.actorId, track: 'PROMOTER', direction: 'OFFER', code: 'CONCERT_DATES' },
					{ personId: me.actorId, track: 'PROMOTER', direction: 'NEED', code: 'FIND_ARTISTS' }
				]
			});
			await db.personTrackAttribute.createMany({
				data: [
					{ personId: me.actorId, track: 'PROMOTER', field: 'structure', code: 'ASSOCIATION' },
					{ personId: me.actorId, track: 'PROMOTER', field: 'territory', code: 'LOCAL' },
					{ personId: me.actorId, track: 'PROMOTER', field: 'concert_pay', code: 'FEE' }
				]
			});

			await test.step('1. Deux fiches de complétude ; la ville manque, comptée à part', async () => {
				await page.goto('/profil/metier/organisateur');
				await waitForAppReady(page);
				const card = page.getByTestId('completude');
				await expect(card.getByRole('link', { name: 'Ta ville' })).toBeVisible();
				// Spécialité, offre et champs requis remplis : seule la ville manque.
				await expect(card.getByTestId('completude-manque')).toHaveCount(1);
				await expectNoA11yViolations(page, A11Y_EXCLUDE);

				await page.goto('/profil/pratique');
				await waitForAppReady(page);
				const musician = page.getByTestId('completude');
				await expect(musician.getByRole('link', { name: 'Tes instruments' })).toBeVisible();
				await expect(musician.getByRole('link', { name: 'Ta ville' })).toBeVisible();

				await setCity(page);
				await page.goto('/profil/metier/organisateur');
				await waitForAppReady(page);
				await expect(page.getByTestId('completude-ok')).toBeVisible();
			});

			await test.step('2. « Qui voit quoi » : intentions publiques, précisions membres', async () => {
				const form = page.getByTestId('reglages-metier');
				const group = (name: string) => form.getByRole('group', { name });
				await group('Spécialités et intentions')
					.getByRole('button', { name: 'Tout le monde' })
					.click();
				await group('Ouvert·e aux sollicitations').getByRole('button', { name: 'Oui' }).click();
				await form.getByRole('button', { name: 'Appliquer ces réglages' }).click();
				await waitForPath(page, '/profil/metier/organisateur');
				await expect(page.getByTestId('reglages-metier').getByRole('status')).toHaveText(
					'Tes réglages sont enregistrés.'
				);
				const saved = await db.personTrack.findUniqueOrThrow({
					where: { personId_track: { personId: me.actorId, track: 'PROMOTER' } }
				});
				expect(saved).toMatchObject({
					offersVisibility: 'PUBLIC',
					detailsVisibility: 'MEMBERS',
					conditionsVisibility: 'PRIVATE',
					openToRequests: true
				});
			});

			const profileUrl = `/@${me.actor.handle}`;
			const fiche = (p: typeof page) =>
				p.getByTestId('fiche-metier').filter({ hasText: 'Organisateur·rice' });

			await test.step('3. Visiteur·se : le public seulement, rien du reste dans les données', async () => {
				const anon = await anonContext.newPage();
				await anon.goto(profileUrl);
				await waitForAppReady(anon);
				await expect(fiche(anon).getByText('Des concerts')).toBeVisible();
				await expect(fiche(anon).getByText('Association')).toHaveCount(0);
				const data = await (await anon.request.get(`${profileUrl}/__data.json`)).text();
				expect(data).not.toContain('Association');
				expect(data).not.toContain('Cachet');
			});

			await test.step('4. Membre inscrit·e : public et membres, jamais le privé', async () => {
				const member = await memberContext.newPage();
				await signUpAndVerify(member, memberAccount);
				await skipOnboarding(member, memberAccount.email);
				await member.goto(profileUrl);
				await waitForAppReady(member);
				await expect(fiche(member).getByText('Association')).toBeVisible();
				await expect(fiche(member).getByText('Ouvert·e aux sollicitations')).toBeVisible();
				await expect(fiche(member).getByText('Cachet')).toHaveCount(0);
				const data = await (await member.request.get(`${profileUrl}/__data.json`)).text();
				expect(data).not.toContain('Cachet');

				// 5. Le membre (musicien·ne seul·e) ne règle pas un métier qu'il n'a pas.
				const before = await db.personTrack.count({
					where: { track: 'PROMOTER', offersVisibility: 'PRIVATE' }
				});
				const res = await member.request.post('/profil/metier/organisateur/reglages', {
					form: {
						offersVisibility: 'PRIVATE',
						detailsVisibility: 'PRIVATE',
						conditionsVisibility: 'PRIVATE',
						openToRequests: 'NO'
					},
					headers: { origin: new URL(member.url()).origin },
					maxRedirects: 0
				});
				expect(res.status()).toBe(403);
				expect(
					await db.personTrack.count({ where: { track: 'PROMOTER', offersVisibility: 'PRIVATE' } })
				).toBe(before);
			});

			await test.step('6. La personne voit tout, conditions comprises', async () => {
				await page.goto(profileUrl);
				await waitForAppReady(page);
				await expect(fiche(page).getByText('Cachet')).toBeVisible();
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
			});
		} finally {
			await memberContext.close();
			await anonContext.close();
			await deleteUser(memberAccount.email);
		}
	});
});
