import { describe, expect, it } from 'vitest';
import {
	actsToCelebrate,
	actTitle,
	BRANCHES,
	branchFigures,
	branchFromSlug,
	careerMap,
	corroboratedGigOf,
	MAX_WITHIN_REACH,
	NO_REACH,
	type CareerFacts,
	type ReachFacts
} from './map';
import { realisationKey, type Realisation } from './realisations';

const none: CareerFacts = {
	jamAppreciations: 0,
	collaborations: 0,
	worksTogether: 0,
	worksSolo: 0,
	recordings: 0,
	productions: 0,
	verifiedGigs: 0,
	tours: 0
};
const all: CareerFacts = {
	...none,
	jamAppreciations: 1,
	worksTogether: 1,
	recordings: 1,
	productions: 1,
	verifiedGigs: 1
};
const state = (facts: Partial<CareerFacts>, reach: Partial<ReachFacts> = {}) =>
	careerMap({ ...none, ...facts }, null, { ...NO_REACH, ...reach }).acts.map((a) => a.state);

const collab = (over: Partial<ReachFacts['toConfirm'][number]> = {}) => ({
	kind: 'SESSION_WORK',
	title: 'Session du jeudi',
	happenedOn: '2026-11-08',
	asProvider: false,
	bandSide: false,
	verifiedHostName: null,
	hasWork: false,
	...over
});
/** Un déclencheur pour chacune des cinq épreuves jouables. */
const everyTrigger: ReachFacts = {
	toConfirm: [
		collab(),
		collab({ kind: 'PRODUCTION', title: 'Prod', hasWork: true }),
		collab({ kind: 'GIG', title: 'Concert', bandSide: true, verifiedHostName: 'Le Bikini' })
	],
	pendingCoauthors: [{ workId: 'w1', title: 'Notre compo' }],
	declaredRecordings: [{ bandHandle: 'les-rats', bandName: 'Les Rats', manager: true }],
	corroboratedGig: false
};

describe('carte de carrière : franchissement inchangé (P3-13, D53)', () => {
	it('au départ : rien de franchi, cinq épreuves ouvertes, trois bientôt', () => {
		expect(state({})).toEqual(['open', 'open', 'open', 'open', 'open', 'soon', 'soon', 'soon']);
		expect(careerMap(none).passed).toEqual([]);
	});

	it('une jam où l’on a reçu une appréciation franchit « La rencontre »', () => {
		expect(careerMap({ ...none, jamAppreciations: 1 }).passed).toEqual([1]);
	});

	it('une collaboration confirmée franchit aussi « La rencontre »', () => {
		expect(careerMap({ ...none, collaborations: 1 }).passed).toEqual([1]);
	});

	it('un morceau composé à plusieurs franchit « La création », pas un morceau composé seul·e', () => {
		expect(careerMap({ ...none, worksTogether: 1 }).passed).toEqual([2]);
		const solo = careerMap({ ...none, worksSolo: 3 });
		expect(solo.passed).toEqual([]);
		expect(solo.soloOnly).toBe(true);
	});

	it('studio, production, scène : mêmes conditions qu’avant N2', () => {
		expect(careerMap({ ...none, recordings: 1 }).passed).toEqual([3]);
		expect(careerMap({ ...none, productions: 1 }).passed).toEqual([4]);
		expect(careerMap({ ...none, verifiedGigs: 1 }).passed).toEqual([5]);
		expect(careerMap(all).passed).toEqual([1, 2, 3, 4, 5]);
	});

	it('la tournée est une épreuve de plus, affichée, jamais bloquante (P5-08)', () => {
		const scene = (f: Partial<CareerFacts>) => careerMap({ ...none, ...f }).acts[4];
		expect(scene({}).bonusTrial).toEqual({ label: expect.stringMatching(/tournée/), done: false });
		expect(scene({ tours: 1 }).state).toBe('open');
		expect(scene({ verifiedGigs: 1 }).state).toBe('passed');
		expect(scene({ verifiedGigs: 1, tours: 1 }).bonusTrial?.done).toBe(true);
		expect(
			careerMap(none)
				.acts.filter((a) => a.bonusTrial)
				.map((a) => a.number)
		).toEqual([5]);
	});

	it('jamais l’XP : ni les faits ni les déclencheurs n’ont de champ de points', () => {
		const keys = [...Object.keys(none), ...Object.keys(NO_REACH)];
		expect(keys.some((k) => /xp|level|trust|points|score/i.test(k))).toBe(false);
	});

	it('une épreuve n’est fêtée qu’une fois (numéros internes inchangés)', () => {
		expect(actsToCelebrate([1, 2], [])).toEqual([1, 2]);
		expect(actsToCelebrate([1, 2], [1])).toEqual([2]);
		expect(actsToCelebrate([1], [1])).toEqual([]);
		expect(careerMap(all).acts.map((a) => a.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
	});
});

describe('carte parallèle : aucun acte en cours (N2, Q-NL-1)', () => {
	it('plus de pointeur unique ni de numéro romain dans les données affichées', () => {
		const map = careerMap(none);
		expect(map).not.toHaveProperty('current');
		for (const a of map.acts) {
			expect(a).not.toHaveProperty('roman');
			expect(`${a.name} ${a.content} ${a.trial}`).not.toMatch(/\b(Acte|[IVX]+ ·)/);
		}
		expect(actTitle(2)).toBe('La création');
		expect(actTitle(5)).toBe('La scène');
	});

	it('groupe de scène (scénario B) : Scène franchie, Création reste ouverte, rien d’« en cours »', () => {
		const map = careerMap({ ...none, verifiedGigs: 1, tours: 1 });
		expect(map.passed).toEqual([5]);
		expect(map.acts[1].state).toBe('open');
		expect(map.withinReach).toEqual([]);
		expect(map.branches.find((b) => b.branch === 'SCENE')?.passedCount).toBe(1);
		expect(map.branches.find((b) => b.branch === 'CREATION')?.passedCount).toBe(0);
	});

	it('groupe de studio (scénario C) : Studio franchi sans jamais la scène', () => {
		const map = careerMap({ ...none, recordings: 1, productions: 1 });
		expect(map.passed).toEqual([3, 4]);
		expect(map.acts[4].state).toBe('open');
		expect(map.branches.find((b) => b.branch === 'PRODUCTION')?.passedCount).toBe(2);
	});

	it('plusieurs branches avancent en même temps, chacune pour elle', () => {
		const map = careerMap({ ...none, collaborations: 2, verifiedGigs: 1 });
		const passed = Object.fromEntries(map.branches.map((b) => [b.branch, b.passedCount]));
		expect(passed).toEqual({
			EQUIPE: 1,
			CREATION: 0,
			PRODUCTION: 0,
			SCENE: 1,
			DIFFUSION: 0,
			ACCOMPAGNEMENT: 0
		});
	});

	it('tout ce qui est jouable est franchi : rien à portée, le reste « bientôt »', () => {
		const map = careerMap(all, 'PRO', everyTrigger);
		expect(map.withinReach).toEqual([]);
		expect(map.acts.map((a) => a.state)).toEqual([
			'passed',
			'passed',
			'passed',
			'passed',
			'passed',
			'soon',
			'soon',
			'soon'
		]);
		expect(map.branches.filter((b) => b.soon).map((b) => b.branch)).toEqual([
			'DIFFUSION',
			'ACCOMPAGNEMENT'
		]);
	});

	it('six branches, toujours dans le même ordre, avec leur adresse', () => {
		expect(careerMap(none).branches.map((b) => b.branch)).toEqual([...BRANCHES]);
		expect(branchFromSlug('scene')).toBe('SCENE');
		expect(branchFromSlug('inconnue')).toBeNull();
	});

	it('les chiffres d’une tuile sont des faits, jamais un pourcentage ; rien quand il n’y a rien', () => {
		expect(branchFigures('SCENE', none)).toEqual([]);
		expect(branchFigures('CREATION', { ...none, worksTogether: 2, worksSolo: 4 })).toEqual([
			'6 morceaux composés',
			'dont 2 à plusieurs'
		]);
		expect(branchFigures('EQUIPE', { ...none, collaborations: 1, jamAppreciations: 3 })).toEqual([
			'1 collaboration confirmée',
			'3 appréciations reçues en jam'
		]);
		for (const b of BRANCHES) expect(branchFigures(b, all).join(' ')).not.toMatch(/%|XP/);
	});
});

describe('épreuves à portée (N2)', () => {
	it('aucun fait déclencheur : aucune fausse épreuve à portée', () => {
		expect(careerMap(none).withinReach).toEqual([]);
		expect(state({}).includes('within_reach')).toBe(false);
	});

	it('une collaboration passée qui n’attend que ma confirmation met « La rencontre » à portée', () => {
		const map = careerMap(none, null, { ...NO_REACH, toConfirm: [collab()] });
		expect(map.withinReach.map((a) => a.number)).toEqual([1]);
		expect(map.withinReach[0].reach).toEqual({
			reason: '« Session du jeudi » (08/11/2026) n’attend plus que ta confirmation.',
			action: { label: 'Confirmer la collaboration', href: '/espace/a-confirmer' }
		});
	});

	it('un concert à confirmer chez un hôte vérifié met « La scène » à portée, pas chez un hôte non vérifié', () => {
		const verified = collab({ kind: 'GIG', bandSide: true, verifiedHostName: 'Le Bikini' });
		const reach = (c: ReturnType<typeof collab>) =>
			careerMap({ ...none, collaborations: 1 }, null, { ...NO_REACH, toConfirm: [c] }).acts[4];
		expect(reach(verified).state).toBe('within_reach');
		expect(reach(verified).reach?.reason).toBe(
			'Le concert du 08/11/2026 peut être vérifié par Le Bikini.'
		);
		expect(reach({ ...verified, verifiedHostName: null }).state).toBe('open');
		// Côté hôte, le concert ne franchit pas « ma » scène.
		expect(reach({ ...verified, bandSide: false }).state).toBe('open');
	});

	it('un concert confirmé mais pas vérifié laisse « La scène » à portée, avec les plateaux', () => {
		const map = careerMap(none, null, { ...NO_REACH, corroboratedGig: true });
		expect(map.acts[4].state).toBe('within_reach');
		expect(map.acts[4].reach?.action.href).toBe('/annonces?type=GIG_SLOT');
	});

	it('une production : seulement côté artiste, rattachée à un morceau', () => {
		const prod = collab({ kind: 'PRODUCTION', hasWork: true });
		const scene = (c: ReturnType<typeof collab>) =>
			careerMap({ ...none, collaborations: 1 }, null, { ...NO_REACH, toConfirm: [c] }).acts[3]
				.state;
		expect(scene(prod)).toBe('within_reach');
		expect(scene({ ...prod, asProvider: true })).toBe('open');
		expect(scene({ ...prod, hasWork: false })).toBe('open');
	});

	it('un rôle en attente sur un morceau déclaré met « La création » à portée', () => {
		const map = careerMap({ ...none, worksSolo: 1 }, null, {
			...NO_REACH,
			pendingCoauthors: [{ workId: 'w1', title: 'Notre compo' }]
		});
		expect(map.acts[1].reach?.action).toEqual({ label: 'Voir le morceau', href: '/morceaux/w1' });
	});

	it('un premier enregistrement déclaré : la gestion demande, un·e membre voit qui peut', () => {
		const reach = (manager: boolean) =>
			careerMap(none, null, {
				...NO_REACH,
				declaredRecordings: [{ bandHandle: 'les-rats', bandName: 'Les Rats', manager }]
			}).acts[2].reach;
		expect(reach(true)?.action.label).toBe('Demander une confirmation');
		expect(reach(false)?.action.label).toBe('Voir le parcours du groupe');
		expect(reach(false)?.reason).toMatch(/la gestion du groupe/);
	});

	it('une épreuve franchie n’est jamais à portée, même avec un déclencheur', () => {
		const map = careerMap(all, null, everyTrigger);
		expect(map.acts.some((a) => a.reach)).toBe(false);
	});

	it('plus de trois candidates : trois au plus, par branche puis par numéro interne', () => {
		const map = careerMap(none, null, everyTrigger);
		expect(map.acts.filter((a) => a.state === 'within_reach')).toHaveLength(5);
		expect(map.withinReach).toHaveLength(MAX_WITHIN_REACH);
		expect(map.withinReach.map((a) => a.number)).toEqual([1, 2, 3]);
	});

	it('ordre déterministe : à faits égaux, même ordre', () => {
		const a = careerMap(none, 'STAGE', everyTrigger).withinReach.map((x) => x.number);
		const b = careerMap(none, 'STAGE', structuredClone(everyTrigger)).withinReach.map(
			(x) => x.number
		);
		expect(a).toEqual(b);
	});

	it('l’ambition réordonne les épreuves à portée, sans changer un seul état', () => {
		const neutral = careerMap(none, null, everyTrigger);
		const stage = careerMap(none, 'STAGE', everyTrigger);
		const record = careerMap(none, 'RECORD', everyTrigger);
		// STAGE met en avant la création (2) et la scène (5).
		expect(stage.withinReach.map((a) => a.number)).toEqual([2, 5, 1]);
		// RECORD : studio (3) et production (4).
		expect(record.withinReach.map((a) => a.number)).toEqual([3, 4, 1]);
		for (const m of [stage, record])
			expect(m.acts.map((a) => a.state)).toEqual(neutral.acts.map((a) => a.state));
		expect(stage.acts.filter((a) => a.highlighted).map((a) => a.number)).toEqual([2, 5]);
	});

	it('aucune sélection par l’XP : seuls les faits et l’ambition entrent dans l’ordre', () => {
		// Mêmes faits et déclencheurs, quelle que soit la « valeur » supposée d'une épreuve.
		const withNoise = { ...everyTrigger, xp: 9_999 } as unknown as ReachFacts;
		expect(careerMap(none, null, withNoise).withinReach.map((a) => a.number)).toEqual([1, 2, 3]);
	});
});

describe('déclencheur « concert confirmé » depuis les réalisations', () => {
	const gig = (proof: Realisation['proof'], status: Realisation['status'] = 'ACTIVE') => {
		const object = {
			type: 'MILESTONE' as const,
			id: 'm',
			bandId: 'b',
			definitionId: 'FIRST_GIG'
		};
		return {
			key: realisationKey('MILESTONE', object),
			kind: 'MILESTONE' as const,
			branch: 'SCENE' as const,
			bearerId: 'b',
			object,
			roles: ['BAND_MEMBER' as const],
			occurredAt: new Date('2026-06-01'),
			proof,
			status,
			visibility: 'PUBLIC' as const,
			firstTime: true
		};
	};

	it('corroboré et actif : oui ; vérifié, gelé ou retiré : non', () => {
		expect(corroboratedGigOf([gig('CORROBORATED')])).toBe(true);
		expect(corroboratedGigOf([gig('VERIFIED')])).toBe(false);
		expect(corroboratedGigOf([gig('CORROBORATED', 'FROZEN')])).toBe(false);
		expect(corroboratedGigOf([gig('CORROBORATED', 'RETIRED')])).toBe(false);
	});
});
