/**
 * Confidentialité des activités (D81, conception 23) : règle **pure**,
 * partagée par le serveur et les tests. Le serveur rassemble les faits
 * (`#lib/server/privacy/activities`) ; ici, on décide.
 *
 * Ordre : soi-même ; blocage ; exclusion ; découverte sur place réciproque ;
 * mode de partage de la catégorie (passée ou à venir) ; autorisation
 * explicite. Une exclusion ou un blocage l'emporte toujours. Un·e mineur·e
 * n'est jamais public·que, ni découvrable sur place.
 */
import { z } from 'zod';

export const ACTIVITY_SHARES = ['PRIVATE', 'SELECTED', 'PUBLIC'] as const;
export type ActivityShareValue = (typeof ACTIVITY_SHARES)[number];

/** Activités passées (« J'y étais », carnet) ou à venir (« Je viens », formation). */
export type ActivityScope = 'past' | 'future';

export type VisibilityFacts = {
	self: boolean;
	/** Blocage dans un sens ou dans l'autre. */
	blocked: boolean;
	/** La personne a masqué ses activités à qui regarde. */
	excluded: boolean;
	ownerMinor: boolean;
	viewerMinor: boolean;
	/** Mode choisi pour la catégorie concernée (absent : `PRIVATE`). */
	mode: ActivityShareValue;
	/** Autorisation explicite de la personne à qui regarde. */
	granted: boolean;
	/** Les deux sont visibles sur place, à la même jam, en ce moment. */
	bothDiscoverable: boolean;
};

export function decideActivityVisibility(f: VisibilityFacts): boolean {
	if (f.self) return true;
	if (f.blocked || f.excluded) return false;
	if (f.bothDiscoverable && !f.ownerMinor && !f.viewerMinor) return true;
	// Un·e mineur·e n'est jamais public·que : `PUBLIC` vaut `SELECTED`.
	const mode = f.ownerMinor && f.mode === 'PUBLIC' ? 'SELECTED' : f.mode;
	if (mode === 'PUBLIC') return true;
	if (mode === 'SELECTED') return f.granted;
	return false;
}

export const SHARE_LABELS: Record<ActivityShareValue, string> = {
	PRIVATE: 'Personne',
	SELECTED: 'Les personnes que j’autorise',
	PUBLIC: 'Tous les membres'
};

export const privacyModesSchema = z
	.object({
		past: z.enum(ACTIVITY_SHARES),
		future: z.enum(ACTIVITY_SHARES),
		/** Case « Je comprends que tous les membres verront… », exigée pour `PUBLIC`. */
		publicConsent: z.boolean().default(false)
	})
	.refine((v) => v.publicConsent || (v.past !== 'PUBLIC' && v.future !== 'PUBLIC'), {
		message: 'Coche la case pour partager tes jams avec tous les membres.',
		path: ['publicConsent']
	});
export type PrivacyModesForm = z.infer<typeof privacyModesSchema>;
