import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { makeAccount } from '../support/account';
import { db, deleteUser, e2eTable, requireUser } from '../support/db';
import { waitForAppReady, waitForPath } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { createMusician, deleteMusicians, setCity, skipOnboarding } from '../support/linkmusician';

/**
 * P5-04b — Animateur·rices d'un lieu : le patron d'un bar publie sa scène
 * ouverte du jeudi, voit Léa parmi les suggestions (prête à organiser des
 * jams, appréciée par deux musicien·nes, à Toulouse) et l'invite à animer.
 * Léa accepte depuis « Mes jams » ; le patron la choisit comme lead par
 * défaut : elle mène le prochain jeudi.
 */
test.describe('LinkMusician — animatrice d’un lieu', () => {
	test.setTimeout(6 * 60_000);
	const A11Y_EXCLUDE = ['.cartButton'];
	const toulouse = { code: '31555', nom: 'Toulouse', dep: '31', lat: 43.6007, lng: 1.4328 };

	test('le lieu invite une animatrice suggérée, elle devient lead du prochain jeudi', async ({
		page,
		account,
		browser
	}) => {
		const leaAccount = makeAccount();
		const leaContext = await browser.newContext();
		const leaPage = await leaContext.newPage();
		const suffix = Math.random().toString(36).slice(2, 8);
		const venueName = `E2E La Cave ${suffix}`;
		const fans: Awaited<ReturnType<typeof createMusician>>[] = [];
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
						validatedAt: new Date()
					}
				})
			).id;
			orgId = (
				await db.actor.create({
					data: {
						kind: 'ORGANIZATION',
						handle: `e2e-cave-${suffix}`,
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
										capacity: 50,
										stage: 'Petite scène.',
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
			// La commune du lieu, comme à l'enregistrement de sa fiche.
			await db.$executeRawUnsafe(
				`INSERT INTO ${e2eTable('actor_locations')} ("actorId", "communeCode", "communeName", "departmentCode", "point", "updatedAt")
				 VALUES ($1, $2, $3, $4, public.ST_SetSRID(public.ST_MakePoint($5, $6), 4326)::public.geography, now())`,
				orgId,
				toulouse.code,
				toulouse.nom,
				toulouse.dep,
				toulouse.lng,
				toulouse.lat
			);

			// Léa : musicienne de Toulouse, prête à organiser des jams (D51).
			await signUpAndVerify(leaPage, leaAccount);
			await skipOnboarding(leaPage, leaAccount.email);
			await setCity(leaPage);
			const lea = await db.person.update({
				where: { userId: (await requireUser(leaAccount.email)).id },
				data: { birthDate: new Date('1994-03-02T00:00:00Z'), organizesJams: true },
				select: { actorId: true, actor: { select: { displayName: true } } }
			});
			const leaName = lea.actor.displayName;

			await test.step('1. Je publie la scène ouverte du jeudi', async () => {
				await page.goto(`/lieux/${venueId}/gerer/scene-ouverte`);
				await waitForAppReady(page);
				await page.getByRole('button', { name: 'Publier la scène ouverte' }).click();
				await waitForPath(page, `/lieux/${venueId}/gerer`);
				await waitForAppReady(page);
				// Deux musicien·nes ont apprécié Léa à la première soirée (en base).
				const first = await db.opportunity.findFirstOrThrow({
					where: { issuerActorId: orgId },
					orderBy: { startsAt: 'asc' }
				});
				for (const name of ['Malik', 'Inès']) {
					const fan = await createMusician({ name, commune: toulouse });
					fans.push(fan);
					await db.jamEndorsement.create({
						data: {
							opportunityId: first.id,
							fromActorId: fan.actorId,
							toActorId: lea.actorId,
							quality: 'GROOVE'
						}
					});
				}
			});

			await test.step('2. Léa est suggérée : je l’invite à animer', async () => {
				await page.getByRole('link', { name: 'Qui anime' }).click();
				await waitForPath(page, `/lieux/${venueId}/gerer/animation`);
				await waitForAppReady(page);
				const suggestions = page.getByRole('list', { name: 'Suggestions d’animateur·rices' });
				const card = suggestions.getByRole('listitem').filter({ hasText: leaName });
				await expect(card).toContainText('Appréciations de 2 personnes');
				await expect(card).toContainText('moins de 5 km');
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
				await card.getByRole('button', { name: `Inviter à animer : ${leaName}` }).click();
				await expect(page.getByText(`Invitation envoyée à ${leaName}`).first()).toBeVisible();
				await expect(
					page
						.getByRole('list', { name: 'Animateur·rices du lieu' })
						.getByRole('link', { name: leaName })
				).toBeVisible();
			});

			await test.step('3. Léa accepte depuis « Mes jams »', async () => {
				await leaPage.goto('/notifications');
				await waitForAppReady(leaPage);
				await expect(
					leaPage.getByText(new RegExp(`animer les scènes ouvertes du lieu « ${venueName} »`))
				).toBeVisible();
				await leaPage.goto('/jam/mes-jams');
				await waitForAppReady(leaPage);
				await expect(
					leaPage.getByRole('heading', { name: 'Un lieu t’invite à animer' })
				).toBeVisible();
				await expectNoA11yViolations(leaPage, A11Y_EXCLUDE);
				await leaPage.getByRole('button', { name: 'Accepter' }).click();
				await expect(leaPage.getByText(/tu animes au lieu/).first()).toBeVisible();
				await expect(leaPage.getByRole('heading', { name: 'Tu animes' })).toBeVisible();
			});

			await test.step('4. Je la choisis comme lead : elle mène le prochain jeudi', async () => {
				await page.reload();
				await waitForAppReady(page);
				await page.getByLabel(/Scène ouverte du jeudi/).selectOption({ label: leaName });
				await page.getByRole('button', { name: 'Enregistrer : Scène ouverte du jeudi' }).click();
				await expect(page.getByText(/mène les prochaines soirées/).first()).toBeVisible();
				const next = await db.opportunity.findFirstOrThrow({
					where: { issuerActorId: orgId, startsAt: { gt: new Date() } },
					orderBy: { startsAt: 'asc' },
					select: { id: true, leadActorId: true }
				});
				expect(next.leadActorId).toBe(lea.actorId);
				// Léa compose la formation du prochain jeudi.
				await leaPage.goto(`/jams/${next.id}`);
				await waitForAppReady(leaPage);
				await expect(leaPage.getByRole('heading', { name: 'Compose ta formation' })).toBeVisible();
			});
		} finally {
			await leaContext.close();
			if (venueId) await db.venue.deleteMany({ where: { id: venueId } });
			if (orgId) await db.actor.deleteMany({ where: { id: orgId } });
			await deleteMusicians(fans).catch(() => {});
			await deleteUser(leaAccount.email).catch(() => {});
		}
	});
});
