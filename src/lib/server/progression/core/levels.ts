/**
 * Niveau de compte (conception 02 §3) : XP cumulée requise pour le niveau n
 * = 50 × n × (n − 1). Niveau 2 = 100, 5 = 1 000, 10 = 4 500, 20 = 19 000.
 * Pas de niveau maximum. Le niveau ne débloque que du cosmétique.
 */

export function xpForLevel(level: number): number {
	if (!Number.isInteger(level) || level < 1) throw new RangeError(`Niveau invalide : ${level}`);
	return 50 * level * (level - 1);
}

/** Niveau atteint avec `xp` points (au moins 1, même avec une XP négative). */
export function levelFromXp(xp: number): number {
	if (xp < 100) return 1;
	// Inverse de 50n(n−1) ≤ xp, corrigé des arrondis flottants.
	let level = Math.floor((1 + Math.sqrt(1 + (4 * xp) / 50)) / 2);
	while (xpForLevel(level + 1) <= xp) level++;
	while (xpForLevel(level) > xp) level--;
	return level;
}

/** Avancement dans le niveau courant, pour une jauge. */
export function levelProgress(xp: number) {
	const level = levelFromXp(xp);
	const floor = xpForLevel(level);
	const next = xpForLevel(level + 1);
	return {
		level,
		xpIntoLevel: Math.max(0, xp - floor),
		xpForNextLevel: next - floor,
		ratio: Math.min(1, Math.max(0, (xp - floor) / (next - floor)))
	};
}
