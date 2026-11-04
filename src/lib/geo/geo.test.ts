import { describe, expect, it } from 'vitest';
import { fuzzedPointOf, GRID_KM, snapToGrid } from './fuzz';
import { distanceBand } from './distance';

/** Distance à vol d'oiseau, pour vérifier l'ampleur du floutage. */
function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
	const rad = (d: number) => (d * Math.PI) / 180;
	const h =
		Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
		Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
	return 2 * 6371 * Math.asin(Math.sqrt(h));
}

const toulouse = { centre: { lat: 43.6007, lng: 1.4328 } };

describe('floutage', () => {
	it('le point stocké ne dépend que de la commune', () => {
		// Même commune, quel que soit le reste de la saisie : même point.
		const a = fuzzedPointOf({ ...toulouse, extra: 'adresse précise ignorée' } as never);
		const b = fuzzedPointOf(toulouse);
		expect(a).toEqual(b);
		// L'API ne prend qu'un centre de commune : aucun paramètre pour une
		// position plus précise.
		expect(fuzzedPointOf.length).toBe(1);
	});

	it('déplace le centre d’au plus une demi-cellule', () => {
		const snapped = fuzzedPointOf(toulouse);
		expect(haversineKm(toulouse.centre, snapped)).toBeLessThanOrEqual(GRID_KM);
	});

	it('deux points de la même cellule donnent le même résultat', () => {
		const p = snapToGrid({ lat: 48.8566, lng: 2.3522 });
		expect(snapToGrid({ lat: p.lat + 0.001, lng: p.lng - 0.001 })).toEqual(p);
		expect(snapToGrid(p)).toEqual(p);
	});
});

describe('distanceBand', () => {
	it.each([
		[0, 'moins de 5 km'],
		[4_999, 'moins de 5 km'],
		[5_000, '5 à 10 km'],
		[24_000, '10 à 25 km'],
		[49_999, '25 à 50 km'],
		[99_000, '50 à 100 km'],
		[100_000, 'plus de 100 km'],
		[588_000, 'plus de 100 km']
	])('%i m → %s', (meters, label) => {
		expect(distanceBand(meters)).toBe(label);
	});
});
