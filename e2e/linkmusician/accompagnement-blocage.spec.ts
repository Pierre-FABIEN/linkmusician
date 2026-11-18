import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { db, requireUser } from '../support/db';
import { waitForAppReady, waitForPath } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';
import { createMusician, deleteMusicians, skipOnboarding } from '../support/linkmusician';

/**
 * #85 — Accompagnement et blocage : une proposition d'une personne bloquée
 * (dans un sens ou dans l'autre) ne laisse ni son nom, ni son pseudo, ni son
 * message, ni dans la page, ni dans le HTML initial, ni dans les données de
 * chargement ; « À traiter » ne la compte pas. Au déblocage, elle revient.
 */
test.describe('LinkMusician — accompagnement et blocage (#85)', () => {
	test.setTimeout(4 * 60_000);
	const toulouse = { code: '31555', nom: 'Toulouse', dep: '31', lat: 43.6007, lng: 1.4328 };
	const A11Y_EXCLUDE = ['.cartButton'];

	test('proposition masquée dans les deux sens, puis rendue', async ({ page, account }) => {
		const agent = await createMusician({ name: 'Agentsecret', commune: toulouse });
		const secret = `Message privé ${Math.random().toString(36).slice(2, 8)}`;
		try {
			await signUpAndVerify(page, account);
			await skipOnboarding(page, account.email);
			const me = await db.person.update({
				where: { userId: (await requireUser(account.email)).id },
				data: { birthDate: new Date('1990-04-04T00:00:00Z') }
			});
			await db.personTrack.create({ data: { personId: agent.actorId, track: 'MANAGER' } });
			await db.representation.create({
				data: {
					agentId: agent.actorId,
					artistId: me.actorId,
					kind: 'MANAGER',
					message: secret,
					allowedActions: ['CAREER_SUPPORT']
				}
			});
			const forbidden = [agent.handle, agent.displayName, secret];
			/** HTML initial et données de chargement : aucune trace de l'agent. */
			const expectNoTrace = async () => {
				for (const path of ['/accompagnement', '/accompagnement/__data.json']) {
					const body = await (await page.request.get(path)).text();
					for (const s of forbidden) expect(body, `${path} contient « ${s} »`).not.toContain(s);
				}
			};
			const expectHidden = async () => {
				await page.goto('/espace/a-confirmer');
				await waitForAppReady(page);
				await expect(page.getByRole('link', { name: /proposition d’accompagnement/ })).toHaveCount(
					0
				);
				await page.goto('/accompagnement');
				await waitForAppReady(page);
				await expect(page.getByRole('heading', { name: 'Propositions à trancher' })).toHaveCount(0);
				await expect(page.getByText('Aucun accompagnement pour l’instant.')).toBeVisible();
				await expectNoTrace();
			};
			const expectVisible = async () => {
				await page.goto('/espace/a-confirmer');
				await waitForAppReady(page);
				const link = page.getByRole('link', { name: /1 proposition d’accompagnement/ });
				await expect(link).toBeVisible();
				await link.focus();
				await page.keyboard.press('Enter');
				await waitForPath(page, '/accompagnement');
				await waitForAppReady(page);
				await expect(page.getByRole('heading', { name: 'Propositions à trancher' })).toBeVisible();
				await expect(page.getByRole('link', { name: agent.displayName })).toHaveAttribute(
					'href',
					`/@${agent.handle}`
				);
				await expect(page.getByText(secret)).toBeVisible();
			};

			await test.step('1. Sans blocage : depuis « À traiter », la proposition et son message', async () => {
				await expectVisible();
			});

			for (const [label, blockerActorId, blockedActorId] of [
				['Je bloque l’agent', me.actorId, agent.actorId],
				['L’agent me bloque', agent.actorId, me.actorId]
			] as const) {
				await test.step(`2. ${label} : rien de lui, nulle part`, async () => {
					await db.block.create({ data: { blockerActorId, blockedActorId } });
					await expectHidden();
					// État vide accessible.
					await expectNoA11yViolations(page, A11Y_EXCLUDE);
				});
				await test.step(`3. ${label}, puis débloque : la proposition revient`, async () => {
					await db.block.deleteMany({ where: { blockerActorId, blockedActorId } });
					await expectVisible();
				});
			}
			// La proposition existe toujours : le blocage change sa visibilité, pas son existence.
			expect(
				await db.representation.count({ where: { agentId: agent.actorId, status: 'PROPOSED' } })
			).toBe(1);
		} finally {
			await db.block.deleteMany({
				where: { OR: [{ blockerActorId: agent.actorId }, { blockedActorId: agent.actorId }] }
			});
			await deleteMusicians([agent]);
		}
	});
});
