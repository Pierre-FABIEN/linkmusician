/**
 * LINKMUSICIAN: géométrie du rendu des diagrammes (DIAGRAM-03). Pure,
 * partagée par le visualiseur (navigateur) et l'export SVG (serveur) :
 * même découpage des libellés, mêmes tracés d'arêtes, résultat déterministe.
 */

export interface Box {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface Point {
	x: number;
	y: number;
}

const center = (b: Box): Point => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });

/** Point où le segment centre → `toward` sort du rectangle. */
export function borderPoint(box: Box, toward: Point): Point {
	const c = center(box);
	const dx = toward.x - c.x;
	const dy = toward.y - c.y;
	if (dx === 0 && dy === 0) return c;
	const sx = dx === 0 ? Infinity : box.width / 2 / Math.abs(dx);
	const sy = dy === 0 ? Infinity : box.height / 2 / Math.abs(dy);
	const s = Math.min(sx, sy);
	return { x: round(c.x + dx * s), y: round(c.y + dy * s) };
}

const round = (n: number) => Math.round(n * 10) / 10;

/** Tracé d'une arête : bord de la source, points intermédiaires, bord de la cible. */
export function edgePoints(source: Box, target: Box, waypoints: Point[] = []): Point[] {
	const first = waypoints[0] ?? center(target);
	const last = waypoints[waypoints.length - 1] ?? center(source);
	return [borderPoint(source, first), ...waypoints, borderPoint(target, last)];
}

export const pathOf = (points: Point[]) =>
	points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');

/** Milieu du tracé, pour poser le libellé d'une arête. */
export function midpoint(points: Point[]): Point {
	if (points.length === 0) return { x: 0, y: 0 };
	if (points.length % 2 === 1) return points[(points.length - 1) / 2];
	const a = points[points.length / 2 - 1];
	const b = points[points.length / 2];
	return { x: round((a.x + b.x) / 2), y: round((a.y + b.y) / 2) };
}

/** Découpe un libellé en lignes pour une largeur donnée (approximation des chasses). */
export function wrapLabel(label: string, width: number, fontSize: number, maxLines = 6): string[] {
	const perLine = Math.max(6, Math.floor((width - 12) / (fontSize * 0.56)));
	const lines: string[] = [];
	for (const paragraph of label.split('\n')) {
		let line = '';
		for (const word of paragraph.split(/\s+/).filter(Boolean)) {
			if (!line) line = word;
			else if ((line + ' ' + word).length <= perLine) line += ' ' + word;
			else {
				lines.push(line);
				line = word;
			}
		}
		if (line) lines.push(line);
	}
	if (lines.length > maxLines) {
		const kept = lines.slice(0, maxLines);
		kept[maxLines - 1] = `${kept[maxLines - 1].replace(/.$/, '')}…`;
		return kept;
	}
	return lines;
}
