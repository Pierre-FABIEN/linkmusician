/**
 * Propositions de l'assistant d'inscription (P3-17) entre les écrans de
 * l'onboarding : gardées dans le navigateur seulement (`sessionStorage`,
 * effacées à la fermeture de l'onglet), jamais envoyées au serveur telles
 * quelles. Chaque écran reprend **sa** part une fois, puis l'efface : la
 * personne la voit pré-remplie, la vérifie et envoie le formulaire habituel.
 *
 * Toute lecture ou écriture est protégée : sans stockage (navigation
 * privée, aperçu), l'onboarding manuel fonctionne exactement pareil.
 */
import type { Proposals } from './assistant';

const KEY = 'lm-onboarding-proposals';

export type ProposalPart = 'tracks' | 'instruments' | 'genres' | 'ville' | 'intention';

type Stored = Partial<{
	tracks: Proposals['tracks'];
	instruments: Proposals['instruments'];
	genres: Proposals['genres'];
	ville: { communeQuery: string | null; radiusKm: Proposals['radiusKm'] };
	intention: Proposals['lookingFor'];
}>;

function read(): Stored {
	try {
		const raw = sessionStorage.getItem(KEY);
		return raw ? (JSON.parse(raw) as Stored) : {};
	} catch {
		return {};
	}
}

function write(value: Stored) {
	try {
		if (Object.keys(value).length === 0) sessionStorage.removeItem(KEY);
		else sessionStorage.setItem(KEY, JSON.stringify(value));
	} catch {
		// Stockage indisponible : les écrans suivants restent simplement vides.
	}
}

/** Garde les propositions acceptées pour les écrans suivants. */
export function saveProposals(p: Proposals) {
	const value: Stored = {};
	if (p.instruments.length) value.instruments = p.instruments;
	if (p.genres.length) value.genres = p.genres;
	if (p.communeQuery || p.radiusKm) {
		value.ville = { communeQuery: p.communeQuery, radiusKm: p.radiusKm };
	}
	if (p.lookingFor.length) value.intention = p.lookingFor;
	write(value);
}

/** Reprend la part d'un écran, une seule fois. */
export function takeProposal<K extends ProposalPart>(part: K): Stored[K] | undefined {
	const all = read();
	const value = all[part];
	if (value !== undefined) {
		delete all[part];
		write(all);
	}
	return value;
}

export function clearProposals() {
	write({});
}

/** Compteur d'usage, sans aucune valeur (voir `/api/onboarding/assistant/usage`). */
export function reportUsage(event: 'applied' | 'ignored' | 'removed' | 'edited', count = 1) {
	try {
		void fetch('/api/onboarding/assistant/usage', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ event, count }),
			keepalive: true
		}).catch(() => {});
	} catch {
		// Mesure facultative.
	}
}
