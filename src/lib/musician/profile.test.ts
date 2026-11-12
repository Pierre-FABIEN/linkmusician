import { describe, expect, it } from 'vitest';
import {
	checkDetails,
	COMMITMENTS,
	DETAIL_FIELDS,
	DETAIL_GROUPS,
	detailGroupsFor,
	intentsOfLookingFor,
	LOOKING_FOR_INTENTS,
	lookingForOf,
	PRACTICE_EXPERIENCES
} from './profile';
import { LOOKING_FOR } from '#lib/actors/profile';
import { catalogOf } from '#lib/actors/specializations';
import { musicianStepSchema } from '#lib/schema/musician/musicianStepSchema';
import { instrumentsByFamily } from '../../../prisma/seed-data/instruments.js';

const guitar = { slug: 'guitare-electrique', family: 'PLUCKED_STRINGS' };
const voice = { slug: 'chant', family: 'VOICE' };
const drums = { slug: 'batterie', family: 'DRUMS_PERCUSSION' };
const oud = { slug: 'oud', family: 'WORLD' };

describe('référentiel du profil musicien·ne', () => {
	it('a des codes uniques partout', () => {
		const ids = DETAIL_FIELDS.map((f) => f.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const f of DETAIL_FIELDS) {
			const codes = f.options.map((o) => o.code);
			expect(new Set(codes).size).toBe(codes.length);
			expect(f.id.startsWith(`${DETAIL_GROUPS.find((g) => g.fields.includes(f))!.id}.`)).toBe(true);
		}
		expect(PRACTICE_EXPERIENCES).toHaveLength(3);
		expect(COMMITMENTS).toHaveLength(3);
	});

	it('vise des instruments qui existent au référentiel', () => {
		const all = Object.entries(instrumentsByFamily).flatMap(([family, list]) =>
			(list as [string, string][]).map(([slug]) => ({ slug, family }))
		);
		for (const g of DETAIL_GROUPS) expect(all.some((i) => g.appliesTo(i))).toBe(true);
	});
});

describe('précisions selon l’instrument', () => {
	it('Thomas, guitare + chant : les deux blocs, sans doublon', () => {
		expect(detailGroupsFor([guitar, voice]).map((g) => g.id)).toEqual(['voice', 'guitar']);
	});

	it('batterie seule : son bloc ; oud : rien à préciser', () => {
		expect(detailGroupsFor([drums]).map((g) => g.id)).toEqual(['drums']);
		expect(detailGroupsFor([oud])).toEqual([]);
	});

	it('garde les codes cochés, dans l’ordre, et retire les champs vides', () => {
		expect(
			checkDetails(
				{ 'voice.languages': ['EN', 'FR'], 'guitar.role': [], 'voice.range': ['UNKNOWN'] },
				[guitar, voice]
			)
		).toEqual({
			ok: true,
			details: { 'voice.languages': ['FR', 'EN'], 'voice.range': ['UNKNOWN'] }
		});
	});

	it('ignore les champs d’un instrument que la personne n’a plus', () => {
		expect(checkDetails({ 'drums.options': ['CLICK'] }, [oud])).toEqual({ ok: true, details: {} });
	});

	it('refuse un champ ou un code inconnu, et deux valeurs pour un choix unique', () => {
		expect(checkDetails({ 'voice.color': ['X'] }, [voice])).toMatchObject({ ok: false });
		expect(checkDetails({ 'voice.languages': ['KLINGON'] }, [voice])).toMatchObject({
			ok: false,
			field: 'voice.languages'
		});
		expect(checkDetails({ 'voice.range': ['TENOR', 'BASS'] }, [voice])).toMatchObject({
			ok: false,
			message: 'Un seul choix possible.'
		});
	});
});

describe('correspondance avec lookingFor', () => {
	it('couvre chaque valeur, vers un code du bon catalogue, sans doublon', () => {
		const refs = LOOKING_FOR.map((v) => LOOKING_FOR_INTENTS[v]);
		expect(new Set(refs.map((r) => `${r.direction}:${r.code}`)).size).toBe(LOOKING_FOR.length);
		for (const r of refs) {
			const list = r.direction === 'OFFER' ? 'offers' : 'needs';
			expect(catalogOf('MUSICIAN', list).map((e) => e.code)).toContain(r.code);
		}
	});

	it('fait l’aller-retour exact', () => {
		for (const v of LOOKING_FOR) expect(lookingForOf(intentsOfLookingFor([v]))).toEqual([v]);
		expect(lookingForOf(intentsOfLookingFor([...LOOKING_FOR]))).toEqual([...LOOKING_FOR]);
	});

	it('ignore les choix sans équivalent', () => {
		expect(lookingForOf({ offers: ['PLAY_JAMS'], needs: ['FIND_PARTNERS', 'FIND_JAMS'] })).toEqual([
			'JAMS'
		]);
	});
});

describe('musicianStepSchema', () => {
	it('exige expérience et engagement, avec un message par champ', () => {
		const result = musicianStepSchema.safeParse({});
		expect(result.success).toBe(false);
		if (!result.success)
			expect(result.error.issues.map((i) => i.path[0]).sort()).toEqual([
				'commitment',
				'practiceExperience'
			]);
	});

	it('accepte Thomas : propose des jams, recherche partenaires et jams', () => {
		const result = musicianStepSchema.safeParse({
			practiceExperience: 'WITH_OTHERS',
			commitment: 'REGULAR',
			offers: ['PLAY_JAMS'],
			needs: ['FIND_PARTNERS', 'FIND_JAMS']
		});
		expect(result.success).toBe(true);
	});

	it('refuse un code de l’offre dans la demande, et une spécialité retirée inconnue', () => {
		const result = musicianStepSchema.safeParse({
			practiceExperience: 'SOLO',
			commitment: 'OCCASIONAL',
			needs: ['PLAY_JAMS'],
			specializations: ['COOK']
		});
		expect(result.success).toBe(false);
		if (!result.success)
			expect(result.error.issues.map((i) => i.path.join('.')).sort()).toEqual([
				'needs.0',
				'specializations.0'
			]);
	});
});
