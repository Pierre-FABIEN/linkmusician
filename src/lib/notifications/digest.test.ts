import { describe, expect, it } from 'vitest';
import {
	buildDigest,
	digestLines,
	digestSubject,
	DIGEST_MAX_ITEMS,
	type DigestInput
} from './digest';

const links = {
	open: 'https://app.test/notifications',
	settings: 'https://app.test/reglages#notifications',
	unsubscribe: [{ label: 'Ne plus recevoir ces emails', url: 'https://app.test/u?t=x' }]
};
const base: DigestInput = {
	displayName: 'Léa',
	notifications: [],
	unreadMessages: null,
	progress: null
};

describe('digest email', () => {
	it('rien de neuf : pas d’email', () => {
		expect(buildDigest(base, links)).toBeNull();
		expect(
			buildDigest({ ...base, unreadMessages: 0, progress: { xp: 0, achievements: [] } }, links)
		).toBeNull();
	});

	it('raconte les nouveautés, les messages et la progression', () => {
		const lines = digestLines({
			...base,
			notifications: [{ type: 'CONTACT_REQUEST', from: 'Malik', title: null }],
			unreadMessages: 2,
			progress: { xp: 120, achievements: ['Première jam'] }
		});
		expect(lines).toEqual([
			'Malik aimerait échanger avec toi.',
			'2 messages t’attendent.',
			'Ta progression : +120 XP, succès « Première jam ». Bravo !'
		]);
	});

	it('au-delà de cinq nouveautés : « et N autres »', () => {
		const notifications = Array.from({ length: DIGEST_MAX_ITEMS + 2 }, () => ({
			type: 'ENDORSEMENT' as const,
			from: 'Ana',
			title: 'fiable'
		}));
		const lines = digestLines({ ...base, notifications });
		expect(lines).toHaveLength(DIGEST_MAX_ITEMS + 1);
		expect(lines.at(-1)).toBe('Et 2 autres nouveautés.');
	});

	it('un objet court qui dit l’essentiel', () => {
		const one = { type: 'JAM_INVITE' as const, from: 'Ana', title: 'Jam funk' };
		expect(digestSubject({ ...base, notifications: [one], unreadMessages: 1 })).toBe(
			'Du neuf sur LinkMusician : 1 nouveauté et 1 message'
		);
		expect(digestSubject({ ...base, unreadMessages: 3 })).toBe(
			'3 messages t’attendent sur LinkMusician'
		);
		expect(digestSubject({ ...base, progress: { xp: 10, achievements: [] } })).toBe(
			'Ta progression sur LinkMusician'
		);
	});

	it('échappe le HTML et porte les liens de réglage et de désinscription', () => {
		const email = buildDigest(
			{ ...base, notifications: [{ type: 'CONTACT_REQUEST', from: '<b>Max</b>', title: null }] },
			links
		)!;
		expect(email.html).toContain('&lt;b&gt;Max&lt;/b&gt;');
		expect(email.html).not.toContain('<b>Max</b>');
		expect(email.text).toContain(links.settings);
		expect(email.text).toContain(links.unsubscribe[0].url);
		expect(email.html).toContain('au plus un email par jour');
	});

	it('jamais culpabilisant', () => {
		const email = buildDigest({ ...base, unreadMessages: 5 }, links)!;
		expect(`${email.subject} ${email.text}`).not.toMatch(
			/n’as pas|n'as pas|toujours pas|dernière chance|urgent/i
		);
	});
});
