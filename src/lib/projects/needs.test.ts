/**
 * U3b (D76) : règles pures des besoins d'un projet et schéma de brouillon.
 * Conception 22 §4 (cycle de vie), §5 (matrice, N1 à N6), §11 (#89).
 */
import { describe, expect, it } from 'vitest';
import {
	addLabel,
	canNeed,
	MAX_LIVE_NEEDS_PER_PROJECT,
	MAX_NEEDS_PER_DAY,
	MAX_PENDING_PROPOSALS_PER_AUTHOR,
	needActions,
	needLabel,
	needQuota,
	needSearchHref,
	needTransition,
	needVisible,
	NEED_STATUSES,
	NEED_TRACKS,
	specialtyAllowed,
	statusOnAdd,
	type NeedStatusValue
} from './needs';
import { projectNeedDraftSchema, needUpdateSchema } from '#lib/schema/projects/need';
import type { ProjectRoleValue } from './participants';

const ROLES: (ProjectRoleValue | null)[] = ['manage', 'coordinate', 'participate', null];

describe('besoins : cycle de vie', () => {
	it('chaque intention ne part que de son état', () => {
		expect(needTransition('open', 'PROPOSED')).toBe('OPEN');
		expect(needTransition('decline', 'PROPOSED')).toBe('DECLINED');
		expect(needTransition('withdraw', 'PROPOSED')).toBe('CANCELLED');
		expect(needTransition('fill', 'OPEN')).toBe('FILLED');
		expect(needTransition('reopen', 'FILLED')).toBe('OPEN');
		expect(needTransition('cancel', 'OPEN')).toBe('CANCELLED');
		expect(needTransition('open', 'OPEN')).toBeNull();
		expect(needTransition('fill', 'PROPOSED')).toBeNull();
		expect(needTransition('cancel', 'FILLED')).toBeNull();
	});

	it('refusé et annulé sont terminaux', () => {
		for (const intent of [
			'update',
			'withdraw',
			'open',
			'decline',
			'fill',
			'reopen',
			'cancel'
		] as const) {
			expect(needTransition(intent, 'DECLINED')).toBeNull();
			expect(needTransition(intent, 'CANCELLED')).toBeNull();
		}
	});

	it('la gestion ajoute ouvert, la coordination propose, personne d’autre n’ajoute', () => {
		expect(statusOnAdd('manage')).toBe('OPEN');
		expect(statusOnAdd('coordinate')).toBe('PROPOSED');
		expect(statusOnAdd('participate')).toBeNull();
		expect(statusOnAdd(null)).toBeNull();
		expect(addLabel('manage')).toBe('Ajouter');
		expect(addLabel('coordinate')).toBe('Proposer à la gestion');
	});
});

describe('besoins : matrice des droits (§5)', () => {
	const can = (
		intent: Parameters<typeof canNeed>[0],
		role: ProjectRoleValue | null,
		status: NeedStatusValue,
		author = false,
		open = true
	) => canNeed(intent, { role, author, status, open });

	it('N1 : seule la gestion ouvre, refuse ou annule', () => {
		for (const role of ROLES) {
			expect(can('open', role, 'PROPOSED')).toBe(role === 'manage');
			expect(can('decline', role, 'PROPOSED')).toBe(role === 'manage');
			expect(can('cancel', role, 'OPEN')).toBe(role === 'manage');
		}
		// Même autrice de la proposition, la coordination ne la valide pas.
		expect(can('open', 'coordinate', 'PROPOSED', true)).toBe(false);
	});

	it('pourvu et rouvrir : gestion et coordination', () => {
		for (const role of ROLES) {
			const allowed = role === 'manage' || role === 'coordinate';
			expect(can('fill', role, 'OPEN')).toBe(allowed);
			expect(can('reopen', role, 'FILLED')).toBe(allowed);
		}
	});

	it('modifier : sa proposition (coordination) ; un besoin ouvert, la gestion seule', () => {
		expect(can('update', 'coordinate', 'PROPOSED', true)).toBe(true);
		expect(can('update', 'coordinate', 'PROPOSED', false)).toBe(false);
		expect(can('update', 'manage', 'PROPOSED')).toBe(true);
		expect(can('update', 'coordinate', 'OPEN', true)).toBe(false);
		expect(can('update', 'manage', 'OPEN')).toBe(true);
		expect(can('update', 'participate', 'OPEN')).toBe(false);
	});

	it('retirer : l’autrice seule, même sur un projet clos', () => {
		expect(can('withdraw', 'coordinate', 'PROPOSED', true)).toBe(true);
		expect(can('withdraw', 'coordinate', 'PROPOSED', true, false)).toBe(true);
		expect(can('withdraw', 'manage', 'PROPOSED', false)).toBe(false);
	});

	it('projet clos ou porteur dissous : rien d’autre ne change', () => {
		expect(can('open', 'manage', 'PROPOSED', false, false)).toBe(false);
		expect(can('fill', 'manage', 'OPEN', false, false)).toBe(false);
		expect(can('update', 'manage', 'OPEN', false, false)).toBe(false);
		expect(needActions({ role: 'manage', author: false, status: 'OPEN', open: false })).toEqual([]);
	});

	it('participation simple et personne extérieure : aucun geste', () => {
		for (const status of NEED_STATUSES) {
			expect(needActions({ role: 'participate', author: false, status, open: true })).toEqual([]);
			expect(needActions({ role: null, author: false, status, open: true })).toEqual([]);
		}
	});
});

describe('besoins : ce que chacun voit', () => {
	it('ouverts et pourvus pour toute personne qui lit la fiche', () => {
		for (const status of ['OPEN', 'FILLED'] as const) {
			expect(needVisible({ role: 'participate', author: false, status })).toBe(true);
			expect(needVisible({ role: null, author: false, status })).toBe(false);
		}
	});

	it('propositions et refus : la gestion, et l’autrice', () => {
		for (const status of ['PROPOSED', 'DECLINED'] as const) {
			expect(needVisible({ role: 'manage', author: false, status })).toBe(true);
			expect(needVisible({ role: 'coordinate', author: true, status })).toBe(true);
			expect(needVisible({ role: 'coordinate', author: false, status })).toBe(false);
			expect(needVisible({ role: 'participate', author: false, status })).toBe(false);
			expect(needVisible({ role: null, author: true, status })).toBe(false);
		}
	});

	it('un besoin annulé ne s’affiche pas sur la fiche', () => {
		for (const role of ROLES) {
			expect(needVisible({ role, author: true, status: 'CANCELLED' })).toBe(false);
		}
	});
});

describe('besoins : métiers, libellés, recherche', () => {
	it('six métiers, ceux que la recherche trouve (Q95)', () => {
		expect([...NEED_TRACKS].sort()).toEqual(
			['BOOKER', 'MANAGER', 'MUSICIAN', 'PRODUCER', 'PROMOTER', 'SOUND_ENGINEER'].sort()
		);
	});

	it('libellé : métier, puis précision ou instrument', () => {
		expect(needLabel('SOUND_ENGINEER', 'RECORDING', null)).toBe('Ingé son · Prise de son');
		expect(needLabel('MUSICIAN', null, 'Basse')).toBe('Musicien·ne · Basse');
		expect(needLabel('BOOKER', null, null)).toBe('Booker');
	});

	it('précision admise seulement pour son métier', () => {
		expect(specialtyAllowed('SOUND_ENGINEER', 'LIVE_FOH')).toBe(true);
		expect(specialtyAllowed('PRODUCER', 'LIVE_FOH')).toBe(false);
		expect(specialtyAllowed('BOOKER', null)).toBe(true);
	});

	it('« Trouver un pro » : la recherche préremplie, sans rien envoyer', () => {
		expect(needSearchHref('SOUND_ENGINEER', 'MIXING', null)).toBe(
			'/decouvrir?metier=inge-son&specialite=mixage'
		);
		expect(needSearchHref('MUSICIAN', null, 'basse')).toBe(
			'/decouvrir?metier=musicien&instrument=basse'
		);
		expect(needSearchHref('BOOKER', null, null)).toBe('/decouvrir?metier=booker');
	});
});

describe('besoins : quotas (Q93)', () => {
	const base = { live: 0, pendingByAuthor: 0, createdToday: 0, status: 'OPEN' as const };
	it('par projet, par autrice, par jour', () => {
		expect(needQuota(base)).toBeNull();
		expect(needQuota({ ...base, live: MAX_LIVE_NEEDS_PER_PROJECT })).toBe('project');
		expect(needQuota({ ...base, createdToday: MAX_NEEDS_PER_DAY })).toBe('day');
		expect(
			needQuota({ ...base, status: 'PROPOSED', pendingByAuthor: MAX_PENDING_PROPOSALS_PER_AUTHOR })
		).toBe('author');
		// La gestion n'a pas de propositions en attente : ce quota ne la vise pas.
		expect(needQuota({ ...base, pendingByAuthor: MAX_PENDING_PROPOSALS_PER_AUTHOR })).toBeNull();
	});
});

describe('besoins : brouillon (formulaire et #89)', () => {
	it('accepte la phrase cible de l’assistant', () => {
		const draft = projectNeedDraftSchema.parse({
			track: 'SOUND_ENGINEER',
			specialty: 'RECORDING',
			description: 'Enregistrer les cinq morceaux de notre EP'
		});
		expect(draft).toEqual({
			track: 'SOUND_ENGINEER',
			specialty: 'RECORDING',
			instrument: null,
			description: 'Enregistrer les cinq morceaux de notre EP'
		});
	});

	it('N5 : refuse un état, un auteur ou une décision venus du client', () => {
		for (const extra of [{ status: 'OPEN' }, { createdById: 'x' }, { decidedById: 'x' }]) {
			expect(projectNeedDraftSchema.safeParse({ track: 'BOOKER', ...extra }).success).toBe(false);
		}
	});

	it('refuse une précision d’un autre métier, un instrument hors musicien·ne', () => {
		expect(
			projectNeedDraftSchema.safeParse({ track: 'PRODUCER', specialty: 'LIVE_FOH' }).success
		).toBe(false);
		expect(projectNeedDraftSchema.safeParse({ track: 'BOOKER', instrument: 'basse' }).success).toBe(
			false
		);
		expect(projectNeedDraftSchema.safeParse({ track: 'LABEL_PRO' }).success).toBe(false);
	});

	it('phrase de 280 caractères au plus ; vide devient absente', () => {
		expect(
			projectNeedDraftSchema.safeParse({ track: 'BOOKER', description: 'a'.repeat(281) }).success
		).toBe(false);
		expect(projectNeedDraftSchema.parse({ track: 'BOOKER', description: '  ' }).description).toBe(
			null
		);
	});

	it('modifier : le même contenu, avec l’identifiant du besoin', () => {
		expect(needUpdateSchema.safeParse({ needId: 'n1', track: 'MANAGER' }).success).toBe(true);
		expect(
			needUpdateSchema.safeParse({ needId: 'n1', track: 'MANAGER', status: 'FILLED' }).success
		).toBe(false);
	});
});
