import { describe, expect, it } from 'vitest';
import {
	compareProjects,
	familyOf,
	homeProjects,
	mainProject,
	nextProjectAction,
	outsideStatus,
	progressLine,
	projectSections,
	sortProjects,
	type NextActionInput,
	type SortableProject
} from './overview';
import { PROJECT_KINDS } from './rules';

const d = (s: string) => new Date(`${s}T12:00:00Z`);

function p(id: string, over: Partial<SortableProject> = {}): SortableProject {
	return {
		id,
		status: 'ACTIVE',
		myLastActAt: null,
		lastActivityAt: null,
		createdAt: d('2026-11-01'),
		...over
	};
}

describe('familyOf', () => {
	it('range chaque type livré dans une famille', () => {
		expect(PROJECT_KINDS.map(familyOf)).toEqual([
			'recorded',
			'recorded',
			'recorded',
			'recorded',
			'stage',
			'stage',
			'stage',
			'other'
		]);
	});
});

describe('nextProjectAction', () => {
	const base: NextActionInput = {
		projectId: 'p1',
		status: 'ACTIVE',
		family: 'recorded',
		manages: true,
		visibleItems: 0,
		resumable: null,
		rangeable: 0,
		hasDates: false,
		hasDescription: false
	};

	it('projet clos : seulement le consulter, même avec des morceaux à ranger', () => {
		for (const status of ['DONE', 'ABANDONED'] as const) {
			const a = nextProjectAction({ ...base, status, rangeable: 3, resumable: null });
			expect(a.kind).toBe('consult');
			expect(a.href).toBe('/projets/p1');
		}
	});

	it('sans gestion, aucune action qui écrit', () => {
		const a = nextProjectAction({ ...base, manages: false, rangeable: 2 });
		expect(a.kind).toBe('consult');
	});

	it('une idée rangée passe avant le rangement', () => {
		const a = nextProjectAction({
			...base,
			visibleItems: 2,
			rangeable: 4,
			resumable: { workId: 'w1', title: 'Aube' }
		});
		expect(a).toMatchObject({ kind: 'resume', label: 'Continuer « Aube »', href: '/morceaux/w1' });
	});

	it('projet vide avec des morceaux : les ranger', () => {
		expect(nextProjectAction({ ...base, rangeable: 1 })).toMatchObject({
			kind: 'range',
			href: '/projets/p1#ranger'
		});
	});

	it('projet enregistré vide, sans morceau : créer le premier', () => {
		expect(nextProjectAction(base)).toMatchObject({ kind: 'create', href: '/morceaux/nouveau' });
	});

	it('projet de scène sans date : poser les dates, sans concert simulé', () => {
		const a = nextProjectAction({ ...base, family: 'stage' });
		expect(a).toMatchObject({ kind: 'complete', label: 'Ajouter des dates' });
		expect(nextProjectAction({ ...base, family: 'stage', hasDates: true }).kind).toBe('create');
	});

	it('projet rempli sans repère : le compléter ; sinon continuer', () => {
		expect(nextProjectAction({ ...base, visibleItems: 3 }).kind).toBe('complete');
		expect(nextProjectAction({ ...base, visibleItems: 3, hasDescription: true })).toMatchObject({
			kind: 'consult',
			label: 'Continuer le travail'
		});
	});

	it('ne propose jamais d’inviter, de confier une tâche ni de publier', () => {
		const inputs: NextActionInput[] = [];
		for (const status of ['ACTIVE', 'DONE', 'ABANDONED'] as const)
			for (const family of ['recorded', 'stage', 'other'] as const)
				for (const visibleItems of [0, 2])
					for (const rangeable of [0, 1])
						for (const hasDates of [false, true])
							inputs.push({ ...base, status, family, visibleItems, rangeable, hasDates });
		for (const input of inputs) {
			const a = nextProjectAction(input);
			expect(a.label).not.toMatch(/invit|confi|tâche|annonce|publier|concert/i);
			expect(a.href).toMatch(/^\/(projets\/p1|morceaux\/)/);
		}
	});
});

describe('tri et projet principal (UX-3, défaut)', () => {
	it('en cours d’abord, puis atteints, puis laissés de côté', () => {
		const list = [
			p('a', { status: 'ABANDONED' }),
			p('b', { status: 'DONE' }),
			p('c', { status: 'ACTIVE' })
		];
		expect(sortProjects(list).map((x) => x.id)).toEqual(['c', 'b', 'a']);
	});

	it('ma dernière action prime sur l’activité des autres', () => {
		const list = [
			p('autre', { lastActivityAt: d('2026-11-18'), myLastActAt: d('2026-11-02') }),
			p('moi', { lastActivityAt: d('2026-11-10'), myLastActAt: d('2026-11-10') }),
			p('jamais', { lastActivityAt: d('2026-11-19') })
		];
		expect(sortProjects(list).map((x) => x.id)).toEqual(['moi', 'autre', 'jamais']);
		expect(mainProject(list)?.id).toBe('moi');
	});

	it('stable : mêmes dates, ordre par création puis identifiant', () => {
		const list = [p('b'), p('a'), p('c', { createdAt: d('2026-11-05') })];
		expect(sortProjects(list).map((x) => x.id)).toEqual(['c', 'a', 'b']);
		expect(sortProjects([...list].reverse()).map((x) => x.id)).toEqual(['c', 'a', 'b']);
		expect(compareProjects(p('x'), p('x'))).toBe(0);
	});

	it('aucun projet en cours : pas de projet principal', () => {
		expect(mainProject([])).toBeNull();
		expect(mainProject([p('a', { status: 'DONE', myLastActAt: d('2026-11-19') })])).toBeNull();
	});

	it('accueil : trois projets au plus, sans répéter le héros', () => {
		const list = ['a', 'b', 'c', 'd'].map((id, i) =>
			p(id, { myLastActAt: d(`2026-11-1${9 - i}`) })
		);
		expect(homeProjects(list, null).map((x) => x.id)).toEqual(['a', 'b', 'c']);
		expect(homeProjects(list, 'a').map((x) => x.id)).toEqual(['b', 'c']);
		expect(homeProjects([...list, p('z', { status: 'DONE' })], null)).toHaveLength(3);
	});

	it('sections sans doublon, chaque projet une seule fois', () => {
		const list = [
			p('a'),
			p('b', { status: 'DONE' }),
			p('c', { status: 'ABANDONED' }),
			p('d', { myLastActAt: d('2026-11-19') })
		];
		const s = projectSections(list);
		expect(s.active.map((x) => x.id)).toEqual(['d', 'a']);
		expect(s.done.map((x) => x.id)).toEqual(['b']);
		expect(s.abandoned.map((x) => x.id)).toEqual(['c']);
		const all = [...s.active, ...s.done, ...s.abandoned].map((x) => x.id);
		expect(new Set(all).size).toBe(list.length);
	});
});

describe('progressLine', () => {
	const base = { family: 'recorded' as const, items: 0, composed: 0, startsOn: null, dueOn: null };
	it('ne dit que ce qui se calcule', () => {
		expect(progressLine(base)).toBe('Aucun morceau rangé');
		expect(progressLine({ ...base, items: 1 })).toBe('1 morceau rangé');
		expect(progressLine({ ...base, items: 3, composed: 2 })).toBe(
			'3 morceaux rangés, dont 2 composés'
		);
		expect(progressLine({ ...base, items: 2, composed: 2 })).toBe(
			'2 morceaux rangés, tous composés'
		);
		expect(progressLine({ ...base, items: 4, composed: 1 })).not.toMatch(/mix|master|sur/);
	});
	it('scène : la prochaine date posée, jamais de concert inventé', () => {
		const now = d('2026-11-19');
		expect(progressLine({ ...base, family: 'stage', now })).toBe('Aucune date posée');
		expect(progressLine({ ...base, family: 'stage', startsOn: d('2027-03-01'), now })).toBe(
			'Début le 1 mars 2027'
		);
		expect(
			progressLine({
				...base,
				family: 'stage',
				startsOn: d('2026-10-01'),
				dueOn: d('2027-06-30'),
				items: 1,
				now
			})
		).toBe('Échéance le 30 juin 2027 · 1 élément rangé');
	});
	it('autre : des éléments', () => {
		expect(progressLine({ ...base, family: 'other', items: 2 })).toBe('2 éléments rangés');
	});
});

describe('outsideStatus', () => {
	it('hors projet = géré par moi et rangé dans aucun de mes projets', () => {
		expect(outsideStatus({ managed: true, myProjects: 0 })).toBe('outside');
		expect(outsideStatus({ managed: true, myProjects: 2 })).toBe('ranged');
	});
	it('un morceau que je ne gère pas n’est jamais « hors projet » pour moi', () => {
		expect(outsideStatus({ managed: false, myProjects: 0 })).toBe('notMine');
		expect(outsideStatus({ managed: false, myProjects: 1 })).toBe('notMine');
	});
});
