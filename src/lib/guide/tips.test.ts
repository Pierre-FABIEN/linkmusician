import { describe, expect, it } from 'vitest';
import { GUIDED_SCREENS, KEY_SCREENS, tipFor, TIPS, type TipContext } from './tips';

const fresh: TipContext = {
	playedWith: 0,
	appreciationsGiven: 0,
	networkSize: 0,
	media: 0,
	opportunities: 0
};

describe('catalogue des conseils', () => {
	it('aucun écran clé sans conseil : chacun a un conseil sans condition', () => {
		for (const screen of KEY_SCREENS) {
			expect(
				TIPS.some((t) => t.screen === screen && !t.when),
				screen
			).toBe(true);
		}
	});

	it('jamais sur un écran déjà guidé par « Ta prochaine étape »', () => {
		for (const t of TIPS) expect(GUIDED_SCREENS as readonly string[]).not.toContain(t.screen);
	});

	it('identifiants uniques, textes courts, liens internes', () => {
		expect(new Set(TIPS.map((t) => t.id)).size).toBe(TIPS.length);
		for (const t of TIPS) {
			expect(t.text.length, t.id).toBeLessThanOrEqual(200);
			if (t.link) expect(t.link.href, t.id).toMatch(/^\/[a-z]/);
		}
	});

	it('ton d’encouragement, jamais de reproche (07 §7)', () => {
		for (const t of TIPS) {
			expect(t.text, t.id).not.toMatch(
				/n’as pas|n'as pas|toujours pas|encore rien|il faut|tu dois|dépêche|urgent/i
			);
		}
	});
});

describe('choix du conseil', () => {
	it('un seul conseil, le premier dont la condition tient', () => {
		expect(tipFor('profil', fresh, [])?.id).toBe('profil-demo');
		expect(tipFor('profil', { ...fresh, playedWith: 2 }, [])?.id).toBe('profil-apprecier');
		expect(tipFor('profil', { ...fresh, media: 1 }, [])?.id).toBe('profil-public');
	});

	it('un conseil masqué ne revient pas ; tout masqué : rien', () => {
		expect(tipFor('profil', fresh, ['profil-demo'])?.id).toBe('profil-public');
		expect(tipFor('profil', fresh, ['profil-demo', 'profil-public'])).toBeNull();
	});

	it('ne renvoie que l’utile au navigateur', () => {
		expect(Object.keys(tipFor('profil', fresh, [])!).sort()).toEqual(['id', 'link', 'text']);
		expect(Object.keys(tipFor('annonces', fresh, [])!).sort()).toEqual(['id', 'text']);
	});
});
