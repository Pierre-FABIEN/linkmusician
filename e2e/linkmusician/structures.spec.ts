import { test, expect } from '../support/fixtures';
import { signUpAndVerify } from '../support/admin';
import { createMusician, deleteMusicians, skipOnboarding } from '../support/linkmusician';
import { db, requireUser } from '../support/db';
import { waitForAppReady } from '../support/flows';
import { expectNoA11yViolations } from '../support/a11y';

/** DASH-02a : mes structures, contextes et autorisations relues à chaque action. */
test('structures communes : invitation, révocation, membre et élève sans gestion', async ({
	page,
	account
}, testInfo) => {
	test.setTimeout(6 * 60_000);
	await signUpAndVerify(page, account);
	await skipOnboarding(page, account.email);
	const person = await db.person.findUniqueOrThrow({
		where: { userId: (await requireUser(account.email)).id }
	});
	await db.person.update({
		where: { actorId: person.actorId },
		data: { birthDate: new Date('1990-01-01') }
	});
	await db.personTrack.createMany({
		data: [
			{ personId: person.actorId, track: 'SOUND_ENGINEER' },
			{ personId: person.actorId, track: 'PROMOTER' }
		]
	});
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/structure');
	await waitForAppReady(page);
	const notice = page.getByRole('button', { name: 'Compris', exact: true });
	if (await notice.isVisible()) await notice.click();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mes structures');
	await expect(page.getByText('Aucune structure pour l’instant')).toBeVisible();
	await expect(page.getByRole('link', { name: /^Ouvrir un studio/ })).toBeVisible();
	await expect(page.getByRole('link', { name: /agence|label|bientôt/i })).toHaveCount(0);
	const peer = await createMusician({
		name: 'Eleveconfidentiel',
		commune: { code: '31555', nom: 'Toulouse', dep: '31', lat: 43.6, lng: 1.43 }
	});
	await db.personTrack.create({ data: { personId: peer.actorId, track: 'PROMOTER' } });
	const orgs: {
		id: string;
		handle: string;
		displayName: string;
		kind: string;
		membershipId: string;
	}[] = [];
	try {
		for (const kind of ['BAND', 'STUDIO', 'VENUE', 'PROMOTER', 'SCHOOL'] as const) {
			const org = await db.actor.create({
				data: {
					kind: 'ORGANIZATION',
					handle: `structure-${person.actorId}-${kind.toLowerCase()}`,
					displayName: `E2E ${kind}`,
					organization: {
						create: {
							kind,
							...(kind === 'STUDIO' ? { studio: { create: {} } } : {}),
							...(kind === 'PROMOTER' ? { promoter: { create: {} } } : {}),
							...(kind === 'SCHOOL' ? { school: { create: { kind: 'MUSIC_SCHOOL' } } } : {})
						}
					}
				}
			});
			const membership = await db.membership.create({
				data: { orgId: org.id, personId: person.actorId, role: 'OWNER', status: 'ACTIVE' }
			});
			orgs.push({ ...org, kind, membershipId: membership.id });
		}
		const studio = orgs.find((o) => o.kind === 'STUDIO')!;
		const school = orgs.find((o) => o.kind === 'SCHOOL')!;
		const promoter = orgs.find((o) => o.kind === 'PROMOTER')!;
		await db.membership.create({
			data: { orgId: school.id, personId: peer.actorId, role: 'MEMBER', status: 'ACTIVE' }
		});
		await test.step('les cinq types appartiennent au compte, sans liste de collègues', async () => {
			await page.reload();
			const list = page.getByRole('navigation', { name: 'Mes participations' });
			await expect(list.getByRole('link')).toHaveCount(5);
			await expect(page.getByText(peer.displayName)).toHaveCount(0);
			await list.getByRole('link', { name: /^E2E STUDIO/ }).focus();
			await page.keyboard.press('Enter');
			await expect(page.getByRole('heading', { level: 1 })).toHaveText('E2E STUDIO');
			await waitForAppReady(page);
			await expect(page.getByText('Responsable', { exact: true })).toBeVisible();
			await expect(page.getByRole('link', { name: /^Ouvrir les outils/ })).toHaveAttribute(
				'href',
				`/studios/${studio.handle}`
			);
			await expectNoA11yViolations(page, ['.cartButton']);
		});
		await test.step('changer de métier conserve la structure et les filtres', async () => {
			await page.goto(`/structure/${studio.id}?onglet=fiche#outils`);
			await waitForAppReady(page);
			await Promise.all([
				page.waitForResponse(
					(r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/jouer'
				),
				page.getByLabel('Rôle', { exact: true }).selectOption('SOUND_ENGINEER')
			]);
			await expect(page.getByLabel('Rôle', { exact: true })).toHaveValue('SOUND_ENGINEER');
			await expect(page).toHaveURL(new RegExp(`/structure/${studio.id}\\?onglet=fiche#outils$`));
			await expect(page.getByRole('heading', { level: 1 })).toHaveText('E2E STUDIO');
			await waitForAppReady(page);
			await expect(page.getByText('Responsable', { exact: true })).toBeVisible();
		});
		await test.step('un membre ou un élève ne gère pas ; le métier ne change pas ces droits', async () => {
			for (const org of [studio, school]) {
				await db.membership.update({ where: { id: org.membershipId }, data: { role: 'MEMBER' } });
				await page.goto(`/structure/${org.id}`);
				await expect(
					page.getByText('Cette participation ne donne pas accès à sa gestion.', { exact: false })
				).toBeVisible();
				await expect(page.getByRole('link', { name: /^Ouvrir les outils/ })).toHaveCount(0);
			}
			await expect(page.getByText('Élève', { exact: true })).toBeVisible();
			await db.person.update({
				where: { actorId: person.actorId },
				data: { birthDate: new Date(`${new Date().getFullYear() - 17}-01-01`) }
			});
			await page.getByRole('link', { name: /^Ouvrir mon espace de membre/ }).click();
			await expect(page).toHaveURL(`/ecoles/${school.handle}`);
			await expect(page.getByText(peer.displayName)).toHaveCount(0);
			await page.goto('/structure');
			await expect(page.getByRole('link', { name: /^Ouvrir une école/ })).toHaveCount(0);
			await db.person.update({
				where: { actorId: person.actorId },
				data: { birthDate: new Date('1990-01-01') }
			});
			await expect(page.getByText(peer.displayName)).toHaveCount(0);
			const post = async (path: string, form: Record<string, string>) =>
				page.request.post(path, {
					form,
					headers: { origin: new URL(page.url()).origin },
					maxRedirects: 0
				});
			expect((await post(`/studios/${studio.handle}?/unpublish`, {})).status()).toBe(404);
			expect((await post(`/ecoles/${school.handle}?/invite`, { uses: '5' })).status()).toBe(403);
			await db.membership.update({ where: { id: studio.membershipId }, data: { role: 'ADMIN' } });
			expect((await post(`/studios/${studio.handle}?/unpublish`, {})).status()).toBe(200);
			await db.membership.update({
				where: { id: studio.membershipId },
				data: { status: 'REMOVED' }
			});
			expect((await post(`/studios/${studio.handle}?/unpublish`, {})).status()).toBe(404);
			expect((await page.request.get(`/structure/${studio.id}`)).status()).toBe(404);
		});
		await test.step('invitation acceptée et retrait effectif', async () => {
			await db.membership.update({
				where: { id: promoter.membershipId },
				data: { status: 'INVITED', role: 'ADMIN', invitedById: peer.actorId }
			});
			await db.membership.create({
				data: { orgId: promoter.id, personId: peer.actorId, role: 'OWNER', status: 'ACTIVE' }
			});
			await page.goto(`/structure/${promoter.id}`);
			await expect(page.getByText('Invitation à accepter', { exact: true })).toBeVisible();
			const history = page.getByRole('region', { name: 'Mon invitation' });
			await expect(history.getByText('Invitation à la structure', { exact: true })).toBeVisible();
			await expect(history.getByText(peer.displayName, { exact: true })).toBeVisible();
			await expect(page.getByRole('link', { name: /^Ouvrir les outils/ })).toHaveCount(0);
			await page.getByRole('link', { name: /^Voir ma participation/ }).click();
			await expect(page).toHaveURL(/\/organisations$/);
			await waitForAppReady(page);
			await page.getByRole('button', { name: 'Accepter', exact: true }).click();
			await expect(
				page.getByText('C’est fait : tu fais partie de la gestion.').first()
			).toBeVisible();
			await page.goto(`/structure/${promoter.id}`);
			await expect(page.getByText('Co-gestion', { exact: true })).toBeVisible();
			await expect(history.locator('li')).toHaveCount(1);
			await db.membership.update({
				where: { id: promoter.membershipId },
				data: { status: 'REMOVED' }
			});
			expect((await page.request.get(`/structure/${promoter.id}`)).status()).toBe(404);
		});
		await test.step('une structure étrangère et une structure dissoute restent inaccessibles', async () => {
			expect((await page.request.get(`/structure/${peer.actorId}`)).status()).toBe(404);
			const band = orgs.find((o) => o.kind === 'BAND')!;
			await db.organization.update({
				where: { actorId: band.id },
				data: { dissolvedAt: new Date() }
			});
			expect((await page.request.get(`/structure/${band.id}`)).status()).toBe(404);
			await page.goto('/structure');
			await expect(
				page.getByRole('navigation', { name: 'Mes participations' }).getByRole('link')
			).toHaveCount(2);
			await waitForAppReady(page);
			await expectNoA11yViolations(page, ['.cartButton']);
			expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
				true
			);
			await testInfo.attach('structures-mobile', {
				body: await page.screenshot(),
				contentType: 'image/png'
			});
			const primary = await db.personTrack.findFirstOrThrow({
				where: { personId: person.actorId, isPrimary: true }
			});
			expect(primary.track).toBe('MUSICIAN');
		});
	} finally {
		await db.actor.deleteMany({ where: { id: { in: orgs.map((o) => o.id) } } });
		await deleteMusicians([peer]);
	}
});
