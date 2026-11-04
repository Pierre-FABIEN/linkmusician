/**
 * Multiplicateurs anti-abus (conception 02 §6) : rendements décroissants par
 * contrepartie, et poids selon la confiance de la contrepartie. Valeurs
 * calibrées par les personas (`personas.test.ts`), voir `bareme.ts`.
 */
import { BAREME } from './bareme';
import type { TrustLevel } from './trust';

/**
 * Coefficient de la k-ième occurrence avec une même contrepartie sur la
 * fenêtre glissante (k ≥ 1) : 1, 0,5, 0,25, puis 0.
 */
export function diminishingReturn(k: number): number {
	if (!Number.isInteger(k) || k < 1) throw new RangeError(`Rang invalide : ${k}`);
	return BAREME.diminishing[k - 1] ?? 0;
}

/** Poids de la confiance de la contrepartie. */
export function trustWeight(level: TrustLevel): number {
	return BAREME.trustWeight[level];
}

/** Arrondi à trois décimales (précision du registre, `Decimal(4,3)`). */
export function roundMultiplier(value: number): number {
	return Math.round(value * 1000) / 1000;
}
