// LINKMUSICIAN : confidentialité des activités et jams signalées (D81, #91),
// jouées par `npm run seed:demo` après la vie de jam.
//
// | Données                                                   | Où le voir                                     |
// | --------------------------------------------------------- | ---------------------------------------------- |
// | Malik partage ses jams passées avec ses contacts de jam    | `malik-batterie` : `/reglages/confidentialite` ; |
// |   (« Les personnes que j'autorise »)                       |   ses contacts le voient dans « Qui était là ? » |
// | Zoé partage ses jams passées avec tous les membres         | n'importe qui : « Qui était là ? » d'une jam de Zoé |
// | Malik masque ses jams à Paul (sans le prévenir)            | `malik-batterie` : réglages ; profil de Paul   |
// | Une jam à venir annulée par Hugo, Théo prévenu             | `theo-basse` : notifications, `/jams/…/annulee` |
// | Une jam signalée par Inès (« aucune jam »), à instruire    | `hugo-dj` : notification, réponse ;             |
// |                                                           |   un·e modérateur·rice : `/moderation/jams`     |
//
// Aucune XP, aucune valeur de progression écrite. Rejouable : rien n'est
// recréé si la jam annulée de démo existe.
import type { PrismaClient } from '@prisma/client';
import type { Commune } from '../src/lib/geo/fuzz';
import { DAY, demoContext, id, inDays } from './seed-scenarios';

const CANCELLED = 'Bœuf du dimanche (annulé)';
const REPORTED = 'Jam du quai';
const HOUR = 60 * 60 * 1000;

export async function seedPrivacy(
	prisma: PrismaClient,
	commune: Commune,
	demoHandles: ReadonlyMap<string, string> = new Map()
) {
	if (await prisma.opportunity.findFirst({ where: { title: CANCELLED }, select: { id: true } })) {
		return;
	}
	const ctx = await demoContext(prisma, commune, null, demoHandles);
	const P = (h: string) => id(ctx, h);
	const has = (h: string) => ctx.who.has(h);

	// ─── Partages, masquage ──────────────────────────────────────────────
	if (has('malik-batterie')) {
		const malik = P('malik-batterie');
		await prisma.activityVisibilityPreference.upsert({
			where: { actorId: malik },
			create: { actorId: malik, past: 'SELECTED', future: 'PRIVATE' },
			update: { past: 'SELECTED' }
		});
		const ties = await prisma.musicalTie.findMany({
			where: { ownerId: malik },
			take: 6,
			select: { contactId: true }
		});
		for (const t of ties) {
			await prisma.activityVisibilityGrant.upsert({
				where: { ownerId_viewerId: { ownerId: malik, viewerId: t.contactId } },
				create: { ownerId: malik, viewerId: t.contactId },
				update: {}
			});
		}
		if (has('paul-salle')) {
			await prisma.activityVisibilityExclusion.upsert({
				where: { ownerId_excludedId: { ownerId: malik, excludedId: P('paul-salle') } },
				create: { ownerId: malik, excludedId: P('paul-salle') },
				update: {}
			});
		}
	}
	if (has('zoe-violon')) {
		await prisma.activityVisibilityPreference.upsert({
			where: { actorId: P('zoe-violon') },
			create: { actorId: P('zoe-violon'), past: 'PUBLIC', future: 'PRIVATE' },
			update: { past: 'PUBLIC' }
		});
	}

	const venue = await prisma.venue.findFirst({
		where: { validatedAt: { not: null }, removedAt: null, claimedByActorId: null },
		orderBy: { createdAt: 'asc' },
		select: { id: true, backline: true }
	});
	if (!venue || !has('hugo-dj')) return;
	const hugo = P('hugo-dj');

	// ─── Jam annulée, participant·e prévenu·e ────────────────────────────
	const startsAt = inDays(5, 18);
	const cancelled = await prisma.opportunity.create({
		data: {
			issuerActorId: hugo,
			kind: 'JAM',
			title: CANCELLED,
			description: 'Bœuf électro-funk, tous niveaux.',
			startsAt,
			endsAt: new Date(startsAt.getTime() + 3 * HOUR),
			expiresAt: new Date(startsAt.getTime() + 3 * HOUR),
			venueId: venue.id,
			backline: venue.backline,
			status: 'CLOSED',
			closedAt: new Date(),
			cancelledAt: new Date(),
			cancelReason: 'Le lieu a une soirée privée ce jour-là.',
			cancelledById: hugo,
			...(has('theo-basse') ? { attendances: { create: [{ actorId: P('theo-basse') }] } } : {})
		},
		select: { id: true }
	});
	if (has('theo-basse')) {
		await prisma.notification.create({
			data: {
				recipientActorId: P('theo-basse'),
				type: 'JAM_CANCELLED',
				href: `/jams/${cancelled.id}`,
				title: CANCELLED
			}
		});
	}

	// ─── Jam signalée, à instruire ───────────────────────────────────────
	if (!has('ines-chant')) return;
	const ines = P('ines-chant');
	const reportedStart = new Date(Date.now() - 5 * HOUR);
	const reported = await prisma.opportunity.create({
		data: {
			issuerActorId: hugo,
			kind: 'JAM',
			title: REPORTED,
			description: 'Jam soul au bord de l’eau.',
			startsAt: reportedStart,
			endsAt: new Date(reportedStart.getTime() + 3 * HOUR),
			expiresAt: new Date(reportedStart.getTime() + 3 * HOUR),
			venueId: venue.id,
			backline: venue.backline,
			// Inès s'était inscrite la veille.
			attendances: {
				create: [{ actorId: ines, createdAt: new Date(reportedStart.getTime() - DAY) }]
			}
		},
		select: { id: true }
	});
	await prisma.jamIncident.create({
		data: {
			opportunityId: reported.id,
			reports: {
				create: [
					{
						reporterId: ines,
						reason: 'NO_JAM',
						wentThere: true,
						details: 'Personne au bar ne savait qu’une jam était prévue.'
					}
				]
			}
		}
	});
	await prisma.notification.create({
		data: {
			recipientActorId: hugo,
			type: 'JAM_REPORTED',
			href: `/jams/${reported.id}/signaler`,
			title: REPORTED
		}
	});
}
