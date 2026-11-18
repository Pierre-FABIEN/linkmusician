/**
 * Fiche de carrière (P3-14) : la fiche publique ne lit que des faits
 * confirmés ; la version privée ajoute les données personnelles de progression.
 */
import { prisma } from '#lib/server';
import { getProgress } from '#lib/server/progression/read';
import { careerMap } from '#lib/career/map';
import type { CareerSheet, PrivateExtras } from '#lib/career/sheet';
import { bandsOfPerson } from '#lib/server/bands/public';
import { careerEvidenceForSheet } from './map';
import { creditsOf } from '#lib/career/realisations';

async function publicSheetData(actorId: string, viewerId?: string | null) {
	const [evidence, appreciations, collabEndorsers, collaborators, bands] = await Promise.all([
		careerEvidenceForSheet(actorId),
		prisma.jamEndorsement.findMany({
			where: { toActorId: actorId, revokedAt: null },
			select: {
				fromActorId: true,
				opportunityId: true,
				opportunity: { select: { venue: { select: { communeName: true } } } }
			}
		}),
		prisma.collabEndorsement.findMany({
			where: { toActorId: actorId, revokedAt: null },
			select: { fromActorId: true }
		}),
		prisma.collaborationParticipant.findMany({
			where: {
				actorId: { not: actorId },
				collaboration: { status: 'COMPLETED', participants: { some: { actorId } } }
			},
			select: { actorId: true }
		}),
		bandsOfPerson(actorId, new Date(), viewerId)
	]);
	const cities = [
		...new Set(
			appreciations
				.map((a) => a.opportunity.venue?.communeName)
				.filter((city): city is string => Boolean(city))
		)
	].sort((a, b) => a.localeCompare(b, 'fr'));
	const peopleMet = new Set([
		...appreciations.map((a) => a.fromActorId),
		...collabEndorsers.map((a) => a.fromActorId),
		...collaborators.map((c) => c.actorId)
	]);
	peopleMet.delete(actorId);
	const { facts, tier, realisations } = evidence;

	return {
		facts,
		sheet: {
			jamsAppreciated: new Set(appreciations.map((a) => a.opportunityId)).size,
			peopleMet: peopleMet.size,
			collaborations: facts.collaborations,
			worksTogether: facts.worksTogether,
			// Un rôle d'écriture compte sur un morceau corroboré ; un rôle du son
			// (P4-07), confirmé des deux côtés, dès sa confirmation (N1 : lu
			// dans les réalisations, plus de requête à part).
			credits: creditsOf(realisations),
			gigs: tier.summary.corroboratedGigs,
			cities,
			appreciatedBy: tier.summary.distinctEndorsers,
			bands: bands.length,
			actsPassed: careerMap(facts).passed
		} satisfies CareerSheet
	};
}

/** Uniquement des faits publics confirmés par d'autres ; aucun champ privé n'est lu. */
export async function publicCareerSheet(
	actorId: string,
	viewerId?: string | null
): Promise<CareerSheet> {
	return (await publicSheetData(actorId, viewerId)).sheet;
}

/** Version privée : ajoute les présences déclarées, XP et niveau au résumé public. */
export async function careerSheet(actorId: string): Promise<CareerSheet & PrivateExtras> {
	const [data, attended, progress] = await Promise.all([
		publicSheetData(actorId, actorId),
		prisma.jamAttendance.count({
			where: { actorId, attendedAt: { not: null }, removedAt: null }
		}),
		getProgress(actorId, prisma)
	]);
	return {
		...data.sheet,
		jamsAttended: attended,
		worksSolo: data.facts.worksSolo,
		xp: progress.xp,
		level: progress.level
	};
}
