import { describe, expect, it } from 'vitest';
import {
	byYear,
	contributionLines,
	filterContributions,
	filterFromSlug,
	partyName,
	presentCategories,
	sortContributions,
	type CollabDetail,
	type ContributionLine,
	type WorkDetail
} from './contributions';
import { realisationKey, type Realisation, type RealisationObject } from './realisations';

const D = (s: string) => new Date(`${s}T12:00:00Z`);

function real(
	kind: Realisation['kind'],
	object: RealisationObject,
	over: Partial<Realisation> = {}
): Realisation {
	return {
		key: realisationKey(kind, object),
		kind,
		branch: 'CREATION',
		bearerId: 'owner',
		object,
		roles: ['CREDITED'],
		occurredAt: D('2026-03-01'),
		proof: 'CORROBORATED',
		status: 'ACTIVE',
		visibility: 'PUBLIC',
		firstTime: false,
		...over
	};
}
const credit = (
	roleId: string,
	workId: string,
	roleKind: string,
	over: Partial<Realisation> = {}
) => real('CREDIT', { type: 'WORK_ROLE', id: roleId, workId, roleKind }, over);
const collab = (id: string, over: Partial<Realisation> = {}) =>
	real('COLLABORATION', { type: 'COLLABORATION', id }, { roles: ['PARTICIPANT'], ...over });

const lea = { displayName: 'Léa', deleted: false, blocked: false };

function work(id: string, over: Partial<WorkDetail> = {}): WorkDetail {
	return {
		id,
		title: `Titre ${id}`,
		state: 'COMPOSED',
		owner: { ...lea, dissolved: false },
		roles: {},
		open: true,
		...over
	};
}
function collabDetail(id: string, over: Partial<CollabDetail> = {}): CollabDetail {
	return {
		id,
		title: `Collab ${id}`,
		kind: 'RECORDING',
		happenedOn: D('2026-05-10'),
		workId: null,
		service: null,
		others: [lea],
		conversationId: `conv-${id}`,
		...over
	};
}
const details = (works: WorkDetail[] = [], collabs: CollabDetail[] = []) => ({
	works: new Map(works.map((w) => [w.id, w])),
	collabs: new Map(collabs.map((c) => [c.id, c]))
});

describe('Mes contributions (U1)', () => {
	it('crédit sans collaboration terminée : « Crédité·e », lien vers le morceau', () => {
		const lines = contributionLines(
			[credit('r1', 'w1', 'INSTRUMENT')],
			details([work('w1', { roles: { r1: { kind: 'INSTRUMENT', instrument: 'Basse' } } })])
		);
		expect(lines).toEqual([
			expect.objectContaining({
				key: 'work:w1',
				title: 'Titre w1',
				roles: ['Basse'],
				categories: ['JEU'],
				proof: 'CREDITED',
				with: 'Léa',
				href: '/morceaux/w1',
				sources: ['credit:r1']
			})
		]);
	});

	it('collaboration terminée sans morceau : « Confirmé », sa date, sa conversation', () => {
		const [line] = contributionLines(
			[collab('c1', { roles: ['PROVIDER'] })],
			details([], [collabDetail('c1', { kind: 'LIVE_SOUND', service: 'LIVE_SOUND' })])
		);
		expect(line).toMatchObject({
			key: 'collab:c1',
			title: 'Collab c1',
			roles: ['Sonorisation d’une date'],
			categories: ['SON'],
			proof: 'CONFIRMED',
			date: D('2026-05-10'),
			with: 'Léa',
			href: '/messages/conv-c1'
		});
	});

	it('déduplication : crédit et collaboration sur le même morceau ne font qu’une ligne, la meilleure preuve l’emporte', () => {
		const lines = contributionLines(
			[
				credit('r1', 'w1', 'MIXING', { occurredAt: D('2026-06-01') }),
				collab('c1', { roles: ['PROVIDER'] })
			],
			details(
				[work('w1', { roles: { r1: { kind: 'MIXING', instrument: null } } })],
				[collabDetail('c1', { workId: 'w1', kind: 'MIXING', service: 'MIXING' })]
			)
		);
		expect(lines).toHaveLength(1);
		expect(lines[0]).toMatchObject({
			key: 'work:w1',
			roles: ['Mixage'],
			proof: 'CONFIRMED',
			// La plus ancienne des dates.
			date: D('2026-05-10'),
			sources: ['credit:r1', 'collab:c1']
		});
	});

	it('plusieurs rôles sur un même morceau : une ligne, tous les rôles, toutes les familles', () => {
		const lines = contributionLines(
			[credit('r1', 'w1', 'COMPOSITION'), credit('r2', 'w1', 'INSTRUMENT')],
			details([
				work('w1', {
					roles: {
						r1: { kind: 'COMPOSITION', instrument: null },
						r2: { kind: 'INSTRUMENT', instrument: 'Guitare' }
					}
				})
			])
		);
		expect(lines).toHaveLength(1);
		expect(lines[0].roles).toEqual(['Composition', 'Guitare']);
		expect(lines[0].categories).toEqual(['JEU', 'ECRITURE']);
	});

	it('deux morceaux d’une même séance : deux réalisations distinctes', () => {
		const lines = contributionLines(
			[collab('c1', { roles: ['PROVIDER'] }), credit('r2', 'w2', 'MIXING')],
			details(
				[work('w1'), work('w2', { roles: { r2: { kind: 'MIXING', instrument: null } } })],
				[collabDetail('c1', { workId: 'w1', service: 'MIXING' })]
			)
		);
		expect(lines.map((l) => l.key).sort()).toEqual(['work:w1', 'work:w2']);
	});

	it('une déclaration n’est jamais affichée comme confirmée', () => {
		const [line] = contributionLines(
			[
				credit('r1', 'w1', 'COMPOSITION', { proof: 'DECLARED' }),
				real('WORK_COMPOSED', { type: 'WORK', id: 'w1' }, { proof: 'DECLARED' })
			],
			details([
				work('w1', { owner: null, roles: { r1: { kind: 'COMPOSITION', instrument: null } } })
			])
		);
		expect(line.proof).toBe('DECLARED');
		// Porteur = moi : personne d'autre à nommer.
		expect(line.with).toBeNull();
	});

	it('crédit sans rôle précisé (`WORK_COMPOSED` seul) : « Crédit »', () => {
		const [line] = contributionLines(
			[real('WORK_COMPOSED', { type: 'WORK', id: 'w1' })],
			details([work('w1')])
		);
		expect(line).toMatchObject({ roles: ['Crédit'], categories: [], proof: 'CREDITED' });
	});

	it('faits de groupe et dérivés exclus : étape, morceau produit du groupe', () => {
		const lines = contributionLines(
			[
				real(
					'MILESTONE',
					{ type: 'MILESTONE', id: 'm1', bandId: 'b1', definitionId: 'FIRST_GIG' },
					{ roles: ['BAND_MEMBER'] }
				),
				real('PRODUCTION_STAGE', { type: 'WORK', id: 'w9' }, { roles: ['BAND_MEMBER'] })
			],
			details([work('w9')])
		);
		expect(lines).toEqual([]);
	});

	it('retirée : absente ; gelée : présente, marquée, sans élever la preuve', () => {
		const lines = contributionLines(
			[credit('r1', 'w1', 'MIXING', { status: 'RETIRED' }), collab('c2', { status: 'FROZEN' })],
			details([work('w1')], [collabDetail('c2')])
		);
		expect(lines).toHaveLength(1);
		expect(lines[0]).toMatchObject({ key: 'collab:c2', frozen: true });
	});

	it('accueil d’un concert : rôle d’accueil, famille Scène ; concert joué : Scène', () => {
		const lines = contributionLines(
			[collab('c1', { roles: ['HOST'] }), collab('c2')],
			details(
				[],
				[
					collabDetail('c1', { kind: 'GIG' }),
					collabDetail('c2', { kind: 'GIG', happenedOn: D('2026-01-02') })
				]
			)
		);
		expect(lines.map((l) => [l.roles, l.categories])).toEqual([
			[['Accueil de la date'], ['SCENE']],
			[['Concert'], ['SCENE']]
		]);
	});

	describe('confidentialité', () => {
		it('porteur bloqué : pas de nom ; compte anonymisé : « Compte supprimé »', () => {
			expect(partyName({ displayName: 'X', deleted: false, blocked: true })).toBeNull();
			expect(partyName({ displayName: 'X', deleted: true, blocked: true })).toBe('Compte supprimé');
			const [line] = contributionLines(
				[credit('r1', 'w1', 'MIXING')],
				details([
					work('w1', {
						owner: { displayName: 'Bloqueur', deleted: false, blocked: true, dissolved: false },
						open: false
					})
				])
			);
			expect(line.with).toBeNull();
			expect(line.href).toBeNull();
		});

		it('groupe dissous : le fait reste, mention, pas de lien', () => {
			const [line] = contributionLines(
				[credit('r1', 'w1', 'INSTRUMENT')],
				details([
					work('w1', {
						owner: { displayName: 'Les Tilleuls', deleted: false, blocked: false, dissolved: true },
						open: false
					})
				])
			);
			expect(line).toMatchObject({ with: 'Les Tilleuls', notes: ['groupe dissous'], href: null });
		});

		it('idée (morceau privé) : mention ; collaboration sans ligne en base : titre neutre, rien d’inventé', () => {
			const lines = contributionLines(
				[credit('r1', 'w1', 'MIXING'), collab('ghost')],
				details([work('w1', { state: 'IDEA' })])
			);
			const ghost = lines.find((l) => l.key === 'collab:ghost')!;
			expect(ghost).toMatchObject({
				title: 'Collaboration terminée',
				with: null,
				href: null,
				roles: ['Collaboration']
			});
			expect(lines.find((l) => l.key === 'work:w1')!.notes).toEqual(['idée']);
		});

		it('participant bloqué sur une collaboration : non nommé, les autres oui', () => {
			const [line] = contributionLines(
				[collab('c1')],
				details(
					[],
					[
						collabDetail('c1', {
							others: [lea, { displayName: 'Bloqueur', deleted: false, blocked: true }],
							conversationId: null
						})
					]
				)
			);
			expect(line).toMatchObject({ with: 'Léa', href: null });
		});
	});

	describe('tri, filtres, années, vide', () => {
		const line = (key: string, date: Date | null, categories: ContributionLine['categories']) =>
			({ key, date, categories }) as ContributionLine;

		it('tri chronologique stable : récent d’abord, sans date à la fin, égalité par clé', () => {
			const sorted = sortContributions([
				line('b', D('2026-01-01'), []),
				line('z', null, []),
				line('a', D('2026-01-01'), []),
				line('c', D('2025-12-31'), [])
			]);
			expect(sorted.map((l) => l.key)).toEqual(['a', 'b', 'c', 'z']);
		});

		it('filtres : seulement les familles présentes ; un filtre inconnu vaut « Tout »', () => {
			const lines = [line('a', null, ['SON']), line('b', null, ['JEU', 'SON'])];
			expect(presentCategories(lines)).toEqual(['SON', 'JEU']);
			expect(filterContributions(lines, 'JEU').map((l) => l.key)).toEqual(['b']);
			expect(filterContributions(lines, 'TOUT')).toHaveLength(2);
			expect(filterFromSlug('son')).toBe('SON');
			expect(filterFromSlug('<script>')).toBe('TOUT');
			expect(filterFromSlug(null)).toBe('TOUT');
		});

		it('regroupement par année, à l’heure de Paris', () => {
			const groups = byYear([
				line('a', new Date('2026-01-01T00:30:00+01:00'), []),
				line('b', new Date('2025-12-31T23:30:00Z'), []),
				line('c', D('2025-06-01'), []),
				line('d', null, [])
			]);
			// 31/12 à 23 h 30 UTC = 1er janvier à 0 h 30 à Paris : 2026.
			expect(groups.map((g) => [g.year, g.lines.map((l) => l.key)])).toEqual([
				[2026, ['a', 'b']],
				[2025, ['c']],
				[null, ['d']]
			]);
		});

		it('aucune réalisation : liste vide, aucune famille', () => {
			const lines = contributionLines([], details());
			expect(lines).toEqual([]);
			expect(presentCategories(lines)).toEqual([]);
		});
	});
});
