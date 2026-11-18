import { describe, expect, it } from 'vitest';
import { NOT_A_HERO, RANK_KICKER, START_DOORS, isNewAccount, pickHero } from './index';

const a = (key: string, rank: 1 | 2 | 3 | 4 | 5 = 2) => ({ key, rank });
const ctx = { newAccount: false, hasObjective: true };

describe('héros de l’accueil Collab (U0, D74)', () => {
	it('prend la première action du moteur, sans la répéter dans la liste', () => {
		const next = [
			a('collab.confirm:COLLABORATION:c1', 1),
			a('credit.confirm:WORK:w1'),
			a('prod.mix:WORK:w2', 4)
		];
		const h = pickHero(next, ctx);
		expect(h.kind).toBe('action');
		if (h.kind !== 'action') return;
		expect(h.action.key).toBe('collab.confirm:COLLABORATION:c1');
		expect(h.rest.map((x) => x.key)).toEqual(['credit.confirm:WORK:w1', 'prod.mix:WORK:w2']);
		expect(h.rest).not.toContain(h.action);
	});

	it('suit l’ordre du moteur : travail en cours, puis besoin, puis suggestion', () => {
		const h = pickHero([a('work.step:WORK:w1', 3), a('prod.mix:WORK:w2', 4)], ctx);
		expect(h.kind === 'action' && h.action.key).toBe('work.step:WORK:w1');
		const opt = pickHero([a('trial.within_reach:TRIAL:5', 5)], ctx);
		expect(opt.kind === 'action' && opt.action.key).toBe('trial.within_reach:TRIAL:5');
	});

	it('candidatures et demandes de contact restent dans leurs tuiles', () => {
		const next = [
			a('applications.review:INBOX:applications'),
			a('contact.respond:INBOX:contact-requests'),
			a('work.step:WORK:w1', 3)
		];
		const h = pickHero(next, ctx);
		expect(h.kind === 'action' && h.action.key).toBe('work.step:WORK:w1');
		expect(h.rest.map((x) => x.key)).toEqual([
			'applications.review:INBOX:applications',
			'contact.respond:INBOX:contact-requests'
		]);
		expect(NOT_A_HERO).toEqual(['applications.review', 'contact.respond']);
		const only = pickHero(next.slice(0, 2), ctx);
		expect(only.kind).toBe('objective');
	});

	it('rien d’autre : l’objectif ; compte neuf : « Commence ici »', () => {
		expect(pickHero([], ctx).kind).toBe('objective');
		expect(pickHero([], { newAccount: true, hasObjective: true }).kind).toBe('start');
		expect(pickHero([], { newAccount: false, hasObjective: false }).kind).toBe('start');
	});

	it('une action réelle passe avant « Commence ici », même pour un compte neuf', () => {
		const h = pickHero([a('band.invitation:BAND:b1')], { newAccount: true, hasObjective: true });
		expect(h.kind).toBe('action');
	});

	it('compte neuf : ni morceau, ni groupe, ni épreuve franchie', () => {
		expect(isNewAccount({ works: 0, bands: 0, trialsPassed: 0 })).toBe(true);
		expect(isNewAccount({ works: 1, bands: 0, trialsPassed: 0 })).toBe(false);
		expect(isNewAccount({ works: 0, bands: 1, trialsPassed: 0 })).toBe(false);
		expect(isNewAccount({ works: 0, bands: 0, trialsPassed: 1 })).toBe(false);
	});

	it('« Commence ici » : trois portes réelles, dont Rencontre, sans reproche', () => {
		expect(START_DOORS.map((d) => d.href)).toEqual(['/morceaux/nouveau', '/decouvrir', '/jam']);
		for (const d of START_DOORS)
			expect(`${d.title} ${d.text}`).not.toMatch(/pas encore|retard|toujours|XP/i);
		// Aucun lien vers les projets avant P2/P3.
		expect(START_DOORS.some((d) => d.href.startsWith('/projets'))).toBe(false);
	});

	it('chaque rang a son mot, sans XP', () => {
		expect(Object.keys(RANK_KICKER)).toEqual(['1', '2', '3', '4', '5']);
		for (const k of Object.values(RANK_KICKER)) expect(k).not.toMatch(/XP|point/i);
	});
});
