/** Raccourcis d'écriture des catalogues de métier (ONB-04 à 11). */
import type { IntentInfo } from '../specializations';
import type { FieldOption } from './types';

export const intent = (code: string, label: string, description: string): IntentInfo => ({
	code,
	label,
	description
});

export const opt = (code: string, label: string): FieldOption => ({ code, label });

/** Environnements de travail du son (ingé son, producteur·rice). */
export const STUDIO_ENVIRONMENTS = [
	opt('HOME_STUDIO', 'Home studio'),
	opt('PARTNER_STUDIO', 'Studio partenaire'),
	opt('REMOTE', 'À distance')
];
