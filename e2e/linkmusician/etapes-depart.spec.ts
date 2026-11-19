import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { createMusician, deleteMusicians, skipOnboarding } from '../support/linkmusician';

/**
 * P1 (E10, #36) — Léa gère « Les Tilleuls ». Thomas, en co-gestion, a pris
 * l'enregistrement d'un morceau du groupe et l'a commencé. Léa le retire du
 * groupe : l'étape est libérée aussitôt, l'historique dit pourquoi, et Léa
 * la reprend elle-même. Aucun bouton « Libérer » à cliquer.
 */
test.describe('LinkMusician — étape libérée au départ', () => {
	test.setTimeout(4 * 60_000);
	const A11Y_EXCLUDE = ['.cartButton'];
	const toulouse = {
		code: '31555',
		nom: 'Toulouse',
		dep: '31',
		lat: 43.6045,
		lng: 1.4442
	};

	test('la gestion retrouve l’étape libre et la reprend', async ({ page, account }) => {
		const suffix = Math.random().toString(36).slice(2, 7);
		const thomas = await createMusician({ name: 'Thomas', commune: toulouse });
		let bandId = '';
		try {
			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			const lea = await db.person.findUniqueOrThrow({
				where: { userId: (await requireUser(account.email)).id }
			});
			const band = await db.actor.create({
				data: {
					kind: 'ORGANIZATION',
					handle: `p1-tilleuls-${suffix}`,
					displayName: `Les Tilleuls ${suffix}`,
					organization: { create: { kind: 'BAND' } }
				}
			});
			bandId = band.id;
			await db.membership.createMany({
				data: [
					{ orgId: bandId, personId: lea.actorId, role: 'OWNER', status: 'ACTIVE' },
					{ orgId: bandId, personId: thomas.actorId, role: 'ADMIN', status: 'ACTIVE' }
				]
			});
			const work = await db.work.create({
				data: { ownerId: bandId, createdById: lea.actorId, title: `Nuit blanche ${suffix}` }
			});
			const startedAt = new Date(Date.now() - 86_400_000);
			await db.workStep.create({
				data: {
					workId: work.id,
					kind: 'RECORDING',
					mode: 'SELF',
					place: 'HOME',
					status: 'IN_PROGRESS',
					assigneeId: thomas.actorId,
					startedAt,
					revision: 2,
					acts: {
						create: [
							{
								authorId: thomas.actorId,
								assigneeId: thomas.actorId,
								kind: 'CLAIMED',
								toStatus: 'TODO',
								occurredAt: startedAt
							},
							{
								authorId: thomas.actorId,
								assigneeId: thomas.actorId,
								kind: 'STARTED',
								fromStatus: 'TODO',
								toStatus: 'IN_PROGRESS',
								occurredAt: startedAt
							}
						]
					}
				}
			});

			await test.step('1. Avant : l’enregistrement est en cours chez Thomas', async () => {
				await page.goto(`/morceaux/${work.id}/etapes`);
				await waitForAppReady(page);
				await expect(page.getByText(`${thomas.displayName} (soi-même)`)).toBeVisible();
				await expect(page.getByRole('button', { name: 'Je m’en charge' })).toHaveCount(0);
			});

			await test.step('2. Léa retire Thomas du groupe', async () => {
				await page.goto(`/groupes/${band.handle}`);
				await waitForAppReady(page);
				const members = page.getByRole('list', { name: 'Membres actuels' });
				await members.getByRole('button', { name: 'Gérer', exact: true }).click();
				await members.getByRole('button', { name: 'Retirer du groupe', exact: true }).click();
				await expect(
					page
						.getByRole('list', { name: 'Anciens membres' })
						.getByRole('link', { name: thomas.displayName, exact: true })
				).toBeVisible();
			});

			await test.step('3. L’étape est libre, l’historique dit pourquoi', async () => {
				await page.goto(`/morceaux/${work.id}`);
				await waitForAppReady(page);
				await expect(page.getByText('Enregistrement : personne pour l’instant')).toBeVisible();
				await page.goto(`/morceaux/${work.id}/etapes`);
				await waitForAppReady(page);
				await expect(page.getByText(`${thomas.displayName} (soi-même)`)).toHaveCount(0);
				await page.getByText('Historique de l’étape').click();
				const history = page.getByRole('list', { name: 'Historique de l’étape Enregistrement' });
				await expect(history.locator('li')).toHaveCount(3);
				await expect(history.locator('li').first()).toContainText('Libérée automatiquement');
				await expect(history.locator('li').first()).toContainText(
					`(${thomas.displayName} ne gère plus le morceau)`
				);
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
				const step = await db.workStep.findFirstOrThrow({ where: { workId: work.id } });
				expect(step).toMatchObject({
					status: 'TODO',
					assigneeId: null,
					startedAt: null,
					mode: null,
					place: null
				});
			});

			await test.step('4. Léa la reprend elle-même', async () => {
				await page.getByRole('button', { name: 'Je m’en charge' }).click();
				await expect(page.getByText('tu prends l’enregistrement en charge')).toBeVisible();
				await expect(page.getByText('Toi (soi-même)')).toBeVisible();
				expect(await db.workStep.findFirstOrThrow({ where: { workId: work.id } })).toMatchObject({
					assigneeId: lea.actorId,
					status: 'TODO'
				});
				// Un seul acte de libération ; les refus à Thomas sont couverts en intégration.
				expect(
					await db.workStepAct.count({
						where: { step: { workId: work.id }, kind: 'AUTO_RELEASED' }
					})
				).toBe(1);
			});
		} finally {
			if (bandId) await db.actor.deleteMany({ where: { id: bandId } });
			await deleteMusicians([thomas]);
		}
	});
});
