import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady, waitForPath } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import {
	createMusician,
	deleteMusicians,
	horizontalOverflow,
	skipOnboarding
} from '../support/linkmusician';
import { TRACKS } from '../../src/lib/actors/tracks';

/**
 * U0 — Accueil Collab (#71, conception 20 §4–§6, D74 : UX-1 acceptée) :
 * quatre pivots ; le héros montre une demande réelle avant la progression ;
 * « À traiter » rassemble ce qui attend ma réponse, sans rien d'une personne
 * qui m'a bloqué·e ; l'agenda Collab ne montre pas de jams et renvoie à
 * Rencontre ; un compte multirôle garde son espace métier. 390 px, clavier,
 * axe.
 */
test.describe('LinkMusician — accueil Collab (U0)', () => {
	test.setTimeout(4 * 60_000);
	const toulouse = { code: '31555', nom: 'Toulouse', dep: '31', lat: 43.6007, lng: 1.4328 };

	test('pivots, héros, À traiter, agenda et métiers', async ({ page, account }) => {
		const created: Awaited<ReturnType<typeof createMusician>>[] = [];
		let bandId = '';
		try {
			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			const me = await db.person.findUniqueOrThrow({
				where: { userId: (await requireUser(account.email)).id }
			});
			await db.person.update({
				where: { actorId: me.actorId },
				data: { birthDate: new Date('1990-01-01') }
			});
			await page.setViewportSize({ width: 390, height: 844 });
			const home = page.getByRole('navigation', { name: 'Collab' });

			await test.step('1. Quatre pivots, chacun avec ses entrées réelles', async () => {
				await page.goto('/espace');
				await waitForAppReady(page);
				const cookieNotice = page.getByRole('button', { name: 'Compris', exact: true });
				if (await cookieNotice.isVisible()) await cookieNotice.click();
				const sections = home.getByRole('navigation', { name: /^Sections de/ });
				await expect(sections.getByRole('button')).toHaveText([
					'avancer',
					'ma musique',
					'réseau',
					'repères'
				]);
				for (const [name, href] of [
					// U2 : « Mes projets » et « Créer un projet » dans « avancer ».
					[/^Mes projets/, '/projets'],
					[/^Créer un projet/, '/projets/nouveau'],
					[/^Mes morceaux/, '/morceaux'],
					[/^Ma carte de carrière/, '/espace/carte'],
					[/^Mes groupes et structures/, '/structure'],
					[/^Mes contacts/, '/messages/contacts'],
					[/^Annonces et candidatures/, '/annonces'],
					[/^Points, succès et confiance/, '/espace/progression'],
					[/^Les démarches/, '/demarches']
				] as const)
					await expect(home.getByRole('link', { name })).toHaveAttribute('href', href);
				// Doublons résorbés : plus de « Mon équipe » ni de « Mes structures » séparés.
				// U2 : les projets vivent dans « avancer » (plus d'entrée dans « ma
				// musique ») ; compte neuf sans morceau : pas de « Hors projet ».
				await expect(home.getByRole('link', { name: /^Mon équipe/ })).toHaveCount(0);
				await expect(home.getByRole('link', { name: /^Mes structures/ })).toHaveCount(0);
				await expect(page.locator('a[href^="/projets"]')).toHaveCount(2);
				await expect(home.getByRole('link', { name: /^Projets/ })).toHaveCount(0);
				await expect(home.getByRole('link', { name: /^Hors projet/ })).toHaveCount(0);
				// Compte neuf : « Commence ici », sans reproche.
				await expect(page.getByTestId('start-hero')).toBeVisible();
				await expect(page.getByTestId('start-hero')).not.toContainText(/retard|pas encore|XP/i);
				expect(await horizontalOverflow(page)).toEqual([]);
				await expectNoA11yViolations(page, ['.cartButton']);
			});

			await test.step('2. Au clavier, les pivots se parcourent', async () => {
				const sections = home.getByRole('navigation', { name: /^Sections de/ });
				const reperes = sections.getByRole('button', { name: 'repères' });
				await reperes.focus();
				await page.keyboard.press('Enter');
				await expect(reperes).toHaveAttribute('aria-current', 'true');
			});

			// Des demandes réelles : un groupe m'invite, Léa me crédite ; une personne
			// qui m'a bloqué·e me crédite aussi et a une session prévue avec moi.
			const lea = await createMusician({ name: 'Lea', commune: toulouse });
			const bloqueur = await createMusician({ name: 'Bloqueur', commune: toulouse });
			created.push(lea, bloqueur);
			const band = await db.actor.create({
				data: {
					kind: 'ORGANIZATION',
					handle: `u0-groupe-${me.actorId.slice(-6)}`,
					displayName: 'Les Tilleuls',
					organization: { create: { kind: 'BAND' } }
				}
			});
			bandId = band.id;
			await db.membership.create({
				data: { orgId: bandId, personId: lea.actorId, role: 'OWNER', status: 'ACTIVE' }
			});
			await db.membership.create({
				data: { orgId: bandId, personId: me.actorId, status: 'INVITED', invitedById: lea.actorId }
			});
			for (const [owner, title] of [
				[lea, 'Nuit blanche'],
				[bloqueur, 'Morceau caché']
			] as const) {
				const w = await db.work.create({
					data: { ownerId: owner.actorId, createdById: owner.actorId, title }
				});
				await db.workContributor.create({ data: { workId: w.id, personId: me.actorId } });
			}
			const conv = await db.conversation.create({
				data: {
					pairKey: [me.actorId, bloqueur.actorId].sort().join(':'),
					initiatorId: bloqueur.actorId,
					participants: {
						create: [
							{ actorId: me.actorId, state: 'ACCEPTED' },
							{ actorId: bloqueur.actorId, state: 'ACCEPTED' }
						]
					}
				}
			});
			await db.collaboration.create({
				data: {
					kind: 'REHEARSAL',
					status: 'ACCEPTED',
					title: 'Répétition cachée',
					happenedOn: new Date(new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10)),
					proposedById: bloqueur.actorId,
					conversationId: conv.id,
					participants: {
						create: [
							{ actorId: me.actorId, acceptedAt: new Date() },
							{ actorId: bloqueur.actorId, acceptedAt: new Date() }
						]
					}
				}
			});
			await db.block.create({
				data: { blockerActorId: bloqueur.actorId, blockedActorId: me.actorId }
			});

			await test.step('3. Le héros montre une demande réelle, avant la progression', async () => {
				await page.goto('/espace');
				await waitForAppReady(page);
				const hero = page.getByTestId('action-hero');
				await expect(hero).toContainText('Une demande pour toi');
				await expect(page.getByTestId('start-hero')).toHaveCount(0);
				// La progression reste accessible, en tête de « repères ».
				await expect(home.getByRole('link', { name: /^Ta prochaine étape/ })).toBeVisible();
				const tile = page
					.getByRole('region', { name: 'Actions prioritaires' })
					.getByRole('link', { name: /^À traiter/ });
				// Deux demandes visibles : l'invitation et le crédit de Léa ; rien du bloqueur.
				await expect(tile).toContainText('2 dans l’aperçu');
				await expect(page.getByText(/Morceau caché|Répétition cachée/)).toHaveCount(0);
				await tile.focus();
				await page.keyboard.press('Enter');
				await waitForPath(page, '/espace/a-confirmer');
			});

			await test.step('4. « À traiter » : les demandes autorisées, par nature', async () => {
				await waitForAppReady(page);
				await expect(page.getByRole('heading', { level: 1 })).toHaveText('À traiter');
				await expect(page.getByRole('list', { name: 'Crédits à confirmer' })).toHaveText(
					/« Nuit blanche »/
				);
				await expect(page.getByRole('list', { name: 'Invitations de groupe' })).toContainText(
					'Les Tilleuls'
				);
				await expect(page.getByText(/Morceau caché|Répétition cachée/)).toHaveCount(0);
				// Une section vide n'apparaît pas.
				await expect(page.getByRole('heading', { name: 'Collaborations' })).toHaveCount(0);
				expect(await horizontalOverflow(page)).toEqual([]);
				await expectNoA11yViolations(page, ['.cartButton']);
			});

			await test.step('5. Agenda Collab : pas de jam, un lien vers Rencontre', async () => {
				await page.goto('/espace/agenda');
				await waitForAppReady(page);
				await expect(page.getByText('Répétition cachée')).toHaveCount(0);
				await expect(page.getByText('Rien de prévu pour l’instant.')).toBeVisible();
				await expect(page.getByRole('link', { name: 'voir les jams à venir' })).toHaveAttribute(
					'href',
					'/jam/agenda'
				);
				await expectNoA11yViolations(page, ['.cartButton']);
			});

			await test.step('6. Multirôle : l’espace manager garde ses entrées et le même héros', async () => {
				await db.personTrack.create({ data: { personId: me.actorId, track: 'MANAGER' } });
				await page.goto('/espace');
				await waitForAppReady(page);
				const selector = page.getByLabel('Rôle', { exact: true });
				await Promise.all([
					page.waitForResponse(
						(r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/jouer'
					),
					selector.selectOption('MANAGER')
				]);
				await expect(page.getByRole('heading', { level: 1 })).toHaveText(TRACKS.MANAGER.label);
				await waitForAppReady(page);
				await expect(page.getByTestId('action-hero')).toContainText('Une demande pour toi');
				await expect(
					page
						.getByRole('region', { name: 'Actions prioritaires' })
						.getByRole('link', { name: /^À traiter/ })
				).toContainText('2 dans l’aperçu');
				expect(await horizontalOverflow(page)).toEqual([]);
				await expectNoA11yViolations(page, ['.cartButton']);
			});
		} finally {
			if (bandId) await db.actor.deleteMany({ where: { id: bandId } });
			await deleteMusicians(created);
		}
	});
});
