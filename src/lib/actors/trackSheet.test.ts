import { describe, expect, it } from 'vitest';
import { canSee, fieldBlock, trackSheet, type TrackSheetInput } from './trackSheet';
import { trackFields } from './trackFields';

const promoter: TrackSheetInput = {
	track: 'PROMOTER',
	isPrimary: true,
	specializations: ['CONCERTS'],
	offers: ['CONCERT_DATES'],
	needs: ['FIND_ARTISTS'],
	answers: { structure: ['ASSOCIATION'], concert_pay: ['FEE'] },
	settings: {
		offersVisibility: 'PUBLIC',
		detailsVisibility: 'MEMBERS',
		conditionsVisibility: 'PRIVATE',
		openToRequests: true
	}
};

const blocks = (audience: Parameters<typeof trackSheet>[1], input = promoter) =>
	trackSheet(input, audience).blocks.map((b) => b.block);

describe('visibilité par bloc (D61)', () => {
	it('public : tout le monde ; membres : inscrit·es ; privé : la personne seule', () => {
		expect(canSee('PUBLIC', 'public')).toBe(true);
		expect(canSee('MEMBERS', 'public')).toBe(false);
		expect(canSee('MEMBERS', 'members')).toBe(true);
		expect(canSee('PRIVATE', 'members')).toBe(false);
		expect(canSee('PRIVATE', 'owner')).toBe(true);
	});

	it('chaque lecteur ne reçoit que ses blocs', () => {
		expect(blocks('public')).toEqual(['offers']);
		expect(blocks('members')).toEqual(['offers', 'details']);
		expect(blocks('owner')).toEqual(['offers', 'details', 'conditions']);
	});

	it('un bloc masqué ne laisse rien passer : ni ses libellés, ni « ouvert aux sollicitations »', () => {
		const hidden = {
			...promoter,
			settings: { ...promoter.settings, offersVisibility: 'PRIVATE' as const }
		};
		const sheet = trackSheet(hidden, 'members');
		expect(sheet.offersVisible).toBe(false);
		expect('openToRequests' in sheet).toBe(false);
		expect(JSON.stringify(sheet)).not.toContain('Des concerts');
		expect(JSON.stringify(trackSheet(promoter, 'members'))).not.toContain('Cachet');
	});

	it('les champs « conditions » vont dans leur bloc, les autres dans les précisions', () => {
		const owner = trackSheet(promoter, 'owner');
		const conditions = owner.blocks.find((b) => b.block === 'conditions');
		expect(conditions?.lines).toEqual([
			{ label: 'Concerts : rémunération envisagée', values: ['Cachet'] }
		]);
		const details = owner.blocks.find((b) => b.block === 'details');
		expect(details?.lines.map((l) => l.label)).toContain('Ta situation');
		expect(details?.lines.map((l) => l.label)).not.toContain('Concerts : rémunération envisagée');
	});

	it('Q65 : les cinq champs « conditions » du catalogue', () => {
		const tagged = (
			['PROMOTER', 'PRODUCER', 'SOUND_ENGINEER', 'MANAGER', 'BOOKER'] as const
		).flatMap((t) =>
			trackFields(t)
				.filter((f) => fieldBlock(f) === 'conditions')
				.map((f) => `${t}.${f.id}`)
		);
		expect(tagged).toEqual([
			'PROMOTER.concert_pay',
			'PRODUCER.beat_terms',
			'SOUND_ENGINEER.mixing_revisions',
			'MANAGER.artist_capacity',
			'BOOKER.hosting'
		]);
	});

	it('un bloc vide n’est pas montré ; une réponse inconnue n’est pas inventée', () => {
		const empty = { ...promoter, specializations: [], offers: [], needs: [], answers: {} };
		expect(trackSheet(empty, 'owner').blocks).toEqual([]);
		const unknown = { ...promoter, answers: { structure: ['RETIRED_CODE'] } };
		expect(JSON.stringify(trackSheet(unknown, 'owner'))).not.toContain('RETIRED_CODE');
	});

	it('musicien·ne : expérience et engagement suivent le bloc des intentions', () => {
		const musician: TrackSheetInput = {
			track: 'MUSICIAN',
			isPrimary: true,
			specializations: [],
			offers: ['PLAY_JAMS'],
			needs: [],
			answers: {},
			settings: { ...promoter.settings, offersVisibility: 'MEMBERS' },
			musician: { practiceExperience: null, commitment: 'REGULAR' }
		};
		expect(trackSheet(musician, 'public').blocks).toEqual([]);
		const lines = trackSheet(musician, 'members').blocks[0].lines.map((l) => l.label);
		expect(lines).toEqual(['Engagement', 'Je propose']);
	});
});
