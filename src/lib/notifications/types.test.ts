import { describe, expect, it } from 'vitest';
import { badgeLabel, isNotificationType, notificationText, NOTIFICATION_TYPES } from './types';

describe('notifications : textes', () => {
	it('chaque type a un texte qui nomme la personne et le contexte', () => {
		for (const type of NOTIFICATION_TYPES) {
			const text = notificationText(type, 'Ana', 'Jam funk');
			expect(text.length).toBeGreaterThan(10);
			if (type !== 'CONTACT_REQUEST') expect(text).toMatch(/Jam funk/);
			// Sans expéditeur : une acceptation, une décision de la modération (P5-03b),
			// une jam annulée (#91a : on prévient sans dire qui annule).
			const anonymous = ['APPLICATION_ACCEPTED', 'VENUE_CLAIM', 'JAM_CANCELLED'];
			if (!anonymous.includes(type)) expect(text).toMatch(/^Ana /);
		}
	});

	it('sans nom ni titre, le texte reste correct', () => {
		expect(notificationText('CONTACT_REQUEST', null, null)).toBe(
			'Quelqu’un aimerait échanger avec toi.'
		);
		expect(notificationText('APPLICATION_ACCEPTED', null, null)).not.toMatch(/«|undefined|null/);
		expect(notificationText('JAM_CANCELLED', 'Ana', 'Jam funk')).toBe(
			'La jam « Jam funk » est annulée. Ne te déplace pas.'
		);
	});

	it('jamais culpabilisant (conception 07 §7)', () => {
		for (const type of NOTIFICATION_TYPES) {
			expect(notificationText(type, 'Ana', 'X')).not.toMatch(
				/pas encore répondu|n’as pas|n'as pas|dernière chance|\bvite\b|\brates?\b|urgent/i
			);
		}
	});

	it('pastille bornée à 9+', () => {
		expect(badgeLabel(3)).toBe('3');
		expect(badgeLabel(10)).toBe('9+');
	});

	it('reconnaît les types', () => {
		expect(isNotificationType('JAM_INVITE')).toBe(true);
		expect(isNotificationType('MESSAGE')).toBe(false);
		expect(isNotificationType(42)).toBe(false);
	});
});
