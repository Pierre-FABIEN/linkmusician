/**
 * Démo DASH-06a (#51, D68) : Clara, guitariste-chanteuse sans métier d'ingé
 * son, a pris elle-même l'enregistrement de « Midnight Groove » chez elle et
 * l'a commencé. Identifiants stables et upserts : rejouable sans doublon,
 * jamais de reprise d'une étape réelle. Aucun événement de progression.
 */
import type { PrismaClient } from '@prisma/client';

const WORK = 'demo-work-midnight-groove';
const STEP = 'demo-work-step-midnight-recording';

export async function seedWorkSteps(
	prisma: PrismaClient,
	demoHandles: ReadonlyMap<string, string>
) {
	const handle = demoHandles.get('clara-guitare') ?? 'clara-guitare';
	const clara = await prisma.actor.findFirst({
		where: { handle, deletedAt: null },
		select: { id: true }
	});
	if (!clara) return;
	const startedAt = new Date(Date.now() - 3 * 86_400_000);
	const claimedAt = new Date(startedAt.getTime() - 86_400_000);
	await prisma.work.upsert({
		where: { id: WORK },
		update: {},
		create: { id: WORK, ownerId: clara.id, createdById: clara.id, title: 'Midnight Groove' }
	});
	const existing = await prisma.workStep.findUnique({ where: { id: STEP }, select: { id: true } });
	if (existing) {
		console.log('Étape « Midnight Groove » déjà en place : rien à refaire.');
		return;
	}
	await prisma.workStep.create({
		data: {
			id: STEP,
			workId: WORK,
			kind: 'RECORDING',
			mode: 'SELF',
			place: 'HOME',
			assigneeId: clara.id,
			status: 'IN_PROGRESS',
			startedAt,
			revision: 2
		}
	});
	await prisma.workStepAct.createMany({
		data: [
			{
				id: `${STEP}-claimed`,
				stepId: STEP,
				authorId: clara.id,
				assigneeId: clara.id,
				kind: 'CLAIMED',
				fromStatus: null,
				toStatus: 'TODO',
				occurredAt: claimedAt
			},
			{
				id: `${STEP}-started`,
				stepId: STEP,
				authorId: clara.id,
				assigneeId: clara.id,
				kind: 'STARTED',
				fromStatus: 'TODO',
				toStatus: 'IN_PROGRESS',
				occurredAt: startedAt
			}
		],
		skipDuplicates: true
	});
	console.log('Enregistrement de « Midnight Groove » pris en charge par Clara (DASH-06a).');
}
