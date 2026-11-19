/**
 * Démo P4a (#71, D72) : « EP des Rats », projet des Rats du Mardi géré par
 * Malik (OWNER). Nora, productrice extérieure au groupe, le coordonne ;
 * Inès (membre du groupe) y participe ; Samir est invité comme ingé son et
 * n'a pas encore répondu. Un morceau composé est partagé en résumé, une idée
 * reste privée (« Rien »). Identifiants stables et upserts : rejouable sans
 * doublon. Aucun événement de progression, aucune XP (I3).
 */
import type { PrismaClient } from '@prisma/client';

const PROJECT = 'demo-project-ep-rats';
const SHARED = 'demo-work-ep-rats-groove';
const PRIVATE = 'demo-work-ep-rats-idee';

export async function seedProjects(prisma: PrismaClient, demoHandles: ReadonlyMap<string, string>) {
	const id = async (handle: string) =>
		(
			await prisma.actor.findFirst({
				where: { handle: demoHandles.get(handle) ?? handle, deletedAt: null },
				select: { id: true }
			})
		)?.id ?? null;
	const [rats, malik, nora, ines, samir] = await Promise.all([
		id('les-rats-du-mardi'),
		id('malik-batterie'),
		id('nora-prod'),
		id('ines-chant'),
		id('samir-son')
	]);
	if (!rats || !malik || !nora || !ines || !samir) return;
	if (await prisma.project.findUnique({ where: { id: PROJECT }, select: { id: true } })) {
		console.log('Projet « EP des Rats » déjà en place : rien à refaire.');
		return;
	}
	const day = (n: number) => new Date(Date.now() - n * 86_400_000);
	for (const [workId, title, state] of [
		[SHARED, 'Groove du mardi', 'COMPOSED'],
		[PRIVATE, 'Ballade sans titre', 'IDEA']
	] as const) {
		await prisma.work.upsert({
			where: { id: workId },
			update: {},
			create: { id: workId, ownerId: rats, createdById: malik, title, state }
		});
	}
	await prisma.project.create({
		data: {
			id: PROJECT,
			ownerId: rats,
			name: 'EP des Rats',
			kind: 'EP',
			description: 'Quatre titres enregistrés avant l’été.',
			createdAt: day(12),
			items: {
				create: [
					{ workId: SHARED, share: 'SUMMARY', addedById: malik, createdAt: day(11) },
					{ workId: PRIVATE, share: 'NONE', addedById: malik, createdAt: day(11) }
				]
			},
			participants: {
				create: [
					{
						personId: nora,
						status: 'ACTIVE',
						role: 'Réalisation',
						capabilities: ['COORDINATE'],
						invitedById: malik,
						invitedAt: day(10),
						answeredAt: day(9)
					},
					{
						personId: ines,
						status: 'ACTIVE',
						invitedById: malik,
						invitedAt: day(10),
						answeredAt: day(10)
					},
					{
						personId: samir,
						status: 'INVITED',
						role: 'Ingé son',
						invitedById: nora,
						invitedAt: day(1)
					}
				]
			}
		}
	});
	await prisma.projectAct.createMany({
		data: [
			{ projectId: PROJECT, authorId: malik, kind: 'CREATED', occurredAt: day(12) },
			{
				projectId: PROJECT,
				authorId: malik,
				kind: 'ITEM_ADDED',
				workId: SHARED,
				toShare: 'SUMMARY',
				occurredAt: day(11)
			},
			{
				projectId: PROJECT,
				authorId: malik,
				kind: 'ITEM_ADDED',
				workId: PRIVATE,
				toShare: 'NONE',
				occurredAt: day(11)
			},
			{
				projectId: PROJECT,
				authorId: malik,
				kind: 'INVITED',
				subjectId: nora,
				capability: 'COORDINATE',
				occurredAt: day(10)
			},
			{
				projectId: PROJECT,
				authorId: malik,
				kind: 'INVITED',
				subjectId: ines,
				occurredAt: day(10)
			},
			{ projectId: PROJECT, authorId: ines, kind: 'JOINED', subjectId: ines, occurredAt: day(10) },
			{ projectId: PROJECT, authorId: nora, kind: 'JOINED', subjectId: nora, occurredAt: day(9) },
			{
				projectId: PROJECT,
				authorId: nora,
				kind: 'CAPABILITY_GRANTED',
				subjectId: nora,
				capability: 'COORDINATE',
				occurredAt: day(9)
			},
			{ projectId: PROJECT, authorId: nora, kind: 'INVITED', subjectId: samir, occurredAt: day(1) }
		]
	});
	console.log('Projet « EP des Rats » : coordination de Nora, Inès participante, Samir invité.');
}
