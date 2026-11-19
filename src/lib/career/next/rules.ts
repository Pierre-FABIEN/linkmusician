/**
 * Prochaines actions (N3) : des **faits autorisés** aux candidates
 * (conception 21 §8.4, §9.1). Règle pure.
 *
 * Chaque fait reçu a déjà passé, côté serveur, le droit (NL4 : le lecteur
 * peut faire le geste) et la visibilité (I6 : il voit l'objet et les
 * personnes nommées). Ici, on ne décide que du rang, de la phrase et de la
 * destination ; jamais d'un droit.
 *
 * - Rang 1 : quelqu'un a déjà confirmé une collaboration passée et attend la
 *   mienne.
 * - Rang 2 : une demande nominative attend ma réponse (collaboration
 *   proposée ou à confirmer, crédit, invitation de groupe ou de projet,
 *   coordination proposée (U3), accompagnement,
 *   candidatures reçues, demandes de contact).
 * - Rang 3 : mon travail en cours (étape que j'ai prise en charge, idée de
 *   morceau que je gère, travaillée récemment).
 * - Rang 4 : un besoin réel d'un morceau que je gère (place libre, mixage
 *   d'un morceau enregistré, enregistrement si mon ambition le vise).
 * - Rang 5 : facultatif (épreuve à portée, enregistrement sans ambition
 *   « enregistrer », objectif).
 *
 * Aucune règle ne naît du vide (NL2) : chaque candidate cite son fait. Aucune
 * jam ni disponibilité (Collab ≠ Rencontre, conception 20 P9). Aucune XP.
 */
import type { AmbitionValue } from '../ambition';
import type { CareerBranch } from '../map';
import { namesOf, type NamedPerson } from '../nudges';
import { collaborationBranch } from '../branch';
import type { Candidate, SuggestionRank } from './engine';

/** Ambitions pour lesquelles « enregistrer » est un besoin (rang 4), pas un plus (rang 5). */
const RECORDING_AMBITIONS: readonly AmbitionValue[] = ['RECORD', 'PRO'];

export type ProPerson = NamedPerson & { craft: 'SOUND_ENGINEER' | 'PRODUCER' };

export type NextFacts = {
	reader: {
		/** Majeur·e : peut chercher et contacter quelqu'un d'inconnu (D5). */
		adult: boolean;
		ambition: AmbitionValue | null;
	};
	/** Collaborations qui attendent ma réponse (`respond`) ou ma confirmation (`confirm`). */
	collaborations: {
		id: string;
		kind: string;
		title: string;
		/** Les autres parties, telles que je les vois déjà dans Messages. */
		with: string;
		conversationId: string;
		step: 'respond' | 'confirm';
		/** Je fournis la prestation du son. */
		asProvider: boolean;
		/** Jour `AAAA-MM-JJ`. */
		happenedOn: string;
		/** La session est à venir : son jour est une échéance réelle. */
		upcoming: boolean;
		proposedAt: Date;
		/** Dernière confirmation d'une autre partie, si quelqu'un a déjà confirmé. */
		othersConfirmedAt: Date | null;
	}[];
	/** Crédits sur un morceau de mon équipe, qui attendent ma confirmation. */
	credits: { workId: string; title: string; since: Date }[];
	/** Invitations de groupe reçues. */
	bandInvitations: { bandId: string; name: string; since: Date }[];
	/** Invitations à un projet (U3) : le nom du projet et qui invite, rien d'autre (§9.3). */
	projectInvitations: { id: string; projectName: string; invitedBy: string | null; since: Date }[];
	/** Coordinations proposées dans un projet où je suis déjà (U3). */
	capabilityOffers: { projectId: string; projectName: string }[];
	/** Besoins proposés par la coordination, à trancher par la gestion (U3b-c). */
	needProposals: {
		needId: string;
		projectId: string;
		projectName: string;
		label: string;
		since: Date;
	}[];
	/** Propositions d'accompagnement qui attendent ma réponse (D44). */
	representations: { id: string }[];
	/** Candidatures en attente sur mes annonces ouvertes. */
	applications: number;
	/** Demandes de contact reçues (adultes seulement). */
	contactRequests: number;
	/** Étapes de production que j'ai prises en charge, sur un morceau que je gère. */
	steps: {
		workId: string;
		title: string;
		/** Libellé de l'étape (« Enregistrement »). */
		label: string;
		status: 'TODO' | 'IN_PROGRESS';
		since: Date;
	}[];
	/** Idées de morceau que je gère, travaillées récemment. */
	ideas: { workId: string; title: string; hasDemo: boolean; updatedAt: Date }[];
	/** Besoins réels des morceaux composés ou en idée que je gère. */
	works: {
		workId: string;
		title: string;
		/** `nextProductionNeed` (`#lib/works/production`). */
		need: 'RECORDING' | 'MIXING' | null;
		/** Pros du son de mon réseau réel, hors équipe, pour ce besoin. */
		pros: ProPerson[];
		/** Places libres (instrument), avec qui en joue dans mon réseau proche. */
		openRoles: { instrument: string; candidates: NamedPerson[] }[];
		/** Une annonce ouverte recrute déjà pour ce morceau. */
		hasOpenOpportunity: boolean;
	}[];
	/** Épreuves de la carte à portée (N2), avec leur geste. */
	withinReach: {
		number: number;
		name: string;
		branch: CareerBranch;
		reason: string;
		action: { label: string; href: string };
		/** Collaboration à confirmer ou morceau visé, pour le dédoublonnage. */
		subject: { type: 'COLLABORATION' | 'WORK'; id: string } | null;
	}[];
	/** Objectif existant (`nextObjectives`, `craftQuests`), sans son XP. */
	objective: { id: string; label: string; href: string } | null;
};

export const NO_NEXT_FACTS: Omit<NextFacts, 'reader'> = {
	collaborations: [],
	credits: [],
	bandInvitations: [],
	projectInvitations: [],
	capabilityOffers: [],
	needProposals: [],
	representations: [],
	applications: 0,
	contactRequests: 0,
	steps: [],
	ideas: [],
	works: [],
	withinReach: [],
	objective: null
};

const day = (iso: string) => iso.split('-').reverse().join('/');
const firstName = (p: NamedPerson) => p.displayName.split(' ')[0] || p.displayName;
const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

const SEARCH = {
	RECORDING: '/decouvrir?metier=inge-son&specialite=prise-de-son',
	MIXING: '/decouvrir?metier=inge-son&specialite=mixage'
} as const;

const CRAFT = {
	SOUND_ENGINEER: { one: 'ingé son', many: 'ingés son' },
	PRODUCER: { one: 'producteur·rice', many: 'producteur·rices' }
} as const;

function prosPhrase(pros: readonly ProPerson[]) {
	const crafts = new Set(pros.map((p) => p.craft));
	return crafts.size === 1 ? CRAFT[pros[0].craft][pros.length > 1 ? 'many' : 'one'] : 'pros du son';
}

/** Rangs 1 et 2 : ce qui attend ma réponse. */
function pending(f: NextFacts): Candidate[] {
	const out: Candidate[] = [];
	for (const c of f.collaborations) {
		const branch = collaborationBranch(c);
		const href = `/messages/${c.conversationId}`;
		const subject = { type: 'COLLABORATION', id: c.id } as const;
		if (c.step === 'respond') {
			out.push({
				rule: 'collab.respond',
				rank: 2,
				branch,
				subject,
				title: `Réponds à la proposition « ${c.title} »`,
				why: `${c.with} te propose une collaboration le ${day(c.happenedOn)}.`,
				href,
				cta: 'Répondre',
				deadline: c.upcoming ? new Date(`${c.happenedOn}T00:00:00Z`) : null,
				waitingSince: c.proposedAt,
				fact: `respond|${c.happenedOn}`
			});
		} else {
			// Quelqu'un a déjà confirmé : sans ma confirmation, la réalisation reste en suspens.
			const blocking = c.othersConfirmedAt !== null;
			out.push({
				rule: 'collab.confirm',
				rank: blocking ? 1 : 2,
				branch,
				subject,
				title: `Confirme « ${c.title} » avec ${c.with}`,
				why: blocking
					? `${c.with} a confirmé la collaboration du ${day(c.happenedOn)} et attend ta confirmation.`
					: `La collaboration du ${day(c.happenedOn)} a eu lieu : confirme-la de ton côté.`,
				href,
				cta: 'Confirmer',
				deadline: null,
				waitingSince: c.othersConfirmedAt ?? new Date(`${c.happenedOn}T00:00:00Z`),
				fact: ''
			});
		}
	}
	for (const c of f.credits)
		out.push({
			rule: 'credit.confirm',
			rank: 2,
			branch: 'CREATION',
			subject: { type: 'WORK', id: c.workId },
			title: `Confirme ton rôle sur « ${c.title} »`,
			why: 'Tu es crédité·e sur ce morceau ; ton rôle attend ta confirmation.',
			href: `/morceaux/${c.workId}#credits-title`,
			cta: 'Voir mon rôle',
			deadline: null,
			waitingSince: c.since,
			fact: ''
		});
	for (const b of f.bandInvitations)
		out.push({
			rule: 'band.invitation',
			rank: 2,
			branch: 'EQUIPE',
			subject: { type: 'BAND', id: b.bandId },
			title: `${b.name} t’invite dans le groupe`,
			why: 'Une invitation à rejoindre le groupe attend ta réponse.',
			href: '/groupes',
			cta: 'Répondre',
			deadline: null,
			waitingSince: b.since,
			fact: ''
		});
	for (const p of f.projectInvitations)
		out.push({
			rule: 'project.invitation',
			rank: 2,
			branch: 'EQUIPE',
			subject: { type: 'PROJECT_INVITE', id: p.id },
			title: p.invitedBy
				? `${p.invitedBy} t’invite dans « ${p.projectName} »`
				: `Une invitation dans « ${p.projectName} »`,
			why: 'Une invitation à rejoindre ce projet attend ta réponse.',
			href: '/espace/a-confirmer#projets',
			cta: 'Répondre',
			deadline: null,
			waitingSince: p.since,
			fact: ''
		});
	for (const o of f.capabilityOffers)
		out.push({
			rule: 'project.coordination',
			rank: 2,
			branch: 'EQUIPE',
			subject: { type: 'PROJECT', id: o.projectId },
			title: `On te propose de coordonner « ${o.projectName} »`,
			why: 'La gestion du projet te propose la coordination ; elle attend ta réponse.',
			href: `/projets/${o.projectId}#equipe`,
			cta: 'Répondre',
			deadline: null,
			waitingSince: null,
			fact: ''
		});
	// Une suggestion par projet (le moteur garde un sujet une fois), la plus ancienne en tête.
	const byProject = new Map<string, (typeof f.needProposals)[number][]>();
	for (const n of f.needProposals)
		byProject.set(n.projectId, [...(byProject.get(n.projectId) ?? []), n]);
	for (const [projectId, list] of byProject) {
		const first = list.reduce((a, b) => (a.since <= b.since ? a : b));
		out.push({
			rule: 'project.need',
			rank: 2,
			branch: 'EQUIPE',
			subject: { type: 'PROJECT', id: projectId },
			title:
				list.length === 1
					? `Besoin proposé dans « ${first.projectName} » : ${first.label}`
					: `${list.length} besoins proposés dans « ${first.projectName} »`,
			why: 'La coordination propose ; la gestion décide d’ouvrir ou non.',
			href: `/projets/${projectId}#besoins`,
			cta: 'Décider',
			deadline: null,
			waitingSince: first.since,
			fact: ''
		});
	}
	for (const r of f.representations)
		out.push({
			rule: 'representation.respond',
			rank: 2,
			branch: 'ACCOMPAGNEMENT',
			subject: { type: 'REPRESENTATION', id: r.id },
			title: 'Une proposition d’accompagnement',
			why: 'Une personne propose de t’accompagner ; elle attend ta réponse.',
			href: '/accompagnement',
			cta: 'Répondre',
			deadline: null,
			waitingSince: null,
			fact: ''
		});
	if (f.applications > 0)
		out.push({
			rule: 'applications.review',
			rank: 2,
			branch: 'EQUIPE',
			subject: { type: 'INBOX', id: 'applications' },
			title: plural(f.applications, 'candidature reçue', 'candidatures reçues'),
			why: 'Des personnes ont répondu à tes annonces ouvertes.',
			href: '/annonces',
			cta: 'Voir mes annonces',
			deadline: null,
			waitingSince: null,
			fact: ''
		});
	if (f.reader.adult && f.contactRequests > 0)
		out.push({
			rule: 'contact.respond',
			rank: 2,
			branch: 'EQUIPE',
			subject: { type: 'INBOX', id: 'contact-requests' },
			title: plural(f.contactRequests, 'demande de contact', 'demandes de contact'),
			why: 'Des personnes souhaitent échanger avec toi.',
			href: '/messages',
			cta: 'Voir les demandes',
			deadline: null,
			waitingSince: null,
			fact: ''
		});
	return out;
}

/** Rang 3 : mon travail en cours. */
function work(f: NextFacts): Candidate[] {
	const out: Candidate[] = [];
	for (const s of f.steps)
		out.push({
			rule: 'work.step',
			rank: 3,
			branch: 'PRODUCTION',
			subject: { type: 'WORK', id: s.workId },
			title: `Poursuis : ${s.label.toLowerCase()} de « ${s.title} »`,
			why:
				s.status === 'IN_PROGRESS'
					? `Tu as commencé : ${s.label.toLowerCase()}.`
					: `Tu as pris en charge : ${s.label.toLowerCase()}.`,
			href: `/morceaux/${s.workId}#suite-title`,
			cta: 'Voir la suite du morceau',
			deadline: null,
			waitingSince: s.since,
			fact: s.status
		});
	for (const i of f.ideas)
		out.push(
			i.hasDemo
				? {
						rule: 'crea.compose',
						rank: 3,
						branch: 'CREATION',
						subject: { type: 'WORK', id: i.workId },
						title: `« ${i.title} » est-il composé ?`,
						why: 'Ton idée a une maquette. Quand tu veux, déclare-la composée.',
						href: `/morceaux/${i.workId}#compose-title`,
						cta: 'Voir le morceau',
						deadline: null,
						waitingSince: i.updatedAt,
						fact: 'demo'
					}
				: {
						rule: 'crea.demo',
						rank: 3,
						branch: 'CREATION',
						subject: { type: 'WORK', id: i.workId },
						title: `Reprends « ${i.title} »`,
						why: 'Tu as travaillé sur cette idée récemment. Une maquette, même brute, aide à la partager.',
						href: `/morceaux/${i.workId}#demo-title`,
						cta: 'Ajouter une maquette',
						deadline: null,
						waitingSince: i.updatedAt,
						fact: 'no-demo'
					}
		);
	return out;
}

/** Rang 4 (et 5 pour un enregistrement que l'ambition ne vise pas) : besoins réels. */
function needs(f: NextFacts): Candidate[] {
	const out: Candidate[] = [];
	const recordingRank: SuggestionRank = RECORDING_AMBITIONS.includes(
		f.reader.ambition as AmbitionValue
	)
		? 4
		: 5;
	for (const w of f.works) {
		const subject = { type: 'WORK', id: w.workId } as const;
		if (w.need) {
			const mixing = w.need === 'MIXING';
			const base = {
				rule: mixing ? ('prod.mix' as const) : ('prod.record' as const),
				rank: mixing ? 4 : recordingRank,
				branch: 'PRODUCTION' as const,
				subject,
				title: mixing
					? `« ${w.title} » est enregistré : place au mixage`
					: `« ${w.title} » est prêt à enregistrer`,
				deadline: null,
				waitingSince: null,
				fact: `${w.need}|${w.pros
					.map((p) => p.handle)
					.sort()
					.join(',')}`
			};
			if (w.pros.length > 0) {
				// Seulement des personnes du réseau réel (« vous avez joué ensemble »), §8.8.
				out.push({
					...base,
					why: `${namesOf(w.pros)}, ${prosPhrase(w.pros)} de ton réseau : vous avez déjà joué ensemble.`,
					href: `/@${w.pros[0].handle}`,
					cta: `Voir le profil de ${firstName(w.pros[0])}`
				});
			} else if (f.reader.adult) {
				out.push({
					...base,
					why: mixing
						? 'Personne ne s’occupe encore du mixage.'
						: 'Personne ne s’occupe encore de l’enregistrement.',
					href: SEARCH[w.need],
					cta: mixing ? 'Chercher qui mixe' : 'Chercher un·e ingé son'
				});
			} else if (!mixing) {
				// Un·e mineur·e ne cherche pas d'inconnu (D5) ; l'enregistrement peut se prendre soi-même.
				out.push({
					...base,
					why: 'Personne ne s’occupe encore de l’enregistrement.',
					href: `/morceaux/${w.workId}#suite-title`,
					cta: 'Voir la suite du morceau'
				});
			}
		}
		const role = w.openRoles.find((r) => r.candidates.length > 0) ?? w.openRoles[0];
		if (!role) continue;
		const instrument = role.instrument.toLowerCase();
		if (role.candidates.length > 0)
			out.push({
				rule: 'team.fill_role',
				rank: 4,
				branch: 'EQUIPE',
				subject,
				title: `« ${w.title} » attend : ${instrument}`,
				why: `${namesOf(role.candidates)}, de ton réseau, ${role.candidates.length > 1 ? 'en jouent' : 'en joue'} près de chez toi.`,
				href: `/morceaux/${w.workId}#open-title`,
				cta: 'Voir les places libres',
				deadline: null,
				waitingSince: null,
				fact: `${role.instrument}|${role.candidates
					.map((p) => p.handle)
					.sort()
					.join(',')}`
			});
		else if (f.reader.adult && !w.hasOpenOpportunity)
			out.push({
				rule: 'team.fill_role',
				rank: 4,
				branch: 'EQUIPE',
				subject,
				title: `« ${w.title} » attend : ${instrument}`,
				why: 'Une place est libre sur ton morceau, et aucune annonce ne la propose encore.',
				href: `/morceaux/${w.workId}#open-title`,
				cta: 'Voir les places libres',
				deadline: null,
				waitingSince: null,
				fact: `${role.instrument}|`
			});
	}
	return out;
}

/** Rang 5 : facultatif. */
function optional(f: NextFacts): Candidate[] {
	const out: Candidate[] = f.withinReach.map((t) => ({
		rule: 'trial.within_reach',
		rank: 5,
		branch: t.branch,
		// Même objet qu'une demande des rangs 1–2 : le dédoublonnage garde la demande.
		subject: t.subject ?? { type: 'TRIAL', id: String(t.number) },
		title: `À portée : ${t.name}`,
		why: t.reason,
		href: t.action.href,
		cta: t.action.label,
		deadline: null,
		waitingSince: null,
		fact: `${t.number}|${t.subject ? `${t.subject.type}:${t.subject.id}` : ''}|${t.action.href}`
	}));
	if (f.objective)
		out.push({
			rule: 'objective',
			rank: 5,
			branch: 'EQUIPE',
			subject: { type: 'OBJECTIVE', id: f.objective.id },
			title: f.objective.label,
			why: 'Un de tes objectifs, atteignable maintenant.',
			href: f.objective.href,
			cta: 'J’y vais',
			deadline: null,
			waitingSince: null,
			fact: f.objective.id
		});
	return out;
}

/** Toutes les candidates, avant tri et dédoublonnage (`rankSuggestions`). */
export function candidatesFrom(f: NextFacts): Candidate[] {
	return [...pending(f), ...work(f), ...needs(f), ...optional(f)];
}
