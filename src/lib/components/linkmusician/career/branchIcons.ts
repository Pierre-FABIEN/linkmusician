/**
 * LINKMUSICIAN: icône de chaque branche de la carte de carrière (N2),
 * décorative (`aria-hidden` dans les tuiles) : le nom de la branche est
 * toujours écrit.
 */
import { Disc3, Handshake, MicVocal, Music, Radio, UsersRound } from 'lucide-svelte';
import type { CareerBranch } from '#lib/career/map';

export const BRANCH_ICON: Readonly<Record<CareerBranch, typeof Music>> = {
	EQUIPE: UsersRound,
	CREATION: Music,
	PRODUCTION: Disc3,
	SCENE: MicVocal,
	DIFFUSION: Radio,
	ACCOMPAGNEMENT: Handshake
};
