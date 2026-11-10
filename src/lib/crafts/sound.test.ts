import { describe, expect, it } from 'vitest';
import {
	checkReference,
	CRAFT_MOBILITY,
	CRAFT_MOBILITY_LABELS,
	isSoundProfileListed,
	MAX_REFERENCE_TITLE,
	MAX_REFERENCES,
	normalizeGear,
	SOUND_SPECIALTIES,
	SOUND_SPECIALTY_INFO
} from './sound';
import { soundProfileSchema } from '#lib/schema/crafts/soundProfileSchema';

describe('référentiel de l’ingé son (P4-02)', () => {
	it('libelle chaque spécialité et chaque mobilité', () => {
		for (const s of SOUND_SPECIALTIES) expect(SOUND_SPECIALTY_INFO[s].label.trim()).not.toBe('');
		for (const m of CRAFT_MOBILITY) expect(CRAFT_MOBILITY_LABELS[m].trim()).not.toBe('');
	});

	it('trouvable dès qu’une spécialité est cochée', () => {
		expect(isSoundProfileListed({ specialties: [] })).toBe(false);
		expect(isSoundProfileListed({ specialties: ['MIXING'] })).toBe(true);
	});
});

describe('checkReference', () => {
	it('complète le lien et resserre le titre', () => {
		expect(checkReference({ title: '  Mix   EP ', url: 'soundcloud.com/a' })).toEqual({
			ok: true,
			reference: { title: 'Mix EP', url: 'https://soundcloud.com/a' }
		});
	});

	it.each([
		[{ title: '', url: 'soundcloud.com/a' }, 'title'],
		[{ title: 'x'.repeat(MAX_REFERENCE_TITLE + 1), url: 'soundcloud.com/a' }, 'title'],
		[{ title: 'Mix', url: 'localhost' }, 'url'],
		[{ title: 'Mix', url: 'javascript:alert(1)' }, 'url'],
		[{ title: 'Mix', url: 'https://user:pass@site.fr' }, 'url']
	])('refuse %j (%s)', (input, field) => {
		expect(checkReference(input)).toMatchObject({ ok: false, field });
	});
});

describe('normalizeGear', () => {
	it('retire les lignes vides et resserre les espaces', () => {
		expect(normalizeGear(' Pro  Tools \n\n\n  U87 ')).toBe('Pro Tools\nU87');
	});
});

describe('soundProfileSchema', () => {
	const base = { specialties: [], mobility: [], gear: '', references: [] };

	it('ignore les lignes de travaux vides', () => {
		expect(
			soundProfileSchema.safeParse({ ...base, references: [{ title: '', url: '' }] }).success
		).toBe(true);
	});

	it('signale le champ fautif d’un travail', () => {
		const result = soundProfileSchema.safeParse({
			...base,
			references: [{ title: 'Mix', url: 'pas une adresse' }]
		});
		expect(result.success).toBe(false);
		expect(result.error?.issues[0].path).toEqual(['references', 0, 'url']);
	});

	it(`limite à ${MAX_REFERENCES} travaux`, () => {
		const references = Array.from({ length: MAX_REFERENCES + 1 }, (_, i) => ({
			title: `Mix ${i}`,
			url: `soundcloud.com/a/${i}`
		}));
		expect(soundProfileSchema.safeParse({ ...base, references }).success).toBe(false);
	});
});
