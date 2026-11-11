import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { skipOnboarding } from '../support/linkmusician';

/**
 * P5-03d — Photos d'un lieu : la gérante du Comptoir voit ses photos et leur
 * état dans la gestion, la photo en ligne s'affiche sur la page du lieu, et
 * elle la retire. (L'envoi lui-même passe par Cloudinary, absent en e2e :
 * il est couvert par `venues/profile.integration.test.ts`, Cloudinary
 * simulé ; la photo est ici déjà en ligne.)
 */
test.describe('LinkMusician — photos d’un lieu', () => {
	test.setTimeout(4 * 60_000);
	const A11Y_EXCLUDE = ['.cartButton'];
	const toulouse = { code: '31555', nom: 'Toulouse', dep: '31', lat: 43.6007, lng: 1.4328 };

	test('la gérante voit, montre et retire une photo du lieu', async ({ page, account }) => {
		const suffix = Math.random().toString(36).slice(2, 8);
		const venueName = `E2E Le Comptoir ${suffix}`;
		let venueId = '';
		let orgId = '';
		try {
			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			const me = await db.person.update({
				where: { userId: (await requireUser(account.email)).id },
				data: { birthDate: new Date('1980-02-14T00:00:00Z') }
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
			const rock = await db.genre.findUniqueOrThrow({ where: { slug: 'rock' } });
			orgId = (
				await db.actor.create({
					data: {
						kind: 'ORGANIZATION',
						handle: `e2e-comptoir-${suffix}`,
						displayName: venueName,
						genres: { create: { genreId: rock.id } },
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
										capacity: 80,
										stage: 'Petite scène, sono 2 × 500 W.',
										conditions: ['HAT'],
										publishedAt: new Date()
									}
								}
							}
						}
					}
				})
			).id;
			await db.venue.update({ where: { id: venueId }, data: { claimedByActorId: orgId } });
			await db.venueClaim.create({
				data: {
					venueId,
					requestedById: me.actorId,
					code: `E2E${suffix}`.toUpperCase().slice(0, 8),
					status: 'APPROVED',
					orgId,
					reviewedAt: new Date()
				}
			});
			await db.media.create({
				data: {
					actorId: orgId,
					uploadedById: me.actorId,
					kind: 'IMAGE',
					provider: 'CLOUDINARY',
					status: 'PUBLISHED',
					title: 'La scène un jeudi',
					fileUrl: '/og-default.jpg',
					publishedAt: new Date()
				}
			});

			await test.step('1. La page du lieu montre la photo', async () => {
				await page.goto(`/lieux/${venueId}`);
				await waitForAppReady(page);
				await expect(
					page.getByRole('list', { name: 'Photos du lieu' }).getByRole('img', {
						name: 'La scène un jeudi'
					})
				).toBeVisible();
			});

			await test.step('2. La gestion voit la photo, son état et l’envoi', async () => {
				await page.getByRole('link', { name: 'Gérer la fiche du lieu' }).click();
				await waitForAppReady(page);
				const photos = page.getByRole('region', { name: /Photos/ });
				await expect(photos).toContainText('(1/8)');
				await expect(photos).toContainText('En ligne');
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
			});

			await test.step('3. Elle la retire : la page du lieu n’en a plus', async () => {
				await page.getByRole('button', { name: /Retirer\s+la photo La scène un jeudi/ }).click();
				await expect(page.getByText('Photo retirée.').first()).toBeVisible();
				await page.goto(`/lieux/${venueId}`);
				await waitForAppReady(page);
				await expect(page.getByRole('list', { name: 'Photos du lieu' })).toHaveCount(0);
			});
		} finally {
			if (venueId) await db.venue.deleteMany({ where: { id: venueId } });
			if (orgId) await db.actor.deleteMany({ where: { id: orgId } });
		}
	});
});
