/**
 * Construction des réalisations depuis les lignes et les événements (N1),
 * sans base : règles des actes II et IV, crédits, étapes, collaborations.
 */
import { describe, expect, it, vi } from 'vitest';
import type { DomainEvent } from '#lib/server/progression/core/events';

vi.mock('#lib/server', () => ({ prisma: {} }));

const { workRealisations, creditedMilestones, milestoneRealisations, collaborationRealisations } =
	await import('./realisations');

type WorkRow = Parameters<typeof workRealisations>[0];
const AT = new Date('2026-05-01T12:00:00Z');

function row(over: Partial<WorkRow> = {}): WorkRow {
	return {
		id: 'w1',
		ownerId: 'band',
		state: 'COMPOSED',
		proof: 'CORROBORATED',
		composedAt: AT,
		producedAt: null,
		contributor: { confirmedAt: AT, roles: [] },
		bandMember: false,
		...over
	};
}

const attested = (
	bandId: string,
	milestone: 'FIRST_RECORDING' | 'FIRST_GIG' | 'FIRST_TOUR' | 'FIRST_EP',
	to: 'DECLARED' | 'CORROBORATED' | 'VERIFIED',
	memberIds: string[],
	at = AT
) =>
	({
		id: `e-${bandId}-${milestone}-${to}`,
		occurredAt: at,
		type: 'milestone.attested',
		bandId,
		milestone,
		from: null,
		to,
		memberIds
	}) as unknown as DomainEvent;

describe('réalisations d’un morceau', () => {
	it('composé, crédité·e sans rôle : une réalisation de création, aucun crédit', () => {
		expect(workRealisations(row()).map((r) => r.key)).toEqual(['work:w1:composed']);
	});

	it('une idée ne crédite rien en écriture, mais un rôle du son compte', () => {
		const out = workRealisations(
			row({
				state: 'IDEA',
				proof: null,
				composedAt: null,
				contributor: {
					confirmedAt: AT,
					roles: [
						{ id: 'r1', kind: 'COMPOSITION' },
						{ id: 'r2', kind: 'MIXING' }
					]
				}
			})
		);
		expect(out.map((r) => [r.key, r.proof, r.visibility])).toEqual([
			['credit:r2', 'CORROBORATED', 'PRIVATE']
		]);
	});

	it('produit : crédité·e qui joue et membre du groupe, rôles réunis', () => {
		const out = workRealisations(
			row({
				producedAt: AT,
				bandMember: true,
				contributor: { confirmedAt: AT, roles: [{ id: 'r1', kind: 'INSTRUMENT' }] }
			})
		);
		expect(out.find((r) => r.kind === 'PRODUCTION_STAGE')?.roles).toEqual([
			'CREDITED',
			'BAND_MEMBER'
		]);
		expect(out.map((r) => r.kind)).toEqual(['WORK_COMPOSED', 'PRODUCTION_STAGE', 'CREDIT']);
	});

	it('produit, crédité·e du son seulement : pas l’acte IV', () => {
		const out = workRealisations(
			row({
				producedAt: AT,
				contributor: { confirmedAt: AT, roles: [{ id: 'r1', kind: 'MIXING' }] }
			})
		);
		expect(out.some((r) => r.kind === 'PRODUCTION_STAGE')).toBe(false);
	});

	it('produit par son groupe, sans crédit : membre seulement', () => {
		const out = workRealisations(row({ producedAt: AT, contributor: null, bandMember: true }));
		expect(out.map((r) => [r.kind, r.roles])).toEqual([['PRODUCTION_STAGE', ['BAND_MEMBER']]]);
	});

	it('composé seul·e (déclaré) : crédit déclaré, qui ne compte pas sur la fiche', () => {
		const out = workRealisations(
			row({
				proof: 'DECLARED',
				contributor: { confirmedAt: AT, roles: [{ id: 'r1', kind: 'LYRICS' }] }
			})
		);
		expect(out.map((r) => r.proof)).toEqual(['DECLARED', 'DECLARED']);
	});
});

describe('étapes de groupe', () => {
	it('crédit à la date, jamais par une attestation déclarée ni hors scène', () => {
		const credited = creditedMilestones('lea', [
			attested('b1', 'FIRST_GIG', 'VERIFIED', ['lea']),
			attested('b2', 'FIRST_GIG', 'DECLARED', ['lea']),
			attested('b3', 'FIRST_GIG', 'VERIFIED', ['malik']),
			attested('b1', 'FIRST_EP', 'VERIFIED', ['lea'])
		]);
		expect([...credited.keys()]).toEqual(['b1|FIRST_GIG']);
	});

	it('ligne présente, gelée ou absente : active, gelée, retirée', () => {
		const credited = creditedMilestones('lea', [
			attested('b1', 'FIRST_GIG', 'VERIFIED', ['lea']),
			attested('b2', 'FIRST_RECORDING', 'CORROBORATED', ['lea']),
			attested('b3', 'FIRST_TOUR', 'VERIFIED', ['lea'])
		]);
		const out = milestoneRealisations(credited, [
			{
				id: 'm1',
				bandId: 'b1',
				definitionId: 'FIRST_GIG',
				proof: 'VERIFIED',
				occurredAt: AT,
				frozenAt: null
			},
			{
				id: 'm2',
				bandId: 'b2',
				definitionId: 'FIRST_RECORDING',
				proof: 'CORROBORATED',
				occurredAt: AT,
				frozenAt: AT
			}
		]);
		expect(out.map((r) => [r.key, r.status])).toEqual([
			['milestone:b1:FIRST_GIG', 'ACTIVE'],
			['milestone:b2:FIRST_RECORDING', 'FROZEN'],
			['milestone:b3:FIRST_TOUR', 'RETIRED']
		]);
		expect(out.every((r) => r.firstTime && r.roles.join() === 'BAND_MEMBER')).toBe(true);
	});
});

describe('collaborations', () => {
	const completed = (over: Record<string, unknown>) =>
		({
			id: 'e1',
			occurredAt: AT,
			type: 'collaboration.completed',
			collaborationId: 'c1',
			participantIds: ['lea', 'ines', 'salle'],
			...over
		}) as unknown as DomainEvent;

	it('rôle de chaque partie, privée, une par collaboration', () => {
		const event = completed({ services: { ines: 'MIXING' }, hostIds: ['salle'] });
		expect(collaborationRealisations('lea', [event])[0].roles).toEqual(['PARTICIPANT']);
		expect(collaborationRealisations('ines', [event])[0].roles).toEqual(['PROVIDER']);
		expect(collaborationRealisations('salle', [event])[0]).toMatchObject({
			roles: ['HOST'],
			visibility: 'PRIVATE',
			key: 'collab:c1'
		});
		expect(collaborationRealisations('zoe', [event])).toEqual([]);
	});
});
