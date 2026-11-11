import { describe, expect, it } from 'vitest';
import { FICHES } from './catalog';
import {
	DEMARCHE_TRIGGERS,
	demarcheFor,
	dismissKey,
	isTriggerId,
	type DemarcheContext
} from './triggers';

const groupe = (over: Partial<Extract<DemarcheContext, { screen: 'groupe' }>> = {}) =>
	({ screen: 'groupe', formed: true, milestones: [], hasMinor: false, ...over }) as const;

describe('déclencheurs des démarches (09 §3)', () => {
	it('chaque déclencheur relie des fiches du catalogue, sans doublon d’identifiant', () => {
		const slugs = new Set(FICHES.map((f) => f.slug));
		for (const t of DEMARCHE_TRIGGERS) for (const s of t.fiches) expect(slugs.has(s)).toBe(true);
		const ids = DEMARCHE_TRIGGERS.map((t) => t.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('morceau : rien tant que c’est une idée', () => {
		expect(demarcheFor({ screen: 'morceau', composed: false, confirmedCredits: 3 }, [])).toBeNull();
	});

	it('morceau composé seul·e : protéger le morceau', () => {
		const n = demarcheFor({ screen: 'morceau', composed: true, confirmedCredits: 1 }, []);
		expect(n?.id).toBe('morceau-proteger');
		expect(n?.links.map((l) => l.href)).toEqual(['/demarches/proteger-un-morceau']);
	});

	it('morceau composé à plusieurs : écrire qui a fait quoi, puis protéger', () => {
		const ctx = { screen: 'morceau', composed: true, confirmedCredits: 2 } as const;
		const n = demarcheFor(ctx, []);
		expect(n?.id).toBe('morceau-a-plusieurs');
		expect(n?.links.map((l) => l.href)).toEqual([
			'/demarches/ecrire-a-plusieurs',
			'/demarches/proteger-un-morceau'
		]);
		// Une seule à la fois : masquée, la suivante prend la place.
		expect(demarcheFor(ctx, [dismissKey('morceau-a-plusieurs')])?.id).toBe('morceau-proteger');
		expect(
			demarcheFor(ctx, [dismissKey('morceau-a-plusieurs'), dismissKey('morceau-proteger')])
		).toBeNull();
	});

	it('groupe en formation : rien', () => {
		expect(demarcheFor(groupe({ formed: false }), [])).toBeNull();
	});

	it('groupe : l’étape la plus avancée d’abord, l’association en dernier', () => {
		expect(demarcheFor(groupe(), [])?.id).toBe('groupe-association');
		expect(demarcheFor(groupe({ milestones: ['FIRST_PUBLIC_DEMO'] }), [])?.id).toBe(
			'groupe-premiere-demo'
		);
		expect(demarcheFor(groupe({ milestones: ['FIRST_PUBLIC_DEMO', 'FIRST_GIG'] }), [])?.id).toBe(
			'groupe-premier-concert'
		);
	});

	it('groupe avec un·e mineur·e : la fiche des mineur·es passe devant', () => {
		const n = demarcheFor(groupe({ hasMinor: true, milestones: ['FIRST_GIG'] }), []);
		expect(n?.id).toBe('groupe-mineurs');
	});

	it('annonce : seulement une session', () => {
		expect(demarcheFor({ screen: 'annonce', kind: 'SESSION_WORK' }, [])?.id).toBe(
			'annonce-session'
		);
		expect(demarcheFor({ screen: 'annonce', kind: 'JAM' }, [])).toBeNull();
		expect(demarcheFor({ screen: 'annonce', kind: 'RECRUIT_MEMBER' }, [])).toBeNull();
		// Plateau (P5-05a) : la date et le cachet.
		expect(demarcheFor({ screen: 'annonce', kind: 'GIG_SLOT' }, [])?.id).toBe('annonce-plateau');
	});

	it('un conseil de P2-17 masqué ne masque pas une démarche (préfixe)', () => {
		expect(demarcheFor(groupe(), ['groupe-association'])?.id).toBe('groupe-association');
	});

	it('isTriggerId : seulement les identifiants du catalogue', () => {
		expect(isTriggerId('groupe-association')).toBe(true);
		expect(isTriggerId('demarche:groupe-association')).toBe(false);
		expect(isTriggerId(42)).toBe(false);
	});

	it('document prérempli en premier quand l’écran en donne l’adresse (P3-15b)', () => {
		const n = demarcheFor(
			{
				screen: 'morceau',
				composed: true,
				confirmedCredits: 2,
				documentHref: '/morceaux/w1/bulletin'
			},
			[]
		);
		expect(n?.links[0]).toEqual({
			href: '/morceaux/w1/bulletin',
			label: 'Télécharger le bulletin de partage',
			download: true
		});
		// Composé seul·e : pas de bulletin proposé dans la phrase.
		const solo = demarcheFor(
			{
				screen: 'morceau',
				composed: true,
				confirmedCredits: 1,
				documentHref: '/morceaux/w1/bulletin'
			},
			[]
		);
		expect(solo?.links.some((l) => l.download)).toBe(false);
		const gig = demarcheFor(
			groupe({ milestones: ['FIRST_GIG'], documentHref: '/groupes/g/programme' }),
			[]
		);
		expect(gig?.links[0]?.href).toBe('/groupes/g/programme');
		expect(
			demarcheFor(groupe({ milestones: ['FIRST_GIG'] }), [])?.links.some((l) => l.download)
		).toBe(false);
	});
});
