import { describe, expect, it } from 'vitest';
import { concertProgram, sharingSheet, type Credit } from './documents';

const lea: Credit = {
	name: 'Léa',
	confirmed: true,
	roles: [{ kind: 'LYRICS' }, { kind: 'INSTRUMENT', instrument: 'Chant' }]
};
const malik: Credit = {
	name: 'Malik',
	confirmed: true,
	roles: [{ kind: 'COMPOSITION' }, { kind: 'INSTRUMENT', instrument: 'Basse électrique' }]
};
const zoe: Credit = {
	name: 'Zoé',
	confirmed: true,
	roles: [{ kind: 'INSTRUMENT', instrument: 'Batterie' }]
};
const sam: Credit = { name: 'Sam', confirmed: false, roles: [{ kind: 'COMPOSITION' }] };

describe('bulletin de partage (P3-15b)', () => {
	const sheet = sharingSheet([lea, malik, zoe, sam]);

	it('les auteur·es et compositeur·rices confirmé·es seulement, avec leurs rôles d’écriture', () => {
		expect(sheet.writers).toEqual([
			{ name: 'Léa', roles: ['Paroles'] },
			{ name: 'Malik', roles: ['Musique'] }
		]);
		expect(sheet.pending).toBe(1);
	});

	it('les interprètes à part, pour mémoire : jouer n’ouvre pas de part d’auteur', () => {
		expect(sheet.performers.map((p) => p.name)).toEqual(['Léa', 'Malik', 'Zoé']);
		expect(sheet.writers.map((w) => w.name)).not.toContain('Zoé');
	});

	it('une colonne de parts par rôle présent ; aucune part n’est fixée par l’app', () => {
		expect(sheet.columns).toEqual(['Paroles', 'Musique']);
		expect(JSON.stringify(sheet)).not.toMatch(/%|share|part"/);
	});
});

describe('programme des œuvres (P3-15b)', () => {
	it('chaque morceau composé, trié, avec paroles et musique confirmées', () => {
		const lines = concertProgram([
			{ title: 'Nuit blanche', credits: [lea, malik, sam] },
			{ title: 'Aube', credits: [malik] }
		]);
		expect(lines).toEqual([
			{ title: 'Aube', lyrics: [], music: ['Malik'] },
			{ title: 'Nuit blanche', lyrics: ['Léa'], music: ['Malik'] }
		]);
	});
});
