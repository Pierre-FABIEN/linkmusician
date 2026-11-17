import { describe, expect, it } from 'vitest';
import { CRAFT_CARD_BLOCKS, gateCraftCard, type BlockSettings } from './craftCardVisibility';

const defaults: BlockSettings = {
	offersVisibility: 'MEMBERS',
	detailsVisibility: 'MEMBERS',
	conditionsVisibility: 'PRIVATE'
};

const producer = {
	specialties: ['BEATMAKING'],
	mobility: ['REMOTE'],
	software: 'Ableton',
	rate: '300 € le titre',
	genres: [{ id: 'g', name: 'Rap' }],
	references: [{ title: 'EP', url: 'https://example.org' }],
	tier: { id: 'home', label: 'Home studio' },
	credits: [{ id: 'w', title: 'Titre', roles: ['Production'] }]
};

describe('cartes historiques sous les blocs D61 (ONB-12c2)', () => {
	it('anonyme, réglages par défaut : seuls portfolio, crédits et rang restent', () => {
		const card = gateCraftCard('PRODUCER', producer, defaults, 'public');
		expect(card).toEqual({
			...producer,
			specialties: [],
			mobility: [],
			software: '',
			rate: '',
			genres: []
		});
	});

	it('membre : spécialités et précisions, jamais les tarifs privés', () => {
		const card = gateCraftCard('PRODUCER', producer, defaults, 'members');
		expect(card.specialties).toEqual(['BEATMAKING']);
		expect(card.software).toBe('Ableton');
		expect(card.rate).toBe('');
	});

	it('la personne voit tout ; tarifs publics si elle le choisit', () => {
		expect(gateCraftCard('PRODUCER', producer, defaults, 'owner')).toEqual(producer);
		const open = { ...defaults, conditionsVisibility: 'PUBLIC' as const };
		expect(gateCraftCard('PRODUCER', producer, open, 'public').rate).toBe('300 € le titre');
	});

	it('ingé son : matériel et mobilité en précisions, spécialités en intentions', () => {
		const sound = { specialties: ['MIXING'], mobility: ['ON_SITE'], gear: 'SM57', references: [] };
		const s = { ...defaults, offersVisibility: 'PUBLIC' as const };
		expect(gateCraftCard('SOUND_ENGINEER', sound, s, 'public')).toEqual({
			specialties: ['MIXING'],
			mobility: [],
			gear: '',
			references: []
		});
	});

	it('organisateur·rice : jauge vidée en null, plateaux et organisations intacts', () => {
		const promoter = {
			eventKinds: ['CONCERTS'],
			genres: [],
			capacity: 200,
			gigSlots: [{ id: 'o' }],
			orgs: [{ handle: 'asso', name: 'Asso' }]
		};
		const card = gateCraftCard('PROMOTER', promoter, defaults, 'public');
		expect(card.capacity).toBeNull();
		expect(card.eventKinds).toEqual([]);
		expect(card.gigSlots).toEqual(promoter.gigSlots);
		expect(card.orgs).toEqual(promoter.orgs);
	});

	it('ne touche jamais aux crédits ni aux références (aucun crédit perdu)', () => {
		for (const blocks of Object.values(CRAFT_CARD_BLOCKS)) {
			expect(Object.keys(blocks)).not.toContain('credits');
			expect(Object.keys(blocks)).not.toContain('references');
			expect(Object.keys(blocks)).not.toContain('tier');
		}
	});

	it('ne modifie pas la carte reçue', () => {
		const copy = structuredClone(producer);
		gateCraftCard('PRODUCER', producer, defaults, 'public');
		expect(producer).toEqual(copy);
	});
});

describe('note « Qui voit quoi » (ONB-12c2)', () => {
	it('regroupe les champs par bloc, tarifs en conditions', async () => {
		const { craftFieldsByBlock } = await import('./craftCardVisibility');
		expect(craftFieldsByBlock('PRODUCER')).toEqual([
			{ block: 'offers', fields: ['spécialités'] },
			{ block: 'details', fields: ['où tu travailles', 'logiciels', 'styles'] },
			{ block: 'conditions', fields: ['tarifs indicatifs'] }
		]);
		expect(craftFieldsByBlock('SOUND_ENGINEER').map((g) => g.block)).toEqual(['offers', 'details']);
	});
});
