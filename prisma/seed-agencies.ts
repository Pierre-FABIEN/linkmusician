import type { PrismaClient } from '@prisma/client';
/** Rejouable : ne modifie aucune agence ni aucun compte existant. */
export async function seedAgencies(prisma: PrismaClient, handles: ReadonlyMap<string, string>) {
	const handle = 'agence-demo-scene';
	if (await prisma.actor.findUnique({ where: { handle }, select: { id: true } })) return;
	const actors = await Promise.all(
		['marc-manager', 'elise-booker', 'nora-prod'].map((name) =>
			prisma.actor.findFirst({
				where: {
					handle: [...handles.entries()].find(([, canonical]) => canonical === name)?.[0] ?? name,
					kind: 'PERSON',
					person: { user: { email: { endsWith: '@demo.linkmusician.test' } } }
				},
				select: { id: true }
			})
		)
	);
	if (actors.some((a) => !a)) return;
	const [owner, admin, collaborator] = actors.map((a) => a!.id);
	await prisma.$transaction(async (tx) => {
		const agency = await tx.actor.create({
			data: {
				handle,
				displayName: 'Agence Scène Démo',
				kind: 'ORGANIZATION',
				hidden: true,
				organization: { create: { kind: 'AGENCY' } }
			}
		});
		await tx.membership.createMany({
			data: [
				{
					orgId: agency.id,
					personId: owner,
					role: 'OWNER',
					status: 'ACTIVE',
					startedAt: new Date()
				},
				{
					orgId: agency.id,
					personId: admin,
					role: 'ADMIN',
					status: 'ACTIVE',
					invitedById: owner,
					startedAt: new Date()
				},
				{
					orgId: agency.id,
					personId: collaborator,
					role: 'MEMBER',
					status: 'INVITED',
					invitedById: owner
				}
			]
		});
		await tx.notification.create({
			data: {
				recipientActorId: collaborator,
				type: 'ORG_INVITE',
				fromActorId: owner,
				href: `/agences/${agency.id}/participation`,
				title: agency.displayName
			}
		});
	});
}
