import { describe, expect, it } from 'vitest';
import { representationProposalSchema, representationTitle } from './rules';

describe('representationProposalSchema', () => {
	it('accepte un nom d’utilisateur avec ou sans @, et un mot vide', () => {
		const parsed = representationProposalSchema.parse({
			artist: ' @les-pistons ',
			kind: 'BOOKER',
			message: ''
		});
		expect(parsed).toEqual({ artist: '@les-pistons', kind: 'BOOKER', message: undefined });
	});

	it('refuse un métier inconnu et un nom invalide', () => {
		expect(representationProposalSchema.safeParse({ artist: 'x', kind: 'BOOKER' }).success).toBe(
			false
		);
		expect(
			representationProposalSchema.safeParse({ artist: 'les-pistons', kind: 'LABEL_PRO' }).success
		).toBe(false);
	});
});

describe('representationTitle', () => {
	it('dit l’artiste et le métier', () => {
		expect(representationTitle('Les Pistons', 'MANAGER')).toBe('Les Pistons, comme manager');
	});
});
