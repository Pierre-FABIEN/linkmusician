/**
 * Lien d'invitation d'école en attente (P5-11) : posé par `/ecole/[token]`
 * quand la personne n'a pas encore de compte prêt, repris une fois par la
 * garde de l'espace (`(app)/+layout.server.ts`). Le jeton seul, valable un
 * jour : il ne donne rien sans le compte de la personne.
 */
export const SCHOOL_INVITE_COOKIE = 'lm_ecole';
