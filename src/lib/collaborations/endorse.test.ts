import { describe, expect, it } from 'vitest';
import { collabEndorseRefusal, collabEndorseSchema } from './endorse';

const ok = {
	fromId: 'a',
	toId: 'b',
	completed: true,
	fromIsParticipant: true,
	toIsParticipant: true,
	fromCanEndorse: true,
	blocked: false,
	alreadyEndorsed: false
};

describe('appréciations après une collaboration (P2-07)', () => {
	it('autorisée entre participants d’une collaboration confirmée', () => {
		expect(collabEndorseRefusal(ok)).toBeNull();
	});

	it('impossible sans collaboration commune', () => {
		expect(collabEndorseRefusal({ ...ok, toIsParticipant: false })).toMatch(/collaboré/);
		expect(collabEndorseRefusal({ ...ok, fromIsParticipant: false })).toMatch(/collaboré/);
		expect(collabEndorseRefusal({ ...ok, blocked: true })).toMatch(/collaboré/);
	});

	it('pas avant la confirmation, pas soi-même, pas deux fois, TL1 requise', () => {
		expect(collabEndorseRefusal({ ...ok, completed: false })).toMatch(/confirmée/);
		expect(collabEndorseRefusal({ ...ok, toId: 'a' })).toMatch(/toi-même/);
		expect(collabEndorseRefusal({ ...ok, alreadyEndorsed: true })).toMatch(/déjà/);
		expect(collabEndorseRefusal({ ...ok, fromCanEndorse: false })).toMatch(/palier de confiance 1/);
	});

	it('une qualité ou un instrument, jamais les deux', () => {
		const base = { collaborationId: 'cm0abcdefghij', to: 'lea-basse' };
		expect(collabEndorseSchema.safeParse({ ...base, quality: 'ON_TIME' }).success).toBe(true);
		expect(collabEndorseSchema.safeParse({ ...base, instrument: 'basse' }).success).toBe(true);
		expect(collabEndorseSchema.safeParse(base).success).toBe(false);
		expect(
			collabEndorseSchema.safeParse({ ...base, quality: 'ON_TIME', instrument: 'basse' }).success
		).toBe(false);
		expect(collabEndorseSchema.safeParse({ ...base, quality: 'GROOVE' }).success).toBe(false);
	});
});
