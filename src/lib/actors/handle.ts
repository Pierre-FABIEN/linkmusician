/**
 * Identifiant public d'un acteur (`@handle`), utilisé dans l'URL du profil.
 *
 * Module pur, partagé par le serveur et le navigateur. Format : 3 à 30
 * caractères parmi `a-z`, `0-9`, `_` et `-`, commençant par une lettre ou un
 * chiffre. Toujours stocké en minuscules : l'unicité est donc insensible à la
 * casse.
 */

export const HANDLE_MIN_LENGTH = 3;
export const HANDLE_MAX_LENGTH = 30;

const HANDLE_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

/**
 * Handles réservés : chemins de l'application (présents et prévus), rôles et
 * termes qui prêteraient à confusion avec un compte officiel.
 */
export const RESERVED_HANDLES: ReadonlySet<string> = new Set([
	'admin',
	'administrateur',
	'api',
	'app',
	'auth',
	'bienvenue',
	'blog',
	'cgu',
	'cgv',
	'checkout',
	'confidentialite',
	'contact',
	'decouvrir',
	'demarrer',
	'espace',
	'help',
	'aide',
	'accueil',
	'linkmusician',
	'login',
	'logout',
	'mentions-legales',
	'medias',
	'messages',
	'moderateur',
	'moderation',
	'suspendu',
	'moderator',
	'null',
	'parcours',
	'products',
	'profil',
	'qui-es-tu',
	'reglages',
	'root',
	'settings',
	'signup',
	'sitemap',
	'staff',
	'structure',
	'support',
	'system',
	'undefined',
	'agences',
	'annonces'
]);

export type HandleCheck =
	{ ok: true } | { ok: false; reason: 'too_short' | 'too_long' | 'format' | 'reserved' };

export const HANDLE_MESSAGES: Record<Exclude<HandleCheck, { ok: true }>['reason'], string> = {
	too_short: `L'identifiant doit contenir au moins ${HANDLE_MIN_LENGTH} caractères.`,
	too_long: `L'identifiant doit contenir au plus ${HANDLE_MAX_LENGTH} caractères.`,
	format:
		"L'identifiant ne peut contenir que des lettres minuscules sans accent, des chiffres, « _ » et « - », et doit commencer par une lettre ou un chiffre.",
	reserved: 'Cet identifiant est réservé.'
};

/** Vérifie un handle déjà normalisé (minuscules). */
export function checkHandle(handle: string): HandleCheck {
	if (handle.length < HANDLE_MIN_LENGTH) return { ok: false, reason: 'too_short' };
	if (handle.length > HANDLE_MAX_LENGTH) return { ok: false, reason: 'too_long' };
	if (!HANDLE_PATTERN.test(handle)) return { ok: false, reason: 'format' };
	if (RESERVED_HANDLES.has(handle)) return { ok: false, reason: 'reserved' };
	return { ok: true };
}

/**
 * Transforme un texte libre (pseudo, nom) en handle candidat : minuscules,
 * accents retirés, séparateurs ramenés à `-`. Le résultat peut encore être
 * invalide (trop court, réservé) : `suggestHandle` s'en charge.
 */
export function slugifyHandle(input: string): string {
	return input
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9_-]+/g, '-')
		.replace(/-{2,}/g, '-')
		.replace(/^[-_]+|[-_]+$/g, '')
		.slice(0, HANDLE_MAX_LENGTH)
		.replace(/[-_]+$/g, '');
}

/**
 * Propose un handle libre à partir d'un texte, en évitant ceux déjà pris.
 * `isTaken` reçoit chaque candidat (`base`, `base-2`, `base-3`…).
 */
export async function suggestHandle(
	input: string,
	isTaken: (candidate: string) => Promise<boolean>,
	maxAttempts = 50
): Promise<string> {
	let base = slugifyHandle(input);
	if (checkHandle(base).ok === false) {
		// Trop court, réservé ou vide : on garde ce qui est lisible et on complète.
		base = slugifyHandle(`${base || 'musicien'}-lm`);
	}

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		const suffix = attempt === 1 ? '' : `-${attempt}`;
		const candidate = base.slice(0, HANDLE_MAX_LENGTH - suffix.length) + suffix;
		if (checkHandle(candidate).ok && !(await isTaken(candidate))) return candidate;
	}
	throw new Error(`Aucun handle libre trouvé pour « ${input} » après ${maxAttempts} essais`);
}
