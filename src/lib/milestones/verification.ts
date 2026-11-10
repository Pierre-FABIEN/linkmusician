/**
 * Vérification d'une sortie externe (P3-07) : identifiants de release, avant
 * l'appel à l'API MusicBrainz / Spotify. Cette règle est pure et testable,
 * sans accès à Prisma ni au client.
 */

import { z } from 'zod';

export type ReleaseReferenceKind = 'UPC' | 'ISRC';

export const releaseReferenceSchema = z
	.object({
		kind: z.enum(['UPC', 'ISRC']),
		value: z.string()
	})
	.transform(({ kind, value }) => ({ kind, value: value.trim() }))
	.refine(
		({ kind, value }) => {
			const result = checkReleaseReference(kind, value);
			return result.ok;
		},
		{
			message: 'Référence de sortie invalide.',
			path: ['value']
		}
	)
	.transform(({ kind, value }) => {
		const result = checkReleaseReference(kind, value);
		return {
			kind,
			value: result.ok ? result.normalized : value
		};
	});

export type ReleaseReferenceInput = z.infer<typeof releaseReferenceSchema>;

export function checkReleaseReference(
	kind: ReleaseReferenceKind,
	raw: string
): { ok: true; normalized: string } | { ok: false; error: string } {
	const value = (raw ?? '').trim();
	if (!value) return { ok: false, error: 'Renseigne l’identifiant de la sortie.' };
	const normalized = value.toUpperCase();
	if (kind === 'UPC') {
		if (!/^\d{12}$/.test(normalized)) {
			return { ok: false, error: 'Un UPC contient 12 chiffres.' };
		}
		return { ok: true, normalized };
	}
	if (!/^[A-Z0-9]{12}$/.test(normalized)) {
		return { ok: false, error: 'Un ISRC contient 12 caractères alphanumériques.' };
	}
	return { ok: true, normalized };
}

export function releaseReferenceLabel(kind: ReleaseReferenceKind) {
	return kind === 'UPC' ? 'UPC (code-barres)' : 'ISRC';
}
