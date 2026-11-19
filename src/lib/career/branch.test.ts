import { describe, expect, it } from 'vitest';
import { branchDetail, collaborationBranch, MAX_POSSIBLE, proofLabel } from './branch';
import { careerMap, NO_REACH, type CareerFacts, type ReachFacts } from './map';
import { realisationKey, type Realisation, type RealisationObject } from './realisations';

const none: CareerFacts = {
	jamAppreciations: 0,
	collaborations: 0,
	worksTogether: 0,
	worksSolo: 0,
	recordings: 0,
	productions: 0,
	verifiedGigs: 0,
	tours: 0
};

function real(
	kind: Realisation['kind'],
	object: RealisationObject,
	over: Partial<Realisation> = {}
): Realisation {
	return {
		key: realisationKey(kind, object),
		kind,
		branch: 'CREATION',
		bearerId: 'me',
		object,
		roles: ['CREDITED'],
		occurredAt: new Date('2026-10-01T12:00:00Z'),
		proof: 'CORROBORATED',
		status: 'ACTIVE',
		visibility: 'PUBLIC',
		firstTime: false,
		...over
	};
}
const titles = { works: { w1: 'Ensemble', w2: 'Seule' }, bands: { b1: 'Les Rats' } };
const detail = (
	branch: Parameters<typeof branchDetail>[0],
	facts: Partial<CareerFacts> = {},
	reach: Partial<ReachFacts> = {},
	list: Realisation[] = []
) => {
	const r = { ...NO_REACH, ...reach };
	return branchDetail(branch, careerMap({ ...none, ...facts }, null, r), r, list, titles);
};

describe('page d’une branche (N2, conception 21 §10.3)', () => {
	it('sans fait ni déclencheur : la porte d’entrée de l’épreuve ouverte, rien en cours ni réalisé', () => {
		const d = detail('EQUIPE');
		expect(d.possible).toEqual([
			{
				label: 'Trouver une jam dans Rencontre',
				href: '/jam',
				reason: expect.stringContaining('La rencontre')
			}
		]);
		expect(d.inProgress).toEqual([]);
		expect(d.done).toEqual([]);
	});

	it('Q-NL-3 : la porte de « La rencontre » mène à Rencontre, pas à un agenda dans Collab', () => {
		const rencontre = careerMap(none).acts[0];
		expect(rencontre.cta?.href).toBe('/jam');
		expect(rencontre.cta?.href).not.toMatch(/agenda/);
	});

	it('au plus deux gestes, le geste à portée en premier', () => {
		const d = detail(
			'PRODUCTION',
			{},
			{
				declaredRecordings: [{ bandHandle: 'les-rats', bandName: 'Les Rats', manager: true }],
				toConfirm: [
					{
						id: 'c1',
						kind: 'PRODUCTION',
						title: 'Prod',
						happenedOn: '2026-11-01',
						asProvider: false,
						bandSide: false,
						verifiedHostName: null,
						hasWork: true
					}
				]
			}
		);
		expect(d.possible).toHaveLength(MAX_POSSIBLE);
		expect(d.possible[0].label).toBe('Demander une confirmation');
		expect(d.possible[1].label).toBe('Confirmer la production');
	});

	it('N3 : une collaboration proposée dans « Possible maintenant » n’est pas répétée dans « En cours »', () => {
		const toConfirm = [
			{
				id: 'c1',
				kind: 'OTHER',
				title: 'Session du jeudi',
				happenedOn: '2026-11-08',
				asProvider: false,
				bandSide: false,
				verifiedHostName: null,
				hasWork: false
			},
			{
				id: 'c2',
				kind: 'OTHER',
				title: 'Session du vendredi',
				happenedOn: '2026-11-09',
				asProvider: false,
				bandSide: false,
				verifiedHostName: null,
				hasWork: false
			}
		];
		const d = detail('EQUIPE', {}, { toConfirm });
		expect(d.possible[0].reason).toMatch(/Session du jeudi/);
		// L'information reste : la première dans le geste, la seconde dans « En cours ».
		expect(d.inProgress.map((i) => i.text)).toEqual([
			'« Session du vendredi » (09/11/2026) : à confirmer de ton côté.'
		]);
	});

	it('une épreuve franchie ne propose plus son geste', () => {
		expect(detail('SCENE', { verifiedGigs: 1 }).possible).toEqual([]);
	});

	it('distingue une réalisation confirmée d’une simple déclaration', () => {
		const d = detail('CREATION', {}, {}, [
			real('WORK_COMPOSED', { type: 'WORK', id: 'w1' }),
			real('WORK_COMPOSED', { type: 'WORK', id: 'w2' }, { proof: 'DECLARED' })
		]);
		expect(d.done.map((x) => [x.label, x.proof, x.confirmed])).toEqual([
			['Morceau composé « Ensemble »', 'Confirmé par d’autres', true],
			['Morceau composé « Seule »', 'Simple déclaration', false]
		]);
	});

	it('une réalisation gelée est « en cours » (modération), une retirée est barrée et ne compte plus', () => {
		const d = detail('CREATION', {}, {}, [
			real('WORK_COMPOSED', { type: 'WORK', id: 'w1' }, { status: 'FROZEN' }),
			real('WORK_COMPOSED', { type: 'WORK', id: 'w2' }, { status: 'RETIRED' })
		]);
		expect(d.inProgress.map((x) => x.text)).toEqual([
			'Morceau composé « Ensemble » : contestée, en attente de la modération.'
		]);
		expect(d.done).toEqual([
			expect.objectContaining({
				retired: true,
				confirmed: false,
				proof: 'Retirée : ne compte plus'
			})
		]);
	});

	it('une première fois s’affiche une fois, dans « Premières fois », pas aussi dans « Réalisé »', () => {
		const gig = real(
			'MILESTONE',
			{ type: 'MILESTONE', id: 'm', bandId: 'b1', definitionId: 'FIRST_GIG' },
			{ branch: 'SCENE', proof: 'VERIFIED', firstTime: true, roles: ['BAND_MEMBER'] }
		);
		const d = detail('SCENE', { verifiedGigs: 1 }, {}, [gig]);
		expect(d.firstTimes).toEqual([
			{ key: gig.key, label: expect.stringContaining('Les Rats'), proof: 'Vérifié' }
		]);
		expect(d.done).toEqual([]);
	});

	it('ne montre que les réalisations de sa branche', () => {
		const d = detail('SCENE', {}, {}, [real('WORK_COMPOSED', { type: 'WORK', id: 'w1' })]);
		expect(d.done).toEqual([]);
		expect(d.acts.map((a) => a.name)).toEqual(['La scène']);
	});

	it('« Pas possible pour l’instant » : bientôt sur Melokiva, et la version solo prévue, sans « fais d’abord »', () => {
		const diffusion = detail('DIFFUSION');
		expect(diffusion.possible).toEqual([]);
		expect(diffusion.notYet.every((l) => l.startsWith('Bientôt sur Melokiva'))).toBe(true);
		const scene = detail('SCENE');
		// P8 (D77) : « La scène » se franchit aussi en son nom ; plus d'avertissement.
		expect(scene.notYet.join(' ')).not.toMatch(/se franchit avec un groupe/);
		for (const b of ['EQUIPE', 'CREATION', 'PRODUCTION', 'SCENE', 'DIFFUSION'] as const)
			expect(detail(b).notYet.join(' ')).not.toMatch(/d’abord|d'abord/i);
	});

	it('une collaboration à confirmer se range dans sa branche', () => {
		const c = (kind: string, asProvider = false) => collaborationBranch({ kind, asProvider });
		expect(c('GIG')).toBe('SCENE');
		expect(c('REHEARSAL')).toBe('SCENE');
		expect(c('MIXING')).toBe('PRODUCTION');
		expect(c('JAM', true)).toBe('PRODUCTION');
		expect(c('JAM')).toBe('EQUIPE');
	});

	it('les libellés de preuve', () => {
		expect(proofLabel({ kind: 'COLLABORATION', proof: 'CORROBORATED' })).toBe(
			'Confirmée des deux côtés'
		);
		expect(proofLabel({ kind: 'PRODUCTION_STAGE', proof: 'CORROBORATED' })).toMatch(/producteur/);
		expect(proofLabel({ kind: 'MILESTONE', proof: 'VERIFIED' })).toBe('Vérifié');
	});
});
