import type { Page } from '@playwright/test';
import { db, requireUser } from './db';
import { waitForAppReady, waitForPath } from './flows';

/**
 * LINKMUSICIAN: raccourci pour les specs qui ne testent pas l'onboarding
 * (P1-10) : choisit le métier musicien, puis marque l'onboarding terminé en
 * base. Le parcours complet est couvert par `onboarding.spec.ts`.
 */
export async function skipOnboarding(page: Page, email: string) {
	await page.goto('/qui-es-tu');
	await waitForAppReady(page);
	await page.getByLabel('Musicien·ne').check();
	await page.getByRole('button', { name: 'Continuer' }).click();
	await waitForPath(page, '/demarrer/instruments');
	const user = await requireUser(email);
	await db.person.update({ where: { userId: user.id }, data: { onboardedAt: new Date() } });
}
