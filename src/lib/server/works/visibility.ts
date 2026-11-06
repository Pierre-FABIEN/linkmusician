/**
 * Médias publics (profil, page de groupe, page d'un média) : une maquette
 * ajoutée depuis un morceau suit sa visibilité, donc reste cachée tant que
 * le morceau est une idée (P3-11). Un média déjà public choisi comme
 * maquette reste public.
 */
import type { Prisma } from '@prisma/client';

export const notIdeaDemo: Prisma.MediaWhereInput = {
	worksAsDemo: { none: { state: 'IDEA', demoFromWork: true } }
};
