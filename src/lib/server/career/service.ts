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
import { publicActorWhere } from '#lib/server/actors/visibility';

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
	kind: 'JAM' | 'COLLAB';
	title: string;
	at: Date;
	/** Ce que la personne y fait. */
	role: string;
	where: string | null;
	href: string;
};

/**
 * L'agenda : les jams à venir où l'on vient, qu'on organise ou où l'on est
 * invité·e (accepté), et les collaborations prévues (acceptées, date à venir).
 */
export async function agenda(personId: string, now = new Date()): Promise<AgendaItem[]> {
	const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
	const [jams, collabs] = await Promise.all([
		prisma.opportunity.findMany({
			where: {
				kind: 'JAM',
				status: { in: ['OPEN', 'FILLED'] },
				startsAt: { gte: now },
				OR: [
					{ issuerActorId: personId },
					{ leadActorId: personId },
					{ attendances: { some: { actorId: personId, removedAt: null } } },
					{ jamInvites: { some: { actorId: personId, status: 'ACCEPTED' } } }
				]
			},
			orderBy: { startsAt: 'asc' },
			take: 30,
			select: {
				id: true,
				title: true,
				startsAt: true,
				issuerActorId: true,
				leadActorId: true,
				venue: { select: { name: true } }
			}
		}),
		prisma.collaboration.findMany({
			where: {
				status: 'ACCEPTED',
				happenedOn: { gte: today },
				participants: { some: { actorId: personId } }
			},
			orderBy: { happenedOn: 'asc' },
			take: 30,
			select: {
				id: true,
				title: true,
				happenedOn: true,
				conversationId: true
			}
		})
	]);
	const items: AgendaItem[] = [
		...jams.map((j) => ({
			kind: 'JAM' as const,
			title: j.title,
			at: j.startsAt!,
			role:
				j.issuerActorId === personId
					? 'Tu organises'
					: j.leadActorId === personId
						? 'Tu mènes la formation'
						: 'Tu viens',
			where: j.venue?.name ?? null,
			href: `/jams/${j.id}`
		})),
		...collabs.map((c) => ({
			kind: 'COLLAB' as const,
			title: c.title,
			at: c.happenedOn,
			role: 'Collaboration prévue',
			where: null,
			href: c.conversationId ? `/messages/${c.conversationId}` : '/messages'
		}))
	];
	return items.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** Écrans déjà construits : un objectif qui mène ailleurs est affiché « bientôt ». */
const AVAILABLE = [
	'/profil',
	'/profil/musical',
	'/profil/ville',
	'/profil/medias',
	// Ingé son (P4-02b). Les sessions mènent encore nulle part : elles se
	// confirmeront avec les collaborations liées au morceau (P4-06).
	'/profil/son',
	'/annonces',
	'/groupes',
	'/morceaux'
];

/** Objectifs pour l'affichage : lien seulement vers un écran qui existe. */
export function linkable<T extends { href: string }>(objectives: T[]) {
	return objectives.map((o) => ({ ...o, href: AVAILABLE.includes(o.href) ? o.href : null }));
}
