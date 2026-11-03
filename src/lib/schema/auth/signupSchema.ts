// src/lib/schemas.ts
import { z } from 'zod';
// LINKMUSICIAN: date de naissance (16 ans minimum, D5) et CGU (D16).
import { BIRTH_DATE_MESSAGES, checkBirthDate } from '#lib/actors/age';

/** LINKMUSICIAN: date civile `AAAA-MM-JJ` (champ `<input type="date">`), âge minimum vérifié. */
export const birthDateField = z
	.string()
	.min(1, 'La date de naissance est requise.')
	.superRefine((value, ctx) => {
		const result = checkBirthDate(value);
		if (!result.ok) {
			ctx.addIssue({ code: z.ZodIssueCode.custom, message: BIRTH_DATE_MESSAGES[result.reason] });
		}
	});

/** LINKMUSICIAN: acceptation explicite des CGU (case non cochée par défaut). */
export const acceptTermsField = z.boolean().refine((value) => value === true, {
	message: "Vous devez accepter les conditions d'utilisation."
});

export const signupSchema = z.object({
	username: z
		.string()
		.min(4, { message: "Le nom d'utilisateur doit contenir au moins 4 caractères." })
		.max(31),
	email: z.string().email({ message: "L'email n'est pas valide." }),
	password: z
		.string()
		.min(8, 'Le mot de passe doit contenir au moins 8 caractères.')
		.regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule.')
		.regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule.')
		.regex(/\d/, 'Le mot de passe doit contenir au moins un chiffre.')
		.regex(/[\W_]/, 'Le mot de passe doit contenir au moins un caractère spécial.'),
	birthDate: birthDateField, // LINKMUSICIAN:
	acceptTerms: acceptTermsField // LINKMUSICIAN:
});

export type SignupForm = z.infer<typeof signupSchema>;
