/**
 * Carte souvenir (P3-14, conception 07 §4.6) : image PNG 1200 × 630 (Open
 * Graph), générée côté serveur pour une épreuve franchie : « Épreuve franchie —
 * La création — Léa » (N2 : plus de numéro d'acte affiché). Mise en page par satori (SVG, texte
 * en tracés : aucune police système), rendu PNG par resvg.
 *
 * Seulement des faits publics : le nom affiché, l'acte et son épreuve.
 * Jamais d'XP, de niveau ni de confiance.
 */
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import regularUri from '@fontsource/open-sans/files/open-sans-latin-400-normal.woff?inline';
import boldUri from '@fontsource/open-sans/files/open-sans-latin-700-normal.woff?inline';

export const SOUVENIR_SIZE = { width: 1200, height: 630 } as const;

const fromDataUri = (uri: string) => Buffer.from(uri.slice(uri.indexOf(',') + 1), 'base64');
let fonts: { name: string; data: Buffer; weight: 400 | 700; style: 'normal' }[] | null = null;
function loadFonts() {
	fonts ??= [
		{ name: 'Open Sans', data: fromDataUri(regularUri), weight: 400, style: 'normal' },
		{ name: 'Open Sans', data: fromDataUri(boldUri), weight: 700, style: 'normal' }
	];
	return fonts;
}

type Node = { type: string; props: Record<string, unknown> & { children?: unknown } };
const h = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({
	type,
	props: { style, children }
});

export async function renderSouvenir(input: {
	displayName: string;
	actTitle: string;
	trial: string;
	date: string;
}): Promise<Buffer> {
	const { width, height } = SOUVENIR_SIZE;
	const margin = 64;
	// Fond en pleine taille, contenu dans un cadre intérieur : la marge ne
	// s'ajoute pas à la hauteur (satori compte le padding en plus).
	const tree = h(
		'div',
		{
			width,
			height,
			display: 'flex',
			color: 'white',
			fontFamily: 'Open Sans',
			backgroundImage: 'linear-gradient(135deg, #7c3aed 0%, #d946ef 55%, #ec4899 100%)'
		},
		h(
			'div',
			{
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'space-between',
				width: width - 2 * margin,
				height: height - 2 * margin,
				margin
			},
			[
				h('div', { display: 'flex', fontSize: 28, fontWeight: 700, opacity: 0.9 }, 'LinkMusician'),
				h('div', { display: 'flex', flexDirection: 'column', gap: 12 }, [
					h(
						'div',
						{ display: 'flex', fontSize: 28, fontWeight: 700, textTransform: 'uppercase' },
						'Épreuve franchie'
					),
					h(
						'div',
						{ display: 'flex', fontSize: 66, fontWeight: 700, lineHeight: 1.05 },
						input.actTitle
					),
					h('div', { display: 'flex', fontSize: 28, opacity: 0.92 }, input.trial)
				]),
				h('div', { display: 'flex', justifyContent: 'space-between', fontSize: 30 }, [
					h('div', { display: 'flex', fontWeight: 700 }, input.displayName),
					h('div', { display: 'flex', opacity: 0.9 }, input.date)
				])
			]
		)
	);
	const svg = await satori(tree as Parameters<typeof satori>[0], {
		...SOUVENIR_SIZE,
		fonts: loadFonts()
	});
	return new Resvg(svg, { fitTo: { mode: 'width', value: SOUVENIR_SIZE.width } }).render().asPng();
}
