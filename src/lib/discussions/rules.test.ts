import { describe, expect, it } from 'vitest';
import {
	MAX_DISCUSSION_MEMBERS,
	accessOf,
	canPost,
	inviteRefusal,
	joinRefusal,
	membersSummary
} from './rules';

describe('accessOf', () => {
	it.each([
		['ACTIVE', 'member'],
		['INVITED', 'invitation'],
		['DECLINED', 'none'],
		['LEFT', 'none'],
		[null, 'none']
	] as const)('%s → %s', (state, expected) => {
		expect(accessOf(state)).toBe(expected);
	});
});

describe('inviteRefusal', () => {
	const ok = {
		inviterIsCreator: true,
		inviterState: 'ACTIVE' as const,
		isContact: true,
		inviteeIsAdult: true,
		blockedWithInviter: false,
		inviteeState: null,
		seats: 3
	};
	it.each([
		['invitation valable', {}, null],
		['pas l’auteur', { inviterIsCreator: false }, 'not_creator'],
		['auteur parti', { inviterState: 'LEFT' as const }, 'not_creator'],
		['pas un contact', { isContact: false }, 'not_contact'],
		['mineur·e', { inviteeIsAdult: false }, 'unavailable'],
		['blocage', { blockedWithInviter: true }, 'unavailable'],
		['déjà invitée', { inviteeState: 'INVITED' as const }, 'already'],
		['déjà présente', { inviteeState: 'ACTIVE' as const }, 'already'],
		['a dit non merci', { inviteeState: 'DECLINED' as const }, 'declined'],
		['est partie', { inviteeState: 'LEFT' as const }, 'declined'],
		['complet', { seats: MAX_DISCUSSION_MEMBERS }, 'full']
	])('%s', (_, patch, expected) => {
		expect(inviteRefusal({ ...ok, ...patch })).toBe(expected);
	});
	it('mineur·e et blocage disent la même chose (la raison reste cachée)', () => {
		expect(inviteRefusal({ ...ok, inviteeIsAdult: false })).toBe(
			inviteRefusal({ ...ok, blockedWithInviter: true })
		);
	});
});

describe('joinRefusal', () => {
	const ok = { state: 'INVITED' as const, isAdult: true, blockedWithAMember: false };
	it.each([
		['invitation', {}, null],
		['pas invitée', { state: null }, 'not_invited'],
		['déjà partie', { state: 'LEFT' as const }, 'not_invited'],
		['déjà dedans', { state: 'ACTIVE' as const }, 'not_invited'],
		['mineur·e', { isAdult: false }, 'unavailable'],
		['blocage avec un membre', { blockedWithAMember: true }, 'unavailable']
	])('%s', (_, patch, expected) => {
		expect(joinRefusal({ ...ok, ...patch })).toBe(expected);
	});
});

describe('canPost', () => {
	it('seulement en étant présent·e', () => {
		expect(canPost('ACTIVE')).toBe(true);
		for (const s of ['INVITED', 'DECLINED', 'LEFT', null] as const) expect(canPost(s)).toBe(false);
	});
});

describe('membersSummary', () => {
	it.each([
		[[], 'Personne d’autre pour l’instant'],
		[['Léa'], 'Léa'],
		[['Léa', 'Malik'], 'Léa et Malik'],
		[['Léa', 'Malik', 'Zoé'], 'Léa, Malik et Zoé'],
		[['Léa', 'Malik', 'Zoé', 'Sam'], 'Léa, Malik, Zoé et 1 autre'],
		[['Léa', 'Malik', 'Zoé', 'Sam', 'Ivy'], 'Léa, Malik, Zoé et 2 autres']
	])('%j', (names, expected) => {
		expect(membersSummary(names)).toBe(expected);
	});
});
