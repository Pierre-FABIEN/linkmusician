/**
 * Page d'une branche de la carte (N2, conception 21 §10.3) : règle pure.
 *
 * Cinq sections, chacune omise si elle est vide :
 *
 * 1. **Possible maintenant** : au plus deux gestes réels (le geste d'une
 *    épreuve à portée, sinon la porte d'entrée d'une épreuve ouverte) ;
 * 2. **En cours** : ce qui attend quelqu'un (une confirmation, une
 *    modération) ;
 * 3. **Réalisé** : les réalisations de la branche avec leur preuve (une
 *    simple déclaration n'est pas présentée comme confirmée) ;
 * 4. **Premières fois et épreuves** : un ensemble, sans ordre de difficulté ;
 * 5. **Pas possible pour l'instant** : une phrase par empêchement, jamais
 *    « fais d'abord X » (NL1).
 *
 * Aucun moteur de suggestion ici (N3) : seulement les faits déclencheurs
 * déjà lus par la carte. La page est privée (l'acteur lui-même).
 */
import { milestoneDef, type MilestoneKey } from '#lib/milestones/rules';
import { WORK_ROLE_LABELS } from '#lib/works/rules';
import type { Act, CareerBranch, CareerMap, ReachFacts } from './map';
import { countable, type Realisation } from './realisations';

/** Au plus deux gestes par branche (conception 21 §10.3). */
export const MAX_POSSIBLE = 2;
const TO_CONFIRM = '/espace/a-confirmer';

/** Branche d'une collaboration à confirmer, comme `collaborationRealisations`. */
export function collaborationBranch(
	c: Pick<ReachFacts['toConfirm'][number], 'kind' | 'asProvider'>
): CareerBranch {
	if (c.kind === 'GIG' || c.kind === 'REHEARSAL') return 'SCENE';
	if (
		c.asProvider ||
		['RECORDING', 'PRODUCTION', 'MIXING', 'MASTERING', 'LIVE_SOUND', 'SESSION_WORK'].includes(
			c.kind
		)
	)
		return 'PRODUCTION';
	return 'EQUIPE';
}

/** Niveau de preuve lisible : une déclaration reste une déclaration. */
export function proofLabel(r: Pick<Realisation, 'proof' | 'kind'>): string {
	if (r.kind === 'COLLABORATION') return 'Confirmée des deux côtés';
	switch (r.proof) {
		case 'DECLARED':
			return 'Simple déclaration';
		case 'CORROBORATED':
			return r.kind === 'PRODUCTION_STAGE'
				? 'Confirmé par le ou la producteur·rice'
				: 'Confirmé par d’autres';
		case 'VERIFIED':
			return 'Vérifié';
	}
}

type Titles = { works: Record<string, string>; bands: Record<string, string> };

/** Libellé d'une réalisation, avec le titre de son objet quand on l'a. */
export function realisationLabel(r: Realisation, titles: Titles): string {
	const work = (id: string) => (titles.works[id] ? ` « ${titles.works[id]} »` : '');
	switch (r.object.type) {
		case 'WORK':
			return r.kind === 'PRODUCTION_STAGE'
				? `Morceau produit${work(r.object.id)}`
				: `Morceau composé${work(r.object.id)}`;
		case 'WORK_ROLE': {
			const role =
				WORK_ROLE_LABELS[r.object.roleKind as keyof typeof WORK_ROLE_LABELS] ?? 'Instrument';
			return `Crédit · ${role}${r.object.workId ? ` sur${work(r.object.workId)}` : ''}`;
		}
		case 'COLLABORATION':
			return r.branch === 'SCENE'
				? 'Concert confirmé'
				: r.branch === 'PRODUCTION'
					? 'Prestation confirmée'
					: 'Collaboration confirmée';
		case 'MILESTONE': {
			const label = milestoneDef(r.object.definitionId as MilestoneKey)?.label ?? 'Étape';
			// Étape personnelle (P8) : jouée en son nom, aucun groupe à nommer.
			if (r.roles.includes('PERFORMER')) return `${label} · en ton nom`;
			const band = titles.bands[r.object.bandId];
			return band ? `${label} · ${band}` : label;
		}
	}
}

export type DoneItem = {
	key: string;
	label: string;
	proof: string;
	/** Confirmée par quelqu'un d'autre (ou vérifiée), par opposition à une déclaration. */
	confirmed: boolean;
	/** Retirée : affichée comme telle, ne compte plus. */
	retired: boolean;
	occurredAt: Date | null;
};

function byDateDesc(a: DoneItem, b: DoneItem) {
	const t = (d: Date | null) => d?.getTime() ?? -Infinity;
	return t(b.occurredAt) - t(a.occurredAt) || a.key.localeCompare(b.key);
}

function day(iso: string) {
	const [y, m, d] = iso.split('-');
	return `${d}/${m}/${y}`;
}

/** Les sections de la page d'une branche. */
export function branchDetail(
	branch: CareerBranch,
	map: CareerMap,
	reach: ReachFacts,
	realisations: readonly Realisation[],
	titles: Titles
) {
	const acts: Act[] = map.acts.filter((a) => a.branch === branch);
	const own = realisations.filter((r) => r.branch === branch);

	const possible: { label: string; href: string; reason: string }[] = [];
	// N3 : une collaboration proposée comme geste n'est pas répétée dans « En cours ».
	const shown = new Set<string>();
	const push = (p: { label: string; href: string; reason: string }) => {
		if (possible.length >= MAX_POSSIBLE) return false;
		if (possible.some((x) => x.href === p.href && x.label === p.label)) return false;
		possible.push(p);
		return true;
	};
	for (const a of acts)
		if (a.reach && push({ ...a.reach.action, reason: a.reach.reason }) && a.reach.subject)
			shown.add(`${a.reach.subject.type}:${a.reach.subject.id}`);
	for (const a of acts)
		if (a.state === 'open' && a.cta) push({ ...a.cta, reason: `${a.name} · ${a.content}` });

	const inProgress: { text: string; href: string | null }[] = [];
	for (const c of reach.toConfirm) {
		if (collaborationBranch(c) !== branch || shown.has(`COLLABORATION:${c.id}`)) continue;
		inProgress.push({
			text: `« ${c.title} » (${day(c.happenedOn)}) : à confirmer de ton côté.`,
			href: TO_CONFIRM
		});
	}
	if (branch === 'CREATION')
		for (const w of reach.pendingCoauthors) {
			if (shown.has(`WORK:${w.workId}`)) continue;
			inProgress.push({
				text: `« ${w.title} » : un rôle attend sa confirmation.`,
				href: `/morceaux/${w.workId}`
			});
		}
	if (branch === 'PRODUCTION')
		for (const m of reach.declaredRecordings)
			inProgress.push({
				text: `Premier enregistrement de ${m.bandName} : déclaré, en attente d’une confirmation.`,
				href: `/groupes/${m.bandHandle}#milestones-title`
			});
	for (const r of own)
		if (r.status === 'FROZEN')
			inProgress.push({
				text: `${realisationLabel(r, titles)} : contestée, en attente de la modération.`,
				href: null
			});

	const done: DoneItem[] = own
		.filter((r) => r.kind !== 'MILESTONE' && r.status !== 'FROZEN')
		.map((r) => ({
			key: r.key,
			label: realisationLabel(r, titles),
			proof: r.status === 'RETIRED' ? 'Retirée : ne compte plus' : proofLabel(r),
			confirmed: r.status === 'ACTIVE' && r.proof !== 'DECLARED',
			retired: r.status === 'RETIRED',
			occurredAt: r.occurredAt
		}))
		.sort(byDateDesc);

	const firstTimes = own
		.filter((r) => r.kind === 'MILESTONE' && countable(r))
		.map((r) => ({ key: r.key, label: realisationLabel(r, titles), proof: proofLabel(r) }))
		.sort((a, b) => a.key.localeCompare(b.key));

	const notYet: string[] = [];
	for (const a of acts) {
		if (a.state === 'soon')
			notYet.push(
				`Bientôt sur Melokiva : ${a.name.toLowerCase()} (${a.trial.toLowerCase().replace(/\.$/, '')}).`
			);
		for (const u of a.unlocks)
			if (!u.href)
				notYet.push(
					`Bientôt sur Melokiva : ${u.label.charAt(0).toLowerCase()}${u.label.slice(1)}.`
				);
		// D73 Q-NL-2 : « La scène » se franchit seul·e depuis P8 (D77) ; la
		// version solo du studio vient avec N6.
		if (a.number === 3 && a.state !== 'passed')
			notYet.push(
				`Aujourd’hui, « ${a.name} » se franchit avec un groupe ; la même épreuve pour une personne seule est prévue.`
			);
	}

	return { acts, possible, inProgress, done, firstTimes, notYet };
}
export type BranchDetail = ReturnType<typeof branchDetail>;
