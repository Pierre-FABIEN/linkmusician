import { describe, expect, it } from 'vitest';
import {
	DETAIL_LIMIT,
	HOME_LIMIT,
	NO_NEXT_FACTS,
	candidatesFrom,
	compareSuggestions,
	isActionable,
	rankSuggestions,
	suggestionKey,
	type Candidate,
	type NextFacts,
	type SuggestionRank
} from './index';

const d = (iso: string) => new Date(`${iso}T10:00:00Z`);

const facts = (over: Partial<NextFacts> = {}): NextFacts => ({
	reader: { adult: true, ambition: null },
	...NO_NEXT_FACTS,
	...over
});

const collab = (over: Partial<NextFacts['collaborations'][number]> = {}) => ({
	id: 'c1',
	kind: 'RECORDING',
	title: 'Prise de son Titre 1',
	with: 'Inès',
	conversationId: 'conv1',
	step: 'confirm' as const,
	asProvider: false,
	happenedOn: '2026-11-10',
	upcoming: false,
	proposedAt: d('2026-11-01'),
	othersConfirmedAt: null,
	...over
});

const work = (over: Partial<NextFacts['works'][number]> = {}) => ({
	workId: 'w1',
	title: 'Titre 2',
	need: null,
	pros: [],
	openRoles: [],
	hasOpenOpportunity: false,
	...over
});

const cand = (rank: SuggestionRank, id: string, over: Partial<Candidate> = {}): Candidate => ({
	rule: 'objective',
	rank,
	branch: 'EQUIPE',
	subject: { type: 'OBJECTIVE', id },
	title: `Titre ${id}`,
	why: 'Parce que.',
	href: `/x/${id}`,
	cta: 'Aller',
	deadline: null,
	waitingSince: null,
	fact: '',
	...over
});

const ranked = (f: NextFacts, scope: 'HOME' | 'DETAIL' = 'DETAIL') =>
	rankSuggestions(candidatesFrom(f), { scope });

describe('tri des prochaines actions (conception 21 §9)', () => {
	it('classe par rang, du plus important au facultatif', () => {
		const out = rankSuggestions(
			[cand(5, 'e'), cand(3, 'c'), cand(1, 'a'), cand(4, 'd'), cand(2, 'b')],
			{ scope: 'DETAIL', perRule: 9 }
		);
		expect(out.map((s) => s.rank)).toEqual([1, 2, 3, 4, 5]);
	});

	it('dans un rang : échéance réelle la plus proche, puis attente la plus longue, puis clé', () => {
		const out = rankSuggestions(
			[
				cand(2, 'z'),
				cand(2, 'b', { waitingSince: d('2026-11-05') }),
				cand(2, 'c', { waitingSince: d('2026-11-01') }),
				cand(2, 'd', { deadline: d('2026-12-01') }),
				cand(2, 'a')
			],
			{ scope: 'DETAIL' }
		);
		expect(out.map((s) => s.subject.id)).toEqual(['d', 'c', 'b', 'a', 'z']);
	});

	it('est stable : même ordre quel que soit l’ordre des candidates', () => {
		const list = [
			cand(2, 'b'),
			cand(1, 'a', { waitingSince: d('2026-11-02') }),
			cand(1, 'c', { waitingSince: d('2026-11-02') }),
			cand(3, 'd', { rule: 'crea.demo' })
		];
		const once = rankSuggestions(list, { scope: 'DETAIL' }).map((s) => s.key);
		for (let i = 0; i < 5; i++) {
			const shuffled = [...list].reverse().sort(() => (i % 2 ? 1 : -1));
			expect(rankSuggestions(shuffled, { scope: 'DETAIL' }).map((s) => s.key)).toEqual(once);
		}
	});

	it('trois au plus sur l’accueil, cinq dans une vue détaillée', () => {
		const many = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => cand(2, id));
		expect(rankSuggestions(many)).toHaveLength(HOME_LIMIT);
		expect(rankSuggestions(many, { scope: 'DETAIL' })).toHaveLength(DETAIL_LIMIT);
		expect(HOME_LIMIT).toBe(3);
		expect(DETAIL_LIMIT).toBe(5);
	});

	it('au plus une suggestion facultative (rang 5) par écran', () => {
		const out = rankSuggestions(
			[cand(5, 'a'), cand(5, 'b', { rule: 'trial.within_reach' }), cand(5, 'c')],
			{ scope: 'DETAIL', perRule: 9 }
		);
		expect(out).toHaveLength(1);
	});

	it('une seule suggestion par couple (règle, objet), puis par objet : la plus prioritaire', () => {
		const same = { type: 'WORK', id: 'w1' } as const;
		const out = rankSuggestions(
			[
				cand(5, 'x', { rule: 'trial.within_reach', subject: same }),
				cand(2, 'x', { rule: 'credit.confirm', subject: same }),
				cand(2, 'x', { rule: 'credit.confirm', subject: same, title: 'Doublon' })
			],
			{ scope: 'DETAIL' }
		);
		expect(out.map((s) => s.rule)).toEqual(['credit.confirm']);
	});

	it('une règle de travail ou de besoin ne remplit pas l’écran à elle seule', () => {
		const out = rankSuggestions(
			['a', 'b', 'c'].map((id) => cand(4, id, { rule: 'prod.mix', subject: { type: 'WORK', id } })),
			{ scope: 'DETAIL' }
		);
		expect(out).toHaveLength(1);
	});

	it('écarte une candidate sans déclencheur ou sans destination interne', () => {
		expect(isActionable(cand(2, 'a', { why: '' }))).toBe(false);
		expect(isActionable(cand(2, 'a', { title: ' ' }))).toBe(false);
		expect(isActionable(cand(2, 'a', { href: 'https://ailleurs.example' }))).toBe(false);
		expect(isActionable(cand(2, 'a', { href: '//ailleurs.example' }))).toBe(false);
		expect(isActionable(cand(2, 'a'))).toBe(true);
		expect(rankSuggestions([cand(2, 'a', { href: 'javascript:alert(1)' })])).toEqual([]);
	});

	it('clé stable « règle:type:objet » et masquage permis selon le rang (sans persistance, N4)', () => {
		expect(
			suggestionKey(cand(4, 'w1', { rule: 'prod.mix', subject: { type: 'WORK', id: 'w1' } }))
		).toBe('prod.mix:WORK:w1');
		const out = rankSuggestions(
			[cand(1, 'a'), cand(3, 'b', { rule: 'crea.demo' }), cand(4, 'c', { rule: 'prod.mix' })],
			{
				scope: 'DETAIL'
			}
		);
		expect(out.map((s) => s.dismissal)).toEqual(['NONE', 'LATER', 'NOT_FOR_ME']);
	});

	it('NL5 : aucune entrée de progression ne peut changer le tri', () => {
		const base = [cand(5, 'a'), cand(2, 'b')];
		const withXp = base.map((c, i) => ({ ...c, xp: 1000 * (i + 1), level: 9 }) as Candidate);
		expect(rankSuggestions(withXp, { scope: 'DETAIL' }).map((s) => s.key)).toEqual(
			rankSuggestions(base, { scope: 'DETAIL' }).map((s) => s.key)
		);
		expect(compareSuggestions.length).toBe(2);
	});
});

describe('règles des cinq rangs (conception 21 §8.4, §9.1)', () => {
	it('compte sans activité : aucune suggestion', () => {
		expect(ranked(facts())).toEqual([]);
	});

	it('rang 1 : l’autre partie a confirmé, elle attend ma confirmation', () => {
		const [s] = ranked(facts({ collaborations: [collab({ othersConfirmedAt: d('2026-11-11') })] }));
		expect(s).toMatchObject({
			rank: 1,
			rule: 'collab.confirm',
			href: '/messages/conv1',
			branch: 'PRODUCTION',
			dismissal: 'NONE'
		});
		expect(s.why).toMatch(/Inès a confirmé/);
	});

	it('rang 2 : personne n’a encore confirmé, ou une proposition attend ma réponse', () => {
		const out = ranked(
			facts({
				collaborations: [
					collab(),
					collab({ id: 'c2', step: 'respond', upcoming: true, happenedOn: '2026-12-01' })
				]
			})
		);
		expect(out.map((s) => [s.rule, s.rank])).toEqual([
			['collab.respond', 2],
			['collab.confirm', 2]
		]);
		expect(out[0].deadline).toEqual(new Date('2026-12-01T00:00:00Z'));
	});

	it('rang 2 : crédit, invitation de groupe, accompagnement, candidatures, demandes de contact', () => {
		const out = ranked(
			facts({
				credits: [{ workId: 'w9', title: 'Nuit', since: d('2026-11-03') }],
				bandInvitations: [{ bandId: 'b1', name: 'Les Rats', since: d('2026-11-02') }],
				representations: [{ id: 'r1' }],
				applications: 2,
				contactRequests: 1
			})
		);
		expect(out.every((s) => s.rank === 2)).toBe(true);
		expect(out.map((s) => s.rule)).toEqual([
			'band.invitation',
			'credit.confirm',
			'applications.review',
			'contact.respond',
			'representation.respond'
		]);
		expect(out.find((s) => s.rule === 'applications.review')?.title).toBe('2 candidatures reçues');
	});
	it('rang 2 (U3) : invitation à un projet et coordination proposée, sans titre de morceau', () => {
		const out = ranked(
			facts({
				projectInvitations: [
					{ id: 'pp1', projectName: 'EP Lumière', invitedBy: 'Lumière', since: d('2026-11-03') }
				],
				capabilityOffers: [{ projectId: 'p2', projectName: 'Tournée' }]
			})
		);
		const invite = out.find((s) => s.rule === 'project.invitation');
		expect(invite?.rank).toBe(2);
		expect(invite?.title).toBe('Lumière t’invite dans « EP Lumière »');
		expect(invite?.href).toBe('/espace/a-confirmer#projets');
		const offer = out.find((s) => s.rule === 'project.coordination');
		expect(offer?.href).toBe('/projets/p2#equipe');
		expect(offer?.key).toBe('project.coordination:PROJECT:p2');
	});

	it('rang 2 (U3b-c) : besoins proposés, une suggestion par projet', () => {
		const need = (needId: string, projectId: string, since: string) => ({
			needId,
			projectId,
			projectName: projectId === 'p3' ? 'EP Lumière' : 'Tournée',
			label: 'Ingé son · Mixage',
			since: d(since)
		});
		const out = ranked(
			facts({
				needProposals: [
					need('n1', 'p3', '2026-11-05'),
					need('n2', 'p3', '2026-11-04'),
					need('n3', 'p4', '2026-11-06')
				]
			})
		);
		const needs = out.filter((s) => s.rule === 'project.need');
		expect(needs.map((s) => [s.key, s.rank, s.href])).toEqual([
			['project.need:PROJECT:p3', 2, '/projets/p3#besoins'],
			['project.need:PROJECT:p4', 2, '/projets/p4#besoins']
		]);
		expect(needs[0].title).toBe('2 besoins proposés dans « EP Lumière »');
		expect(needs[1].title).toBe('Besoin proposé dans « Tournée » : Ingé son · Mixage');
	});

	it('demandes de contact : jamais pour un·e mineur·e', () => {
		const out = ranked(facts({ reader: { adult: false, ambition: null }, contactRequests: 3 }));
		expect(out).toEqual([]);
	});

	it('rang 3 : l’étape que j’ai prise en charge, l’idée travaillée récemment', () => {
		const out = ranked(
			facts({
				steps: [
					{
						workId: 'w1',
						title: 'Titre 1',
						label: 'Enregistrement',
						status: 'IN_PROGRESS',
						since: d('2026-11-01')
					}
				],
				ideas: [{ workId: 'w2', title: 'Brouillon', hasDemo: false, updatedAt: d('2026-11-10') }]
			})
		);
		expect(out.map((s) => [s.rule, s.rank])).toEqual([
			['work.step', 3],
			['crea.demo', 3]
		]);
		expect(out[0].href).toBe('/morceaux/w1#suite-title');
	});

	it('rang 3 : une idée avec maquette propose de la déclarer composée, sans reproche', () => {
		const [s] = ranked(
			facts({
				ideas: [{ workId: 'w2', title: 'Brouillon', hasDemo: true, updatedAt: d('2026-11-10') }]
			})
		);
		expect(s.rule).toBe('crea.compose');
		expect(`${s.title} ${s.why}`).not.toMatch(/retard|toujours pas|n’as pas|manque/i);
	});

	it('rang 4 : mixage d’un morceau enregistré, avec un·e pro du réseau réel', () => {
		const [s] = ranked(
			facts({
				works: [
					work({
						need: 'MIXING',
						pros: [{ handle: 'ines', displayName: 'Inès Roy', craft: 'SOUND_ENGINEER' }]
					})
				]
			})
		);
		expect(s).toMatchObject({
			rule: 'prod.mix',
			rank: 4,
			href: '/@ines',
			cta: 'Voir le profil de Inès'
		});
	});

	it('rang 4 : sans personne du réseau, une recherche filtrée plutôt qu’un nom arbitraire', () => {
		const [s] = ranked(facts({ works: [work({ need: 'MIXING' })] }));
		expect(s.href).toBe('/decouvrir?metier=inge-son&specialite=mixage');
	});

	it('mineur·e : jamais de recherche d’inconnu ; l’enregistrement se prend sur le morceau', () => {
		const minor = { adult: false, ambition: 'RECORD' as const };
		expect(ranked(facts({ reader: minor, works: [work({ need: 'MIXING' })] }))).toEqual([]);
		const [s] = ranked(facts({ reader: minor, works: [work({ need: 'RECORDING' })] }));
		expect(s.href).toBe('/morceaux/w1#suite-title');
	});

	it('enregistrer : un besoin (rang 4) si l’ambition le vise, sinon facultatif (rang 5)', () => {
		const rec = (ambition: NextFacts['reader']['ambition']) =>
			ranked(facts({ reader: { adult: true, ambition }, works: [work({ need: 'RECORDING' })] }))[0]
				.rank;
		expect(rec('RECORD')).toBe(4);
		expect(rec('PRO')).toBe(4);
		expect(rec('STAGE')).toBe(5);
		expect(rec(null)).toBe(5);
	});

	it('aucun enchaînement obligatoire : un morceau sans besoin ne produit rien', () => {
		expect(ranked(facts({ works: [work()] }))).toEqual([]);
	});

	it('rang 4 : une place libre, nommée seulement si quelqu’un du réseau proche en joue', () => {
		const named = ranked(
			facts({
				works: [
					work({
						openRoles: [{ instrument: 'Basse', candidates: [{ handle: 'jo', displayName: 'Jo' }] }]
					})
				]
			})
		)[0];
		expect(named).toMatchObject({ rule: 'team.fill_role', rank: 4 });
		expect(named.why).toMatch(/^Jo, de ton réseau/);
		const anonymous = ranked(
			facts({ works: [work({ openRoles: [{ instrument: 'Basse', candidates: [] }] })] })
		);
		expect(anonymous[0].why).not.toMatch(/réseau/);
	});

	it('une place déjà proposée par une annonce ouverte n’est pas répétée', () => {
		const out = ranked(
			facts({
				works: [
					work({ hasOpenOpportunity: true, openRoles: [{ instrument: 'Basse', candidates: [] }] })
				]
			})
		);
		expect(out).toEqual([]);
	});

	it('rang 5 : une épreuve à portée qui vise la même collaboration qu’une demande n’est pas répétée', () => {
		const out = ranked(
			facts({
				collaborations: [collab()],
				withinReach: [
					{
						number: 1,
						name: 'La rencontre',
						branch: 'EQUIPE',
						reason: '« Prise de son Titre 1 » n’attend plus que ta confirmation.',
						action: { label: 'Confirmer la collaboration', href: '/espace/a-confirmer' },
						subject: { type: 'COLLABORATION', id: 'c1' }
					}
				]
			})
		);
		expect(out.map((s) => s.rule)).toEqual(['collab.confirm']);
	});

	it('rang 5 : une épreuve à portée sans demande correspondante reste proposée, une seule fois', () => {
		const trial = (n: number) => ({
			number: n,
			name: `Épreuve ${n}`,
			branch: 'SCENE' as const,
			reason: 'Un fait existe.',
			action: { label: 'Voir', href: '/annonces?type=GIG_SLOT' },
			subject: null
		});
		const out = ranked(
			facts({
				withinReach: [trial(5), trial(3)],
				objective: { id: 'demo.first', label: 'Une démo', href: '/profil' }
			})
		);
		expect(out).toHaveLength(1);
		expect(out[0].rank).toBe(5);
	});

	it('Collab ≠ Rencontre : aucune suggestion ne mène à une jam', () => {
		const everything = facts({
			collaborations: [
				collab({ othersConfirmedAt: d('2026-11-11') }),
				collab({ id: 'c2', step: 'respond' })
			],
			credits: [{ workId: 'w9', title: 'Nuit', since: d('2026-11-03') }],
			bandInvitations: [{ bandId: 'b1', name: 'Les Rats', since: d('2026-11-02') }],
			applications: 1,
			contactRequests: 1,
			works: [work({ need: 'MIXING' })],
			objective: { id: 'demo.first', label: 'Une démo', href: '/profil' }
		});
		for (const s of candidatesFrom(everything)) expect(s.href).not.toMatch(/jam/i);
	});
});
