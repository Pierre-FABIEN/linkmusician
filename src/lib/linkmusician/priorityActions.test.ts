import { describe, expect, it } from 'vitest';
import { priorityActions, type PriorityFacts } from './priorityActions';

const empty: PriorityFacts = {
	confirmations: 0,
	applications: 0,
	requests: 0,
	nextDate: null,
	canReceiveRequests: true
};
describe('actions prioritaires DASH-03', () => {
	it('explique chaque absence sans compteur fictif et ouvre un écran réel', () => {
		const actions = priorityActions('MUSICIAN', empty);
		expect(actions).toHaveLength(4);
		expect(actions.every((a) => a.summary === null && !a.highlight && a.href.startsWith('/'))).toBe(
			true
		);
		expect(actions.every((a) => a.text.startsWith('Aucune'))).toBe(true);
	});
	it('privilégie les réponses réelles, puis les dates, sans entrée répétée', () => {
		const facts = { ...empty, applications: 2, nextDate: new Date('2026-11-15T23:30:00Z') };
		const actions = priorityActions('SOUND_ENGINEER', facts);
		expect(actions.map((a) => a.kind)).toEqual([
			'applications',
			'agenda',
			'confirmations',
			'requests'
		]);
		expect(actions[0].summary).toBe('2 dans l’aperçu');
		expect(actions[1].summary).toBe('16 nov. 2026');
		expect(new Set(actions.map((a) => a.href)).size).toBe(4);
	});
	it('configure les six métiers ouverts et exclut les trois métiers bientôt', () => {
		for (const track of [
			'MUSICIAN',
			'SOUND_ENGINEER',
			'PRODUCER',
			'PROMOTER',
			'MANAGER',
			'BOOKER'
		] as const) {
			expect(priorityActions(track, empty)).toHaveLength(4);
		}
		for (const track of ['LABEL_PRO', 'PUBLISHER', 'MUSIC_COMMS'] as const) {
			expect(priorityActions(track, empty)).toEqual([]);
		}
		expect(priorityActions('PROMOTER', empty)[0].kind).toBe('applications');
		expect(priorityActions('MANAGER', empty)[0].kind).toBe('requests');
	});
	it('ne propose pas de répondre à une sollicitation pour un mineur ou un âge inconnu', () => {
		const action = priorityActions('BOOKER', {
			...empty,
			requests: 12,
			canReceiveRequests: false
		}).find((a) => a.kind === 'requests')!;
		expect(action.summary).toBeNull();
		expect(action.highlight).toBe(false);
		expect(action.text).toContain('réservées aux adultes');
	});
});
