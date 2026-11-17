/**
 * Démo DASH-06a (#51, D68) : Clara, guitariste-chanteuse sans métier d'ingé
 * son, a pris elle-même l'enregistrement de « Midnight Groove » chez elle et
 * l'a commencé. DASH-06d (#54) : elle a aussi composé « Night Drive », l'a
 * enregistré chez elle (terminé, déclaré), et a ajouté « Prise de son » à son
 * crédit (D69) ; la fiche propose ensuite le mixage (D70). Identifiants
 * stables et upserts : rejouable sans doublon, jamais de reprise d'une étape
 * réelle. Aucun événement de progression, aucune XP.
 */
import type { PrismaClient } from '@prisma/client';

const WORK = 'demo-work-midnight-groove';
const STEP = 'demo-work-step-midnight-recording';
const DONE_WORK = 'demo-work-night-drive';
const DONE_STEP = 'demo-work-step-night-drive-recording';
const DONE_CREDIT = 'demo-work-credit-night-drive-clara';

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
	await seedNightDrive(prisma, clara.id);
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

/** « Night Drive » : composé seule, enregistré chez elle, prise de son à son crédit. */
async function seedNightDrive(prisma: PrismaClient, claraId: string) {
	if (await prisma.work.findUnique({ where: { id: DONE_WORK }, select: { id: true } })) {
		console.log('« Night Drive » déjà en place : rien à refaire.');
		return;
	}
	const day = 86_400_000;
	const composedAt = new Date(Date.now() - 12 * day);
	const claimedAt = new Date(Date.now() - 9 * day);
	const startedAt = new Date(Date.now() - 8 * day);
	const doneAt = new Date(Date.now() - 5 * day);
	const creditedAt = new Date(doneAt.getTime() + 3_600_000);
	await prisma.work.create({
		data: {
			id: DONE_WORK,
			ownerId: claraId,
			createdById: claraId,
			title: 'Night Drive',
			state: 'COMPOSED',
			proof: 'DECLARED',
			composedAt,
			createdAt: new Date(composedAt.getTime() - 2 * day)
		}
	});
	await prisma.workContributor.create({
		data: { id: DONE_CREDIT, workId: DONE_WORK, personId: claraId, confirmedAt: composedAt }
	});
	await prisma.workRole.createMany({
		data: [
			{ workId: DONE_WORK, kind: 'COMPOSITION', contributorId: DONE_CREDIT },
			{ workId: DONE_WORK, kind: 'RECORDING', contributorId: DONE_CREDIT }
		]
	});
	await prisma.workCreditAct.create({
		data: {
			workId: DONE_WORK,
			periodId: DONE_CREDIT,
			personId: claraId,
			authorId: claraId,
			kind: 'CREATOR_CREDITED',
			occurredAt: composedAt
		}
	});
	await prisma.workRoleAct.create({
		data: {
			workId: DONE_WORK,
			periodId: DONE_CREDIT,
			personId: claraId,
			kind: 'ADDED',
			roleKind: 'RECORDING',
			occurredAt: creditedAt
		}
	});
	await prisma.workStep.create({
		data: {
			id: DONE_STEP,
			workId: DONE_WORK,
			kind: 'RECORDING',
			mode: 'SELF',
			place: 'HOME',
			assigneeId: claraId,
			status: 'DONE',
			startedAt,
			doneAt,
			revision: 3
		}
	});
	const acts = [
		['claimed', 'CLAIMED', null, 'TODO', claimedAt],
		['started', 'STARTED', 'TODO', 'IN_PROGRESS', startedAt],
		['finished', 'FINISHED', 'IN_PROGRESS', 'DONE', doneAt]
	] as const;
	await prisma.workStepAct.createMany({
		data: acts.map(([suffix, kind, fromStatus, toStatus, occurredAt]) => ({
			id: `${DONE_STEP}-${suffix}`,
			stepId: DONE_STEP,
			authorId: claraId,
			assigneeId: claraId,
			kind,
			fromStatus,
			toStatus,
			occurredAt
		})),
		skipDuplicates: true
	});
	console.log('« Night Drive » enregistré chez elle par Clara, prise de son créditée (DASH-06d).');
}
