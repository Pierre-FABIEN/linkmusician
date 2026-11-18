import { describe, expect, it } from 'vitest';
import {
	LATER_DAYS,
	NO_CHOICES,
	NO_NEXT_FACTS,
	NOT_FOR_ME_RULES,
	candidatesFrom,
	canDecline,
	canPostpone,
	fingerprint,
	hiddenBy,
	laterActive,
	laterUntil,
	parseTarget,
	rankSuggestions,
	ruleOfKey,
	SUGGESTION_KEY,
	targetOf,
	type Candidate,
	type ChoiceState,
	type NextFacts,
	type SuggestionRank
} from './index';

const DAY = 86_400_000;
const now = new Date('2026-11-18T12:00:00Z');
const at = (days: number) => new Date(now.getTime() + days * DAY);

const cand = (rank: SuggestionRank, id: string, over: Partial<Candidate> = {}): Candidate => ({
	rule: rank >= 4 ? 'prod.mix' : rank === 3 ? 'crea.demo' : 'credit.confirm',
	rank,
	branch: 'PRODUCTION',
	subject: { type: 'WORK', id },
	title: `Titre ${id}`,
	why: 'Un fait.',
	href: `/morceaux/${id}`,
	cta: 'Voir',
	deadline: null,
	waitingSince: null,
	fact: 'MIXING|',
	...over
});

const later = (target: string, version: string, until = at(10)): ChoiceState => ({
	later: [{ target, version, until }],
	notForMe: []
});

const keys = (list: Candidate[], choices: ChoiceState, when = now) =>
	rankSuggestions(list, { scope: 'DETAIL', perRule: 9, maxOptional: 9, choices, now: when }).map(
		(s) => s.key
	);

describe('Plus tard (N4, Q-NL-4)', () => {
	it('dure 30 jours, calculés par le serveur', () => {
		expect(LATER_DAYS).toBe(30);
		expect(laterUntil(now).toISOString()).toBe('2026-12-18T12:00:00.000Z');
	});

	it('masque la suggestion pendant le report, puis la rend à l’échéance', () => {
		const c = cand(4, 'w1');
		const v = fingerprint(c.fact);
		expect(keys([c], later('prod.mix:WORK:w1', v, at(30)))).toEqual([]);
		expect(keys([c], later('prod.mix:WORK:w1', v, at(30)), at(30))).toEqual(['prod.mix:WORK:w1']);
		expect(laterActive({ version: v, until: at(-1) }, v, now)).toBe(false);
	});

	it('revient plus tôt quand son fait déclencheur change', () => {
		const before = cand(4, 'w1', { fact: 'MIXING|' });
		const choices = later('prod.mix:WORK:w1', fingerprint(before.fact));
		// Une personne du réseau qui mixe apparaît : le fait n'est plus le même.
		const after = cand(4, 'w1', { fact: 'MIXING|ines' });
		expect(keys([before], choices)).toEqual([]);
		expect(keys([after], choices)).toEqual(['prod.mix:WORK:w1']);
	});

	it('la clé ne dépend pas de la formulation : un titre réécrit reste reporté', () => {
		const c = cand(4, 'w1');
		const choices = later('prod.mix:WORK:w1', fingerprint(c.fact));
		expect(keys([{ ...c, title: 'Nouvelle phrase', why: 'Autre raison.' }], choices)).toEqual([]);
	});

	it('ne touche que l’objet reporté : les autres restent', () => {
		const choices = later('prod.mix:WORK:w1', fingerprint('MIXING|'));
		expect(keys([cand(4, 'w1'), cand(4, 'w2')], choices)).toEqual(['prod.mix:WORK:w2']);
	});

	it('une suggestion reportée laisse sa place à la suivante, avant la troncature', () => {
		const list = [cand(3, 'a'), cand(3, 'b'), cand(3, 'c'), cand(3, 'd')];
		const choices = later('crea.demo:WORK:a', fingerprint('MIXING|'));
		const out = rankSuggestions(list, { scope: 'HOME', perRule: 9, choices, now });
		expect(out.map((s) => s.subject.id)).toEqual(['b', 'c', 'd']);
	});

	it('le tri reste déterministe après filtrage', () => {
		const list = [cand(4, 'c'), cand(3, 'b'), cand(4, 'a'), cand(3, 'z')];
		const choices = later('crea.demo:WORK:b', fingerprint('MIXING|'));
		const once = keys(list, choices);
		expect(keys([...list].reverse(), choices)).toEqual(once);
		expect(once).toEqual(['crea.demo:WORK:z', 'prod.mix:WORK:a', 'prod.mix:WORK:c']);
	});
});

describe('Pas pour moi (N4, Q-NL-4)', () => {
	it('écarte une règle des rangs 4 et 5 jusqu’à réactivation, quelle que soit la date', () => {
		const choices: ChoiceState = { later: [], notForMe: ['rule:prod.mix'] };
		expect(keys([cand(4, 'w1'), cand(4, 'w2')], choices, at(400))).toEqual([]);
		// Réactiver = retirer la cible : la suggestion revient.
		expect(keys([cand(4, 'w1')], NO_CHOICES, at(400))).toEqual(['prod.mix:WORK:w1']);
	});

	it('écarte une branche entière, sauf ses demandes et son travail en cours', () => {
		const choices: ChoiceState = { later: [], notForMe: ['branch:PRODUCTION'] };
		const list = [
			cand(4, 'w1'),
			cand(5, 'w2', { rule: 'trial.within_reach' }),
			cand(3, 'w3', { rule: 'work.step' }),
			cand(2, 'w4')
		];
		expect(keys(list, choices)).toEqual(['credit.confirm:WORK:w4', 'work.step:WORK:w3']);
	});

	it('une branche écartée ne retire pas les objectifs, qui n’appartiennent à aucune branche', () => {
		const objective = cand(5, 'demo.first', {
			rule: 'objective',
			branch: 'EQUIPE',
			subject: { type: 'OBJECTIVE', id: 'demo.first' }
		});
		expect(keys([objective], { later: [], notForMe: ['branch:EQUIPE'] })).toHaveLength(1);
		expect(keys([objective], { later: [], notForMe: ['rule:objective'] })).toEqual([]);
	});
});

describe('rangs 1 et 2 : jamais masquables', () => {
	it('ni reportés ni écartés, même avec une clé ou une branche correspondante', () => {
		const blocking = cand(1, 'c1', {
			rule: 'collab.confirm',
			subject: { type: 'COLLABORATION', id: 'c1' }
		});
		const request = cand(2, 'w1');
		const choices: ChoiceState = {
			later: [
				{ target: 'collab.confirm:COLLABORATION:c1', version: fingerprint(''), until: at(10) },
				{ target: 'credit.confirm:WORK:w1', version: fingerprint('MIXING|'), until: at(10) }
			],
			notForMe: ['branch:PRODUCTION', 'rule:prod.mix']
		};
		expect(keys([blocking, request], choices)).toHaveLength(2);
		expect(canPostpone(blocking)).toBe(false);
		expect(canDecline(request)).toBe(false);
	});

	it('Plus tard dès le rang 3, Pas pour moi aux rangs 4 et 5 seulement', () => {
		expect(canPostpone(cand(3, 'a'))).toBe(true);
		expect(canDecline(cand(3, 'a'))).toBe(false);
		expect(canDecline(cand(4, 'a'))).toBe(true);
		expect(canDecline(cand(5, 'a', { rule: 'trial.within_reach' }))).toBe(true);
		// Un rang 3 ne se masque pas en écartant sa branche.
		const step = cand(3, 'w', { rule: 'work.step' });
		const s = { ...step, key: 'work.step:WORK:w', version: fingerprint(step.fact) };
		expect(hiddenBy(s, { later: [], notForMe: ['branch:PRODUCTION'] }, now)).toBe(false);
	});
});

describe('cibles et clés acceptées', () => {
	it('« Pas pour moi » n’accepte qu’une règle des rangs 4–5 ou une branche connue', () => {
		for (const rule of NOT_FOR_ME_RULES)
			expect(targetOf(parseTarget(`rule:${rule}`)!)).toBe(`rule:${rule}`);
		expect(parseTarget('branch:SCENE')).toEqual({ type: 'branch', branch: 'SCENE' });
		for (const forged of [
			'rule:credit.confirm',
			'rule:collab.confirm',
			'rule:work.step',
			'branch:INCONNUE',
			'rule:prod.mix:extra',
			'prod.mix',
			'',
			'rule:'
		])
			expect(parseTarget(forged)).toBeNull();
	});

	it('une clé de suggestion a une forme stricte', () => {
		expect(SUGGESTION_KEY.test('prod.mix:WORK:cmabc123')).toBe(true);
		expect(SUGGESTION_KEY.test('objective:OBJECTIVE:demo.first')).toBe(true);
		expect(ruleOfKey('team.fill_role:WORK:w1')).toBe('team.fill_role');
		for (const forged of [
			'prod.mix:WORK:',
			'x',
			'prod.mix:work:w1',
			'prod.mix:WORK:a b',
			`prod.mix:WORK:${'a'.repeat(65)}`
		])
			expect(ruleOfKey(forged)).toBeNull();
	});

	it('l’empreinte est stable et ne contient pas le fait en clair', () => {
		expect(fingerprint('MIXING|ines')).toBe(fingerprint('MIXING|ines'));
		expect(fingerprint('MIXING|ines')).not.toBe(fingerprint('MIXING|'));
		expect(fingerprint('MIXING|ines')).not.toMatch(/ines/);
	});

	it('chaque règle produit un fait déterministe (les mêmes faits, la même empreinte)', () => {
		const f: NextFacts = {
			reader: { adult: true, ambition: 'RECORD' },
			...NO_NEXT_FACTS,
			works: [
				{
					workId: 'w1',
					title: 'Aube',
					need: 'MIXING',
					pros: [{ handle: 'ines', displayName: 'Inès', craft: 'SOUND_ENGINEER' }],
					openRoles: [],
					hasOpenOpportunity: false
				}
			]
		};
		const a = candidatesFrom(f);
		const b = candidatesFrom(structuredClone(f));
		expect(a.map((c) => c.fact)).toEqual(b.map((c) => c.fact));
		expect(a[0].fact).not.toBe('');
	});
});
