import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { makeAccount } from '../support/account';
import { db, requireUser, deleteUser } from '../support/db';
import { skipOnboarding } from '../support/linkmusician';
import { waitForAppReady, waitForPath } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';

/**
 * ONB-12c3 (#26) : disponibilités sur la page du métier, invitation à
 * compléter un critère « non précisé » d'une annonce puis retour, et niveaux
 * déclaré / confirmé / vérifié sur le profil public. Mobile et clavier.
 */
test('profil avancé : disponibilités, invitation à compléter, niveaux de preuve', async ({
	page,
	account,
	browser
}) => {
	test.setTimeout(5 * 60_000);
	const issuerAccount = makeAccount(),
		viewerAccount = makeAccount();
	const viewerContext = await browser.newContext();
	const viewerPage = await viewerContext.newPage();
	let opportunity = '';
	try {
		for (const [p, a] of [
			[page, account],
			[viewerPage, viewerAccount]
		] as const) {
			await signUpAndVerify(p, a);
			await skipOnboarding(p, a.email);
		}
		const issuerUser = await db.user.create({
			data: { email: issuerAccount.email, referralCode: `e2e-${Date.now()}` }
		});
		const issuer = await db.actor.create({
			data: {
				kind: 'PERSON',
				handle: `e2e-orga-${Date.now()}`,
				displayName: 'Orga e2e',
				person: {
					create: {
						userId: issuerUser.id,
						termsAcceptedAt: new Date(),
						onboardedAt: new Date()
					}
				}
			}
		});
		const me = await db.person.findUniqueOrThrow({
			where: { userId: (await requireUser(account.email)).id },
			include: { actor: true }
		});
		await db.person.update({
			where: { actorId: me.actorId },
			data: { birthDate: new Date('1990-01-01') }
		});
		// Ingé son mixage, sans mobilité déclarée : la présence de l'annonce est inconnue.
		await db.personTrack.create({
			data: {
				personId: me.actorId,
				track: 'SOUND_ENGINEER',
				specializations: { create: [{ code: 'MIXING' }] },
				attributes: { create: [{ field: 'environment', code: 'HOME_STUDIO' }] }
			}
		});
		await db.soundEngineerProfile.create({
			data: { personId: me.actorId, specialties: ['MIXING'] }
		});
		opportunity = (
			await db.opportunity.create({
				data: {
					issuerActorId: issuer.id,
					kind: 'SESSION_WORK',
					title: 'Mixage à distance ONB-12c3',
					description: 'Un EP de cinq titres à mixer, pistes envoyées par lien.',
					targetTrack: 'SOUND_ENGINEER',
					presence: 'REMOTE',
					expiresAt: new Date(Date.now() + 86400000)
				}
			})
		).id;

		await test.step('1. Disponibilités sur la page du métier, jamais à l’inscription', async () => {
			await page.goto('/profil/metier/inge-son');
			await waitForAppReady(page);
			await page
				.getByRole('group', { name: /Disponible pour un nouveau projet/ })
				.getByLabel('Sous quelques semaines')
				.check();
			await page
				.getByRole('group', { name: /Quand tu travailles/ })
				.getByLabel('Le week-end')
				.check();
			await page.getByRole('button', { name: 'Enregistrer' }).first().click();
			await expect
				.poll(async () =>
					(
						await db.personTrackAttribute.findMany({
							where: { personId: me.actorId, field: { startsWith: 'availability_' } },
							select: { code: true },
							orderBy: { code: 'asc' }
						})
					).map((a) => a.code)
				)
				.toEqual(['WEEKENDS', 'WEEKS']);
			await page.goto('/demarrer/metier/inge-son');
			await waitForAppReady(page);
			await expect(page.getByText('Disponible pour un nouveau projet')).toHaveCount(0);
		});

		await test.step('2. Annonce : invitation à préciser, au clavier, à 390 px', async () => {
			await page.setViewportSize({ width: 390, height: 844 });
			await page.goto(`/annonces/${opportunity}`);
			await waitForAppReady(page);
			await expect(page.getByText(/Non précisé : ta façon de travailler/)).toBeVisible();
			const link = page.getByRole('link', { name: 'Préciser où tu travailles' });
			// La candidature reste possible : rien n'est bloqué.
			await expect(page.getByRole('button', { name: 'Envoyer ma candidature' })).toBeVisible();
			expect(
				await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
			).toBe(true);
			await expectNoA11yViolations(page, ['.cartButton']);
			await link.focus();
			await expect(link).toBeFocused();
			await page.keyboard.press('Enter');
			await waitForPath(page, '/profil/son');
			await waitForAppReady(page);
			expect(new URL(page.url()).searchParams.get('annonce')).toBe(opportunity);
		});

		await test.step('3. Je précise, puis je reviens à l’annonce', async () => {
			await page.getByLabel(/À distance/).check();
			await page.getByRole('button', { name: 'Enregistrer' }).click();
			await expect
				.poll(
					async () =>
						(await db.soundEngineerProfile.findUniqueOrThrow({ where: { personId: me.actorId } }))
							.mobility
				)
				.toEqual(['REMOTE']);
			await page.getByTestId('retour-annonce').getByRole('link').click();
			await waitForPath(page, `/annonces/${opportunity}`);
			await waitForAppReady(page);
			await expect(page.getByText(/Non précisé/)).toHaveCount(0);
			await expect(page.getByRole('button', { name: 'Envoyer ma candidature' })).toBeVisible();
		});

		await test.step('4. Un paramètre de retour forgé ne mène nulle part', async () => {
			await page.goto('/profil/son?annonce=' + encodeURIComponent('//evil.example'));
			await waitForAppReady(page);
			await expect(page.getByTestId('retour-annonce')).toHaveCount(0);
		});

		await test.step('5. Profil public : disponibilités et niveaux de preuve', async () => {
			await db.personTrack.update({
				where: { personId_track: { personId: me.actorId, track: 'SOUND_ENGINEER' } },
				data: { detailsVisibility: 'MEMBERS' }
			});
			await viewerPage.goto(`/@${me.actor.handle}`);
			await waitForAppReady(viewerPage);
			const sheet = viewerPage.getByTestId('fiche-metier');
			await expect(sheet).toContainText('Sous quelques semaines');
			await expect(sheet).toContainText('Le week-end');
			await expect(viewerPage.getByRole('heading', { name: /Métiers\s*Déclaré/ })).toBeVisible();
			const legend = viewerPage.getByTestId('legende-preuve');
			await expect(legend).toContainText('Confirmé');
			await expect(legend).toContainText('Vérifié');
			await expectNoA11yViolations(viewerPage, ['.cartButton']);
		});
	} finally {
		await viewerContext.close();
		if (opportunity) await db.opportunity.deleteMany({ where: { id: opportunity } });
		await deleteUser(viewerAccount.email).catch(() => {});
		await deleteUser(issuerAccount.email).catch(() => {});
	}
});
