/**
 * Preuves des étapes de groupe (P3-05, D43) : règles pures, partagées par le
 * serveur et le navigateur. Une seule corroboration suffit par étape :
 *
 * - **Répétition** : un autre membre présent à la date la confirme ;
 * - **Enregistrement** : une personne hors groupe qui y a participé la
 *   confirme (un lien vers un extrait est facultatif) ;
 * - **Démo publique** : un lien d'écoute public, relu par la modération ;
 * - **Concert** : un lien vers l'événement ou l'affiche **et** une personne
 *   hors groupe qui y était.
 *
 * Personne hors groupe : confiance TL1 au moins, jamais membre ni ancien
 * membre du groupe. « Composition » et « Formation » ont leurs propres
 * règles (D41) ; aucune étape n'est vérifiée au lancement.
 */
import type { MilestoneKey } from './rules';

export const EVIDENCE_KINDS = ['EVENT', 'LISTEN', 'RECORDING'] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];
export type EvidenceStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'VERIFIED';
export type AttesterRole = 'MEMBER' | 'OUTSIDER';
export type AttestationStatus = 'REQUESTED' | 'CONFIRMED' | 'DECLINED';

export type ProofRule = {
	/** Qui confirme : un membre présent, une personne hors groupe, personne. */
	attester: AttesterRole | null;
	/** Lien joint : son type, s'il est exigé, s'il passe par la modération. */
	evidence: { kind: EvidenceKind; required: boolean; reviewed: boolean } | null;
};

export const PROOF_RULES: Partial<Record<MilestoneKey, ProofRule>> = {
	FIRST_REHEARSAL: { attester: 'MEMBER', evidence: null },
	FIRST_RECORDING: {
		attester: 'OUTSIDER',
		evidence: { kind: 'RECORDING', required: false, reviewed: false }
	},
	FIRST_PUBLIC_DEMO: {
		attester: null,
		evidence: { kind: 'LISTEN', required: true, reviewed: true }
	},
	FIRST_GIG: {
		attester: 'OUTSIDER',
		evidence: { kind: 'EVENT', required: true, reviewed: false }
	}
};

export function proofRule(key: MilestoneKey): ProofRule | null {
	return PROOF_RULES[key] ?? null;
}

/** Confiance minimale d'une personne hors groupe qui atteste (D43). */
export const MIN_OUTSIDER_TRUST = 1;
/** Demandes de confirmation en attente par étape (anti-sollicitation). */
export const MAX_PENDING_ATTESTATIONS = 5;
/** Liens joints par étape. */
export const MAX_EVIDENCE = 3;
export const MAX_EVIDENCE_URL = 500;

/** Plateformes d'écoute acceptées pour une démo publique. */
const LISTEN_HOSTS = [
	'youtube.com',
	'youtu.be',
	'music.youtube.com',
	'soundcloud.com',
	'bandcamp.com',
	'open.spotify.com',
	'deezer.com',
	'music.apple.com',
	'tidal.com',
	'audiomack.com'
];

function hostMatches(host: string, allowed: string) {
	return host === allowed || host.endsWith(`.${allowed}`);
}

/** Lien recevable pour ce type de preuve ? Renvoie l'URL propre ou une erreur. */
export function checkEvidenceUrl(
	kind: EvidenceKind,
	raw: string
): { ok: true; url: string } | { ok: false; error: string } {
	const value = raw.trim();
	if (!value) return { ok: false, error: 'Colle un lien.' };
	if (value.length > MAX_EVIDENCE_URL) return { ok: false, error: 'Ce lien est trop long.' };
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		return { ok: false, error: 'Ce lien n’est pas valide.' };
	}
	if (url.protocol !== 'https:')
		return { ok: false, error: 'Le lien doit commencer par https://.' };
	const host = url.hostname.toLowerCase().replace(/^www\./, '');
	if (kind === 'LISTEN' && !LISTEN_HOSTS.some((h) => hostMatches(host, h))) {
		return {
			ok: false,
			error:
				'Un lien d’écoute public : YouTube, SoundCloud, Bandcamp, Spotify, Deezer, Apple Music, Tidal ou Audiomack.'
		};
	}
	url.hash = '';
	return { ok: true, url: url.toString() };
}

export const EVIDENCE_LABELS: Readonly<Record<EvidenceKind, string>> = {
	EVENT: 'Lien vers l’événement ou l’affiche',
	LISTEN: 'Lien d’écoute de la démo',
	RECORDING: 'Lien vers un extrait'
};

export type ProofState = {
	attestations: readonly { role: AttesterRole; status: AttestationStatus }[];
	evidence: readonly { kind: EvidenceKind; status: EvidenceStatus }[];
};

function hasConfirmed(state: ProofState, role: AttesterRole) {
	return state.attestations.some((a) => a.role === role && a.status === 'CONFIRMED');
}

function hasEvidence(state: ProofState, kind: EvidenceKind) {
	return state.evidence.some(
		(e) => e.kind === kind && (e.status === 'ACCEPTED' || e.status === 'VERIFIED')
	);
}

/** L'étape est-elle corroborée par ce qui a été confirmé et joint ? */
export function corroborationMet(key: MilestoneKey, state: ProofState): boolean {
	const rule = proofRule(key);
	if (!rule) return false;
	if (rule.attester && !hasConfirmed(state, rule.attester)) return false;
	if (rule.evidence?.required && !hasEvidence(state, rule.evidence.kind)) return false;
	return rule.attester !== null || rule.evidence !== null;
}

/** Ce qu'il reste à faire, en clair, pour la gestion du groupe. */
export function proofChecklist(key: MilestoneKey, state: ProofState) {
	const rule = proofRule(key);
	if (!rule) return [];
	const items: { label: string; done: boolean; pending: boolean }[] = [];
	if (rule.evidence?.required) {
		const kind = rule.evidence.kind;
		items.push({
			label:
				kind === 'LISTEN'
					? 'Un lien d’écoute public, relu par la modération'
					: 'Un lien vers l’événement ou l’affiche en ligne',
			done: hasEvidence(state, kind),
			pending: state.evidence.some((e) => e.kind === kind && e.status === 'PENDING')
		});
	}
	if (rule.attester) {
		items.push({
			label:
				rule.attester === 'MEMBER'
					? 'Un autre membre présent ce jour-là confirme'
					: 'Une personne hors du groupe qui y était confirme',
			done: hasConfirmed(state, rule.attester),
			pending: state.attestations.some((a) => a.role === rule.attester && a.status === 'REQUESTED')
		});
	}
	return items;
}

/**
 * Peut-on demander à cette personne de confirmer ? Raison du refus, ou
 * `null`. Le service fournit les faits ; les mineur·es suivent la règle des
 * invitations (`knownToMinor`, D5), sans que la raison soit dite.
 */
export function attesterBlocker(input: {
	role: AttesterRole;
	self: boolean;
	declaredByThem: boolean;
	/** Membre (actuel ou ancien) du groupe. */
	everMember: boolean;
	/** Membre présent à la date de l'étape. */
	presentAtDate: boolean;
	trustLevel: number;
	blocked: boolean;
	minorUnknown: boolean;
}): string | null {
	if (input.self) return 'Demande à quelqu’un d’autre que toi.';
	// Appartenance au groupe d'abord : la gestion connaît ses membres, la
	// réponse ne révèle rien.
	if (input.role === 'MEMBER') {
		if (!input.presentAtDate) return 'Il faut un membre du groupe présent ce jour-là.';
		if (input.declaredByThem) return 'Il faut un autre membre que celui ou celle qui l’a déclarée.';
	} else if (input.everMember) {
		return 'Il faut une personne extérieure au groupe.';
	}
	if (input.blocked || input.minorUnknown)
		return 'Cette personne ne peut pas confirmer cette étape.';
	if (input.role === 'OUTSIDER' && input.trustLevel < MIN_OUTSIDER_TRUST) {
		return 'Cette personne vient d’arriver : elle pourra confirmer dans quelques jours.';
	}
	return null;
}
