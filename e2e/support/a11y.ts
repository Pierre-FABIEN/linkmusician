import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/**
 * Scanne la page courante avec axe-core (règles WCAG 2.0/2.1 A+AA) et fait
 * échouer le test si une violation est détectée. Pensé pour être appelé à un
 * point stable de l'UI (après chargement, avant/après une interaction clé),
 * pas à chaque étape d'un test e2e.
 *
 * `exclude` permet d'ignorer des sélecteurs connus hors de notre contrôle
 * (ex. iframe tierce Stripe) — à documenter en commentaire à chaque usage.
 */
export async function expectNoA11yViolations(page: Page, exclude: string[] = []) {
	let builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);

	for (const selector of exclude) {
		builder = builder.exclude(selector);
	}

	// LINKMUSICIAN: attendre la fin des animations finies (fondu d'un toast,
	// transition d'une tuile) : axe mesure sinon une couleur à demi transparente
	// et signale un faux défaut de contraste (`div[data-title]` de svelte-sonner,
	// vu sur base locale, plus rapide). Les animations en boucle sont ignorées ;
	// attente plafonnée à 2 s.
	await page.evaluate(async () => {
		const finite = document
			.getAnimations()
			.filter((a) => a.effect?.getComputedTiming().iterations !== Infinity);
		await Promise.race([
			Promise.all(finite.map((a) => a.finished.catch(() => undefined))),
			new Promise((resolve) => setTimeout(resolve, 2000))
		]);
	});

	const results = await builder.analyze();

	const summary = results.violations.map(
		(violation) =>
			`[${violation.impact}] ${violation.id} — ${violation.help} (${violation.nodes.length} nœud(s))` +
			// LINKMUSICIAN: sélecteurs des éléments fautifs, pour savoir quoi corriger.
			` : ${violation.nodes.map((n) => n.target.join(' ')).join(' | ')}`
	);

	expect(summary, summary.join('\n')).toEqual([]);
}
