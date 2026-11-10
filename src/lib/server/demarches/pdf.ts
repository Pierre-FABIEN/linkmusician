/**
 * Documents préremplis (P3-15b) : rendu PDF A4 (jsPDF, comme les bordereaux
 * du boilerplate), sobre et lisible une fois imprimé. Polices standard :
 * le texte passe par `printable` (apostrophes et caractères hors WinAnsi).
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BRAND } from '#lib/linkmusician/brand';
import type { ProgramView, SplitSheetView } from '#lib/demarches/documents';

const MARGIN = 16;
const INK: [number, number, number] = [20, 20, 20];
const MUTED: [number, number, number] = [90, 90, 90];

/** Remplace ce que les polices standard ne savent pas dessiner. */
export function printable(text: string): string {
	return (
		text
			.replace(/[\u2018\u2019]/g, "'")
			.replace(/[\u201c\u201d]/g, '"')
			.replace(/[\u00a0\u202f]/g, ' ')
			// Plage Latin-1 voulue (polices standard du PDF), `\u0000` compris.
			// eslint-disable-next-line no-control-regex
			.replace(/[^\u0000-\u00ff\u20ac\u0153\u0152\u2026\u2013\u2014\u2022]/g, '')
	);
}

type Doc = jsPDF & { lastAutoTable?: { finalY: number } };

function header(doc: Doc, heading: string, title: string): number {
	doc.setTextColor(...MUTED);
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(9);
	doc.text(printable(`${BRAND.name} · document préparé à compléter et signer`), MARGIN, 14);
	doc.setTextColor(...INK);
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(20);
	doc.text(printable(heading), MARGIN, 26);
	doc.setFontSize(14);
	const lines = doc.splitTextToSize(printable(title), 210 - 2 * MARGIN);
	doc.text(lines, MARGIN, 35);
	return 35 + lines.length * 6;
}

function notes(doc: Doc, items: string[], y: number): number {
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(9);
	doc.setTextColor(...MUTED);
	for (const note of items) {
		const lines = doc.splitTextToSize(printable(`• ${note}`), 210 - 2 * MARGIN);
		if (y + lines.length * 4.2 > 285) {
			doc.addPage();
			y = 20;
		}
		doc.text(lines, MARGIN, y);
		y += lines.length * 4.2 + 1.5;
	}
	doc.setTextColor(...INK);
	return y;
}

function footer(doc: Doc) {
	const pages = doc.getNumberOfPages();
	for (let i = 1; i <= pages; i++) {
		doc.setPage(i);
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(8);
		doc.setTextColor(...MUTED);
		doc.text(
			printable(
				'Information générale, pas un conseil personnalisé. LinkMusician n’est lié à aucun organisme cité.'
			),
			MARGIN,
			290
		);
		doc.text(`${i} / ${pages}`, 210 - MARGIN, 290, { align: 'right' });
	}
}

const CHECKED = 'X';

export function renderSplitSheetPdf(view: SplitSheetView): Buffer {
	const doc: Doc = new jsPDF({ unit: 'mm', format: 'a4' });
	doc.setProperties({ title: printable(`${view.heading} : ${view.title}`), creator: BRAND.name });
	let y = header(doc, view.heading, view.title);
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(10);
	for (const fact of view.facts) {
		doc.text(printable(`${fact.label} : ${fact.value}`), MARGIN, y);
		y += 5;
	}
	y += 2;
	const box = (on: boolean) => (on ? CHECKED : '');
	const blank = { name: '', lyrics: false, music: false, arrangement: false, roles: '' };
	autoTable(doc, {
		startY: y,
		margin: { left: MARGIN, right: MARGIN },
		theme: 'grid',
		styles: { font: 'helvetica', fontSize: 9, cellPadding: 2, textColor: INK, minCellHeight: 12 },
		headStyles: { fillColor: [235, 235, 235], textColor: INK, fontStyle: 'bold' },
		head: [
			[
				'Nom',
				'Paroles',
				'Musique',
				'Arrang.',
				'Part paroles (%)',
				'Part musique (%)',
				'Date et signature'
			]
		],
		body: [...view.rows, ...Array.from({ length: view.blankRows }, () => blank)].map((r) => [
			printable(r.roles ? `${r.name}\n${r.roles}` : r.name),
			box(r.lyrics),
			box(r.music),
			box(r.arrangement),
			'',
			'',
			''
		]),
		columnStyles: {
			0: { cellWidth: 42 },
			1: { cellWidth: 18, halign: 'center' },
			2: { cellWidth: 18, halign: 'center' },
			3: { cellWidth: 18, halign: 'center' },
			4: { cellWidth: 20 },
			5: { cellWidth: 20 }
		},
		foot: [['Total', '', '', '', '100 %', '100 %', '']],
		footStyles: { fillColor: [245, 245, 245], textColor: INK, fontStyle: 'bold' }
	});
	y = (doc.lastAutoTable?.finalY ?? y) + 8;
	notes(doc, view.notes, y);
	footer(doc);
	return Buffer.from(doc.output('arraybuffer'));
}

export function renderProgramPdf(view: ProgramView): Buffer {
	const doc: Doc = new jsPDF({ unit: 'mm', format: 'a4' });
	doc.setProperties({ title: printable(`${view.heading} : ${view.band}`), creator: BRAND.name });
	let y = header(doc, view.heading, view.band);
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(10);
	for (const blank of view.blanks) {
		doc.text(printable(`${blank} :`), MARGIN, y);
		doc.setDrawColor(...MUTED);
		doc.line(MARGIN + 38, y + 0.8, 210 - MARGIN, y + 0.8);
		y += 8;
	}
	y += 1;
	const blank = { title: '', creators: '' };
	autoTable(doc, {
		startY: y,
		margin: { left: MARGIN, right: MARGIN },
		theme: 'grid',
		styles: { font: 'helvetica', fontSize: 9, cellPadding: 2, textColor: INK, minCellHeight: 9 },
		headStyles: { fillColor: [235, 235, 235], textColor: INK, fontStyle: 'bold' },
		head: [['N°', 'Titre', 'Auteur·rices et compositeur·rices', 'Durée']],
		body: [...view.rows, ...Array.from({ length: view.blankRows }, () => blank)].map((r, i) => [
			String(i + 1),
			printable(r.title),
			printable(r.creators),
			''
		]),
		columnStyles: {
			0: { cellWidth: 10, halign: 'center' },
			1: { cellWidth: 62 },
			3: { cellWidth: 20 }
		}
	});
	y = (doc.lastAutoTable?.finalY ?? y) + 8;
	notes(doc, view.notes, y);
	footer(doc);
	return Buffer.from(doc.output('arraybuffer'));
}
