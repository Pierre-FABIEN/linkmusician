import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { setCity, skipOnboarding } from '../support/linkmusician';

/**
 * P3-12 — Écran de carrière en page-menu (D50) et ambition : je choisis
 * « Monter sur scène », l'objectif mis en avant change ; j'en change, rien
 * n'est retiré.
 */
test.describe('LinkMusician — écran de carrière', () => {
	test.setTimeout(2 * 60_000);
	const A11Y_EXCLUDE = ['.cartButton'];

	test('je choisis mon ambition, mes objectifs suivent', async ({ page, account }) => {
		await signUpAndVerify(page, account);
		await skipOnboarding(page, account.email);
		const person = await db.person.findUniqueOrThrow({
			where: { userId: (await requireUser(account.email)).id }
		});
		// Profil de base rempli en base : les objectifs d'ambition passent devant.
		const guitar = await db.instrument.findUniqueOrThrow({ where: { slug: 'guitare-electrique' } });
		const rock = await db.genre.findUniqueOrThrow({ where: { slug: 'rock' } });
		await db.personInstrument.create({
			data: { personId: person.actorId, instrumentId: guitar.id, declaredLevel: 3, isPrimary: true }
		});
		await db.actorGenre.create({ data: { actorId: person.actorId, genreId: rock.id } });
		await setCity(page);

		const menu = page.getByRole('navigation', { name: 'Collab' });
		await test.step('1. Le menu de carrière : l’ambition est à choisir', async () => {
			await page.goto('/espace');
			await waitForAppReady(page);
			await expect(menu.getByRole('link', { name: /Mon ambition.*À choisir/ })).toBeVisible();
			await expectNoA11yViolations(page, A11Y_EXCLUDE);
		});

		await test.step('2. « Monter sur scène » : un groupe et un morceau d’abord', async () => {
			await menu.getByRole('link', { name: /Mon ambition/ }).click();
			await page.getByLabel(/Monter sur scène/).check();
			await page.getByRole('button', { name: 'Enregistrer' }).click();
			await expect(page.getByText(/C’est noté : « Monter sur scène »/)).toBeVisible();
			await page.goto('/espace/objectifs');
			await waitForAppReady(page);
			await expect(page.getByText('Rejoins ou monte un groupe')).toBeVisible();
		});

		await test.step('3. « Enregistrer et sortir » : la démo passe devant', async () => {
			await page.goto('/espace/ambition');
			await waitForAppReady(page);
			await page.getByLabel(/Enregistrer et sortir/).check();
			await page.getByRole('button', { name: 'Enregistrer' }).click();
			await expect(page.getByText(/C’est noté/)).toBeVisible();
			await page.goto('/espace/objectifs');
			await waitForAppReady(page);
			await expect(page.getByText('Publie ta première démo')).toBeVisible();
			expect(
				(await db.person.findUniqueOrThrow({ where: { actorId: person.actorId } })).ambition
			).toBe('RECORD');
		});
	});

	test('carte : un morceau composé à plusieurs franchit « La création », pas seul·e', async ({
		page,
		account
	}) => {
		await signUpAndVerify(page, account);
		await skipOnboarding(page, account.email);
		const person = await db.person.findUniqueOrThrow({
			where: { userId: (await requireUser(account.email)).id }
		});
		const work = (title: string, proof: 'DECLARED' | 'CORROBORATED') =>
			db.work.create({
				data: {
					ownerId: person.actorId,
					createdById: person.actorId,
					title,
					state: 'COMPOSED',
					proof,
					composedAt: new Date(),
					contributors: { create: [{ personId: person.actorId, confirmedAt: new Date() }] }
				}
			});
		const creation = page.getByRole('list', { name: 'Épreuves · Création' });

		await test.step('1. Composé seul·e : une simple déclaration, l’épreuve reste ouverte', async () => {
			await work('Ma compo solo', 'DECLARED');
			await page.goto('/espace/carte');
			await waitForAppReady(page);
			await expect(creation).toContainText('La création · Ouverte');
			await page.goto('/espace/carte/creation');
			await waitForAppReady(page);
			await expect(page.getByText(/Tu as composé seul·e/)).toBeVisible();
			await expect(page.getByText('Morceau composé « Ma compo solo »')).toBeVisible();
			await expect(page.getByText('Simple déclaration')).toBeVisible();
			await expectNoA11yViolations(page, A11Y_EXCLUDE);
		});

		await test.step('2. Composé à plusieurs : franchie, et aucune autre épreuve « en cours »', async () => {
			await work('Notre compo', 'CORROBORATED');
			await page.goto('/espace/carte');
			await waitForAppReady(page);
			await expect(creation).toContainText('La création · Franchie');
			await expect(page.getByRole('list', { name: 'Épreuves · Équipe' })).toContainText(
				'La rencontre · Ouverte'
			);
			// N2 : ni acte en cours, ni numérotation chronologique.
			await expect(page.locator('#main-content')).not.toContainText(/Acte en cours|Acte [IVX]+\b/);
		});
	});

	test('fiche : les données privées restent privées, une carte souvenir se partage', async ({
		page,
		account
	}) => {
		await signUpAndVerify(page, account);
		await skipOnboarding(page, account.email);
		const person = await db.person.findUniqueOrThrow({
			where: { userId: (await requireUser(account.email)).id },
			include: { actor: true }
		});
		const peer = await db.actor.create({
			data: {
				kind: 'PERSON',
				handle: `fiche-peer-${Math.random().toString(36).slice(2, 9)}`,
				displayName: 'Fiche Peer'
			}
		});
		try {
			await db.work.create({
				data: {
					ownerId: person.actorId,
					createdById: person.actorId,
					title: 'Morceau à plusieurs',
					state: 'COMPOSED',
					proof: 'CORROBORATED',
					composedAt: new Date(),
					contributors: {
						create: [
							{ personId: person.actorId, confirmedAt: new Date() },
							{ personId: peer.id, confirmedAt: new Date() }
						]
					}
				}
			});

			await test.step('1. La fiche privée montre les détails personnels', async () => {
				await page.goto('/espace/fiche');
				await waitForAppReady(page);
				await expect(page.getByRole('heading', { name: 'Ma fiche de carrière' })).toBeVisible();
				await expect(page.getByText('Rien que pour toi')).toBeVisible();
				await expect(page.getByText('XP', { exact: true })).toBeVisible();
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
			});

			await test.step('2. La fiche publique ne présente que les faits confirmés', async () => {
				await page.goto(`/@${person.actor.handle}`);
				await waitForAppReady(page);
				const sheet = page.locator('section[aria-labelledby="career-sheet-title"]');
				await expect(sheet).toContainText('Morceaux à plusieurs');
				await expect(sheet).not.toContainText('XP');
				await expect(sheet).not.toContainText('Rien que pour toi');
				await expect(page.getByRole('link', { name: /Télécharger · La création/ })).toBeVisible();
				await expectNoA11yViolations(page, A11Y_EXCLUDE);

				const response = await page.request.get(
					`/api/carriere/souvenir/${person.actor.handle}/2.png`
				);
				expect(response.status()).toBe(200);
				expect(response.headers()['content-type']).toBe('image/png');
				expect((await response.body()).subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
			});
		} finally {
			await db.actor.delete({ where: { id: peer.id } });
		}
	});
	test('scène : un concert confirmé met l’épreuve à portée, vérifié il la franchit', async ({
		page,
		account
	}) => {
		await signUpAndVerify(page, account);
		await skipOnboarding(page, account.email);
		const person = await db.person.findUniqueOrThrow({
			where: { userId: (await requireUser(account.email)).id },
			include: { actor: true }
		});
		const suffix = Math.random().toString(36).slice(2, 8);
		const bandName = `E2E Les Rats ${suffix}`;
		// Concert préparé en base : le groupe de la personne, son « Premier
		// concert » et l'attestation qui la crédite.
		const band = await db.actor.create({
			data: {
				kind: 'ORGANIZATION',
				handle: `e2e-scene-${suffix}`,
				displayName: bandName,
				organization: {
					create: {
						kind: 'BAND',
						formedAt: new Date(Date.now() - 60 * 86_400_000),
						memberships: {
							create: [
								{
									personId: person.actorId,
									role: 'OWNER',
									status: 'ACTIVE',
									startedAt: new Date(Date.now() - 60 * 86_400_000)
								}
							]
						}
					}
				}
			}
		});
		const occurredAt = new Date(Date.now() - 7 * 86_400_000);
		const attested = (to: 'CORROBORATED' | 'VERIFIED') =>
			db.domainEvent.create({
				data: {
					type: 'milestone.attested',
					actorIds: [band.id, person.actorId],
					processedAt: new Date(),
					payload: {
						type: 'milestone.attested',
						bandId: band.id,
						milestone: 'FIRST_GIG',
						from: to === 'VERIFIED' ? 'CORROBORATED' : null,
						to,
						memberIds: [person.actorId],
						occurredAt: occurredAt.toISOString()
					}
				}
			});
		const scene = page.getByRole('list', { name: 'Épreuves · Scène' });
		const reach = page.getByRole('region', { name: 'À portée' });
		try {
			await test.step('1. Avant le concert : « La scène » est ouverte, rien de faussement à portée', async () => {
				await page.goto('/espace/carte');
				await waitForAppReady(page);
				await expect(scene).toContainText('La scène · Ouverte');
				await expect(reach.getByText('Rien n’attend de geste de ta part')).toBeVisible();
				await page.goto('/espace/carte/scene');
				await waitForAppReady(page);
				await expect(page.getByText(/Pour aller plus loin :.*tournée/)).toBeVisible();
				// P8 (D77) : « La scène » se franchit aussi en son nom, plus d'avertissement.
				await expect(page.getByText(/se franchit avec un groupe/)).toHaveCount(0);
			});

			await test.step('2. Concert confirmé, pas vérifié : à portée, un seul geste', async () => {
				const definition = await db.milestoneDefinition.findUniqueOrThrow({
					where: { id: 'FIRST_GIG' }
				});
				await db.milestone.create({
					data: {
						definitionId: 'FIRST_GIG',
						bandId: band.id,
						proof: 'CORROBORATED',
						occurredAt,
						definitionVersion: definition.version
					}
				});
				await attested('CORROBORATED');
				await page.goto('/espace/carte');
				await waitForAppReady(page);
				await expect(scene).toContainText('La scène · À portée');
				await expect(reach.getByRole('heading', { name: 'La scène' })).toBeVisible();
				await expect(
					reach.getByRole('link', { name: /Voir les plateaux ouverts/ })
				).toHaveAttribute('href', '/annonces?type=GIG_SLOT');
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
			});

			await test.step('3. Concert vérifié : épreuve franchie, la tournée reste à faire', async () => {
				await db.milestone.update({
					where: { bandId_definitionId: { bandId: band.id, definitionId: 'FIRST_GIG' } },
					data: { proof: 'VERIFIED' }
				});
				await attested('VERIFIED');
				await page.reload();
				await waitForAppReady(page);
				await expect(scene).toContainText('La scène · Franchie');
				await page.goto('/espace/carte/scene');
				await waitForAppReady(page);
				await expect(page.getByText('Faite !')).toHaveCount(0);
				await expect(page.getByRole('link', { name: /carte souvenir du concert/ })).toBeVisible();
				await expect(page.getByText(new RegExp(`Premier concert · ${bandName}`))).toBeVisible();
				await expectNoA11yViolations(page, A11Y_EXCLUDE);
			});

			await test.step('4. La carte souvenir du concert se partage', async () => {
				const response = await page.request.get(
					`/api/carriere/souvenir/${person.actor.handle}/5.png`
				);
				expect(response.status()).toBe(200);
				expect(response.headers()['content-type']).toBe('image/png');
			});
		} finally {
			await db.domainEvent.deleteMany({ where: { actorIds: { has: band.id } } });
			await db.actor.delete({ where: { id: band.id } });
		}
	});

	test('carte parallèle sur mobile (390 px) : branches, clavier, Rencontre', async ({
		page,
		account
	}) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await signUpAndVerify(page, account);
		await skipOnboarding(page, account.email);

		await test.step('1. Compte neuf : un état vide sans reproche, six branches', async () => {
			await page.goto('/espace/carte');
			await waitForAppReady(page);
			await expect(page.getByText('Rien n’attend de geste de ta part')).toBeVisible();
			const branches = page.getByRole('list', { name: 'Branches de la carrière' });
			await expect(branches.locator(':scope > li')).toHaveCount(6);
			await expect(branches).toContainText('Bientôt sur Melokiva');
			await expect(page.locator('#main-content')).not.toContainText(/Acte|en cours|%/);
			// Aucun débordement horizontal à 390 px.
			const overflow = await page.evaluate(
				() => document.documentElement.scrollWidth - document.documentElement.clientWidth
			);
			expect(overflow).toBeLessThanOrEqual(0);
			await expectNoA11yViolations(page, A11Y_EXCLUDE);
		});

		await test.step('2. Au clavier, la tuile Équipe ouvre sa branche', async () => {
			const equipe = page.getByRole('link', { name: /^Équipe/ });
			await equipe.focus();
			await expect(equipe).toBeFocused();
			await page.keyboard.press('Enter');
			await expect(page).toHaveURL(/\/espace\/carte\/equipe$/);
			await waitForAppReady(page);
			await expect(page.getByRole('heading', { level: 1, name: 'Équipe' })).toBeVisible();
		});

		await test.step('3. Les jams mènent à Rencontre (Q-NL-3)', async () => {
			const jam = page.getByRole('link', { name: /Trouver une jam dans Rencontre/ });
			await expect(jam).toHaveAttribute('href', '/jam');
			await expectNoA11yViolations(page, A11Y_EXCLUDE);
		});
	});
});
