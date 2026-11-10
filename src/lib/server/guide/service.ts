/**
 * Conseils en contexte (P2-17) : faits lus en base pour choisir le conseil
 * (`#lib/guide/tips`), et « J'ai compris » mémorisé par personne.
 */
import { prisma } from '#lib/server';
import { isTipId, tipFor, TIPS, type TipContext, type TipScreen } from '#lib/guide/tips';

/** Faits qui choisissent le conseil. Quelques comptages, rien de plus. */
export async function tipContext(actorId: string): Promise<TipContext> {
	const [jams, collaborations, jamGiven, collabGiven, networkSize, media, opportunities] =
		await Promise.all([
			prisma.jamAttendance.findMany({
				where: { actorId, attendedAt: { not: null } },
				select: { opportunityId: true }
			}),
			prisma.collaborationParticipant.findMany({
				where: { collaboration: { status: 'COMPLETED', participants: { some: { actorId } } } },
				select: { actorId: true }
			}),
			prisma.jamEndorsement.count({ where: { fromActorId: actorId, revokedAt: null } }),
			prisma.collabEndorsement.count({ where: { fromActorId: actorId, revokedAt: null } }),
			prisma.musicalTie.count({ where: { ownerId: actorId } }),
			prisma.media.count({ where: { actorId, status: 'PUBLISHED' } }),
			prisma.opportunity.count({ where: { issuerActorId: actorId } })
		]);
	const coAttendees = jams.length
		? await prisma.jamAttendance.findMany({
				where: {
					opportunityId: { in: jams.map((j) => j.opportunityId) },
					actorId: { not: actorId },
					attendedAt: { not: null }
				},
				select: { actorId: true }
			})
		: [];
	const people = new Set(
		[...coAttendees, ...collaborations].map((p) => p.actorId).filter((id) => id !== actorId)
	);
	return {
		playedWith: people.size,
		appreciationsGiven: jamGiven + collabGiven,
		networkSize,
		media,
		opportunities
	};
}

const NO_FACTS: TipContext = {
	playedWith: 0,
	appreciationsGiven: 0,
	networkSize: 0,
	media: 0,
	opportunities: 0
};

/**
 * Le conseil de l'écran pour cette personne, ou `null`. Un écran dont aucun
 * conseil n'a de condition (messages, conversation : rechargés par polling)
 * ne lit rien en base.
 */
export async function currentTip(
	screen: TipScreen,
	person: { actorId: string; tipsDismissed: string[] }
) {
	const conditional = TIPS.some((t) => t.screen === screen && t.when);
	const ctx = conditional ? await tipContext(person.actorId) : NO_FACTS;
	return tipFor(screen, ctx, person.tipsDismissed);
}

/** « J'ai compris » : le conseil ne revient plus. Identifiant inconnu : refusé. */
export async function dismissTip(actorId: string, tipId: unknown): Promise<boolean> {
	if (!isTipId(tipId)) return false;
	const person = await prisma.person.findUnique({
		where: { actorId },
		select: { tipsDismissed: true }
	});
	if (!person) return false;
	if (!person.tipsDismissed.includes(tipId)) {
		await prisma.person.update({
			where: { actorId },
			data: { tipsDismissed: { push: tipId } }
		});
	}
	return true;
}
