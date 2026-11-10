import { describe, expect, it } from 'vitest';
import { FICHES, MAX_AGE_DAYS, ficheBySlug, verificationAgeDays } from '#lib/demarches/catalog';
import { ficheFiles, renderedFiche } from './render';

describe('guide des démarches : les fiches (D42)', () => {
	const rendered = FICHES.map((fiche) => ({ fiche, html: renderedFiche(fiche.file) }));

	it('les huit fiches du lancement, chacune avec son fichier, et aucun fichier orphelin', () => {
		expect(FICHES).toHaveLength(8);
		for (const { fiche, html } of rendered) expect(html, fiche.file).not.toBeNull();
		expect(ficheFiles().sort()).toEqual(FICHES.map((f) => f.file).sort());
	});

	it('chaque fiche a un titre, une accroche et un « En bref »', () => {
		for (const { fiche, html } of rendered) {
			expect(html!.title, fiche.file).toBe(fiche.title);
			expect(html!.lead, fiche.file).toBeTruthy();
			expect(html!.html, fiche.file).toContain('aide-brief');
		}
	});

	it('chaque fiche dit ce que ça coûte', () => {
		for (const { fiche, html } of rendered) {
			expect(
				html!.toc.map((t) => t.text),
				fiche.file
			).toContain('Ce que ça coûte');
		}
	});

	it('chaque fiche a des sources, dont au moins une officielle, en https', () => {
		const official =
			/(\.gouv\.fr|service-public\.fr|legifrance|inpi\.fr|sacem\.fr|guso\.fr|cnm\.fr|senat\.fr|justice\.fr)/;
		for (const fiche of FICHES) {
			expect(fiche.sources.length, fiche.slug).toBeGreaterThan(0);
			for (const s of fiche.sources) expect(s.url, fiche.slug).toMatch(/^https:\/\//);
			expect(
				fiche.sources.some((s) => official.test(s.url)),
				fiche.slug
			).toBe(true);
		}
	});

	it('chaque fiche a été vérifiée il y a moins d’un an', () => {
		for (const fiche of FICHES) {
			expect(fiche.verifiedAt, fiche.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			const age = verificationAgeDays(fiche);
			expect(age, `${fiche.slug} vérifiée il y a ${age} jours`).toBeLessThanOrEqual(MAX_AGE_DAYS);
			expect(age, fiche.slug).toBeGreaterThanOrEqual(0);
		}
	});

	it('les liens entre fiches mènent à une fiche qui existe', () => {
		for (const { fiche, html } of rendered) {
			for (const [, slug] of html!.html.matchAll(/href="\/demarches\/([^"#]+)/g)) {
				expect(ficheBySlug(slug), `${fiche.file} → ${slug}`).not.toBeNull();
			}
		}
	});

	it('aucun logo, ni « officiel », ni partenariat (D42)', () => {
		for (const { fiche, html } of rendered) {
			expect(html!.html, fiche.file).not.toMatch(/<img|partenaire|(?<!journal )officiel/i);
		}
	});
});
