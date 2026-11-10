import { describe, expect, it } from 'vitest';
import { ficheBySlug, fichesByMoment, verificationAgeDays } from './catalog';
import { NUDGES, isNudgeId, nudgeFor } from './nudges';
import { isTipId } from '#lib/guide/tips';

describe('démarches au bon moment (09 §3)', () => {
	it('chaque déclencheur mène à des fiches qui existent, avec un identifiant distinct des conseils', () => {
		for (const n of NUDGES) {
			expect(n.fiches.length, n.id).toBeGreaterThan(0);
			for (const slug of n.fiches) expect(ficheBySlug(slug), `${n.id} → ${slug}`).not.toBeNull();
			expect(isTipId(n.id), n.id).toBe(false);
			expect(isNudgeId(n.id)).toBe(true);
		}
		expect(isNudgeId('profil-demo')).toBe(false);
	});

	it('morceau : rien pour une idée ; à plusieurs, le partage d’abord ; seul·e, la preuve de la date', () => {
		expect(nudgeFor('morceau', { composed: false, confirmedCredits: 3 }, [])).toBeNull();
		const many = nudgeFor('morceau', { composed: true, confirmedCredits: 2 }, []);
		expect(many?.links.map((l) => l.href)).toEqual([
			'/demarches/ecrire-a-plusieurs',
			'/demarches/proteger-un-morceau'
		]);
		const withDoc = nudgeFor(
			'morceau',
			{ composed: true, confirmedCredits: 2, documents: { bulletin: '/morceaux/w1/bulletin' } },
			[]
		);
		expect(withDoc?.links[0]).toEqual({
			href: '/morceaux/w1/bulletin',
			label: 'Préparer le bulletin de partage'
		});
		expect(nudgeFor('morceau', { composed: true, confirmedCredits: 1 }, [])?.id).toBe(
			'demarche-morceau-proteger'
		);
	});

	it('une seule à la fois ; « J’ai compris » laisse passer la suivante', () => {
		const ctx = { milestones: ['FORMATION', 'FIRST_RECORDING', 'FIRST_GIG'], hasMinor: true };
		expect(nudgeFor('groupe', ctx, [])?.id).toBe('demarche-groupe-concert');
		expect(nudgeFor('groupe', ctx, ['demarche-groupe-concert'])?.id).toBe(
			'demarche-groupe-mineurs'
		);
		const all = NUDGES.filter((n) => n.screen === 'groupe').map((n) => n.id);
		expect(nudgeFor('groupe', ctx, all)).toBeNull();
	});

	it('groupe tout juste formé : l’association', () => {
		expect(nudgeFor('groupe', { milestones: ['FORMATION'] }, [])?.id).toBe(
			'demarche-groupe-association'
		);
		expect(nudgeFor('groupe', { milestones: [] }, [])).toBeNull();
	});

	it('annonce : seule une session parle d’être payé·e', () => {
		expect(nudgeFor('annonce', { opportunityKind: 'SESSION_WORK' }, [])?.links[0].href).toBe(
			'/demarches/etre-paye-pour-un-concert'
		);
		expect(nudgeFor('annonce', { opportunityKind: 'JAM' }, [])).toBeNull();
		expect(nudgeFor('annonce', { opportunityKind: 'RECRUIT_MEMBER' }, [])).toBeNull();
	});
});

describe('catalogue des démarches', () => {
	it('regroupe les fiches par moment, sans en perdre', () => {
		const groups = fichesByMoment();
		expect(groups.map((g) => g.moment)).toEqual(['creer', 'publier', 'concert', 'groupe']);
		expect(groups.flatMap((g) => g.fiches)).toHaveLength(8);
	});
	it('compte l’âge de la vérification en jours', () => {
		expect(
			verificationAgeDays({ verifiedAt: '2026-01-01' }, new Date('2026-01-11T12:00:00Z'))
		).toBe(10);
	});
});
