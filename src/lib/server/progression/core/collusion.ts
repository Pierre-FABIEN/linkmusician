/**
 * Détection de collusion (conception 02 §6, P2-10) : repérer les **cercles
 * fermés**, des groupes de personnes qui ne collaborent et ne s'apprécient
 * qu'entre elles. Dans une vraie scène locale, les gens finissent reliés les
 * uns aux autres ; un petit îlot dense, sans aucun lien vers l'extérieur, qui
 * se renvoie collaborations et appréciations, est le signal d'un farm de
 * points.
 *
 * Un cas n'est qu'une **piste pour la modération** : jamais de sanction
 * automatique (deux amis qui ne jouent qu'ensemble y ressemblent aussi).
 *
 * Module pur.
 */

/** Une interaction confirmée entre deux personnes (collaboration, appréciation). */
export type Interaction = { a: string; b: string };

/** Taille d'un cercle fermé : au-delà, c'est une communauté, pas une clique. */
export const MAX_CLIQUE_SIZE = 8;
/** Part des liens possibles qui existent effectivement (1 = tout le monde avec tout le monde). */
export const MIN_DENSITY = 0.6;
/** Interactions minimales dans le cercle, en dessous rien ne mérite une revue. */
export const MIN_INTERACTIONS = 4;
/** Fenêtre observée (jours). */
export const COLLUSION_WINDOW_DAYS = 180;

export type CollusionCandidate = {
	memberIds: string[];
	/** Clé stable du groupe (membres triés). */
	memberKey: string;
	interactions: number;
	density: number;
};

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** Composantes connexes du graphe des interactions (auto-interactions ignorées). */
export function components(interactions: readonly Interaction[]): string[][] {
	const parent = new Map<string, string>();
	const find = (x: string): string => {
		let root = x;
		while (parent.get(root) !== root) root = parent.get(root)!;
		let node = x;
		while (parent.get(node) !== root) {
			const next = parent.get(node)!;
			parent.set(node, root);
			node = next;
		}
		return root;
	};
	for (const { a, b } of interactions) {
		if (a === b) continue;
		if (!parent.has(a)) parent.set(a, a);
		if (!parent.has(b)) parent.set(b, b);
		const ra = find(a);
		const rb = find(b);
		if (ra !== rb) parent.set(ra, rb);
	}
	const groups = new Map<string, string[]>();
	for (const node of parent.keys()) {
		const root = find(node);
		groups.set(root, [...(groups.get(root) ?? []), node]);
	}
	return [...groups.values()].map((g) => g.sort());
}

/**
 * Cercles fermés à mettre en revue. Une composante connexe n'a, par
 * définition, aucun lien vers l'extérieur : on garde les petites (2 à
 * `MAX_CLIQUE_SIZE`), denses (`MIN_DENSITY`) et actives (`MIN_INTERACTIONS`).
 */
export function findClosedCircles(interactions: readonly Interaction[]): CollusionCandidate[] {
	const counts = new Map<string, number>();
	for (const { a, b } of interactions) {
		if (a !== b) counts.set(pairKey(a, b), (counts.get(pairKey(a, b)) ?? 0) + 1);
	}
	const result: CollusionCandidate[] = [];
	for (const members of components(interactions)) {
		const n = members.length;
		if (n < 2 || n > MAX_CLIQUE_SIZE) continue;
		let links = 0;
		let total = 0;
		for (let i = 0; i < n; i++) {
			for (let j = i + 1; j < n; j++) {
				const c = counts.get(pairKey(members[i], members[j])) ?? 0;
				if (c > 0) links += 1;
				total += c;
			}
		}
		const density = links / ((n * (n - 1)) / 2);
		if (density < MIN_DENSITY || total < MIN_INTERACTIONS) continue;
		result.push({
			memberIds: members,
			memberKey: members.join('|'),
			interactions: total,
			density: Math.round(density * 100) / 100
		});
	}
	return result.sort(
		(x, y) => y.interactions - x.interactions || x.memberKey.localeCompare(y.memberKey)
	);
}

/** Adresses IP partagées par au moins deux membres (empreinte d'appareil). */
export function sharedIpCount(ipsByMember: ReadonlyMap<string, ReadonlySet<string>>): number {
	const owners = new Map<string, number>();
	for (const ips of ipsByMember.values()) {
		for (const ip of ips) owners.set(ip, (owners.get(ip) ?? 0) + 1);
	}
	return [...owners.values()].filter((n) => n >= 2).length;
}
