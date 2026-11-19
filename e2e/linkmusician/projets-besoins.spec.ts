import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { makeAccount } from '../support/account';
import { signUpAndVerify } from '../support/admin';
import { db, deleteUser, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { horizontalOverflow, setCity, skipOnboarding } from '../support/linkmusician';

/**
 * U3b-c — besoins d'un projet (#71, #36 ; D76, conception 22 §6, §7, §8).
 * À 390 px, en partie au clavier : Léa porte l'EP en son nom ; Sam le
 * coordonne, Inès y participe. Léa ajoute un besoin ; Sam en propose deux ;
 * Léa les retrouve dans « À traiter », en ouvre un, refuse l'autre ; Sam voit
 * le changement ; Inès ne voit jamais les propositions ; Léa marque un besoin
 * pourvu, cherche un pro, prépare une annonce là où c'est possible ; après le
 * retrait de sa coordination, Sam ne propose plus rien et sa proposition en
 * attente tombe.
 */

async function dismissCookies(page: Page) {
	const notice = page.getByRole('button', { name: 'Compris', exact: true });
	if (await notice.isVisible()) await notice.click();
}

async function personOf(email: string, name: string) {
	const person = await db.person.findUniqueOrThrow({
		where: { userId: (await requireUser(email)).id },
		select: { actorId: true }
	});
	await db.person.update({
		where: { actorId: person.actorId },
		data: { birthDate: new Date('1990-01-01T00:00:00Z') }
	});
	await db.actor.update({ where: { id: person.actorId }, data: { displayName: name } });
	return { actorId: person.actorId, name };
}

async function checkPage(page: Page) {
	expect(await horizontalOverflow(page)).toEqual([]);
	await expectNoA11yViolations(page, ['.cartButton']);
}

async function openFiche(page: Page, projectId: string) {
	await page.goto(`/projets/${projectId}`);
	await waitForAppReady(page);
	await dismissCookies(page);
}

/** Ajoute ou propose un besoin depuis la feuille, au clavier pour le métier. */
async function addNeed(
	page: Page,
	opener: RegExp,
	track: string,
	specialty: string | null,
	description: string
) {
	const open = page.getByRole('button', { name: opener });
	await open.focus();
	await page.keyboard.press('Enter');
	const sheet = page.getByTestId('need-sheet');
	await expect(sheet).toBeVisible();
	await sheet.getByLabel('Métier recherché').selectOption({ label: track });
	if (specialty) await sheet.getByLabel(/Précision/).selectOption({ label: specialty });
	await sheet.getByLabel(/En une phrase/).fill(description);
	await sheet.getByRole('button', { name: /^(Ajouter|Proposer à la gestion)$/ }).click();
	await expect(sheet).toBeHidden();
}

const needTile = (page: Page, label: string) =>
	page.getByTestId('need').filter({ has: page.getByText(label, { exact: true }) });

test.describe('LinkMusician — besoins d’un projet (U3b-c)', () => {
	test.setTimeout(8 * 60_000);

	test('gestion, coordination, participation : ajouter, proposer, décider, pourvoir', async ({
		page,
		account,
		browser
	}) => {
		const samAccount = makeAccount();
		const inesAccount = makeAccount();
		const samContext = await browser.newContext();
		const inesContext = await browser.newContext();
		const sam = await samContext.newPage();
		const ines = await inesContext.newPage();
		let bandId = '';
		let leaId = '';
		try {
			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			const lea = await personOf(account.email, 'Léa Roux');
			leaId = lea.actorId;
			// La publication d'une annonce exige une commune, même depuis un besoin.
			await setCity(page);
			await signUpAndVerify(sam, samAccount);
			await skipOnboarding(sam, samAccount.email);
			const coord = await personOf(samAccount.email, 'Sam Morel');
			await signUpAndVerify(ines, inesAccount);
			await skipOnboarding(ines, inesAccount.email);
			const guest = await personOf(inesAccount.email, 'Inès Diallo');

			// L'EP est porté par Léa en son nom ; Sam coordonne, Inès participe.
			const project = await db.project.create({
				data: { ownerId: lea.actorId, name: 'EP Lumière', kind: 'EP' }
			});
			await db.projectParticipant.createMany({
				data: [
					{
						projectId: project.id,
						personId: coord.actorId,
						status: 'ACTIVE',
						capabilities: ['COORDINATE'],
						answeredAt: new Date()
					},
					{
						projectId: project.id,
						personId: guest.actorId,
						status: 'ACTIVE',
						answeredAt: new Date()
					}
				]
			});
			for (const p of [page, sam, ines]) await p.setViewportSize({ width: 390, height: 844 });

			await test.step('1. La gestion ajoute un besoin, ouvert d’emblée', async () => {
				await openFiche(page, project.id);
				await expect(page.locator('#besoins')).toContainText('Il te manque quelqu’un ?');
				await checkPage(page);
				await addNeed(
					page,
					/^Ajouter un besoin$/,
					'Ingé son',
					'Prise de son',
					'Enregistrer cinq titres en janvier'
				);
				const tile = needTile(page, 'Ingé son · Prise de son');
				await expect(tile).toHaveAttribute('data-status', 'OPEN');
				await expect(tile).toContainText('Ouvert');
			});

			await test.step('2. La coordination propose deux besoins', async () => {
				await openFiche(sam, project.id);
				await addNeed(sam, /^Proposer un besoin$/, 'Booker', null, 'Une tournée au printemps');
				await addNeed(sam, /^Proposer un besoin$/, 'Producteur·rice', 'Arrangement', 'Les cordes');
				await expect(needTile(sam, 'Booker')).toHaveAttribute('data-status', 'PROPOSED');
				// La coordination ne valide pas : aucun bouton « Ouvrir ce besoin ».
				await expect(sam.getByRole('button', { name: /^Ouvrir ce besoin/ })).toHaveCount(0);
				await checkPage(sam);
			});

			await test.step('3. La gestion retrouve les propositions dans « À traiter »', async () => {
				await page.goto('/espace/a-confirmer');
				await waitForAppReady(page);
				const rows = page.getByTestId('need-proposal');
				await expect(rows).toHaveCount(2);
				await expect(rows.first()).toContainText('EP Lumière');
				await expect(rows.first()).toContainText('par Sam Morel');
				await checkPage(page);
				await rows.first().focus();
				await page.keyboard.press('Enter');
				await expect(page).toHaveURL(new RegExp(`/projets/${project.id}#besoins$`));
				await expect(page.getByTestId('project-next')).toContainText(
					'Décider des besoins proposés'
				);
			});

			await test.step('4. La gestion ouvre l’une, refuse l’autre', async () => {
				await needTile(page, 'Booker')
					.getByRole('button', { name: /^Ouvrir ce besoin/ })
					.click();
				await expect(needTile(page, 'Booker')).toHaveAttribute('data-status', 'OPEN');
				await needTile(page, 'Producteur·rice · Arrangement')
					.getByRole('button', { name: /^Ne pas retenir/ })
					.click();
				await expect(needTile(page, 'Producteur·rice · Arrangement')).toHaveAttribute(
					'data-status',
					'DECLINED'
				);
				// Une proposition tranchée ne reste pas dans « À traiter ».
				await page.goto('/espace/a-confirmer');
				await waitForAppReady(page);
				await expect(page.getByTestId('need-proposal')).toHaveCount(0);
			});

			await test.step('5. La coordination constate la décision', async () => {
				await openFiche(sam, project.id);
				await expect(needTile(sam, 'Booker')).toHaveAttribute('data-status', 'OPEN');
				await expect(needTile(sam, 'Producteur·rice · Arrangement')).toContainText('Non retenu');
			});

			await test.step('6. La participation ne voit que les besoins ouverts et pourvus', async () => {
				await openFiche(ines, project.id);
				await expect(ines.getByTestId('need')).toHaveCount(2);
				await expect(ines.locator('#besoins')).not.toContainText('Arrangement');
				await expect(ines.locator('#besoins')).not.toContainText('Proposé');
				await expect(
					ines.getByRole('button', { name: /Proposer un besoin|Ajouter un besoin/ })
				).toHaveCount(0);
				// Elle cherche, sans rien envoyer au nom du projet.
				await expect(
					needTile(ines, 'Ingé son · Prise de son').getByTestId('need-search')
				).toHaveAttribute('href', /\/decouvrir\?metier=inge-son&specialite=prise-de-son$/);
				await checkPage(ines);
			});

			await test.step('7. La gestion marque un besoin pourvu, par Inès', async () => {
				await openFiche(page, project.id);
				const tile = needTile(page, 'Ingé son · Prise de son');
				await tile.getByLabel(/Par qui/).selectOption({ label: 'Inès Diallo' });
				await tile.getByRole('button', { name: /^Marquer pourvu/ }).click();
				await expect(tile).toHaveAttribute('data-status', 'FILLED');
				await expect(tile).toContainText('pourvu par Inès Diallo');
				// Pourvu ne crée ni tâche, ni crédit, ni XP.
				expect(await db.xpTransaction.count({ where: { actorId: guest.actorId } })).toBe(0);
			});

			await test.step('8. Une annonce seulement pour les métiers et porteurs admis', async () => {
				// Booker : pas d'annonce possible, une phrase le dit.
				const booker = needTile(page, 'Booker');
				await expect(booker.getByTestId('need-opportunity')).toHaveCount(0);
				await expect(booker).toContainText('Les annonces ne cherchent pas encore de booker');
				// Ingé son rouvert : l'annonce se prépare, sans le nom du projet.
				const engineer = needTile(page, 'Ingé son · Prise de son');
				await engineer.getByRole('button', { name: /^Rouvrir/ }).click();
				await expect(engineer).toHaveAttribute('data-status', 'OPEN');
				const link = engineer.getByTestId('need-opportunity');
				await expect(link).toHaveAttribute('href', /cible=SOUND_ENGINEER/);
				await expect(link).not.toHaveAttribute('href', /EP/);
				await link.click();
				await waitForAppReady(page);
				await expect(page.getByTestId('need-origin')).toContainText('sans le nom du projet');

				// Projet d'un groupe : annonce refusée (au nom d'un groupe, recrutement seulement).
				const band = await db.actor.create({
					data: {
						kind: 'ORGANIZATION',
						handle: `u3c-groupe-${Date.now()}`,
						displayName: 'Lumière',
						organization: {
							create: {
								kind: 'BAND',
								memberships: {
									create: [
										{
											personId: lea.actorId,
											role: 'OWNER',
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
				const bandProject = await db.project.create({
					data: { ownerId: band.id, name: 'Tournée', kind: 'TOUR' }
				});
				await db.projectNeed.create({
					data: {
						projectId: bandProject.id,
						status: 'OPEN',
						track: 'SOUND_ENGINEER',
						specialty: 'LIVE_FOH',
						createdById: lea.actorId
					}
				});
				await openFiche(page, bandProject.id);
				const foh = needTile(page, 'Ingé son · Façade');
				await expect(foh.getByTestId('need-opportunity')).toHaveCount(0);
				await expect(foh).toContainText('Au nom d’un groupe');
			});

			await test.step('9. Coordination retirée : plus de proposition, la sienne tombe', async () => {
				await openFiche(sam, project.id);
				await addNeed(sam, /^Proposer un besoin$/, 'Manager', null, 'Pour la suite');
				await openFiche(page, project.id);
				await page
					.getByRole('button', { name: /^Retirer la coordination/ })
					.first()
					.click();
				await expect(needTile(page, 'Manager')).toHaveCount(0);
				await openFiche(sam, project.id);
				await expect(sam.getByRole('button', { name: /Proposer un besoin/ })).toHaveCount(0);
				await expect(needTile(sam, 'Manager')).toHaveCount(0);
				const manager = await db.projectNeed.findFirstOrThrow({
					where: { projectId: project.id, track: 'MANAGER' }
				});
				expect(manager.status).toBe('CANCELLED');
			});
		} finally {
			await samContext.close();
			await inesContext.close();
			if (leaId) await db.project.deleteMany({ where: { ownerId: leaId } });
			if (bandId) {
				await db.project.deleteMany({ where: { ownerId: bandId } });
				await db.actor.deleteMany({ where: { id: bandId } });
			}
			await deleteUser(samAccount.email);
			await deleteUser(inesAccount.email);
		}
	});
});
