/**
 * Écran `/bienvenue` : complétion de la personne LinkMusician pour un compte
 * qui n'en a pas encore (connexion Google, comptes antérieurs).
 */
import { z } from 'zod';
import { acceptTermsField, birthDateField } from '#lib/schema/auth/signupSchema';
import { checkHandle, HANDLE_MESSAGES } from '#lib/actors/handle';

export const handleField = z
	.string()
	.trim()
	.transform((value) => value.toLowerCase())
	.superRefine((value, ctx) => {
		const result = checkHandle(value);
		if (!result.ok) {
			ctx.addIssue({ code: z.ZodIssueCode.custom, message: HANDLE_MESSAGES[result.reason] });
		}
	});

export const welcomeSchema = z.object({
	handle: handleField,
	birthDate: birthDateField,
	acceptTerms: acceptTermsField
});

export type WelcomeForm = z.infer<typeof welcomeSchema>;
