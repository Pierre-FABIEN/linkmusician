import { describe, expect, it } from 'vitest';
import { MAX_NUDGES, STALL_DAYS, isStalled, namesOf, pickNudges, type NudgeInput } from './nudges';

const DAY = 86_400_000;
const now = new Date('2026-11-11T12:00:00Z');
const ago = (days: number) => new Date(now.getTime() - days * DAY);

const lea = { handle: 'lea', displayName: 'Léa Martin' };
const jo = { handle: 'jo', displayName: 'Jo' };
const sam = { handle: 'sam', displayName: 'Sam Dupont' };

const empty: NudgeInput = { jamsSoon: 0, openRoles: [], toRecord: null };

describe('isStalled', () => {
	it('se déclenche après STALL_DAYS jours sans progrès', () => {
		expect(isStalled(ago(STALL_DAYS - 1), ago(100), now)).toBe(false);
		expect(isStalled(ago(STALL_DAYS), ago(100), now)).toBe(true);
	});

	it('compte depuis l’arrivée quand rien ne s’est encore passé', () => {
		expect(isStalled(null, ago(3), now)).toBe(false);
		expect(isStalled(null, ago(STALL_DAYS + 1), now)).toBe(true);
	});
});

describe('namesOf', () => {
	it('nomme deux personnes au plus, par leur prénom', () => {
		expect(namesOf([lea])).toBe('Léa');
		expect(namesOf([lea, jo])).toBe('Léa et Jo');
		expect(namesOf([lea, jo, sam])).toBe('Léa, Jo et 1 autre');
		expect(namesOf([lea, jo, sam, sam])).toBe('Léa, Jo et 2 autres');
	});
});

describe('pickNudges', () => {
	it('ne propose rien sans matière réelle', () => {
		expect(pickNudges(empty)).toEqual([]);
		expect(
			pickNudges({
				...empty,
				openRoles: [{ workId: 'w', workTitle: 'Lumière', instrument: 'Chant', candidates: [] }],
				toRecord: { workId: 'w', workTitle: 'Lumière', pros: [] }
			})
		).toEqual([]);
	});

	it('va du plus concret au plus large', () => {
		const nudges = pickNudges({
			jamsSoon: 3,
			openRoles: [
				{ workId: 'w1', workTitle: 'Lumière', instrument: 'Chant', candidates: [lea, jo] }
			],
			toRecord: { workId: 'w2', workTitle: 'Nuit', pros: [{ ...sam, craft: 'SOUND_ENGINEER' }] }
		});
		expect(nudges.map((n) => n.kind)).toEqual(['OPEN_ROLE', 'TO_RECORD', 'JAMS_SOON']);
		expect(nudges.length).toBeLessThanOrEqual(MAX_NUDGES);
		expect(nudges[0]).toMatchObject({
			title: '« Lumière » attend : chant',
			href: '/morceaux/w1'
		});
		expect(nudges[0].text).toContain('Léa et Jo, de ton réseau, en jouent');
		expect(nudges[1].text).toContain('Sam, ingé son de ton réseau');
		expect(nudges[1].href).toBe('/@sam');
		expect(nudges[2].title).toBe('3 jams cette semaine près de chez toi');
	});

	it('prend la première place libre que quelqu’un du réseau peut tenir', () => {
		const [nudge] = pickNudges({
			...empty,
			openRoles: [
				{ workId: 'w1', workTitle: 'A', instrument: 'Basse', candidates: [] },
				{ workId: 'w2', workTitle: 'B', instrument: 'Batterie', candidates: [jo] }
			]
		});
		expect(nudge.href).toBe('/morceaux/w2');
		expect(nudge.text).toContain('Jo, de ton réseau, en joue');
	});

	it('accorde le métier des pros nommés', () => {
		const pros = [
			{ ...sam, craft: 'PRODUCER' as const },
			{ ...lea, craft: 'PRODUCER' as const }
		];
		const [nudge] = pickNudges({ ...empty, toRecord: { workId: 'w', workTitle: 'N', pros } });
		expect(nudge.text).toContain('producteur·rices de ton réseau');
		const [mixed] = pickNudges({
			...empty,
			toRecord: { workId: 'w', workTitle: 'N', pros: [pros[0], { ...jo, craft: 'SOUND_ENGINEER' }] }
		});
		expect(mixed.text).toContain('pros du son de ton réseau');
	});

	it('une seule jam : au singulier', () => {
		expect(pickNudges({ ...empty, jamsSoon: 1 })[0].title).toBe(
			'Une jam cette semaine près de chez toi'
		);
	});

	// Relecture des textes (fiche P4-13) : aucun reproche, aucune durée d'absence.
	it('ne culpabilise jamais', () => {
		const all = pickNudges({
			jamsSoon: 2,
			openRoles: [{ workId: 'w', workTitle: 'T', instrument: 'Chant', candidates: [lea] }],
			toRecord: { workId: 'w', workTitle: 'T', pros: [{ ...sam, craft: 'SOUND_ENGINEER' }] }
		});
		const text = all
			.map((n) => `${n.title} ${n.text} ${n.cta}`)
			.join(' ')
			.toLowerCase();
		for (const banned of [
			'depuis',
			'jours',
			'inactif',
			'rien fait',
			'oublié',
			'dommage',
			'tu n’as pas',
			"tu n'as pas",
			'il faut',
			'dernière chance',
			'xp',
			'niveau'
		]) {
			expect(text).not.toContain(banned);
		}
	});
});
