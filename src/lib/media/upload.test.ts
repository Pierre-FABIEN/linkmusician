import { describe, expect, it } from 'vitest';
import { checkDeclaredFile, folderOf, resourceTypeOf, uploadKindOf } from './upload';

describe('envoi de fichiers', () => {
	it.each([
		['image/jpeg', 'IMAGE'],
		['audio/mpeg', 'AUDIO'],
		['AUDIO/WAV', 'AUDIO'],
		['video/quicktime', 'VIDEO'],
		['image/svg+xml', null],
		['application/pdf', null]
	])('%s → %s', (mime, kind) => {
		expect(uploadKindOf(mime)).toBe(kind);
	});

	it('range l’audio parmi les vidéos chez Cloudinary', () => {
		expect(resourceTypeOf('AUDIO')).toBe('video');
		expect(resourceTypeOf('IMAGE')).toBe('image');
	});

	it('cantonne chaque acteur à son dossier', () => {
		expect(folderOf('cmw2abc')).toBe('linkmusician/actors/cmw2abc');
		expect(() => folderOf('../autre')).toThrow();
	});

	it.each([
		[
			{ mimeType: 'audio/mpeg', bytes: 5e6 },
			{ ok: true, kind: 'AUDIO' }
		],
		[
			{ mimeType: 'image/png', bytes: 11 * 1024 * 1024 },
			{ ok: false, reason: 'too_big' }
		],
		[
			{ mimeType: 'video/mp4', bytes: 0 },
			{ ok: false, reason: 'too_big' }
		],
		[
			{ mimeType: 'image/svg+xml', bytes: 1000 },
			{ ok: false, reason: 'type' }
		]
	] as const)('%o', (file, expected) => {
		expect(checkDeclaredFile(file)).toEqual(expected);
	});
});
