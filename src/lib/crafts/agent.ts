/**
 * Profil léger de manager ou de booker (P5-07, conception 06 §3.4 et §3.5) :
 * règles. Module pur, partagé par le serveur et le navigateur.
 *
 * Tout est déclaratif : genres et ce que la personne cherche. La zone est
 * la ville de l'acteur. Les artistes accompagnés affichés sont **seulement**
 * ceux qui ont confirmé (`Representation`) : c'est le seul fait du profil.
 */

/** Genres suivis : du référentiel, 5 au plus. */
export const MAX_AGENT_GENRES = 5;
/** « Ce que je cherche », texte brut. */
export const MAX_AGENT_PITCH = 280;

/** Trouvable dans la recherche par métier : un genre au moins. */
export function isAgentProfileListed(profile: { genres: readonly unknown[] }): boolean {
	return profile.genres.length > 0;
}
