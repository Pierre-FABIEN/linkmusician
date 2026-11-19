import { describe, expect, it } from 'vitest';
import { backdropFor } from './backdrop';

describe('backdropFor', () => {
	it('laisse leur fond aux modules du boilerplate et aux maquettes', () => {
		for (const path of ['/', '/admin', '/admin/users', '/blog/x', '/products/1', '/_lab/metro']) {
			expect(backdropFor(path).metro).toBe(false);
		}
	});

	it('Melokiva Diagram pose lui-même son papier (D80)', () => {
		expect(backdropFor('/diagram').metro).toBe(false);
		expect(backdropFor('/diagram/d/etats-besoin').metro).toBe(false);
		expect(backdropFor('/diagrammes-fictifs').metro).toBe(true);
	});

	it('pose l’Aurora sur les accueils seulement', () => {
		expect(backdropFor('/jam')).toEqual({ metro: true, aurora: 'jam' });
		expect(backdropFor('/espace')).toEqual({ metro: true, aurora: 'career' });
		expect(backdropFor('/jouer').aurora).toBe('mix');
		expect(backdropFor('/jouer/jam').aurora).toBe('mix');
		expect(backdropFor('/@malik').aurora).toBe('mix');
		expect(backdropFor('/jam/dispos')).toEqual({ metro: true, aurora: null });
		expect(backdropFor('/espace/objectifs').aurora).toBeNull();
		expect(backdropFor('/administration-fictive').metro).toBe(true);
	});
});
