import { describe, expect, it } from 'vitest';
import {
	backlineSchema,
	canReserve,
	inviteSchema,
	leadOf,
	packingSentence,
	spotBoard,
	whatToBring
} from './lineup';

const spots = [
	{ instrumentId: 'drums', name: 'Batterie', count: 1 },
	{ instrumentId: 'bass', name: 'Basse', count: 2 }
];

describe('formation de la jam (P2-14c)', () => {
	it('une place réservée n’est pas prise par « Je viens »', () => {
		const board = spotBoard(
			spots,
			[{ instrumentId: 'drums', status: 'INVITED' }],
			[{ instrumentId: 'drums' }, { instrumentId: 'bass' }, { instrumentId: null }]
		);
		expect(board[0]).toMatchObject({ wanted: 1, reserved: 1, taken: 0, open: 0 });
		expect(board[1]).toMatchObject({ wanted: 2, reserved: 0, taken: 1, open: 1 });
	});

	it('places ouvertes = souhaitées − réservées − prises', () => {
		const board = spotBoard(
			spots,
			[
				{ instrumentId: 'bass', status: 'ACCEPTED' },
				{ instrumentId: 'bass', status: 'DECLINED' }
			],
			[{ instrumentId: 'bass' }, { instrumentId: 'bass' }]
		);
		// Une invitation refusée libère sa place ; le second « Je viens » basse
		// vient quand même, sans place.
		expect(board[1]).toMatchObject({ reserved: 1, taken: 1, open: 0 });
	});

	it('le lead réserve tant qu’il reste des places non réservées', () => {
		const board = spotBoard(spots, [{ instrumentId: 'drums', status: 'ACCEPTED' }], []);
		expect(canReserve(board, 'drums')).toBe(false);
		expect(canReserve(board, 'bass')).toBe(true);
		expect(canReserve(board, 'piano')).toBe(false);
		// Une place prise par « Je viens » reste réservable : le lead compose sa formation.
		const taken = spotBoard(spots, [], [{ instrumentId: 'drums' }]);
		expect(canReserve(taken, 'drums')).toBe(true);
	});

	it('le lead est l’hôte par défaut', () => {
		expect(leadOf({ issuerActorId: 'host', leadActorId: null })).toBe('host');
		expect(leadOf({ issuerActorId: 'host', leadActorId: 'lea' })).toBe('lea');
	});

	it('invitation : identifiant nettoyé', () => {
		const ok = inviteSchema.safeParse({ handle: ' @Lea-Drums ', instrument: 'batterie' });
		expect(ok.success && ok.data.handle).toBe('lea-drums');
		expect(inviteSchema.safeParse({ handle: '@', instrument: 'batterie' }).success).toBe(false);
	});
});

describe('matériel sur place (P2-14c)', () => {
	const bass = { slug: 'basse', family: 'PLUCKED_STRINGS', name: 'Basse électrique' };
	const drums = { slug: 'batterie', family: 'DRUMS_PERCUSSION', name: 'Batterie' };
	const voice = { slug: 'chant', family: 'VOICE', name: 'Chant' };
	const sax = { slug: 'saxophone-alto', family: 'WOODWINDS', name: 'Saxophone alto' };

	it('apporte ta basse, l’ampli est fourni', () => {
		expect(packingSentence(whatToBring(bass, ['BASS_AMP', 'CABLES']))).toBe(
			'Apporte ta basse. Sur place : l’ampli basse et les câbles.'
		);
		expect(packingSentence(whatToBring(bass, []))).toBe(
			'Apporte ta basse, ton ampli basse et tes câbles.'
		);
	});

	it('batterie, voix et autres instruments', () => {
		expect(whatToBring(drums, ['DRUMS'])).toEqual({
			bring: ['tes baguettes'],
			onSite: ['la batterie']
		});
		expect(whatToBring(voice, ['PA_MICS']).bring).toEqual([]);
		expect(whatToBring(voice, []).bring).toEqual(['ton micro']);
		expect(packingSentence(whatToBring(sax, []))).toBe('Apporte ton instrument (saxophone alto).');
	});

	it('matériel coché : connu, sans doublon, dans l’ordre', () => {
		expect(backlineSchema.parse(['CABLES', 'DRUMS', 'DRUMS'])).toEqual(['DRUMS', 'CABLES']);
		expect(backlineSchema.safeParse(['PIANO']).success).toBe(false);
	});
});
