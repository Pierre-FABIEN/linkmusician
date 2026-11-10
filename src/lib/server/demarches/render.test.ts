/**
 * Contenu du guide des démarches (P3-15a, 09 §5) : chaque fiche du catalogue
 * existe, cite des sources officielles, a un « en bref » et une date de
 * vérification de moins d'un an.
 */
import { describe, expect, it } from 'vitest';
import {
	FICHES,
	MAX_AGE_DAYS,
	isOfficialSource,
	parseFiche,
	verificationAgeDays
} from '#lib/demarches/catalog';
import { orphanFiles, rawFiche, renderedFiche } from './render';

describe('fiches des démarches', () => {
	it('chaque fichier du dossier est au catalogue', () => {
		expect(orphanFiles()).toEqual([]);
	});

	for (const entry of FICHES) {
		describe(entry.slug, () => {
			const raw = rawFiche(entry.file);

			it('existe et a un titre, une accroche et des sections', () => {
				expect(raw).not.toBeNull();
				const fiche = renderedFiche(entry)!;
				expect(fiche.title.length).toBeGreaterThan(3);
				expect(fiche.lead).toBeTruthy();
				expect(fiche.toc.length).toBeGreaterThanOrEqual(2);
			});

			it('a un « en bref » d’au plus trois lignes', () => {
				const html = renderedFiche(entry)!.html;
				const brief = /<aside class="aide-callout aide-brief"[^>]*>([\s\S]*?)<\/aside>/.exec(html);
				expect(brief).not.toBeNull();
				const items = brief![1].match(/<li>/g) ?? [];
				expect(items.length).toBeGreaterThanOrEqual(1);
				expect(items.length).toBeLessThanOrEqual(3);
			});

			it('cite au moins une source, toutes officielles', () => {
				const { meta } = parseFiche(raw!);
				expect(meta.sources.length).toBeGreaterThanOrEqual(1);
				for (const source of meta.sources) {
					expect(source.label.length, source.url).toBeGreaterThan(3);
					expect(isOfficialSource(source.url), source.url).toBe(true);
				}
			});

			it('a été vérifiée il y a moins d’un an', () => {
				const { meta } = parseFiche(raw!);
				const age = verificationAgeDays(meta.verifiedOn);
				expect(age, `date illisible : « ${meta.verifiedOn} »`).not.toBeNull();
				expect(age!).toBeGreaterThanOrEqual(0);
				expect(age!).toBeLessThanOrEqual(MAX_AGE_DAYS);
			});

			it('ne relie que des fiches et des pages d’aide qui existent', () => {
				const html = renderedFiche(entry)!.html;
				const links = [...html.matchAll(/href="(\/[^"#]*)/g)].map((m) => m[1]);
				for (const href of links) {
					const demarche = /^\/demarches\/([\w-]+)$/.exec(href);
					if (demarche)
						expect(
							FICHES.map((f) => f.slug),
							href
						).toContain(demarche[1]);
					else expect(href, href).toMatch(/^\/aide(\/[\w-]+)?$/);
				}
			});
		});
	}
});

describe('parseFiche', () => {
	it('lit la date, la relecture et les sources', () => {
		const { meta, body } = parseFiche(
			'---\nverifie: 2026-11-10\nrelue: oui\nsources:\n  - INPI, e-Soleau | https://www.inpi.fr/x\n  - Sacem | https://www.sacem.fr\n---\n\n# Titre\n'
		);
		expect(meta).toEqual({
			verifiedOn: '2026-11-10',
			reviewed: true,
			sources: [
				{ label: 'INPI, e-Soleau', url: 'https://www.inpi.fr/x' },
				{ label: 'Sacem', url: 'https://www.sacem.fr' }
			]
		});
		expect(body.trim()).toBe('# Titre');
	});

	it('sans en-tête : rien de vérifié, pas relue', () => {
		expect(parseFiche('# Titre').meta).toEqual({ verifiedOn: '', sources: [], reviewed: false });
	});
});

describe('isOfficialSource', () => {
	it('accepte les organismes et leurs sous-domaines, en https seulement', () => {
		expect(isOfficialSource('https://normandie.dreets.gouv.fr/page')).toBe(true);
		expect(isOfficialSource('https://www.service-public.fr/x')).toBe(true);
		expect(isOfficialSource('http://www.inpi.fr/x')).toBe(false);
		expect(isOfficialSource('https://www.legalstart.fr/x')).toBe(false);
		expect(isOfficialSource('https://inpi.fr.example.com/x')).toBe(false);
		expect(isOfficialSource('pas une adresse')).toBe(false);
	});
});

describe('verificationAgeDays', () => {
	it('compte les jours, refuse une date illisible', () => {
		const now = new Date('2027-11-10T10:00:00Z');
		expect(verificationAgeDays('2026-11-10', now)).toBe(365);
		expect(verificationAgeDays('10/11/2026', now)).toBeNull();
	});
});
