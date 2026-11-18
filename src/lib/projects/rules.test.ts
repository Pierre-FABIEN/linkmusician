import { describe, expect, it } from 'vitest';
import {
	actVisible,
	canChangeShare,
	canTransition,
	defaultShare,
	displayTitle,
	isAllowedOwner,
	isLowering,
	itemVisibility,
	itemsQuotaReached,
	MAX_ACTIVE_PROJECTS,
	MAX_ITEMS_PER_PROJECT,
	MAX_PROJECTS_PER_OWNER,
	PROJECT_KINDS,
	projectQuota
} from './rules';
import {
	addItemSchema,
	editProjectSchema,
	itemShareSchema,
	newProjectSchema
} from '#lib/schema/projects/project';

describe('porteurs admis (Q-G0-13)', () => {
	it('personne, groupe, organisation, studio, lieu', () => {
		expect(isAllowedOwner('PERSON')).toBe(true);
		for (const kind of ['BAND', 'PROMOTER', 'STUDIO', 'VENUE'])
			expect(isAllowedOwner('ORGANIZATION', kind)).toBe(true);
	});
	it('ni école, ni agence, ni type inconnu', () => {
		for (const kind of ['SCHOOL', 'AGENCY', 'LABEL', '', null])
			expect(isAllowedOwner('ORGANIZATION', kind)).toBe(false);
		expect(isAllowedOwner('SOMETHING')).toBe(false);
	});
});

describe('types de projet', () => {
	it('les huit types de D72, sans « Autre » (UX-2 non tranché)', () => {
		expect(PROJECT_KINDS).toEqual([
			'SINGLE',
			'EP',
			'ALBUM',
			'PRODUCTION',
			'CONCERT',
			'TOUR',
			'FESTIVAL',
			'CAMPAIGN'
		]);
		expect(newProjectSchema.safeParse({ name: 'X1', kind: 'OTHER' }).success).toBe(false);
	});
});

describe('transitions d’état', () => {
	it('en cours → atteint ou laissé de côté, puis réouverture', () => {
		expect(canTransition('ACTIVE', 'DONE')).toBe(true);
		expect(canTransition('ACTIVE', 'ABANDONED')).toBe(true);
		expect(canTransition('DONE', 'ACTIVE')).toBe(true);
		expect(canTransition('ABANDONED', 'ACTIVE')).toBe(true);
	});
	it('pas d’état identique, pas de passage direct entre deux états clos', () => {
		expect(canTransition('ACTIVE', 'ACTIVE')).toBe(false);
		expect(canTransition('DONE', 'ABANDONED')).toBe(false);
		expect(canTransition('ABANDONED', 'DONE')).toBe(false);
	});
});

describe('quotas anti-abus', () => {
	it('projets en cours et projets au total, par porteur', () => {
		expect(projectQuota({ active: 0, total: 0 })).toBeNull();
		expect(projectQuota({ active: MAX_ACTIVE_PROJECTS - 1, total: 50 })).toBeNull();
		expect(projectQuota({ active: MAX_ACTIVE_PROJECTS, total: 50 })).toBe('active');
		expect(projectQuota({ active: 0, total: MAX_PROJECTS_PER_OWNER })).toBe('total');
	});
	it('éléments par projet', () => {
		expect(itemsQuotaReached(MAX_ITEMS_PER_PROJECT - 1)).toBe(false);
		expect(itemsQuotaReached(MAX_ITEMS_PER_PROJECT)).toBe(true);
	});
});

describe('partage par défaut (§9.3)', () => {
	it('public → résumé, privé → rien, jamais travail', () => {
		expect(defaultShare({ state: 'COMPOSED' })).toBe('SUMMARY');
		expect(defaultShare({ state: 'IDEA' })).toBe('NONE');
		for (const state of ['COMPOSED', 'IDEA', 'ANYTHING'])
			expect(defaultShare({ state })).not.toBe('WORK');
	});
	it('un rangement sans partage choisi laisse le serveur décider', () => {
		const parsed = addItemSchema.parse({ workId: 'w1', share: '' });
		expect(parsed.share).toBeNull();
	});
});

describe('changer le partage', () => {
	it('abaisser est toujours permis, élargir seulement en cours', () => {
		expect(isLowering('WORK', 'SUMMARY')).toBe(true);
		expect(isLowering('NONE', 'SUMMARY')).toBe(false);
		expect(canChangeShare('DONE', 'WORK', 'NONE')).toBe(true);
		expect(canChangeShare('DONE', 'NONE', 'SUMMARY')).toBe(false);
		expect(canChangeShare('ACTIVE', 'NONE', 'WORK')).toBe(true);
		expect(canChangeShare('ACTIVE', 'SUMMARY', 'SUMMARY')).toBe(false);
	});
	it('valeur inconnue refusée', () => {
		expect(itemShareSchema.safeParse({ itemId: 'i', share: 'ALL' }).success).toBe(false);
	});
});

describe('visibilité d’un élément (I6)', () => {
	it('la gestion du morceau voit tout, quel que soit le partage', () => {
		for (const share of ['NONE', 'SUMMARY', 'WORK'] as const)
			expect(itemVisibility({ managed: true, share, readable: false })).toBe('full');
	});
	it('rien n’est révélé sans partage', () => {
		expect(itemVisibility({ managed: false, share: 'NONE', readable: true })).toBe('hidden');
	});
	it('résumé et travail : un résumé, si le morceau reste lisible', () => {
		expect(itemVisibility({ managed: false, share: 'SUMMARY', readable: true })).toBe('summary');
		expect(itemVisibility({ managed: false, share: 'WORK', readable: true })).toBe('summary');
		expect(itemVisibility({ managed: false, share: 'WORK', readable: false })).toBe('hidden');
	});
	it('le titre de travail remplace le titre pour qui ne gère pas', () => {
		expect(displayTitle('summary', 'Secret feat.', 'Titre 3')).toBe('Titre 3');
		expect(displayTitle('summary', 'Lumière', null)).toBe('Lumière');
		expect(displayTitle('summary', 'Lumière', '  ')).toBe('Lumière');
		expect(displayTitle('full', 'Secret feat.', 'Titre 3')).toBe('Secret feat.');
	});
	it('journal : les actes sur un élément invisible sont omis', () => {
		const visible = new Set(['w1']);
		expect(actVisible({ workId: null }, visible)).toBe(true);
		expect(actVisible({ workId: 'w1' }, visible)).toBe(true);
		expect(actVisible({ workId: 'w2' }, visible)).toBe(false);
	});
});

describe('formulaires', () => {
	it('nom obligatoire et borné', () => {
		expect(newProjectSchema.safeParse({ name: ' ', kind: 'EP' }).success).toBe(false);
		expect(newProjectSchema.safeParse({ name: 'x'.repeat(81), kind: 'EP' }).success).toBe(false);
		const ok = newProjectSchema.parse({ name: ' EP Lumière ', kind: 'EP', owner: '' });
		expect(ok).toMatchObject({ name: 'EP Lumière', owner: null, startsOn: null, dueOn: null });
	});
	it('dates : format jour, échéance après le début', () => {
		const ok = editProjectSchema.parse({
			name: 'Tournée',
			kind: 'TOUR',
			startsOn: '2027-03-01',
			dueOn: '2027-04-01'
		});
		expect(ok.startsOn?.toISOString()).toBe('2027-03-01T00:00:00.000Z');
		expect(
			editProjectSchema.safeParse({
				name: 'Tournée',
				kind: 'TOUR',
				startsOn: '2027-05-01',
				dueOn: '2027-04-01'
			}).success
		).toBe(false);
		expect(
			editProjectSchema.safeParse({ name: 'Tournée', kind: 'TOUR', startsOn: '01/05/2027' }).success
		).toBe(false);
	});
	it('aucun champ de progression n’est accepté', () => {
		const parsed = newProjectSchema.parse({ name: 'EP', kind: 'EP', xp: 500, status: 'DONE' });
		expect(parsed).not.toHaveProperty('xp');
		expect(parsed).not.toHaveProperty('status');
	});
});
