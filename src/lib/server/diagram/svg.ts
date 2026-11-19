/**
 * LINKMUSICIAN: export SVG déterministe d'un diagramme (DIAGRAM-03).
 *
 * Reconstruit depuis le modèle neutre du `.drawio` : une liste blanche
 * d'éléments (`svg`, `title`, `desc`, `defs`, `marker`, `g`, `rect`,
 * `ellipse`, `polygon`, `path`, `text`, `tspan`), aucun attribut
 * d'événement, aucun lien, aucun script, aucun contenu recopié tel quel.
 * Tout texte passe par `escapeXml`. Même entrée, même sortie, octet pour octet.
 */
import { edgePoints, midpoint, pathOf, wrapLabel, type Box } from '#lib/diagram/geometry';
import type { DrawioCell, DrawioModel } from '#lib/diagram/types';

/** Tons Metro en clair, pour un fichier lu hors de l'application. */
export const EXPORT_TONES: Readonly<Record<string, { fill: string; ink: string }>> = {
	violet: { fill: '#6d3fd6', ink: '#ffffff' },
	rose: { fill: '#c42f6e', ink: '#ffffff' },
	blue: { fill: '#2f62c4', ink: '#ffffff' },
	orange: { fill: '#f0a050', ink: '#1d1a24' },
	amber: { fill: '#f4cf55', ink: '#1d1a24' },
	lime: { fill: '#b6e05a', ink: '#1d1a24' },
	cyan: { fill: '#8ad4e6', ink: '#1d1a24' },
	ink: { fill: '#1d1a24', ink: '#ffffff' },
	paper: { fill: '#ffffff', ink: '#1d1a24' }
};

export function escapeXml(text: string) {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

const FONT = 'Open Sans, system-ui, sans-serif';

function shape(cell: DrawioCell, fill: string, stroke: string) {
	const { x, y, width: w, height: h } = cell;
	const common = `fill="${fill}" stroke="${stroke}" stroke-width="1.5"${cell.dashed ? ' stroke-dasharray="6 4"' : ''}`;
	if (cell.shape === 'ellipse') {
		return `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}" ${common}/>`;
	}
	if (cell.shape === 'rhombus') {
		return `<polygon points="${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}" ${common}/>`;
	}
	const r = cell.shape === 'rounded' ? 10 : cell.shape === 'entity' ? 4 : 0;
	return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ${common}/>`;
}

function textBlock(
	lines: string[],
	cx: number,
	cy: number,
	size: number,
	fill: string,
	anchor = 'middle'
) {
	const lineHeight = size * 1.3;
	const top = cy - ((lines.length - 1) * lineHeight) / 2;
	const tspans = lines
		.map(
			(l, i) =>
				`<tspan x="${cx}" y="${Math.round((top + i * lineHeight) * 10) / 10}">${escapeXml(l)}</tspan>`
		)
		.join('');
	return `<text font-family="${FONT}" font-size="${size}" fill="${fill}" text-anchor="${anchor}" dominant-baseline="middle">${tspans}</text>`;
}

export function toSvg(model: DrawioModel, meta: { title: string; description: string }) {
	const pad = 24;
	const width = Math.ceil(model.width + pad * 2);
	const height = Math.ceil(model.height + pad * 2);
	const byId = new Map(model.cells.map((c) => [c.id, c]));
	const parts: string[] = [];
	parts.push(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="dg-title dg-desc">`,
		`<title id="dg-title">${escapeXml(meta.title)}</title>`,
		`<desc id="dg-desc">${escapeXml(meta.description)}</desc>`,
		'<defs><marker id="dg-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#1d1a24"/></marker></defs>',
		`<rect x="${-pad}" y="${-pad}" width="${width}" height="${height}" fill="#f6f2ea"/>`
	);
	for (const lane of model.cells.filter((c) => c.role === 'lane' || c.role === 'group')) {
		const dash = lane.role === 'group' ? ' stroke-dasharray="6 4"' : '';
		parts.push(
			`<g><rect x="${lane.x}" y="${lane.y}" width="${lane.width}" height="${lane.height}" fill="#ffffff" fill-opacity="0.6" stroke="#8a8494" stroke-width="1"${dash}/>`,
			textBlock([lane.label], lane.x + 14, lane.y + 18, 13, '#1d1a24', 'start'),
			'</g>'
		);
	}
	for (const edge of model.cells.filter((c) => c.role === 'edge')) {
		const s = edge.source ? byId.get(edge.source) : undefined;
		const t = edge.target ? byId.get(edge.target) : undefined;
		if (!s || !t) continue;
		const points = edgePoints(s as Box, t as Box, edge.points);
		parts.push(
			`<path d="${pathOf(points)}" fill="none" stroke="#1d1a24" stroke-width="1.5"${edge.dashed ? ' stroke-dasharray="6 4"' : ''} marker-end="url(#dg-arrow)"/>`
		);
		if (edge.label) {
			const m = midpoint(points);
			parts.push(textBlock(wrapLabel(edge.label, 160, 11, 3), m.x, m.y - 8, 11, '#1d1a24'));
		}
	}
	for (const cell of model.cells.filter((c) => c.role === 'step' || c.role === 'note')) {
		const tone = EXPORT_TONES[cell.tone ?? 'paper'] ?? EXPORT_TONES.paper;
		parts.push(
			'<g>',
			shape(cell, tone.fill, '#1d1a24'),
			textBlock(
				wrapLabel(cell.label, cell.width, 12),
				cell.x + cell.width / 2,
				cell.y + cell.height / 2,
				12,
				tone.ink
			),
			'</g>'
		);
	}
	parts.push('</svg>');
	return parts.join('\n');
}
