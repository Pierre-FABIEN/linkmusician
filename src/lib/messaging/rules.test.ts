import { describe, expect, it } from 'vitest';
import {
	MAX_MESSAGE_LENGTH,
	canReceiveRequest,
	checkMessage,
	pairKey,
	preview,
	sendPermission
} from './rules';

describe('messages (P2-04)', () => {
	it('texte brut nettoyé', () => {
		expect(checkMessage('  Salut !\r\n\n\n\n\nÇa te dit une jam ?\u0007 ')).toEqual({
			ok: true,
			body: 'Salut !\n\n\nÇa te dit une jam ?'
		});
	});

	it.each([
		['', 'empty'],
		['   \n ', 'empty'],
		['a'.repeat(MAX_MESSAGE_LENGTH + 1), 'too_long']
	])('refuse %#', (raw, reason) => {
		expect(checkMessage(raw)).toEqual({ ok: false, reason });
	});

	it('compte les caractères, pas les octets (emoji)', () => {
		expect(checkMessage('🎸'.repeat(MAX_MESSAGE_LENGTH)).ok).toBe(true);
	});

	it('une paire, quel que soit l’ordre', () => {
		expect(pairKey('b', 'a')).toBe(pairKey('a', 'b'));
	});

	it('aperçu sur une ligne, tronqué', () => {
		expect(preview('Salut\n\ntoi', 80)).toBe('Salut toi');
		expect(preview('x'.repeat(100), 10)).toBe('xxxxxxxxx…');
	});
});

describe('qui peut écrire', () => {
	it.each([
		[{ myState: 'ACCEPTED', otherState: 'REQUEST', mySentCount: 0 }, 'ok'],
		[{ myState: 'ACCEPTED', otherState: 'REQUEST', mySentCount: 1 }, 'pending'],
		[{ myState: 'ACCEPTED', otherState: 'DECLINED', mySentCount: 1 }, 'declined'],
		[{ myState: 'REQUEST', otherState: 'ACCEPTED', mySentCount: 0 }, 'must_accept'],
		[{ myState: 'ACCEPTED', otherState: 'ACCEPTED', mySentCount: 5 }, 'ok']
	] as const)('%o → %s', (input, expected) => {
		expect(sendPermission(input)).toBe(expected);
	});
});

describe('demandes et mineur·es (D5)', () => {
	const now = new Date('2026-11-05T12:00:00Z');
	it.each([
		['2000-01-01', true],
		['2008-11-05', true], // 18 ans aujourd'hui
		['2009-03-01', false], // 17 ans
		[null, false]
	])('né·e le %s : %s', (born, expected) => {
		expect(canReceiveRequest(born ? new Date(`${born}T00:00:00Z`) : null, now)).toBe(expected);
	});
});
