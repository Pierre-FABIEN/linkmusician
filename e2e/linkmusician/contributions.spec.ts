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
 * U1 — Mes contributions (#71, conception 20 §10.2) : un compte neuf voit un
 * état vide neutre ; un compte multirôle (musicien·ne, ingé son,
 * producteur·rice) voit une ligne par réalisation, avec sa meilleure preuve
 * (une séance liée à un morceau crédité ne fait qu'une ligne « Confirmé »),
 * filtre par rôle, ouvre la fiche d'un morceau, et ne voit rien qui nomme une
 * personne qui l'a bloqué·e. Entrées depuis « ma musique » (musicien) et en
 * tête de l'espace métier (UX-4, défaut). 390 px, clavier, axe.
 */
test.describe('LinkMusician — mes contributions (U1)', () => {
	test.setTimeout(4 * 60_000);
	const toulouse = { code: '31555', nom: 'Toulouse', dep: '31', lat: 43.6007, lng: 1.4328 };

	test('vide, lignes dédupliquées, filtres, fiche, espaces métiers', async ({ page, account }) => {
		const created: Awaited<ReturnType<typeof createMusician>>[] = [];
		const eventIds: string[] = [];
		let meId = '';
		try {
			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			const me = await db.person.findUniqueOrThrow({
				where: { userId: (await requireUser(account.email)).id }
			});
			meId = me.actorId;
			await db.person.update({
				where: { actorId: me.actorId },
				data: { birthDate: new Date('1990-01-01') }
			});
			await page.setViewportSize({ width: 390, height: 844 });
			const home = page.getByRole('navigation', { name: 'Mode carrière' });

			await test.step('1. Depuis « ma musique », un état vide neutre', async () => {
				await page.goto('/espace');
				await waitForAppReady(page);
				const cookieNotice = page.getByRole('button', { name: 'Compris', exact: true });
				if (await cookieNotice.isVisible()) await cookieNotice.click();
				await home
					.getByRole('navigation', { name: /^Sections de/ })
					.getByRole('button', { name: 'ma musique' })
					.click();
				const entry = home.getByRole('link', { name: /^Mes contributions/ });
				await expect(entry).toHaveAttribute('href', '/espace/contributions');
				await entry.click();
				await waitForPath(page, '/espace/contributions');
				await waitForAppReady(page);
				await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mes contributions');
				await expect(page.getByText('Ce que tu as réalisé et qui le confirme.')).toBeVisible();
				await expect(page.getByText(/apparaîtront ici/)).toBeVisible();
				await expect(page.locator('#main-content')).not.toContainText(/XP|niveau|retard/i);
				await expect(page.getByRole('group', { name: 'Filtrer par rôle' })).toHaveCount(0);
				await expect(page.getByRole('link', { name: /Ma fiche de carrière/ })).toHaveAttribute(
					'href',
					'/espace/fiche'
				);
				expect(await horizontalOverflow(page)).toEqual([]);
				await expectNoA11yViolations(page, ['.cartButton']);
			});

			// Léa porte trois morceaux : je joue sur le premier, je mixe les deux
			// autres lors d'une même séance (collaboration terminée sur « Titre 2 »,
			// crédit seul sur « Titre 3 »). Un producteur confirme une production
			// sans morceau. Un bloqueur me crédite sur son morceau.
			const lea = await createMusician({ name: 'Lea', commune: toulouse });
			const prod = await createMusician({ name: 'Prod', commune: toulouse });
			const bloqueur = await createMusician({ name: 'Bloqueur', commune: toulouse });
			created.push(lea, prod, bloqueur);
			const instrument = await db.instrument.findFirstOrThrow({ where: { active: true } });
			const credit = async (
				owner: string,
				title: string,
				kind: 'INSTRUMENT' | 'MIXING' | 'RECORDING'
			) => {
				const w = await db.work.create({
					data: {
						ownerId: owner,
						createdById: owner,
						title,
						state: 'COMPOSED',
						proof: 'CORROBORATED',
						composedAt: new Date('2026-03-01T12:00:00Z')
					}
				});
				const c = await db.workContributor.create({
					data: {
						workId: w.id,
						personId: me.actorId,
						confirmedAt: new Date('2026-03-02T12:00:00Z')
					}
				});
				await db.workRole.create({
					data: {
						workId: w.id,
						kind,
						contributorId: c.id,
						instrumentId: kind === 'INSTRUMENT' ? instrument.id : null
					}
				});
				return w.id;
			};
			const nuit = await credit(lea.actorId, 'Nuit blanche', 'INSTRUMENT');
			const titre2 = await credit(lea.actorId, 'Titre 2', 'MIXING');
			await credit(lea.actorId, 'Titre 3', 'MIXING');
			await credit(bloqueur.actorId, 'Morceau caché', 'RECORDING');
			const completed = async (
				other: string,
				data: {
					title: string;
					kind: 'MIXING' | 'PRODUCTION';
					workId?: string;
					service: 'MIXING' | 'PRODUCTION';
				}
			) => {
				const collab = await db.collaboration.create({
					data: {
						kind: data.kind,
						status: 'COMPLETED',
						title: data.title,
						happenedOn: new Date('2026-05-10'),
						completedAt: new Date('2026-05-11T12:00:00Z'),
						proposedById: me.actorId,
						workId: data.workId ?? null,
						participants: {
							create: [
								{
									actorId: me.actorId,
									acceptedAt: new Date(),
									confirmedCompletionAt: new Date(),
									service: data.service
								},
								{ actorId: other, acceptedAt: new Date(), confirmedCompletionAt: new Date() }
							]
						}
					}
				});
				const occurredAt = new Date('2026-05-11T12:00:00Z');
				const event = await db.domainEvent.create({
					data: {
						type: 'collaboration.completed',
						actorIds: [me.actorId, other],
						processedAt: new Date(),
						occurredAt,
						payload: {
							type: 'collaboration.completed',
							collaborationId: collab.id,
							participantIds: [me.actorId, other],
							services: { [me.actorId]: data.service },
							occurredAt: occurredAt.toISOString()
						}
					}
				});
				eventIds.push(event.id);
			};
			await completed(lea.actorId, {
				title: 'Séance de mixage',
				kind: 'MIXING',
				workId: titre2,
				service: 'MIXING'
			});
			await completed(prod.actorId, {
				title: 'Production de l’EP',
				kind: 'PRODUCTION',
				service: 'PRODUCTION'
			});
			await db.block.create({
				data: { blockerActorId: bloqueur.actorId, blockedActorId: me.actorId }
			});

			const list = page.getByRole('list', { name: /^Contributions/ });

			await test.step('2. Une ligne par réalisation, avec sa meilleure preuve', async () => {
				await page.goto('/espace/contributions');
				await waitForAppReady(page);
				await expect(page.getByRole('heading', { level: 2, name: '2026' })).toBeVisible();
				await expect(list.getByRole('listitem')).toHaveCount(5);
				const t2 = list.getByRole('listitem').filter({ hasText: 'Titre 2' });
				await expect(t2).toHaveCount(1);
				await expect(t2).toContainText('Mixage');
				await expect(t2).toContainText('Confirmé');
				await expect(list.getByRole('listitem').filter({ hasText: 'Titre 3' })).toContainText(
					'Crédité·e'
				);
				await expect(
					list.getByRole('listitem').filter({ hasText: 'Production de l’EP' })
				).toContainText(prod.displayName);
				// Le morceau du bloqueur reste un fait, sans son nom ni lien.
				const hidden = list.getByRole('listitem').filter({ hasText: 'Morceau caché' });
				await expect(hidden).toHaveCount(1);
				await expect(hidden.getByRole('link')).toHaveCount(0);
				await expect(page.locator('#main-content')).not.toContainText(bloqueur.displayName);
				expect(await page.content()).not.toContain(bloqueur.displayName);
				expect(await horizontalOverflow(page)).toEqual([]);
				await expectNoA11yViolations(page, ['.cartButton']);
			});

			await test.step('3. Filtres au clavier : seulement les rôles présents', async () => {
				const filters = page.getByRole('group', { name: 'Filtrer par rôle' });
				await expect(filters.getByRole('button')).toHaveText(['Tout', 'Son', 'Production', 'Jeu']);
				const son = filters.getByRole('button', { name: 'Son' });
				await son.focus();
				await page.keyboard.press('Enter');
				await expect(page).toHaveURL(/\?role=son$/);
				await expect(son).toHaveAttribute('aria-pressed', 'true');
				await expect(list.getByRole('listitem')).toHaveCount(3);
				await expect(page.getByText('Nuit blanche')).toHaveCount(0);
				await filters.getByRole('button', { name: 'Jeu' }).click();
				await expect(page).toHaveURL(/\?role=jeu$/);
				await expect(list.getByRole('listitem')).toHaveCount(1);
				await expect(list).toContainText(instrument.name);
				await filters.getByRole('button', { name: 'Tout' }).click();
				await expect(list.getByRole('listitem')).toHaveCount(5);
			});

			await test.step('4. Le détail accessible d’une contribution', async () => {
				const link = list.getByRole('link', { name: /Nuit blanche/ });
				await expect(link).toHaveAttribute('href', `/morceaux/${nuit}`);
				await link.focus();
				await page.keyboard.press('Enter');
				await waitForPath(page, `/morceaux/${nuit}`);
				await waitForAppReady(page);
				await expect(page.getByRole('heading', { level: 1 })).toContainText('Nuit blanche');
			});

			await test.step('5. Espaces ingé son et producteur : « Mes contributions » en tête', async () => {
				await db.personTrack.createMany({
					data: [
						{ personId: me.actorId, track: 'SOUND_ENGINEER' },
						{ personId: me.actorId, track: 'PRODUCER' }
					]
				});
				for (const track of ['SOUND_ENGINEER', 'PRODUCER'] as const) {
					await page.goto('/espace');
					await waitForAppReady(page);
					await Promise.all([
						page.waitForResponse(
							(r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/jouer'
						),
						page.getByLabel('Rôle', { exact: true }).selectOption(track)
					]);
					await expect(page.getByRole('heading', { level: 1 })).toHaveText(TRACKS[track].label);
					const entry = page.getByRole('link', { name: /^Mes contributions/ });
					await expect(entry).toHaveAttribute('href', '/espace/contributions');
				}
				await page.getByRole('link', { name: /^Mes contributions/ }).click();
				await waitForPath(page, '/espace/contributions');
				await waitForAppReady(page);
				// Même écran pour chaque métier.
				await expect(list.getByRole('listitem')).toHaveCount(5);
				await expectNoA11yViolations(page, ['.cartButton']);
			});
		} finally {
			if (eventIds.length > 0) {
				await db.xpTransaction.deleteMany({ where: { sourceEventId: { in: eventIds } } });
				await db.domainEvent.deleteMany({ where: { id: { in: eventIds } } });
			}
			if (meId) await db.collaboration.deleteMany({ where: { proposedById: meId } });
			await deleteMusicians(created);
		}
	});
});
