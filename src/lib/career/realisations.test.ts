import { describe, expect, it } from 'vitest';
import {
	byBranch,
	careerFactsOf,
	countable,
	creditsOf,
	dedupeRealisations,
	firstVerifiedGigOf,
	realisationKey,
	type Realisation
} from './realisations';

const NONE = { jamAppreciations: 0, collaborations: 0 };

function work(id: string, over: Partial<Realisation> = {}): Realisation {
	return {
		key: realisationKey('WORK_COMPOSED', { type: 'WORK', id }),
		kind: 'WORK_COMPOSED',
		branch: 'CREATION',
		bearerId: 'band',
		object: { type: 'WORK', id },
		roles: ['CREDITED'],
		occurredAt: new Date('2026-05-01'),
		proof: 'CORROBORATED',
		status: 'ACTIVE',
		visibility: 'PUBLIC',
		firstTime: false,
		...over
	};
}

function produced(id: string, roles: Realisation['roles'], at = '2026-07-01'): Realisation {
	return work(id, {
		key: realisationKey('PRODUCTION_STAGE', { type: 'WORK', id }),
		kind: 'PRODUCTION_STAGE',
		branch: 'PRODUCTION',
		roles,
		occurredAt: new Date(at)
	});
}

function milestone(
	bandId: string,
	definitionId: string,
	over: Partial<Realisation> = {}
): Realisation {
	const object = { type: 'MILESTONE' as const, id: `m-${bandId}`, bandId, definitionId };
	return {
		key: realisationKey('MILESTONE', object),
		kind: 'MILESTONE',
		branch: definitionId === 'FIRST_RECORDING' ? 'PRODUCTION' : 'SCENE',
		bearerId: bandId,
		object,
		roles: ['BAND_MEMBER'],
		occurredAt: new Date('2026-06-01'),
		proof: 'VERIFIED',
		status: 'ACTIVE',
		visibility: 'PUBLIC',
		firstTime: true,
		...over
	};
}

function credit(id: string, roleKind: string, proof: Realisation['proof']): Realisation {
	const object = { type: 'WORK_ROLE' as const, id, workId: `w-${id}`, roleKind };
	return work(`w-${id}`, {
		key: realisationKey('CREDIT', object),
		kind: 'CREDIT',
		object,
		proof
	});
}

describe('clé de réalisation', () => {
	it('désigne le fait source, pas le contexte', () => {
		expect(realisationKey('WORK_COMPOSED', { type: 'WORK', id: 'w1' })).toBe('work:w1:composed');
		expect(realisationKey('PRODUCTION_STAGE', { type: 'WORK', id: 'w1' })).toBe('work:w1:produced');
		expect(realisationKey('COLLABORATION', { type: 'COLLABORATION', id: 'c1' })).toBe('collab:c1');
		expect(
			realisationKey('CREDIT', { type: 'WORK_ROLE', id: 'r1', workId: 'w1', roleKind: 'MIXING' })
		).toBe('credit:r1');
	});

	it('une étape garde sa clé après retrait (pas d’identifiant de ligne)', () => {
		const alive = { type: 'MILESTONE' as const, id: 'row', bandId: 'b', definitionId: 'FIRST_GIG' };
		expect(realisationKey('MILESTONE', alive)).toBe(
			realisationKey('MILESTONE', { ...alive, id: null })
		);
	});
});

describe('déduplication (NL3)', () => {
	it('plusieurs réalisations distinctes restent distinctes', () => {
		const list = [work('w1'), work('w2'), produced('w1', ['CREDITED'])];
		expect(dedupeRealisations(list).map((r) => r.key)).toEqual([
			'work:w1:composed',
			'work:w2:composed',
			'work:w1:produced'
		]);
	});

	it('un même fait vu de deux contextes : une entrée, rôles cumulés', () => {
		const [one, ...rest] = dedupeRealisations([
			produced('w1', ['BAND_MEMBER'], '2026-08-01'),
			produced('w1', ['CREDITED'], '2026-07-01')
		]);
		expect(rest).toEqual([]);
		expect(one.roles).toEqual(['CREDITED', 'BAND_MEMBER']);
		expect(one.occurredAt).toEqual(new Date('2026-07-01'));
	});

	it('preuve la plus haute, statut et visibilité les plus restrictifs', () => {
		const [one] = dedupeRealisations([
			milestone('b', 'FIRST_GIG', { proof: 'CORROBORATED' }),
			milestone('b', 'FIRST_GIG', { status: 'FROZEN', visibility: 'PRIVATE' })
		]);
		expect(one).toMatchObject({ proof: 'VERIFIED', status: 'FROZEN', visibility: 'PRIVATE' });
	});

	it('ne modifie pas la liste reçue', () => {
		const list = [produced('w1', ['BAND_MEMBER']), produced('w1', ['CREDITED'])];
		dedupeRealisations(list);
		expect(list[0].roles).toEqual(['BAND_MEMBER']);
	});
});

describe('faits de la carte', () => {
	it('aucune réalisation : tout à zéro, rien n’est un manque (NL2)', () => {
		expect(careerFactsOf([], NONE)).toEqual({
			jamAppreciations: 0,
			collaborations: 0,
			worksTogether: 0,
			worksSolo: 0,
			recordings: 0,
			productions: 0,
			verifiedGigs: 0,
			tours: 0
		});
		expect(creditsOf([])).toBe(0);
		expect(firstVerifiedGigOf([])).toBeNull();
	});

	it('personnel et collectif : morceaux, productions, étapes du groupe', () => {
		const facts = careerFactsOf(
			[
				work('w1'),
				work('w2', { proof: 'DECLARED' }),
				produced('w1', ['CREDITED']),
				produced('w1', ['BAND_MEMBER']),
				produced('w3', ['BAND_MEMBER']),
				milestone('b1', 'FIRST_RECORDING', { proof: 'CORROBORATED' }),
				milestone('b1', 'FIRST_GIG'),
				milestone('b2', 'FIRST_GIG', { proof: 'CORROBORATED' }),
				milestone('b1', 'FIRST_TOUR')
			],
			{ jamAppreciations: 2, collaborations: 3 }
		);
		expect(facts).toEqual({
			jamAppreciations: 2,
			collaborations: 3,
			worksTogether: 1,
			worksSolo: 1,
			recordings: 1,
			// w1 compté une fois malgré deux contextes.
			productions: 2,
			// Concert corroboré seulement : pas vérifié, pas compté.
			verifiedGigs: 1,
			tours: 1
		});
	});

	it('gelée ou retirée : ne franchit aucune épreuve', () => {
		const facts = careerFactsOf(
			[
				milestone('b1', 'FIRST_RECORDING', { status: 'FROZEN' }),
				milestone('b2', 'FIRST_GIG', { status: 'RETIRED' }),
				work('w1', { status: 'FROZEN' })
			],
			NONE
		);
		expect(facts.recordings).toBe(0);
		expect(facts.verifiedGigs).toBe(0);
		expect(facts.worksTogether).toBe(0);
		expect(countable(milestone('b', 'FIRST_GIG'))).toBe(true);
	});

	it('crédits : corroborés et actifs, une fois chacun', () => {
		expect(
			creditsOf([
				credit('r1', 'COMPOSITION', 'CORROBORATED'),
				credit('r1', 'COMPOSITION', 'CORROBORATED'),
				credit('r2', 'MIXING', 'CORROBORATED'),
				credit('r3', 'COMPOSITION', 'DECLARED'),
				work('w9')
			])
		).toBe(2);
	});

	it('premier concert vérifié : le plus ancien, actif', () => {
		const first = firstVerifiedGigOf([
			milestone('b1', 'FIRST_GIG', { occurredAt: new Date('2026-09-01') }),
			milestone('b2', 'FIRST_GIG', { occurredAt: new Date('2026-03-01'), status: 'FROZEN' }),
			milestone('b3', 'FIRST_GIG', { occurredAt: new Date('2026-05-01') })
		]);
		expect(first?.bearerId).toBe('b3');
	});

	it('classe par branche', () => {
		const branches = byBranch([
			work('w1'),
			produced('w1', ['CREDITED']),
			milestone('b', 'FIRST_GIG')
		]);
		expect([...branches.keys()]).toEqual(['CREATION', 'PRODUCTION', 'SCENE']);
	});

	it('aucun champ de points dans une réalisation', () => {
		expect(Object.keys(work('w1')).join(' ')).not.toMatch(/xp|level|points|trust/i);
	});
});
