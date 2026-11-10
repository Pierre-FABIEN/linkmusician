/**
 * Démarches en contexte (P3-15a, conception 09 §3) : les faits lus en base
 * pour choisir la démarche d'un écran (`#lib/demarches/triggers`), et
 * « J'ai compris » mémorisé par personne dans `persons.tipsDismissed`
 * (préfixe `demarche:`, comme les conseils de P2-17).
 */
import { prisma } from '#lib/server';
import { adultBirthCutoff } from '#lib/actors/visibility';
import {
	demarcheFor,
	dismissKey,
	isTriggerId,
	type DemarcheContext
} from '#lib/demarches/triggers';
import type { MilestoneKey } from '#lib/milestones/rules';

async function dismissedOf(actorId: string): Promise<string[]> {
	const person = await prisma.person.findUnique({
		where: { actorId },
		select: { tipsDismissed: true }
	});
	return person?.tipsDismissed ?? [];
}

/** La démarche à annoncer, ou `null`. */
export async function demarcheNudge(actorId: string, ctx: DemarcheContext) {
	return demarcheFor(ctx, await dismissedOf(actorId));
}

/**
 * Faits d'un groupe : formé, étapes franchies (non gelées) et présence
 * d'un·e mineur·e parmi les membres actifs, sans dire qui (D5).
 */
export async function bandDemarcheContext(
	band: { id: string; formedAt: Date | null },
	milestones: readonly { key: MilestoneKey; frozen: boolean }[],
	now = new Date()
): Promise<DemarcheContext> {
	const minors = await prisma.membership.count({
		where: {
			orgId: band.id,
			status: 'ACTIVE',
			person: { deletedAt: null, person: { birthDate: { gt: adultBirthCutoff(now) } } }
		}
	});
	return {
		screen: 'groupe',
		formed: band.formedAt !== null,
		milestones: milestones.filter((m) => !m.frozen).map((m) => m.key),
		hasMinor: minors > 0
	};
}

/** « J'ai compris » : la démarche ne revient plus sur cet écran. Identifiant inconnu : refusé. */
export async function dismissDemarche(actorId: string, triggerId: unknown): Promise<boolean> {
	if (!isTriggerId(triggerId)) return false;
	const key = dismissKey(triggerId);
	const dismissed = await prisma.person.findUnique({
		where: { actorId },
		select: { tipsDismissed: true }
	});
	if (!dismissed) return false;
	if (!dismissed.tipsDismissed.includes(key)) {
		await prisma.person.update({
			where: { actorId },
			data: { tipsDismissed: { push: key } }
		});
	}
	return true;
}
