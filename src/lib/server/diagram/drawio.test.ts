import { deflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { decodeEntities, parseDrawio, parseStyle, plainLabel } from './drawio';
import { escapeXml, toSvg } from './svg';

const model = `
<mxGraphModel><root>
	<mxCell id="0"/><mxCell id="1" parent="0"/>
	<mxCell id="lane" value="Gestion" style="swimlane;lm=lane;" vertex="1" parent="1">
		<mxGeometry x="100" y="50" width="400" height="200" as="geometry"/>
	</mxCell>
	<mxCell id="a" value="&lt;b&gt;Proposer&lt;/b&gt;&lt;br&gt;un besoin" style="rounded=1;html=1;lm=step;lmTone=amber;" vertex="1" parent="lane">
		<mxGeometry x="10" y="20" width="160" height="60" as="geometry"/>
	</mxCell>
	<mxCell id="b" value="Valider" style="ellipse;lm=step;" vertex="1" parent="1">
		<mxGeometry x="600" y="80" width="120" height="60" as="geometry"/>
	</mxCell>
	<mxCell id="e1" value="ok" style="dashed=1;lm=edge;" edge="1" parent="1" source="a" target="b">
		<mxGeometry relative="1" as="geometry">
			<mxPoint x="1" y="2" as="sourcePoint"/>
			<Array as="points"><mxPoint x="400" y="300"/></Array>
		</mxGeometry>
	</mxCell>
</root></mxGraphModel>`;

const plain = `<mxfile><diagram id="t" name="Test &amp; essai">${model}</diagram></mxfile>`;

describe('lecture .drawio', () => {
	it('lit cellules, rôles, formes, tons et arêtes', () => {
		const m = parseDrawio(plain);
		expect(m.name).toBe('Test & essai');
		const a = m.cells.find((c) => c.id === 'a')!;
		expect(a).toMatchObject({
			role: 'step',
			shape: 'rounded',
			tone: 'amber',
			label: 'Proposer\nun besoin'
		});
		// Enfant d'un conteneur : coordonnées rendues absolues.
		expect(a).toMatchObject({ x: 110, y: 70 });
		expect(m.cells.find((c) => c.id === 'b')!.shape).toBe('ellipse');
		const e = m.cells.find((c) => c.id === 'e1')!;
		expect(e).toMatchObject({
			role: 'edge',
			source: 'a',
			target: 'b',
			dashed: true,
			points: [{ x: 400, y: 300 }]
		});
		expect(m.width).toBe(720);
	});

	it('lit le format compressé de diagrams.net', () => {
		const packed = deflateRawSync(Buffer.from(encodeURIComponent(model))).toString('base64');
		const m = parseDrawio(`<mxfile><diagram id="t" name="Compressé">${packed}</diagram></mxfile>`);
		expect(m.cells.map((c) => c.id)).toEqual(['lane', 'a', 'b', 'e1']);
	});

	it('refuse un fichier sans diagramme', () => {
		expect(() => parseDrawio('<mxfile></mxfile>')).toThrow();
	});

	it('texte brut seulement : balises, entités et scripts retirés', () => {
		expect(plainLabel('&lt;script&gt;alert(1)&lt;/script&gt;Texte')).toBe('alert(1)Texte');
		expect(plainLabel('<img src=x onerror=alert(1)>Nom')).toBe('Nom');
		expect(decodeEntities('&#xa;&#233;&amp;')).toBe('\né&');
		expect(parseStyle('rounded=1;dashed;lm=step')).toEqual({
			rounded: '1',
			dashed: '1',
			lm: 'step'
		});
	});
});

describe('export SVG', () => {
	const hostile = plain
		.replace('Valider', '&lt;script&gt;alert(1)&lt;/script&gt; &quot;x&quot; onload=&quot;y&quot;')
		.replace('value="ok"', 'value="javascript:alert(1)"');
	const svg = toSvg(parseDrawio(hostile), { title: 'T <x>', description: 'D & d' });

	it('n’émet que des éléments de la liste blanche, sans événement ni lien', () => {
		const tags = new Set([...svg.matchAll(/<([a-zA-Z]+)/g)].map((m) => m[1]));
		const allowed = [
			'svg',
			'title',
			'desc',
			'defs',
			'marker',
			'path',
			'g',
			'rect',
			'ellipse',
			'polygon',
			'text',
			'tspan'
		];
		expect([...tags].filter((t) => !allowed.includes(t))).toEqual([]);
		expect(svg).not.toMatch(/<script/i);
		expect(svg).not.toMatch(/\son\w+=/i);
		expect(svg).not.toMatch(/href=/i);
	});

	it('échappe tout texte', () => {
		expect(svg).toContain('alert(1) &quot;x&quot;');
		expect(svg).toContain('T &lt;x&gt;');
		expect(escapeXml(`<a href="x">'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&apos;&lt;/a&gt;');
	});

	it('est déterministe', () => {
		expect(toSvg(parseDrawio(plain), { title: 't', description: 'd' })).toBe(
			toSvg(parseDrawio(plain), { title: 't', description: 'd' })
		);
	});
});
