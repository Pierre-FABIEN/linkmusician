/**
 * Écran de carrière (P3-12, conception 07 §4.2) : l'ambition, et les données
 * des écrans ouverts depuis le menu `/espace` (D50) : campagnes en cours,
 * équipe, agenda. L'ambition ne fait que réordonner les objectifs mis en
 * avant (`#lib/career/ambition`) : elle ne retire rien et ne rapporte rien.
 */
import { prisma } from '#lib/server';
import { isAmbition, type AmbitionValue } from '#lib/career/ambition';
import { myWorks } from '#lib/server/works/service';
import { myBands } from '#lib/server/bands/service';
import { notBlockedWith, publicActorWhere } from '#lib/server/actors/visibility';

export class CareerError extends Error {}

/** Choisir ou changer d'ambition (`null` : ne plus en avoir). */
export async function setAmbition(personId: string, raw: string) {
	const ambition: AmbitionValue | null = raw === '' ? null : isAmbition(raw) ? raw : null;
	if (raw !== '' && ambition === null) throw new CareerError('Choisis une ambition de la liste.');
	await prisma.person.update({ where: { actorId: personId }, data: { ambition } });
	return ambition;
}

/** Campagnes en cours : chaque morceau, son état et ses places libres. */
export async function campaigns(personId: string) {
	const { works, toConfirm } = await myWorks(personId);
	return {
		/** Idées d'abord (en cours), puis les morceaux composés. */
		works: [...works].sort((a, b) => (a.state === b.state ? 0 : a.state === 'IDEA' ? -1 : 1)),
		toConfirm
	};
}

/**
 * L'équipe : ses groupes (avec leur rang) et ses partenaires réguliers, les
 * personnes avec qui l'on a le plus de collaborations confirmées.
 */
export async function team(personId: string, now = new Date()) {
	const [bands, collabs] = await Promise.all([
		myBands(personId),
		prisma.collaborationParticipant.findMany({
			where: {
				actorId: { not: personId },
				actor: publicActorWhere(now, personId),
				collaboration: { status: 'COMPLETED', participants: { some: { actorId: personId } } }
			},
			select: {
				actor: { select: { id: true, handle: true, displayName: true } },
				collaboration: { select: { happenedOn: true } }
			}
		})
	]);
	const partners = new Map<
		string,
		{ handle: string; displayName: string; count: number; last: Date }
	>();
	for (const c of collabs) {
		const p = partners.get(c.actor.id) ?? {
			handle: c.actor.handle,
			displayName: c.actor.displayName,
			count: 0,
			last: c.collaboration.happenedOn
		};
		p.count += 1;
		if (c.collaboration.happenedOn > p.last) p.last = c.collaboration.happenedOn;
		partners.set(c.actor.id, p);
	}
	return {
		bands: bands.active,
		partners: [...partners.values()]
			.sort((a, b) => b.count - a.count || b.last.getTime() - a.last.getTime())
			.slice(0, 12)
	};
}

export type AgendaItem = {
	kind: 'COLLAB';
	title: string;
	at: Date;
	/** Ce que la personne y fait. */
	role: string;
	where: string | null;
	href: string;
};

/**
 * L'agenda Collab (U0, #76) : les collaborations prévues (acceptées, date à
 * venir). Les jams vivent dans Rencontre (`/jam/agenda`), jamais ici
 * (conception 20 P9). Aucune collaboration avec une personne qui m'a
 * bloqué·e ou que j'ai bloquée.
 */
export async function agenda(personId: string, now = new Date()): Promise<AgendaItem[]> {
	const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
	const collabs = await prisma.collaboration.findMany({
		where: {
			status: 'ACCEPTED',
			happenedOn: { gte: today },
			participants: {
				some: { actorId: personId },
				none: { actorId: { not: personId }, actor: { NOT: notBlockedWith(personId) } }
			}
		},
		orderBy: [{ happenedOn: 'asc' }, { id: 'asc' }],
		take: 30,
		select: { id: true, title: true, happenedOn: true, conversationId: true }
	});
	return collabs.map((c) => ({
		kind: 'COLLAB' as const,
		title: c.title,
		at: c.happenedOn,
		role: 'Collaboration prévue',
		where: null,
		href: c.conversationId ? `/messages/${c.conversationId}` : '/messages'
	}));
}

/** Écrans déjà construits : un objectif qui mène ailleurs est affiché « bientôt ». */
const AVAILABLE = [
	'/profil',
	'/profil/musical',
	'/profil/ville',
	'/profil/medias',
	// Métiers du son (P4-02b, P4-04) ; les prestations se proposent dans une
	// conversation avec l'artiste (P4-06).
	'/profil/son',
	'/messages',
	'/profil/production',
	'/annonces',
	'/groupes',
	'/morceaux',
	// Organisateur·rice (P5-05a).
	'/profil/organisateur',
	'/plateaux/nouveau',
	'/jams/nouvelle'
];

/** Objectifs pour l'affichage : lien seulement vers un écran qui existe. */
export function linkable<T extends { href: string }>(objectives: T[]) {
	return objectives.map((o) => ({ ...o, href: AVAILABLE.includes(o.href) ? o.href : null }));
}
