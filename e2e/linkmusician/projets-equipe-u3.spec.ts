import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { makeAccount } from '../support/account';
import { signUpAndVerify } from '../support/admin';
import { db, deleteUser, requireUser } from '../support/db';
import { waitForAppReady, waitForPath } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { horizontalOverflow, skipOnboarding } from '../support/linkmusician';
import { MAX_PENDING_PROJECT_INVITES } from '../../src/lib/projects/participants';

/**
 * U3 — écrans de l'équipe d'un projet (#71, #36 ; conception 20 §8, §11 C,
 * §6.3, UX-8). Scénario C au clavier, à 390 px : le groupe Lumière invite
 * Sam, un producteur de son carnet, à coordonner son EP ; « Inviter les
 * membres du groupe » envoie une invitation à chaque membre, une mineure
 * comprise, sans jamais l'ajouter d'office ; Sam répond depuis « À traiter »
 * et arrive sur la fiche avec sa prochaine action ; la mineure refuse. Un
 * second projet, au quota d'invitations, le dit à l'écran.
 */

async function dismissCookies(page: Page) {
	const notice = page.getByRole('button', { name: 'Compris', exact: true });
	if (await notice.isVisible()) await notice.click();
}

async function personOf(email: string, birthDate: string, name: string) {
	const person = await db.person.findUniqueOrThrow({
		where: { userId: (await requireUser(email)).id },
		include: { actor: { select: { handle: true, displayName: true } } }
	});
	await db.person.update({
		where: { actorId: person.actorId },
		data: { birthDate: new Date(`${birthDate}T00:00:00Z`) }
	});
	await db.actor.update({ where: { id: person.actorId }, data: { displayName: name } });
	return { actorId: person.actorId, handle: person.actor.handle!, name };
}

async function checkPage(page: Page) {
	expect(await horizontalOverflow(page)).toEqual([]);
	await expectNoA11yViolations(page, ['.cartButton']);
}

test.describe('LinkMusician — équipe d’un projet (U3)', () => {
	test.setTimeout(8 * 60_000);

	test('scénario C : producteur invité à coordonner, membres du groupe, mineure, quota', async ({
		page,
		account,
		browser
	}) => {
		const samAccount = makeAccount();
		const zoeAccount = makeAccount();
		const samContext = await browser.newContext();
		const zoeContext = await browser.newContext();
		const sam = await samContext.newPage();
		const zoe = await zoeContext.newPage();
		const extras: string[] = [];
		let bandId = '';
		try {
			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			const lea = await personOf(account.email, '1990-01-01', 'Léa Roux');
			await signUpAndVerify(sam, samAccount);
			await skipOnboarding(sam, samAccount.email);
			const producer = await personOf(samAccount.email, '1988-04-02', 'Sam Morel');
			await signUpAndVerify(zoe, zoeAccount);
			await skipOnboarding(zoe, zoeAccount.email);
			const minor = await personOf(zoeAccount.email, '2012-05-01', 'Zoé Martin');

			// Le groupe : Léa le gère, Zoé (mineure) en est membre. Sam est dans le carnet de Léa.
			const band = await db.actor.create({
				data: {
					kind: 'ORGANIZATION',
					handle: `u3-lumiere-${Date.now()}`,
					displayName: 'Lumière',
					organization: {
						create: {
							kind: 'BAND',
							memberships: {
								create: [
									{ personId: lea.actorId, role: 'OWNER', status: 'ACTIVE', startedAt: new Date() },
									{
										personId: minor.actorId,
										role: 'MEMBER',
										status: 'ACTIVE',
										startedAt: new Date()
									}
								]
							}
						}
					}
				}
			});
			bandId = band.id;
			await db.savedContact.create({ data: { ownerId: lea.actorId, contactId: producer.actorId } });
			const project = await db.project.create({
				data: { ownerId: band.id, name: 'EP Lumière', kind: 'EP', description: 'Secret du groupe' }
			});
			// Un morceau du groupe, rangé en résumé : la prochaine action n'est plus « Créer un morceau ».
			const hymne = await db.work.create({
				data: { ownerId: band.id, createdById: lea.actorId, title: 'Hymne', state: 'COMPOSED' }
			});
			await db.projectItem.create({
				data: { projectId: project.id, workId: hymne.id, share: 'SUMMARY' }
			});
			for (const page_ of [page, sam, zoe])
				await page_.setViewportSize({ width: 390, height: 844 });

			await test.step('1. La gestion invite Sam à coordonner, au clavier', async () => {
				await page.goto(`/projets/${project.id}`);
				await waitForAppReady(page);
				await dismissCookies(page);
				await expect(page.getByTestId('team-owner')).toContainText('Gère le projet');
				// Projet de groupe sans personne d'autre : la prochaine action invite ses membres.
				await expect(page.getByTestId('project-next')).toContainText(
					'Inviter les membres du groupe'
				);
				const open = page.getByRole('button', { name: 'Inviter quelqu’un' });
				await open.focus();
				await page.keyboard.press('Enter');
				const sheet = page.getByRole('dialog', { name: 'Inviter dans EP Lumière' });
				await expect(sheet).toBeVisible();
				await checkPage(page);
				// Zoé, mineure : la coordination ne lui est pas proposée, et l'écran dit pourquoi.
				await sheet.getByRole('radio', { name: new RegExp(minor.name) }).check();
				await expect(sheet.getByRole('radio', { name: /^Coordonner/ })).toHaveCount(0);
				await expect(sheet).toContainText('La coordination est réservée aux adultes.');
				// Sam, trouvé par la recherche dans les contacts.
				await sheet.getByLabel('Rechercher dans tes contacts').fill('morel');
				const samRadio = sheet.getByRole('radio', { name: new RegExp(producer.name) });
				await samRadio.focus();
				await page.keyboard.press('Space');
				await expect(samRadio).toBeChecked();
				await sheet.getByLabel('Son rôle dans le projet').fill('Réalisation');
				await sheet.getByRole('radio', { name: /^Coordonner/ }).check();
				await expect(sheet).toContainText('Rien d’autre avant d’accepter.');
				await sheet.getByRole('button', { name: 'Inviter', exact: true }).focus();
				await page.keyboard.press('Enter');
				await expect(sheet).toBeHidden();
				await expect(page.locator('#main-content').getByRole('status').first()).toContainText(
					`Invitation envoyée à ${producer.name}`
				);
				await expect(page.getByTestId('team-member')).toContainText('Invitation en attente');
			});

			await test.step('2. « Inviter les membres du groupe » : une invitation, pas une adhésion', async () => {
				await page.getByRole('button', { name: /^Inviter les membres du groupe/ }).click();
				const sheet = page.getByRole('dialog', { name: 'Inviter les membres du groupe ?' });
				await expect(sheet).toContainText(minor.name);
				await expect(sheet).toContainText('Personne n’est ajouté sans accepter.');
				await sheet.getByRole('button', { name: 'Envoyer les invitations' }).click();
				await expect(page.locator('#main-content').getByRole('status').first()).toContainText(
					`Invitation envoyée à ${minor.name}`
				);
				const row = await db.projectParticipant.findFirstOrThrow({
					where: { projectId: project.id, personId: minor.actorId }
				});
				expect([row.status, row.capabilities]).toEqual(['INVITED', []]);
				// Plus personne à inviter parmi les membres : le raccourci disparaît.
				await expect(
					page.getByRole('button', { name: /^Inviter les membres du groupe/ })
				).toHaveCount(0);
			});

			await test.step('3. Sam répond depuis « À traiter », avec le minimum (§9.3)', async () => {
				await sam.goto('/espace/a-confirmer');
				await waitForAppReady(sam);
				await dismissCookies(sam);
				const invitation = sam.getByTestId('project-invitation');
				await expect(invitation).toContainText('à coordonner « EP Lumière »');
				await expect(invitation).toContainText('Porté par Lumière');
				await expect(invitation).toContainText('Réalisation');
				for (const secret of ['Secret du groupe', 'Hymne'])
					await expect(sam.locator('#main-content')).not.toContainText(secret);
				await checkPage(sam);
				const join = invitation.getByRole('button', { name: /^Rejoindre/ });
				await join.focus();
				await sam.keyboard.press('Enter');
				await waitForPath(sam, `/projets/${project.id}`);
				await waitForAppReady(sam);
				await expect(sam.getByRole('status').first()).toContainText(
					'Bienvenue dans « EP Lumière »'
				);
				await expect(sam.getByTestId('project-role')).toHaveText('Je coordonne');
				// Coordination : poser les dates d'abord (§7.3).
				await expect(sam.getByTestId('project-next')).toContainText('Poser les dates');
				// Il invite, mais ne propose pas la coordination.
				await sam.getByRole('button', { name: 'Inviter quelqu’un' }).click();
				const sheet = sam.getByRole('dialog', { name: 'Inviter dans EP Lumière' });
				await expect(sheet.getByRole('radio', { name: /^Coordonner/ })).toHaveCount(0);
				await sam.keyboard.press('Escape');
				await expect(sheet).toBeHidden();
				await checkPage(sam);
			});

			await test.step('4. La mineure refuse : retour à « À traiter », personne n’est prévenu', async () => {
				await zoe.goto('/espace/a-confirmer');
				await waitForAppReady(zoe);
				await dismissCookies(zoe);
				const invitation = zoe.getByTestId('project-invitation');
				await expect(invitation).toContainText('Participant·e');
				await expect(invitation).not.toContainText('Coordination');
				await invitation.getByRole('button', { name: /^Refuser/ }).click();
				await expect(zoe.getByRole('status').first()).toContainText('Invitation refusée');
				await expect(zoe.getByTestId('project-invitation')).toHaveCount(0);
				await expect(zoe.locator('#main-content')).toContainText('Rien n’attend ta réponse.');
				const notified = await db.notification.count({
					where: { recipientActorId: lea.actorId, type: 'PROJECT_JOINED' }
				});
				expect(notified).toBe(1);
			});

			await test.step('5. Quota : un projet plein le dit, et n’invite personne', async () => {
				const tour = await db.project.create({
					data: { ownerId: band.id, name: 'Tournée', kind: 'TOUR' }
				});
				for (let i = 0; i < MAX_PENDING_PROJECT_INVITES; i += 1) {
					const extra = await db.actor.create({
						data: { kind: 'PERSON', handle: `u3-f-${Date.now()}-${i}`, displayName: `F${i}` }
					});
					extras.push(extra.id);
					await db.projectParticipant.create({
						data: { projectId: tour.id, personId: extra.id, status: 'INVITED' }
					});
				}
				await page.goto(`/projets/${tour.id}`);
				await waitForAppReady(page);
				await page.getByRole('button', { name: /^Inviter les membres du groupe/ }).click();
				await page
					.getByRole('dialog', { name: 'Inviter les membres du groupe ?' })
					.getByRole('button', { name: 'Envoyer les invitations' })
					.click();
				await expect(page.locator('#main-content').getByRole('status').first()).toContainText(
					`Aucune invitation envoyée. Ce projet a déjà ${MAX_PENDING_PROJECT_INVITES} invitations en attente`
				);
				expect(
					await db.projectParticipant.count({
						where: { projectId: tour.id, personId: minor.actorId }
					})
				).toBe(0);
			});
		} finally {
			await samContext.close();
			await zoeContext.close();
			if (bandId) {
				await db.project.deleteMany({ where: { ownerId: bandId } });
				await db.actor.deleteMany({ where: { id: { in: [bandId, ...extras] } } });
			}
			await deleteUser(samAccount.email);
			await deleteUser(zoeAccount.email);
		}
	});
});
