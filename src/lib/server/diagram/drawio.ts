/**
 * LINKMUSICIAN: lecture d'un fichier `.drawio` (DIAGRAM-01, DIAGRAM-03).
 *
 * Le `.drawio` reste la source graphique éditable (diagrams.net). On n'en
 * garde que la géométrie et le texte : identifiant, libellé en texte brut,
 * forme, ton, position, extrémités des arêtes. Aucun HTML, aucun lien, aucun
 * script n'en sort : le rendu SVG est reconstruit par `svg.ts`, jamais
 * recopié depuis le fichier.
 *
 * Formats acceptés : XML non compressé (recommandé, lisible en revue) et
 * contenu compressé de diagrams.net (base64 + deflate brut + URI).
 */
import { inflateRawSync } from 'node:zlib';
import type { DrawioCell, DrawioModel } from './types';

const ENTITIES: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: ' '
};

export function decodeEntities(text: string) {
	return text.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (whole, code: string) => {
		if (code[0] === '#') {
			const n =
				code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
			return Number.isFinite(n) ? String.fromCodePoint(n) : whole;
		}
		return ENTITIES[code.toLowerCase()] ?? whole;
	});
}

/** Un libellé diagrams.net (texte ou HTML si `html=1`) en texte brut. */
export function plainLabel(value: string) {
	const decoded = decodeEntities(value);
	return decodeEntities(
		decoded
			.replace(/<br\s*\/?>/gi, '\n')
			.replace(/<\/(div|p|li)>/gi, '\n')
			.replace(/<[^>]*>/g, '')
	)
		.replace(/[ \t]+/g, ' ')
		.replace(/\n{2,}/g, '\n')
		.trim();
}

function attributes(tag: string): Record<string, string> {
	const out: Record<string, string> = {};
	for (const m of tag.matchAll(/([\w:-]+)="([^"]*)"/g)) out[m[1]] = m[2];
	return out;
}

export function parseStyle(style: string): Record<string, string> {
	const out: Record<string, string> = {};
	for (const part of style.split(';')) {
		if (!part) continue;
		const eq = part.indexOf('=');
		if (eq === -1) out[part] = '1';
		else out[part.slice(0, eq)] = part.slice(eq + 1);
	}
	return out;
}

/** Contenu d'un `<diagram>` compressé par diagrams.net. */
function inflate(content: string) {
	const raw = inflateRawSync(Buffer.from(content.trim(), 'base64')).toString('utf8');
	return decodeURIComponent(raw);
}

function graphModelOf(xml: string): { name: string; model: string } {
	const diagram = xml.match(/<diagram\b([^>]*)>([\s\S]*?)<\/diagram>/);
	if (!diagram) throw new Error('Fichier .drawio sans <diagram>');
	const name = decodeEntities(attributes(diagram[1]).name ?? '');
	const body = diagram[2].trim();
	return { name, model: body.startsWith('<') ? body : inflate(body) };
}

const num = (v: string | undefined) => (v === undefined ? 0 : Number(v) || 0);

function roleOf(style: Record<string, string>, edge: boolean): DrawioCell['role'] {
	if (edge) return 'edge';
	const lm = style.lm;
	return lm === 'step' || lm === 'lane' || lm === 'note' || lm === 'group' ? lm : 'other';
}

function shapeOf(style: Record<string, string>): DrawioCell['shape'] {
	if (style.swimlane !== undefined || style.lm === 'lane') return 'swimlane';
	if (style.lmShape === 'entity' || style.shape === 'table') return 'entity';
	if (style.ellipse !== undefined || style.shape === 'ellipse') return 'ellipse';
	if (style.rhombus !== undefined || style.shape === 'rhombus') return 'rhombus';
	if (style.text !== undefined) return 'text';
	return style.rounded === '1' ? 'rounded' : 'box';
}

/** Lit un `.drawio` en modèle neutre. Lève une erreur si le fichier est illisible. */
export function parseDrawio(xml: string): DrawioModel {
	const { name, model } = graphModelOf(xml);
	const cells: DrawioCell[] = [];
	const pattern = /<mxCell\b([^>]*?)(\/>|>([\s\S]*?)<\/mxCell>)/g;
	for (const m of model.matchAll(pattern)) {
		const attrs = attributes(m[1]);
		if (!attrs.id || attrs.id === '0' || attrs.id === '1') continue;
		const inner = m[3] ?? '';
		const geo = inner.match(/<mxGeometry\b([^>]*?)(\/>|>([\s\S]*?)<\/mxGeometry>)/);
		const g = geo ? attributes(geo[1]) : {};
		const points = [...(geo?.[3] ?? '').matchAll(/<mxPoint\b([^>]*?)\/>/g)]
			.map((p) => attributes(p[1]))
			.filter((p) => p.as === undefined)
			.map((p) => ({ x: num(p.x), y: num(p.y) }));
		const style = parseStyle(decodeEntities(attrs.style ?? ''));
		const edge = attrs.edge === '1';
		cells.push({
			id: decodeEntities(attrs.id),
			label: plainLabel(attrs.value ?? ''),
			role: roleOf(style, edge),
			shape: shapeOf(style),
			...(style.lmTone ? { tone: style.lmTone } : {}),
			dashed: style.dashed === '1',
			x: num(g.x),
			y: num(g.y),
			width: num(g.width),
			height: num(g.height),
			...(attrs.source ? { source: decodeEntities(attrs.source) } : {}),
			...(attrs.target ? { target: decodeEntities(attrs.target) } : {}),
			points,
			...(attrs.parent && attrs.parent !== '1' ? { parent: decodeEntities(attrs.parent) } : {})
		});
	}
	// Les enfants d'un conteneur ont des coordonnées relatives : on les rend absolues.
	const byId = new Map(cells.map((c) => [c.id, c]));
	const absolute = (cell: DrawioCell, depth = 0): { x: number; y: number } => {
		const parent = cell.parent ? byId.get(cell.parent) : undefined;
		if (!parent || depth > 10) return { x: cell.x, y: cell.y };
		const p = absolute(parent, depth + 1);
		return { x: p.x + cell.x, y: p.y + cell.y };
	};
	const placed = cells.map((c) => (c.role === 'edge' ? c : { ...c, ...absolute(c) }));
	const vertices = placed.filter((c) => c.role !== 'edge');
	const width = Math.max(0, ...vertices.map((c) => c.x + c.width));
	const height = Math.max(0, ...vertices.map((c) => c.y + c.height));
	return { name, cells: placed, width, height };
}
