import { describe, expect, it } from 'vitest';
import {
	staleWorkStep,
	availableWorkStepActions,
	planAccessLossRelease,
	planWorkStep,
	workStepFormSchema,
	type WorkStepState
} from './steps';

const now = new Date('2026-11-17T10:00:00Z');
const earlier = new Date('2026-11-10T10:00:00Z');
const step = (s: Partial<WorkStepState> = {}): WorkStepState => ({
	status: 'TODO',
	assigneeId: 'thomas',
	startedAt: null,
	doneAt: null,
	...s
});

describe('planWorkStep — prise en charge', () => {
	it('crée une étape SELF, HOME, TODO, sans dates', () => {
		expect(planWorkStep(null, 'claim', 'thomas', now)).toEqual({
			kind: 'apply',
			act: 'CLAIMED',
			next: {
				status: 'TODO',
				assigneeId: 'thomas',
				startedAt: null,
				doneAt: null,
				mode: 'SELF',
				place: 'HOME'
			}
		});
	});
	it('rejouer la prise en charge ne change rien', () => {
		expect(planWorkStep(step(), 'claim', 'thomas', now)).toEqual({ kind: 'noop' });
	});
	it('refuse une étape déjà prise par une autre personne', () => {
		expect(planWorkStep(step(), 'claim', 'lea', now)).toMatchObject({ kind: 'error', status: 409 });
	});
	it('reprend une étape libérée de zéro', () => {
		const released = step({ assigneeId: null });
		expect(planWorkStep(released, 'claim', 'lea', now)).toMatchObject({
			act: 'CLAIMED',
			next: { assigneeId: 'lea', status: 'TODO' }
		});
	});
});

describe('planWorkStep — transitions de la personne responsable', () => {
	it('TODO → IN_PROGRESS pose la date de début', () => {
		expect(planWorkStep(step(), 'start', 'thomas', now)).toMatchObject({
			act: 'STARTED',
			next: { status: 'IN_PROGRESS', startedAt: now, doneAt: null }
		});
	});
	it('IN_PROGRESS → DONE exige une confirmation et garde le début', () => {
		const running = step({ status: 'IN_PROGRESS', startedAt: earlier });
		expect(planWorkStep(running, 'finish', 'thomas', now)).toMatchObject({ kind: 'error' });
		expect(planWorkStep(running, 'finish', 'thomas', now, true)).toMatchObject({
			act: 'FINISHED',
			next: { status: 'DONE', startedAt: earlier, doneAt: now }
		});
	});
	it('TODO → DONE directement, avec confirmation, sans date de début', () => {
		expect(planWorkStep(step(), 'finish', 'thomas', now, true)).toMatchObject({
			next: { status: 'DONE', startedAt: null, doneAt: now }
		});
	});
	it('IN_PROGRESS → TODO efface le début', () => {
		const running = step({ status: 'IN_PROGRESS', startedAt: earlier });
		expect(planWorkStep(running, 'reset', 'thomas', now)).toMatchObject({
			act: 'RESET',
			next: { status: 'TODO', startedAt: null }
		});
	});
	it('DONE → IN_PROGRESS rouvre, efface la fin et garde le début', () => {
		const done = step({ status: 'DONE', startedAt: earlier, doneAt: now });
		expect(planWorkStep(done, 'reopen', 'thomas', now)).toMatchObject({
			act: 'REOPENED',
			next: { status: 'IN_PROGRESS', startedAt: earlier, doneAt: null }
		});
		// Terminée sans être commencée : la réouverture pose un début.
		const direct = step({ status: 'DONE', doneAt: earlier });
		expect(planWorkStep(direct, 'reopen', 'thomas', now)).toMatchObject({
			next: { startedAt: now }
		});
	});
	it('les actions rejouées sont sans effet', () => {
		expect(
			planWorkStep(step({ status: 'IN_PROGRESS', startedAt: earlier }), 'start', 'thomas', now)
		).toEqual({ kind: 'noop' });
		expect(
			planWorkStep(step({ status: 'DONE', doneAt: now }), 'finish', 'thomas', now, true)
		).toEqual({ kind: 'noop' });
		expect(planWorkStep(step(), 'reset', 'thomas', now)).toEqual({ kind: 'noop' });
		expect(
			planWorkStep(step({ status: 'IN_PROGRESS', startedAt: earlier }), 'reopen', 'thomas', now)
		).toEqual({ kind: 'noop' });
	});
	it('refuse les transitions incohérentes', () => {
		const done = step({ status: 'DONE', doneAt: now });
		expect(planWorkStep(done, 'start', 'thomas', now)).toMatchObject({ kind: 'error' });
		expect(planWorkStep(done, 'reset', 'thomas', now)).toMatchObject({ kind: 'error' });
		expect(planWorkStep(step(), 'reopen', 'thomas', now)).toMatchObject({ kind: 'error' });
	});
});

describe('planWorkStep — droits', () => {
	it('une autre personne de la gestion ne fait pas avancer l’étape de Thomas', () => {
		for (const action of ['start', 'finish', 'reset', 'reopen'] as const) {
			expect(planWorkStep(step(), action, 'lea', now, true)).toMatchObject({
				kind: 'error',
				status: 403
			});
		}
	});
	it('elle peut libérer une étape non terminée, pas une étape terminée', () => {
		expect(
			planWorkStep(step({ status: 'IN_PROGRESS', startedAt: earlier }), 'release', 'lea', now)
		).toMatchObject({
			act: 'RELEASED',
			next: { assigneeId: null, status: 'TODO', startedAt: null, mode: null, place: null }
		});
		expect(
			planWorkStep(step({ status: 'DONE', doneAt: now }), 'release', 'lea', now)
		).toMatchObject({
			kind: 'error'
		});
	});
	it('sans prise en charge, seule « Je m’en charge » est possible', () => {
		expect(planWorkStep(null, 'start', 'thomas', now)).toMatchObject({ kind: 'error' });
		expect(planWorkStep(null, 'release', 'thomas', now)).toEqual({ kind: 'noop' });
	});
});

describe('availableWorkStepActions', () => {
	it('rien pour qui ne gère pas le morceau', () => {
		expect(availableWorkStepActions(step(), 'thomas', false)).toEqual([]);
	});
	it('selon le statut, pour la personne responsable', () => {
		expect(availableWorkStepActions(null, 'thomas', true)).toEqual(['claim']);
		expect(availableWorkStepActions(step(), 'thomas', true)).toEqual([
			'start',
			'finish',
			'release'
		]);
		expect(availableWorkStepActions(step({ status: 'DONE', doneAt: now }), 'thomas', true)).toEqual(
			['reopen']
		);
	});
	it('les autres gestionnaires peuvent seulement libérer', () => {
		expect(availableWorkStepActions(step(), 'lea', true)).toEqual(['release']);
	});
});

describe('planAccessLossRelease — P1 (E10)', () => {
	const freed = {
		status: 'TODO',
		assigneeId: null,
		startedAt: null,
		doneAt: null,
		mode: null,
		place: null
	};
	it('libère une étape à faire ou en cours, avec un acte dédié', () => {
		expect(planAccessLossRelease(step(), 'thomas')).toEqual({
			kind: 'apply',
			act: 'AUTO_RELEASED',
			next: freed
		});
		expect(
			planAccessLossRelease(step({ status: 'IN_PROGRESS', startedAt: earlier }), 'thomas')
		).toEqual({ kind: 'apply', act: 'AUTO_RELEASED', next: freed });
	});
	it('une étape terminée reste intacte, à son nom', () => {
		expect(planAccessLossRelease(step({ status: 'DONE', doneAt: now }), 'thomas')).toEqual({
			kind: 'noop'
		});
	});
	it('idempotent : rien pour une étape déjà libérée, reprise par autrui ou absente', () => {
		expect(planAccessLossRelease(step({ assigneeId: null }), 'thomas')).toEqual({ kind: 'noop' });
		expect(planAccessLossRelease(step({ assigneeId: 'lea' }), 'thomas')).toEqual({ kind: 'noop' });
		expect(planAccessLossRelease(null, 'thomas')).toEqual({ kind: 'noop' });
	});
	it('la libération manuelle produit le même état, avec son propre acte', () => {
		const manual = planWorkStep(step({ status: 'IN_PROGRESS' }), 'release', 'lea', now);
		expect(manual).toEqual({ kind: 'apply', act: 'RELEASED', next: freed });
	});
	it('une étape terminée sans responsable (compte supprimé) ne se reprend pas', () => {
		const erased = step({ status: 'DONE', assigneeId: null, doneAt: now });
		expect(planWorkStep(erased, 'claim', 'lea', now)).toMatchObject({
			kind: 'error',
			status: 409
		});
		expect(availableWorkStepActions(erased, 'lea', true)).toEqual([]);
		// Libérée (à faire, sans responsable) : la gestion la reprend.
		expect(availableWorkStepActions(step({ assigneeId: null }), 'lea', true)).toEqual(['claim']);
	});
});

describe('workStepFormSchema', () => {
	it('ne lit que l’intention, jamais un statut', () => {
		expect(
			workStepFormSchema.parse({
				kind: 'RECORDING',
				action: 'finish',
				confirm: 'on',
				status: 'DONE'
			})
		).toEqual({ kind: 'RECORDING', action: 'finish', confirm: true, revision: 0 });
		expect(workStepFormSchema.safeParse({ kind: 'RECORDING', action: 'publish' }).success).toBe(
			false
		);
	});
});

describe('staleWorkStep', () => {
	it('refuse une transition calculée sur une révision dépassée', () => {
		const plan = planWorkStep(step(), 'start', 'thomas', now);
		expect(staleWorkStep(plan, 3, 3)).toBe(plan);
		expect(staleWorkStep(plan, 4, 3)).toMatchObject({ kind: 'error', status: 409 });
	});
	it('un rejeu sans effet reste sans effet, même périmé', () => {
		expect(staleWorkStep({ kind: 'noop' }, 4, 3)).toEqual({ kind: 'noop' });
	});
});
