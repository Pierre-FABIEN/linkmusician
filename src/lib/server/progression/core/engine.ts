/**
 * Application des règles à un événement : toutes celles qui écoutent son type,
 * dans l'ordre de `RULES`. Pur : le registre et les projections sont tenus
 * hors du noyau (`../ledger.ts`, `../projector.ts`).
 */
import { parseDomainEvent, type DomainEvent } from './events';
import { RULES } from './rules';
import type { Rule, RuleContext, XpGain } from './types';

export function gainsFor(input: DomainEvent | unknown, ctx: RuleContext, rules = RULES): XpGain[] {
	const event = parseDomainEvent(input);
	return rules
		.filter((rule) => rule.on === event.type)
		.flatMap((rule) => (rule as Rule<typeof event.type>).apply(event as never, ctx));
}
