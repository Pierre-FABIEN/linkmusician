import { describe, expect, it } from 'vitest';
import { parseExternalMedia } from './external';
import { checkUpload, normalizeTitle, publishedEventKind, readyStatus } from './rules';

describe('liens externes', () => {
	it.each([
		[
			'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s',
			'YOUTUBE',
			'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
			'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'
		],
		[
			'youtu.be/dQw4w9WgXcQ?si=abc',
			'YOUTUBE',
			'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
			'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'
		],
		[
			'https://m.youtube.com/shorts/dQw4w9WgXcQ',
			'YOUTUBE',
			'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
			'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'
		],
		[
			'https://soundcloud.com/lea/mon-titre?utm_source=x',
			'SOUNDCLOUD',
			'https://soundcloud.com/lea/mon-titre',
			'https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Flea%2Fmon-titre&visual=false'
		],
		[
			'https://soundcloud.com/lea/sets/ep',
			'SOUNDCLOUD',
			'https://soundcloud.com/lea/sets/ep',
			'https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Flea%2Fsets%2Fep&visual=false'
		],
		['https://on.soundcloud.com/AbC12', 'SOUNDCLOUD', 'https://on.soundcloud.com/AbC12', null],
		[
			'http://lea.bandcamp.com/album/premier-ep',
			'BANDCAMP',
			'https://lea.bandcamp.com/album/premier-ep',
			null
		]
	])('%s', (input, provider, url, embedUrl) => {
		expect(parseExternalMedia(input)).toEqual({ ok: true, media: { provider, url, embedUrl } });
	});

	it.each([
		['https://vimeo.com/123', 'provider'],
		['https://evil-youtube.com/watch?v=dQw4w9WgXcQ', 'provider'],
		['https://www.youtube.com/@lea', 'not_media'],
		['https://www.youtube.com/watch?v=court', 'not_media'],
		['https://soundcloud.com/lea', 'not_media'],
		['https://lea.bandcamp.com/', 'not_media'],
		['javascript:alert(1)', 'format'],
		['https://user:pw@youtube.com/watch?v=dQw4w9WgXcQ', 'format'],
		['', 'format']
	])('refuse %s (%s)', (input, reason) => {
		expect(parseExternalMedia(input)).toEqual({ ok: false, reason });
	});
});

describe('règles des médias', () => {
	it.each([
		['AUDIO', 50e6, 300, { ok: true }],
		['AUDIO', 50e6, 601, { ok: false, reason: 'too_long' }],
		['VIDEO', 150e6, 180, { ok: true }],
		['VIDEO', 150e6, 181, { ok: false, reason: 'too_long' }],
		['VIDEO', 210 * 1024 * 1024, 60, { ok: false, reason: 'too_big' }],
		['IMAGE', 5e6, null, { ok: true }],
		['IMAGE', 11 * 1024 * 1024, null, { ok: false, reason: 'too_big' }],
		['AUDIO', 1e6, null, { ok: false, reason: 'unreadable' }],
		['VIDEO', 1e6, null, { ok: false, reason: 'unreadable' }]
	] as const)('%s, %i octets, %s s', (kind, bytes, durationSec, expected) => {
		expect(checkUpload(kind, { bytes, durationSec })).toEqual(expected);
	});

	it('publie d’office à partir de TL1, sinon attend la modération', () => {
		expect(readyStatus(0)).toBe('PENDING_REVIEW');
		expect(readyStatus(1)).toBe('PUBLISHED');
		expect(readyStatus(3)).toBe('PUBLISHED');
	});

	it.each([
		[{ kind: 'EXTERNAL_LINK', isDemo: true }, 'DEMO'],
		[{ kind: 'AUDIO', isDemo: true }, 'DEMO'],
		[{ kind: 'IMAGE', isDemo: true }, 'PHOTO'],
		[{ kind: 'VIDEO', isDemo: false }, 'VIDEO'],
		[{ kind: 'EXTERNAL_LINK', isDemo: false }, 'VIDEO']
	] as const)('%o → %s', (media, kind) => {
		expect(publishedEventKind(media)).toBe(kind);
	});

	it('nettoie le titre', () => {
		expect(normalizeTitle('  Ma\u0000 démo \n live  ')).toBe('Ma démo live');
		expect(normalizeTitle('x'.repeat(200))).toHaveLength(120);
	});
});
