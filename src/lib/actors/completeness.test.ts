import { describe, expect, it } from 'vitest';
import { profileCompleteness, type CompletenessInput } from './completeness';

const base: CompletenessInput = {
	tracks: [
		{ track: 'MUSICIAN', isPrimary: true },
		{ track: 'PROMOTER', isPrimary: false }
	],
	instruments: [{ name: 'Guitare', level: 3, isPrimary: true }],
	genres: ['Rock'],
	commune: 'Toulouse',
	radiusKm: 30,
	musician: {
		practiceExperience: 'STAGE',
		commitment: 'REGULAR',
		specializations: [],
		offers: ['PLAY_JAMS'],
		needs: [],
		answers: {}
	},
	details: {
		PROMOTER: {
			specializations: ['CONCERTS'],
			offers: ['CONCERT_DATES'],
			needs: ['FIND_ARTISTS'],
			answers: { structure: ['ASSOCIATION'], territory: ['LOCAL'] }
		}
	},
	openToRequests: { MUSICIAN: true, PROMOTER: null }
};

const ids = (items: { id: string }[]) => items.map((i) => i.id);
const of = (c: ReturnType<typeof profileCompleteness>, track: string) =>
	c.tracks.find((t) => t.track === track)!;

describe('complétude par métier (D61)', () => {
	it('deux métiers, deux fiches séparées ; la ville comptée une fois, à part', () => {
		const c = profileCompleteness({ ...base, commune: null });
		expect(c.tracks.map((t) => t.track)).toEqual(['MUSICIAN', 'PROMOTER']);
		expect(ids(c.common)).toEqual(['commune']);
		expect(ids(of(c, 'MUSICIAN').missing)).not.toContain('commune');
		expect(ids(of(c, 'PROMOTER').missing)).not.toContain('commune');
	});

	it('profil exploitable : rien ne manque, les facultatifs ne pénalisent pas', () => {
		const c = profileCompleteness(base);
		expect(of(c, 'MUSICIAN').missing).toEqual([]);
		expect(of(c, 'PROMOTER').missing).toEqual([]);
		// Facultatifs proposés « pour aller plus loin » : précisions de concert, sollicitations.
		expect(ids(of(c, 'PROMOTER').optional)).toEqual(
			expect.arrayContaining(['concert_lineup', 'concert_pay', 'openToRequests'])
		);
	});

	it('sans offre, le métier n’est pas exploitable comme prestataire (D62)', () => {
		const c = profileCompleteness({
			...base,
			details: { PROMOTER: { ...base.details.PROMOTER!, offers: [] } }
		});
		const offers = of(c, 'PROMOTER').missing.find((i) => i.id === 'offers');
		expect(offers?.benefit).toMatch(/prestataire/);
		expect(offers?.href).toBe('/profil/metier/organisateur');
	});

	it('un champ requis visible et vide manque ; masqué par sa condition, il ne compte pas', () => {
		const noStructure = { ...base.details.PROMOTER!, answers: { territory: ['LOCAL'] } };
		const c = profileCompleteness({ ...base, details: { PROMOTER: noStructure } });
		expect(ids(of(c, 'PROMOTER').missing)).toEqual(['structure']);
		// `concert_pay` ne s'affiche que si « Concerts » est coché.
		const noConcerts = { ...noStructure, specializations: ['OPEN_STAGES'] };
		const d = profileCompleteness({ ...base, details: { PROMOTER: noConcerts } });
		expect(ids(of(d, 'PROMOTER').optional)).not.toContain('concert_pay');
	});

	it('musicien·ne : instruments, expérience, engagement ; un profil ancien (null) est à compléter', () => {
		const c = profileCompleteness({
			...base,
			instruments: [],
			musician: { ...base.musician, practiceExperience: null, commitment: null }
		});
		expect(ids(of(c, 'MUSICIAN').missing)).toEqual([
			'instruments',
			'practiceExperience',
			'commitment'
		]);
		expect(of(c, 'MUSICIAN').href).toBe('/profil/pratique');
	});

	it('« ouvert aux sollicitations » non précisé : proposé, jamais compté comme un manque', () => {
		const c = profileCompleteness(base);
		expect(ids(of(c, 'PROMOTER').missing)).not.toContain('openToRequests');
		expect(ids(of(c, 'MUSICIAN').optional)).not.toContain('openToRequests');
	});

	it('un métier « bientôt » n’exige rien', () => {
		const c = profileCompleteness({
			...base,
			tracks: [...base.tracks, { track: 'LABEL_PRO', isPrimary: false }]
		});
		expect(of(c, 'LABEL_PRO')).toMatchObject({ soon: true, missing: [], optional: [] });
	});
});
