/**
 * Démos validées par la modération : la première rapporte davantage (une
 * fois), les suivantes sont plafonnées par semaine glissante. Les photos et
 * vidéos ne rapportent rien.
 */
import { BAREME } from '../bareme';
import { daysBefore, defineRule } from '../types';

export const firstDemo = defineRule({
	id: 'demo.first',
	version: BAREME.version,
	on: 'media.published',
	apply(event, ctx) {
		if (event.kind !== 'DEMO' || ctx.countGains(event.actorId, this.id) > 0) return [];
		return [
			{
				actorId: event.actorId,
				track: 'MUSICIAN',
				amount: BAREME.firstDemo,
				multiplier: 1,
				ruleId: this.id,
				ruleVersion: this.version,
				reason: 'Première démo publiée'
			}
		];
	}
});

export const extraDemo = defineRule({
	id: 'demo.extra',
	version: BAREME.version,
	on: 'media.published',
	apply(event, ctx) {
		if (event.kind !== 'DEMO') return [];
		// La première démo relève de `demo.first` (déjà créditée ou en cours).
		if (ctx.countGains(event.actorId, firstDemo.id) === 0) return [];
		const thisWeek = ctx.countGains(event.actorId, this.id, daysBefore(ctx.now, 7));
		if (thisWeek >= BAREME.extraDemoPerWeek) return [];
		return [
			{
				actorId: event.actorId,
				track: 'MUSICIAN',
				amount: BAREME.extraDemo,
				multiplier: 1,
				ruleId: this.id,
				ruleVersion: this.version,
				reason: 'Nouvelle démo publiée'
			}
		];
	}
});
