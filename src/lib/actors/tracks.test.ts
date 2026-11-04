import { describe, expect, it } from 'vitest';
import {
	checkTrackSelection,
	isTrackKind,
	suggestPrimary,
	TRACK_KINDS,
	TRACK_LIST,
	TRACKS
} from './tracks';
import { tracksSchema } from '#lib/schema/actors/tracksSchema';

describe('référentiel des métiers', () => {
	it('décrit chaque métier, dans l’ordre d’affichage', () => {
		expect(TRACK_LIST.map((t) => t.kind)).toEqual([...TRACK_KINDS]);
		for (const kind of TRACK_KINDS) {
			expect(TRACKS[kind].kind).toBe(kind);
			expect(TRACKS[kind].label.trim()).not.toBe('');
			expect(TRACKS[kind].description.trim()).not.toBe('');
		}
	});

	it('ouvre seulement « musicien » au lancement (D15)', () => {
		expect(TRACK_LIST.filter((t) => t.available).map((t) => t.kind)).toEqual(['MUSICIAN']);
	});

	it('reconnaît les valeurs de l’enum', () => {
		expect(isTrackKind('PRODUCER')).toBe(true);
		expect(isTrackKind('producer')).toBe(false);
		expect(isTrackKind(42)).toBe(false);
	});
});

describe('checkTrackSelection', () => {
	it('refuse une sélection vide', () => {
		expect(checkTrackSelection([], 'MUSICIAN')).toEqual({ ok: false, reason: 'empty' });
	});

	it('rend principal le métier unique, quel que soit le principal envoyé', () => {
		expect(checkTrackSelection(['PRODUCER'], undefined)).toEqual({
			ok: true,
			selection: { tracks: ['PRODUCER'], primary: 'PRODUCER' }
		});
		expect(checkTrackSelection(['PRODUCER'], 'MUSICIAN')).toMatchObject({
			ok: true,
			selection: { primary: 'PRODUCER' }
		});
	});

	it('exige un principal parmi les métiers cochés quand il y en a plusieurs', () => {
		expect(checkTrackSelection(['MUSICIAN', 'PRODUCER'], undefined)).toEqual({
			ok: false,
			reason: 'primary'
		});
		expect(checkTrackSelection(['MUSICIAN', 'PRODUCER'], 'MANAGER')).toEqual({
			ok: false,
			reason: 'primary'
		});
	});

	it('dédoublonne et remet dans l’ordre du référentiel', () => {
		expect(checkTrackSelection(['PRODUCER', 'MUSICIAN', 'PRODUCER'], 'PRODUCER')).toEqual({
			ok: true,
			selection: { tracks: ['MUSICIAN', 'PRODUCER'], primary: 'PRODUCER' }
		});
	});
});

describe('suggestPrimary', () => {
	it('garde le principal encore coché', () => {
		expect(suggestPrimary(['MUSICIAN', 'PRODUCER'], 'PRODUCER')).toBe('PRODUCER');
	});

	it('reprend le premier métier coché sinon', () => {
		expect(suggestPrimary(['PRODUCER', 'MUSICIAN'], 'MANAGER')).toBe('MUSICIAN');
		expect(suggestPrimary(['BOOKER'], undefined)).toBe('BOOKER');
		expect(suggestPrimary([], 'MUSICIAN')).toBeNull();
	});
});

describe('tracksSchema', () => {
	it('accepte deux métiers et un principal', () => {
		const result = tracksSchema.safeParse({ tracks: ['MUSICIAN', 'BOOKER'], primary: 'BOOKER' });
		expect(result.success).toBe(true);
	});

	it('place l’erreur sur le bon champ', () => {
		const empty = tracksSchema.safeParse({ tracks: [] });
		expect(empty.success).toBe(false);
		expect(empty.error?.issues[0].path).toEqual(['tracks']);

		const noPrimary = tracksSchema.safeParse({ tracks: ['MUSICIAN', 'BOOKER'] });
		expect(noPrimary.error?.issues[0].path).toEqual(['primary']);
	});

	it('refuse un métier inconnu', () => {
		expect(tracksSchema.safeParse({ tracks: ['DJ'], primary: 'DJ' }).success).toBe(false);
	});
});
