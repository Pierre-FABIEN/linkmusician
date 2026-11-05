import { describe, expect, it } from 'vitest';
import { levelFromXp, levelProgress, xpForLevel } from './levels';
import { diminishingReturn, roundMultiplier, trustWeight } from './multipliers';
import { computeTrustLevel, TRUST_PERMISSIONS, type TrustSummary } from './trust';
import { parseDomainEvent } from './events';
import { gainsFor } from './engine';
import { MemoryLedger } from './memory';
import { bandTier, musicianTier, type MusicianSummary } from './tiers';
import { nextObjectives, questProgress, type QuestState } from './quests';
import { milestoneDelta } from './rules/milestoneAttested';
import { BAREME } from './bareme';
import type { RuleContext } from './types';

const at = new Date('2026-03-01T12:00:00Z');
const ev = (o: Record<string, unknown>, occurredAt = at) => ({ id: 'evt-1', occurredAt, ...o });

/** Contexte vide : aucun historique, confiance réglable. */
function ctx(over: Partial<RuleContext> = {}): RuleContext {
	return {
		now: at,
		countGains: () => 0,
		priorCollaborations: () => 0,
		priorMemberships: () => 0,
		priorEndorsements: () => 0,
		trustLevel: () => 2,
		...over
	};
}

describe('niveaux (§3)', () => {
	it.each([
		[1, 0],
		[2, 100],
		[5, 1000],
		[10, 4500],
		[20, 19000],
		[30, 43500]
	])('niveau %i à %i XP', (level, xp) => {
		expect(xpForLevel(level)).toBe(xp);
		expect(levelFromXp(xp)).toBe(level);
		if (xp > 0) expect(levelFromXp(xp - 1)).toBe(level - 1);
	});

	it('reste au niveau 1 avec une XP nulle ou négative', () => {
		expect(levelFromXp(0)).toBe(1);
		expect(levelFromXp(-50)).toBe(1);
	});

	it('refuse un niveau invalide', () => {
		expect(() => xpForLevel(0)).toThrow(RangeError);
		expect(() => xpForLevel(1.5)).toThrow(RangeError);
	});

	it('mesure l’avancement dans le niveau', () => {
		expect(levelProgress(150)).toEqual({
			level: 2,
			xpIntoLevel: 50,
			xpForNextLevel: 200,
			ratio: 0.25
		});
		expect(levelProgress(-10).ratio).toBe(0);
	});
});

describe('multiplicateurs (§6)', () => {
	it.each([
		[1, 1],
		[2, 0.5],
		[3, 0.25],
		[4, 0],
		[12, 0]
	])('k = %i → %d', (k, value) => expect(diminishingReturn(k)).toBe(value));

	it('refuse un rang invalide', () => expect(() => diminishingReturn(0)).toThrow(RangeError));

	it.each([
		[0, 0.1],
		[1, 0.5],
		[2, 1],
		[3, 1]
	] as const)('confiance TL%i → %d', (tl, w) => expect(trustWeight(tl)).toBe(w));

	it('arrondit au millième', () => expect(roundMultiplier(1 / 3)).toBe(0.333));
});

describe('confiance (§7)', () => {
	const tl3: TrustSummary = {
		emailVerified: true,
		accountAgeDays: 120,
		profileComplete: true,
		reciprocalConversations: 3,
		activeSanctions: 0,
		collaborationsWithTrusted: 4,
		distinctCounterparts: 6,
		reportRate: 0,
		blockedBy: 0,
		declineRate: 0
	};

	it.each([
		['palier 3', {}, 3],
		['signalements trop fréquents', { reportRate: 0.05 }, 2],
		['bloqué par 3 personnes (P2-05)', { blockedBy: 3 }, 0],
		['bloqué par 2 personnes : rien ne change', { blockedBy: 2 }, 3],
		['demandes trop souvent refusées (P2-05)', { declineRate: 0.6 }, 1],
		['moins de 5 contreparties', { distinctCounterparts: 4 }, 2],
		['moins de 90 jours', { accountAgeDays: 60 }, 2],
		['sans collaboration de confiance', { collaborationsWithTrusted: 0 }, 1],
		['moins de 30 jours', { accountAgeDays: 20 }, 1],
		['moins de 7 jours', { accountAgeDays: 3 }, 0],
		['sanction en cours', { activeSanctions: 1 }, 0],
		['profil incomplet', { profileComplete: false }, 0],
		['sans conversation réciproque', { reciprocalConversations: 0 }, 0],
		['email non vérifié', { emailVerified: false }, 0]
	] as const)('%s → TL%i', (_, patch, level) => {
		expect(computeTrustLevel({ ...tl3, ...patch })).toBe(level);
	});

	it('ouvre la corroboration à partir de TL2', () => {
		expect(TRUST_PERMISSIONS[1].canCorroborate).toBe(false);
		expect(TRUST_PERMISSIONS[2].canCorroborate).toBe(true);
	});
});

describe('événements', () => {
	it('refuse un événement mal formé ou inconnu', () => {
		expect(() =>
			parseDomainEvent({ type: 'profile.completed', id: 'x', occurredAt: at })
		).toThrow();
		expect(() =>
			parseDomainEvent(ev({ type: 'xp.granted', actorId: 'a', amount: 1000 }))
		).toThrow();
		expect(() =>
			parseDomainEvent(
				ev({ type: 'collaboration.completed', collaborationId: 'c', participantIds: ['a'] })
			)
		).toThrow();
	});
});

describe('règles', () => {
	it.each([
		[
			'profil complété',
			ev({ type: 'profile.completed', actorId: 'a' }),
			ctx(),
			['profile.completed', BAREME.profileCompleted]
		],
		[
			'profil déjà crédité',
			ev({ type: 'profile.completed', actorId: 'a' }),
			ctx({ countGains: () => 1 }),
			null
		],
		[
			'première démo',
			ev({ type: 'media.published', actorId: 'a', mediaId: 'm', kind: 'DEMO' }),
			ctx(),
			['demo.first', BAREME.firstDemo]
		],
		[
			'démo suivante',
			ev({ type: 'media.published', actorId: 'a', mediaId: 'm', kind: 'DEMO' }),
			ctx({ countGains: (_, r) => (r === 'demo.first' ? 1 : 0) }),
			['demo.extra', BAREME.extraDemo]
		],
		[
			'quatrième démo de la semaine',
			ev({ type: 'media.published', actorId: 'a', mediaId: 'm', kind: 'DEMO' }),
			ctx({ countGains: (_, r) => (r === 'demo.first' ? 1 : 3) }),
			null
		],
		[
			'photo',
			ev({ type: 'media.published', actorId: 'a', mediaId: 'm', kind: 'PHOTO' }),
			ctx(),
			null
		],
		[
			'conversation née d’une annonce',
			ev({
				type: 'conversation.reciprocated',
				actorId: 'a',
				counterpartId: 'b',
				fromOpportunity: true
			}),
			ctx(),
			['conversation.reciprocated', BAREME.reciprocalConversation]
		],
		[
			'conversation hors annonce',
			ev({
				type: 'conversation.reciprocated',
				actorId: 'a',
				counterpartId: 'b',
				fromOpportunity: false
			}),
			ctx(),
			null
		],
		[
			'sixième conversation du jour',
			ev({
				type: 'conversation.reciprocated',
				actorId: 'a',
				counterpartId: 'b',
				fromOpportunity: true
			}),
			ctx({ countGains: () => 5 }),
			null
		],
		[
			'conversation avec soi-même',
			ev({
				type: 'conversation.reciprocated',
				actorId: 'a',
				counterpartId: 'a',
				fromOpportunity: true
			}),
			ctx(),
			null
		],
		[
			'adhésion',
			ev({ type: 'membership.accepted', personId: 'a', bandId: 'g' }),
			ctx(),
			['membership.accepted', BAREME.membershipAccepted]
		],
		[
			'retour dans le même groupe',
			ev({ type: 'membership.accepted', personId: 'a', bandId: 'g' }),
			ctx({ priorMemberships: () => 1 }),
			['membership.accepted', BAREME.membershipAccepted / 2]
		],
		[
			'quatrième adhésion au même groupe',
			ev({ type: 'membership.accepted', personId: 'a', bandId: 'g' }),
			ctx({ priorMemberships: () => 3 }),
			null
		],
		[
			'endossement',
			ev({ type: 'endorsement.received', actorId: 'a', endorserId: 'b', skill: 'guitare' }),
			ctx(),
			['endorsement.received', BAREME.endorsementReceived]
		],
		[
			'appréciation, deuxième de la même personne : ×0,5',
			ev({ type: 'endorsement.received', actorId: 'a', endorserId: 'b', skill: 'bon groove' }),
			ctx({ priorEndorsements: () => 1 }),
			['endorsement.received', BAREME.endorsementReceived / 2]
		],
		[
			'appréciation, quatrième de la même personne : rien',
			ev({ type: 'endorsement.received', actorId: 'a', endorserId: 'b', skill: 'bon groove' }),
			ctx({ priorEndorsements: () => 3 }),
			null
		],
		[
			'auto-endossement',
			ev({ type: 'endorsement.received', actorId: 'a', endorserId: 'a', skill: 'guitare' }),
			ctx(),
			null
		]
	] as const)('%s', (_, event, context, expected) => {
		const gains = gainsFor(event, context);
		if (expected === null) {
			expect(gains).toEqual([]);
		} else {
			expect(gains).toHaveLength(1);
			expect(gains[0]).toMatchObject({ ruleId: expected[0], amount: expected[1], actorId: 'a' });
		}
	});

	describe('collaboration', () => {
		const collab = (ids: string[]) =>
			ev({ type: 'collaboration.completed', collaborationId: 'c', participantIds: ids });

		it.each([
			['première, contrepartie TL2', 0, 2, 1, 400],
			['deuxième avec la même personne', 1, 2, 0.5, 200],
			['troisième', 2, 2, 0.25, 100],
			['quatrième', 3, 2, 0, null],
			['contrepartie TL1', 0, 1, 0.5, 200],
			['contrepartie TL0', 0, 0, 0.1, 40]
		] as const)('%s', (_, prior, tl, multiplier, amount) => {
			const gains = gainsFor(
				collab(['a', 'b']),
				ctx({ priorCollaborations: () => prior, trustLevel: () => tl })
			);
			if (amount === null) return expect(gains).toEqual([]);
			expect(gains.map((g) => [g.actorId, g.amount, g.multiplier])).toEqual([
				['a', amount, multiplier],
				['b', amount, multiplier]
			]);
		});

		it('fait la moyenne des contreparties à plusieurs', () => {
			const gains = gainsFor(
				collab(['a', 'b', 'c']),
				ctx({ trustLevel: (id) => (id === 'c' ? 0 : 2) })
			);
			// a : (1 × 1 + 1 × 0,1) / 2 = 0,55
			expect(gains.find((g) => g.actorId === 'a')).toMatchObject({ multiplier: 0.55, amount: 220 });
			expect(gains.find((g) => g.actorId === 'c')).toMatchObject({ multiplier: 1, amount: 400 });
		});

		it('ignore les doublons de participants', () => {
			expect(gainsFor(collab(['a', 'a']), ctx())).toEqual([]);
		});

		it('indique le multiplicateur dans la raison', () => {
			const [gain] = gainsFor(collab(['a', 'b']), ctx({ trustLevel: () => 1 }));
			expect(gain.reason).toBe('Collaboration confirmée ×0,5');
		});
	});

	describe('étapes de groupe (§2.2, §4)', () => {
		const milestone = (o: Record<string, unknown>) =>
			ev({ type: 'milestone.attested', bandId: 'g', memberIds: ['a', 'b'], ...o });

		it.each([
			['concert déclaré', 'FIRST_GIG', null, 'DECLARED', 50],
			['concert corroboré après déclaré', 'FIRST_GIG', 'DECLARED', 'CORROBORATED', 350],
			['concert vérifié après corroboré', 'FIRST_GIG', 'CORROBORATED', 'VERIFIED', 600],
			['concert vérifié d’emblée', 'FIRST_GIG', null, 'VERIFIED', 1000],
			['EP déclaré (impossible)', 'FIRST_EP', null, 'DECLARED', 0],
			['signature déclarée', 'SIGNING', null, 'DECLARED', 0],
			['rétrogradation', 'FIRST_GIG', 'VERIFIED', 'DECLARED', 0]
		] as const)('%s', (_, m, from, to, delta) => {
			const event = milestone({ milestone: m, from, to });
			expect(milestoneDelta(parseDomainEvent(event) as never)).toBe(delta);
			const gains = gainsFor(event, ctx());
			if (delta === 0) return expect(gains).toEqual([]);
			expect(gains).toEqual([
				expect.objectContaining({
					actorId: 'g',
					track: 'BAND',
					amount: delta,
					ruleId: 'milestone.band'
				}),
				expect.objectContaining({ actorId: 'a', track: 'MUSICIAN', amount: Math.round(delta / 4) }),
				expect.objectContaining({ actorId: 'b', track: 'MUSICIAN', amount: Math.round(delta / 4) })
			]);
		});
	});

	it('aucune règle ne renvoie un gain nul ou fractionnaire', () => {
		const gains = gainsFor(
			ev({
				type: 'collaboration.completed',
				collaborationId: 'c',
				participantIds: ['a', 'b', 'c']
			}),
			ctx({ trustLevel: () => 0 })
		);
		for (const g of gains) {
			expect(Number.isInteger(g.amount)).toBe(true);
			expect(g.amount).toBeGreaterThan(0);
		}
	});
});

describe('registre en mémoire', () => {
	it('ne crédite la première démo qu’une fois, plafonne les suivantes par semaine', () => {
		const l = new MemoryLedger();
		const demo = (n: number, d: number) =>
			l.apply({
				id: `d${n}`,
				occurredAt: new Date(at.getTime() + d * 86_400_000),
				type: 'media.published',
				actorId: 'a',
				mediaId: `m${n}`,
				kind: 'DEMO'
			});
		expect(demo(1, 0).map((g) => g.ruleId)).toEqual(['demo.first']);
		expect([2, 3, 4, 5].map((n) => demo(n, 1).length)).toEqual([1, 1, 1, 0]);
		expect(demo(6, 9).length).toBe(1); // une semaine plus tard
		expect(l.xp('a')).toBe(BAREME.firstDemo + 4 * BAREME.extraDemo);
	});

	it('applique les rendements décroissants entre deux personnes, puis les oublie après 12 mois', () => {
		const l = new MemoryLedger({ a: 2, b: 2 });
		const collab = (n: number, d: number) =>
			l.apply({
				id: `c${n}`,
				occurredAt: new Date(at.getTime() + d * 86_400_000),
				type: 'collaboration.completed',
				collaborationId: `c${n}`,
				participantIds: ['a', 'b']
			});
		expect([1, 2, 3, 4].map((n) => collab(n, n)[0]?.amount ?? 0)).toEqual([400, 200, 100, 0]);
		expect(collab(5, 400)[0].amount).toBe(400);
	});

	it('mémorise adhésions et endossements', () => {
		const l = new MemoryLedger();
		const join = () =>
			l.apply({ id: 'j', occurredAt: at, type: 'membership.accepted', personId: 'a', bandId: 'g' });
		expect(join()[0].amount).toBe(BAREME.membershipAccepted);
		expect(join()[0].amount).toBe(BAREME.membershipAccepted / 2);
		const endorse = () =>
			l.apply({
				id: 'e',
				occurredAt: at,
				type: 'endorsement.received',
				actorId: 'a',
				endorserId: 'b',
				skill: 'basse'
			});
		// Rendements décroissants par paire (D27) : 40, 20, 10, puis rien.
		expect(endorse().map((g) => g.amount)).toEqual([BAREME.endorsementReceived]);
		expect(endorse().map((g) => g.amount)).toEqual([BAREME.endorsementReceived / 2]);
		expect(endorse().map((g) => g.amount)).toEqual([BAREME.endorsementReceived / 4]);
		expect(endorse()).toHaveLength(0);
		l.setTrust('b', 3);
		expect(l.context().trustLevel('b')).toBe(3);
		expect(l.xp('a', 'BAND')).toBe(0);
	});
});

describe('paliers (§5)', () => {
	const none: MusicianSummary = {
		profileComplete: false,
		reciprocalConversations: 0,
		bands: 0,
		collaborations: 0,
		distinctCollaborators: 0,
		corroboratedGigs: 0,
		verifiedReleases: 0,
		distinctEndorsers: 0
	};

	it.each([
		['aucun', {}, null],
		['premiers pas', { profileComplete: true }, 'FIRST_STEPS'],
		['en réseau', { profileComplete: true, reciprocalConversations: 1, bands: 1 }, 'NETWORKED'],
		['collaborateur', { collaborations: 3, distinctCollaborators: 2 }, 'COLLABORATOR'],
		['de scène', { corroboratedGigs: 3 }, 'STAGE'],
		[
			'pilier local',
			{ collaborations: 10, distinctCollaborators: 5, corroboratedGigs: 10 },
			'LOCAL_PILLAR'
		],
		['référence', { verifiedReleases: 1, distinctEndorsers: 10 }, 'REFERENCE']
	] as const)('%s', (_, patch, id) => {
		expect(musicianTier({ ...none, ...patch }).tier?.id ?? null).toBe(id);
	});

	it.each([
		['aucune étape', {}, null],
		['formation seule', { FORMATION: 'VERIFIED' }, 'Projet'],
		['concert seulement déclaré', { FORMATION: 'VERIFIED', FIRST_GIG: 'DECLARED' }, 'Projet'],
		['démo corroborée', { FORMATION: 'VERIFIED', FIRST_PUBLIC_DEMO: 'CORROBORATED' }, 'Démo'],
		['signé', { SIGNING: 'VERIFIED' }, 'Signé']
	] as const)('groupe : %s', (_, milestones, label) => {
		expect(bandTier(milestones)?.label ?? null).toBe(label);
	});
});

describe('quêtes (§8)', () => {
	const fresh: QuestState = {
		profileComplete: false,
		reciprocalConversations: 0,
		bands: 0,
		collaborations: 0,
		distinctCollaborators: 0,
		corroboratedGigs: 0,
		verifiedReleases: 0,
		distinctEndorsers: 0,
		hasInstrument: false,
		hasGenre: false,
		hasZone: false,
		hasBio: false,
		demos: 0
	};

	it('propose les trois prochains objectifs, dans l’ordre', () => {
		expect(nextObjectives(fresh).map((o) => o.id)).toEqual([
			'profile.instrument',
			'profile.genre',
			'profile.zone'
		]);
	});

	it('passe aux objectifs suivants une fois le profil rempli', () => {
		const done = {
			...fresh,
			hasInstrument: true,
			hasGenre: true,
			hasZone: true,
			hasBio: true,
			demos: 1
		};
		expect(nextObjectives(done).map((o) => o.id)).toEqual([
			'conversation.first',
			'band.join',
			'collaboration.first'
		]);
	});

	it('affiche la progression vers un palier', () => {
		const state = {
			...fresh,
			hasInstrument: true,
			hasGenre: true,
			hasZone: true,
			hasBio: true,
			demos: 1,
			reciprocalConversations: 1,
			bands: 1,
			collaborations: 2,
			distinctCollaborators: 1
		};
		expect(nextObjectives(state, 2)).toEqual([
			expect.objectContaining({ id: 'tier.collaborator', progress: { current: 2, target: 3 } }),
			expect.objectContaining({ id: 'tier.stage', progress: { current: 0, target: 3 } })
		]);
	});

	it('ne propose plus rien quand tout est fait', () => {
		const all = {
			...fresh,
			hasInstrument: true,
			hasGenre: true,
			hasZone: true,
			hasBio: true,
			demos: 2,
			reciprocalConversations: 2,
			bands: 1,
			collaborations: 3,
			distinctCollaborators: 2,
			corroboratedGigs: 3
		};
		expect(nextObjectives(all)).toEqual([]);
	});
});

describe('avancement des objectifs (P2-12b)', () => {
	it('compte les objectifs déjà atteints', () => {
		const state = {
			profileComplete: false,
			reciprocalConversations: 0,
			bands: 0,
			collaborations: 0,
			distinctCollaborators: 0,
			corroboratedGigs: 0,
			verifiedReleases: 0,
			distinctEndorsers: 0,
			hasInstrument: true,
			hasGenre: true,
			hasZone: false,
			hasBio: false,
			demos: 0
		} satisfies QuestState;
		expect(questProgress(state)).toEqual({ done: 2, total: 10 });
	});
});
