import { describe, expect, it } from 'vitest';
import {
	addableSoundRoles,
	ownSoundRoleSchema,
	composeBlocker,
	creditSchema,
	newWorkSchema,
	onConfirm,
	proofFor,
	recruitHref,
	roleLabel,
	hasCreativeRole,
	isSoundRole,
	openRoleHref,
	roleInputSchema
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

describe('morceaux : rôles du son (P4-07)', () => {
	it('prise de son, mixage, mastering, production : rôles du son, libellés', () => {
		expect(
			['RECORDING', 'MIXING', 'MASTERING', 'PRODUCTION'].every((k) => isSoundRole(k as never))
		).toBe(true);
		expect(isSoundRole('COMPOSITION')).toBe(false);
		expect(roleLabel({ kind: 'MIXING' })).toBe('Mixage');
		expect(roleLabel({ kind: 'RECORDING' })).toBe('Prise de son');
		expect(roleInputSchema.parse('MASTERING')).toEqual({ kind: 'MASTERING', instrumentSlug: null });
	});

	it('une personne qui n’a que des rôles du son n’est pas co-autrice', () => {
		expect(hasCreativeRole(['MIXING', 'MASTERING'])).toBe(false);
		expect(hasCreativeRole(['MIXING', 'LYRICS'])).toBe(true);
		expect(hasCreativeRole(['INSTRUMENT'])).toBe(true);
		// Un crédit sans rôle compte comme avant.
		expect(hasCreativeRole([])).toBe(true);
	});

	it('« Recruter » un rôle du son publie une annonce ciblée sur le métier', () => {
		const base = {
			workId: 'w1',
			workTitle: 'Nuit blanche',
			bandHandle: null,
			instrumentSlug: null
		};
		const mix = new URL(
			openRoleHref({ ...base, kind: 'MIXING', roleLabel: 'Mixage' }),
			'https://x.test'
		);
		expect(mix.searchParams.get('cible')).toBe('SOUND_ENGINEER');
		expect(mix.searchParams.get('specialite')).toBe('MIXING');
		expect(mix.searchParams.get('morceau')).toBe('w1');
		const prod = new URL(
			openRoleHref({ ...base, kind: 'PRODUCTION', roleLabel: 'Production' }),
			'https://x.test'
		);
		expect(prod.searchParams.get('cible')).toBe('PRODUCER');
		const lyrics = new URL(
			openRoleHref({ ...base, kind: 'LYRICS', roleLabel: 'Paroles' }),
			'https://x.test'
		);
		expect(lyrics.searchParams.has('cible')).toBe(false);
	});
});

describe('rôles du son ajoutés à son crédit (DASH-06b)', () => {
	it('ne propose que les rôles du son pas encore tenus', () => {
		expect(addableSoundRoles(['COMPOSITION', 'RECORDING'])).toEqual([
			'MIXING',
			'MASTERING',
			'PRODUCTION'
		]);
		expect(addableSoundRoles(['RECORDING', 'MIXING', 'MASTERING', 'PRODUCTION'])).toEqual([]);
	});
	it('refuse un rôle d’écriture ou d’instrument', () => {
		expect(ownSoundRoleSchema.safeParse({ kind: 'RECORDING' }).success).toBe(true);
		expect(ownSoundRoleSchema.safeParse({ kind: 'COMPOSITION' }).success).toBe(false);
		expect(ownSoundRoleSchema.safeParse({ kind: 'INSTRUMENT' }).success).toBe(false);
	});
});
