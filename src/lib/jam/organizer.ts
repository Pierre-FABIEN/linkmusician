/**
 * Organisateurs de jams (D51) : règle pure, partagée par le serveur et le
 * navigateur.
 *
 * - Lancer une jam est réservé aux personnes qui ont coché « Prêt·e à
 *   organiser des jams » dans leur profil. Les autres se retrouvent par la
 *   messagerie pour jouer ensemble (et peuvent déclarer une collaboration).
 * - Seul·es les adultes peuvent le cocher : ces profils seront proposés aux
 *   lieux et organisateurs (D5, pas de mise en relation d'un·e mineur·e avec
 *   une structure).
 */
import { isIndexable } from '#lib/actors/visibility';

export function canOrganizeJams(
	person: { organizesJams: boolean; birthDate: Date | null | undefined },
	now = new Date()
): boolean {
	return person.organizesJams && isIndexable(person.birthDate, now);
}

/** La case s'affiche-t-elle dans le profil ? Adultes seulement. */
export function mayOfferToOrganize(birthDate: Date | null | undefined, now = new Date()): boolean {
	return isIndexable(birthDate, now);
}

export const NOT_ORGANIZER_ERROR =
	'Pour lancer une jam, coche « Prêt·e à organiser des jams » dans ton profil.';
