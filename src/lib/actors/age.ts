/**
 * Contrôle d'âge à l'inscription (décision D5 : 16 ans minimum).
 *
 * Module pur, partagé par le serveur et le navigateur (schéma Zod du
 * formulaire). Les dates de naissance sont des dates civiles `AAAA-MM-JJ`,
 * sans heure ni fuseau : on compare des triplets année/mois/jour, jamais des
 * timestamps, pour éviter qu'un décalage horaire fasse gagner ou perdre un jour.
 */

export const MINIMUM_AGE = 16;

/** Âge maximal plausible : au-delà, c'est une faute de saisie. */
export const MAXIMUM_AGE = 120;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export type CivilDate = { year: number; month: number; day: number };

/** Lit une date `AAAA-MM-JJ`. Renvoie `null` si elle est mal formée ou n'existe pas (31 février…). */
export function parseCivilDate(value: string): CivilDate | null {
	const match = ISO_DATE.exec(value.trim());
	if (!match) return null;
	const [year, month, day] = match.slice(1).map(Number);
	const probe = new Date(Date.UTC(year, month - 1, day));
	if (
		probe.getUTCFullYear() !== year ||
		probe.getUTCMonth() !== month - 1 ||
		probe.getUTCDate() !== day
	) {
		return null;
	}
	return { year, month, day };
}

/** Date civile du jour, dans le fuseau local de l'exécution. */
export function todayCivil(now: Date = new Date()): CivilDate {
	return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

/**
 * Âge révolu à une date donnée. Une personne née un 29 février a son
 * anniversaire le 1er mars les années non bissextiles.
 */
export function ageOn(birth: CivilDate, on: CivilDate): number {
	let age = on.year - birth.year;
	const birthdayPassed =
		on.month > birth.month || (on.month === birth.month && on.day >= birth.day);
	if (!birthdayPassed) age -= 1;
	return age;
}

export type BirthDateCheck =
	| { ok: true; age: number }
	| { ok: false; reason: 'invalid' | 'future' | 'too_young' | 'implausible' };

/** Vérifie une date de naissance saisie. `today` est injectable pour les tests. */
export function checkBirthDate(value: string, today: CivilDate = todayCivil()): BirthDateCheck {
	const birth = parseCivilDate(value);
	if (!birth) return { ok: false, reason: 'invalid' };
	const age = ageOn(birth, today);
	if (age < 0) return { ok: false, reason: 'future' };
	if (age < MINIMUM_AGE) return { ok: false, reason: 'too_young' };
	if (age > MAXIMUM_AGE) return { ok: false, reason: 'implausible' };
	return { ok: true, age };
}

export const BIRTH_DATE_MESSAGES: Record<Exclude<BirthDateCheck, { ok: true }>['reason'], string> =
	{
		invalid: 'Date de naissance invalide.',
		future: 'La date de naissance ne peut pas être dans le futur.',
		too_young: `Il faut avoir au moins ${MINIMUM_AGE} ans pour s'inscrire.`,
		implausible: 'Vérifiez la date de naissance saisie.'
	};

/** Convertit une date civile valide en `Date` UTC à minuit (colonne Postgres `DATE`). */
export function civilDateToUtc(value: string): Date {
	const birth = parseCivilDate(value);
	if (!birth) throw new Error(`Date civile invalide : ${value}`);
	return new Date(Date.UTC(birth.year, birth.month - 1, birth.day));
}
