/**
 * Parcours scénique solo (P8, D77, DC4) : lecture des réalisations, carte et
 * libellés. Écrit le 19/11/2026, **non exécuté** dans la session.
 *
 *   npm run test:unit -- --run src/lib/career/solo.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
	careerFactsOf,
	firstVerifiedGigOf,
	personalGigsOf,
	realisationKey,
	type Realisation,
	type RealisationObject
} from './realisations';
import { careerMap, corroboratedGigOf } from './map';
import { realisationLabel } from './branch';

const camille = 'camille';
const rats = 'les-rats';

function milestone(
	bearer: string,
	definitionId: string,
	proof: Realisation['proof'],
	role: 'PERFORMER' | 'BAND_MEMBER',
	extra: Partial<Realisation> = {}
): Realisation {
	const object: RealisationObject = {
		type: 'MILESTONE',
		id: `${bearer}-${definitionId}`,
		bandId: bearer,
		definitionId
	};
	return {
		key: realisationKey('MILESTONE', object),
		kind: 'MILESTONE',
		branch: 'SCENE',
		bearerId: bearer,
		object,
		roles: [role],
		occurredAt: new Date('2026-10-01T12:00:00Z'),
		proof,
		status: 'ACTIVE',
		visibility: 'PUBLIC',
		firstTime: true,
		...extra
	};
}

const summary = { jamAppreciations: 0, collaborations: 1 };

describe('« La scène » sans groupe (P8)', () => {
	it('un premier concert personnel vérifié franchit l’épreuve', () => {
		const facts = careerFactsOf(
			[milestone(camille, 'FIRST_GIG', 'VERIFIED', 'PERFORMER')],
			summary
		);
		expect(facts.verifiedGigs).toBe(1);
		expect(careerMap(facts).passed).toContain(5);
	});

	it('corroboré seulement : l’épreuve n’est pas franchie', () => {
		const list = [milestone(camille, 'FIRST_GIG', 'CORROBORATED', 'PERFORMER')];
		const facts = careerFactsOf(list, summary);
		expect(facts.verifiedGigs).toBe(0);
		expect(careerMap(facts).passed).not.toContain(5);
		// Déclencheur : un concert est confirmé, la vérification reste possible.
		expect(corroboratedGigOf(list)).toBe(true);
	});

	it('gelée ou retirée : ne compte pas', () => {
		for (const status of ['FROZEN', 'RETIRED'] as const) {
			const facts = careerFactsOf(
				[milestone(camille, 'FIRST_GIG', 'VERIFIED', 'PERFORMER', { status })],
				summary
			);
			expect(facts.verifiedGigs).toBe(0);
			expect(
				personalGigsOf([milestone(camille, 'FIRST_GIG', 'VERIFIED', 'PERFORMER', { status })])
			).toBe(0);
		}
	});

	it('DC4 : personne et groupe, deux faits, deux clés, aucun doublon', () => {
		const mine = milestone(camille, 'FIRST_GIG', 'VERIFIED', 'PERFORMER');
		const band = milestone(rats, 'FIRST_GIG', 'VERIFIED', 'BAND_MEMBER');
		expect(mine.key).not.toBe(band.key);
		const facts = careerFactsOf([mine, band, { ...mine }], summary);
		// La même réalisation lue deux fois ne compte qu'une fois.
		expect(facts.verifiedGigs).toBe(2);
		// La fiche n'ajoute que l'étape personnelle aux concerts de groupe du moteur.
		expect(personalGigsOf([mine, band, { ...mine }])).toBe(1);
	});

	it('un concert du groupe ne compte pas comme concert personnel', () => {
		expect(personalGigsOf([milestone(rats, 'FIRST_GIG', 'VERIFIED', 'BAND_MEMBER')])).toBe(0);
	});

	it('la tournée personnelle vérifiée s’affiche en bonus', () => {
		const facts = careerFactsOf(
			[
				milestone(camille, 'FIRST_GIG', 'VERIFIED', 'PERFORMER'),
				milestone(camille, 'FIRST_TOUR', 'VERIFIED', 'PERFORMER')
			],
			summary
		);
		expect(facts.tours).toBe(1);
	});

	it('carte souvenir : le premier concert vérifié peut être personnel', () => {
		const first = firstVerifiedGigOf([milestone(camille, 'FIRST_GIG', 'VERIFIED', 'PERFORMER')]);
		expect(first?.bearerId).toBe(camille);
	});

	it('libellé : « en ton nom », jamais un groupe', () => {
		const label = realisationLabel(milestone(camille, 'FIRST_GIG', 'VERIFIED', 'PERFORMER'), {
			works: {},
			bands: { [camille]: 'Camille' }
		});
		expect(label).toBe('Premier concert · en ton nom');
	});

	it('l’épreuve n’invite pas à créer un groupe', () => {
		const scene = careerMap(careerFactsOf([], summary)).acts.find((a) => a.number === 5)!;
		expect(scene.trial).toMatch(/en ton nom/);
		expect(`${scene.trial} ${scene.cta?.label ?? ''}`).not.toMatch(/crée|créer|monter un groupe/i);
	});
});
