import { describe, expect, it } from 'vitest';
import {
	composeBlocker,
	creditSchema,
	newWorkSchema,
	onConfirm,
	proofFor,
	recruitHref,
	roleLabel
} from './rules';

describe('morceaux : règles (P3-11, D35)', () => {
	it('niveau de preuve : corroboré à partir de 2 crédits confirmés', () => {
		expect(proofFor(1)).toBe('DECLARED');
		expect(proofFor(2)).toBe('CORROBORATED');
	});

	it.each([
		['idée : rien', { state: 'IDEA', proof: null, confirmed: 3 }, null],
		[
			'composé seul·e, 2ᵉ confirmation : corroboré',
			{ state: 'COMPOSED', proof: 'DECLARED', confirmed: 2 },
			'corroborate'
		],
		[
			'déjà corroboré : la part de qui confirme',
			{ state: 'COMPOSED', proof: 'CORROBORATED', confirmed: 3 },
			'share'
		]
	] as const)('%s', (_, work, expected) => {
		expect(onConfirm(work)).toBe(expected);
	});

	it('déclarer composé exige une maquette', () => {
		expect(composeBlocker({ state: 'IDEA', hasDemo: false })).toMatch(/maquette/);
		expect(composeBlocker({ state: 'IDEA', hasDemo: true })).toBeNull();
		expect(composeBlocker({ state: 'COMPOSED', hasDemo: true })).toMatch(/déjà/);
	});

	it('rôles : instrument du référentiel ou écriture, sans doublon', () => {
		const parsed = newWorkSchema.parse({
			title: '  Sans titre  ',
			genreIds: [],
			band: '',
			roles: ['INSTRUMENT:basse', 'LYRICS', 'LYRICS']
		});
		expect(parsed).toMatchObject({ title: 'Sans titre', band: null });
		expect(parsed.roles).toEqual([
			{ kind: 'INSTRUMENT', instrumentSlug: 'basse' },
			{ kind: 'LYRICS', instrumentSlug: null }
		]);
		expect(newWorkSchema.safeParse({ title: 'x', genreIds: [], roles: [] }).success).toBe(false);
		expect(creditSchema.safeParse({ handle: '@x', roles: ['INSTRUMENT:'] }).success).toBe(false);
		expect(creditSchema.parse({ handle: '@Malik', roles: ['COMPOSITION'] }).handle).toBe('malik');
	});

	it('libellés', () => {
		expect(roleLabel({ kind: 'INSTRUMENT', instrument: { name: 'Batterie' } })).toBe('Batterie');
		expect(roleLabel({ kind: 'ARRANGEMENT' })).toBe('Arrangement');
	});

	it('« Recruter » : membre pour un groupe, session pour une personne', () => {
		const band = new URL(
			recruitHref({
				workTitle: 'Nuit',
				bandHandle: 'les-rats',
				instrumentSlug: 'batterie',
				roleLabel: 'Batterie'
			}),
			'https://x'
		);
		expect(band.pathname).toBe('/annonces/nouvelle');
		expect(Object.fromEntries(band.searchParams)).toEqual({
			type: 'RECRUIT_MEMBER',
			groupe: 'les-rats',
			instrument: 'batterie',
			titre: 'Batterie pour « Nuit »'
		});
		const solo = new URL(
			recruitHref({
				workTitle: 'Nuit',
				bandHandle: null,
				instrumentSlug: null,
				roleLabel: 'Paroles'
			}),
			'https://x'
		);
		expect(solo.searchParams.get('type')).toBe('SESSION_WORK');
		expect(solo.searchParams.has('groupe')).toBe(false);
	});
});
