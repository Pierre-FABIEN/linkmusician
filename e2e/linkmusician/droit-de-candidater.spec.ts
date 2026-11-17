import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { makeAccount } from '../support/account';
import { db, requireUser, deleteUser } from '../support/db';
import { skipOnboarding } from '../support/linkmusician';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';

/**
 * DASH-07a (D71) — Droit de candidater : la manager le demande depuis son
 * accompagnement, l'artiste l'accorde sur un mobile au clavier, puis le
 * révoque. Le mandat seul n'ouvre rien ; un tiers qui forge un POST est
 * refusé ; l'agent ne s'accorde pas le droit lui-même.
 */
test('droit de candidater : demande, accord au clavier, POST forgé, révocation', async ({
	page,
	account,
	browser
}) => {
	test.setTimeout(6 * 60_000);
	const artistAccount = makeAccount(),
		outsiderAccount = makeAccount();
	const artistContext = await browser.newContext(),
		outsiderContext = await browser.newContext();
	const artistPage = await artistContext.newPage(),
		outsiderPage = await outsiderContext.newPage();
	let parentId = '';
	try {
		for (const [p, a] of [
			[page, account],
			[artistPage, artistAccount],
			[outsiderPage, outsiderAccount]
		] as const) {
			await signUpAndVerify(p, a);
			await skipOnboarding(p, a.email);
			await db.person.update({
				where: { userId: (await requireUser(a.email)).id },
				data: { birthDate: new Date('1990-01-01') }
			});
		}
		const person = async (email: string) =>
			db.person.findUniqueOrThrow({
				where: { userId: (await requireUser(email)).id },
				include: { actor: true }
			});
		const agent = await person(account.email),
			artist = await person(artistAccount.email);
		await db.personTrack.create({ data: { personId: agent.actorId, track: 'MANAGER' } });
		parentId = (
			await db.representation.create({
				data: {
					agentId: agent.actorId,
					artistId: artist.actorId,
					kind: 'MANAGER',
					status: 'CONFIRMED',
					confirmedById: artist.actorId,
					confirmedAt: new Date(),
					allowedActions: ['CAREER_SUPPORT']
				}
			})
		).id;
		const path = `/accompagnement/${parentId}/candidatures`;

		await test.step('La manager demande le droit depuis son accompagnement', async () => {
			await page.goto('/accompagnement');
			await waitForAppReady(page);
			await page.getByRole('link', { name: 'Droit de candidater →' }).click();
			await expect(page).toHaveURL(new RegExp(`${path}$`));
			await expect(page.getByText(/L’accompagnement seul ne le permet pas/)).toBeVisible();
			// Un groupe se recrute soi-même : jamais proposé.
			await expect(page.getByRole('checkbox', { name: 'Plateaux' })).toHaveCount(0);
			await page.getByRole('checkbox', { name: 'Jams' }).uncheck();
			await page.getByRole('button', { name: 'Envoyer la demande' }).click();
			await expect(page.getByText(/Demande envoyée/)).toBeVisible();
			await expect(page.getByRole('heading', { name: 'Demande en attente' })).toBeVisible();
			await expect(page.getByText('Sessions et prestations', { exact: true })).toBeVisible();
		});

		await test.step('Personne d’autre n’accorde : agent et tiers refusés', async () => {
			const grant = await db.applicationGrant.findFirstOrThrow({
				where: { representationId: parentId }
			});
			const self = await page.request.post(path + '?/answer', {
				form: { grantId: grant.id, accept: '1' },
				headers: { Origin: new URL(page.url()).origin }
			});
			expect(self.status()).toBe(403);
			await outsiderPage.goto('/accompagnement');
			const origin = new URL(outsiderPage.url()).origin;
			expect((await outsiderPage.request.get(path)).status()).toBe(404);
			const forged = await outsiderPage.request.post(path + '?/answer', {
				form: { grantId: grant.id, accept: '1' },
				headers: { Origin: origin }
			});
			expect(forged.status()).toBe(403);
			expect(
				(await db.applicationGrant.findUniqueOrThrow({ where: { id: grant.id } })).grantedAt
			).toBeNull();
		});

		await test.step('L’artiste accorde au clavier, sur mobile, sans défaut d’accessibilité', async () => {
			await artistPage.setViewportSize({ width: 390, height: 844 });
			await artistPage.goto(path);
			await waitForAppReady(artistPage);
			const notice = artistPage.getByRole('button', { name: 'Compris', exact: true });
			if (await notice.isVisible()) await notice.click();
			await expectNoA11yViolations(artistPage, ['.cartButton']);
			expect(
				await artistPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
			).toBe(true);
			const accept = artistPage.getByRole('button', { name: 'Accorder ce droit' });
			await accept.focus();
			await expect(accept).toBeFocused();
			await artistPage.keyboard.press('Enter');
			await expect(artistPage.getByText('Droit accordé.', { exact: true })).toBeVisible();
			await expect(artistPage.getByRole('heading', { name: 'Droit accordé' })).toBeVisible();
			await artistPage.getByText('Historique du droit').click();
			await expect(artistPage.getByText('Droit demandé', { exact: true })).toBeVisible();
			const notified = await db.notification.count({
				where: { recipientActorId: agent.actorId, type: 'APPLICATION_GRANT' }
			});
			expect(notified).toBe(1);
		});

		await test.step('L’artiste révoque : le droit est terminé, l’acte conservé', async () => {
			await artistPage.getByRole('button', { name: 'Révoquer le droit' }).click();
			await expect(artistPage.getByText(/le droit est terminé/)).toBeVisible();
			const acts = await db.applicationGrantAct.findMany({
				where: { grant: { representationId: parentId } },
				orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
				select: { kind: true, byId: true }
			});
			expect(acts).toEqual([
				{ kind: 'REQUESTED', byId: agent.actorId },
				{ kind: 'GRANTED', byId: artist.actorId },
				{ kind: 'REVOKED', byId: artist.actorId }
			]);
			await page.reload();
			await waitForAppReady(page);
			await expect(page.getByRole('button', { name: 'Envoyer la demande' })).toBeVisible();
		});
	} finally {
		await artistContext.close();
		await outsiderContext.close();
		if (parentId) await db.representation.deleteMany({ where: { id: parentId } });
		await deleteUser(artistAccount.email).catch(() => {});
		await deleteUser(outsiderAccount.email).catch(() => {});
	}
});
