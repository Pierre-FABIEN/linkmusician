import { describe, expect, it } from 'vitest';
import {
	displayTime,
	isStudioSessionKind,
	studioQuests,
	formatTime,
	parseTime,
	publicationGaps,
	studioProfileSchema,
	studioSchema
} from './rules';

const base = {
	name: 'Studio du Canal',
	bio: '',
	communeCode: '31555',
	services: ['RECORDING'],
	rooms: [{ name: 'Salle A', description: '', hourlyRate: '35' }],
	gear: 'Console',
	pricingNotes: '',
	byAppointment: false,
	hours: [{ weekday: 1, opensAt: '10:00', closesAt: '19:00' }]
};

describe('studio : création', () => {
	it('resserre le nom et refuse un nom trop court', () => {
		expect(studioSchema.parse({ name: '  Studio   du  Canal ' }).name).toBe('Studio du Canal');
		expect(studioSchema.safeParse({ name: 'A' }).success).toBe(false);
	});
});

describe('studio : heures', () => {
	it('lit et écrit une heure', () => {
		expect(parseTime('09:30')).toBe(570);
		expect(parseTime('24:00')).toBe(1440);
		expect(parseTime('24:30')).toBeNull();
		expect(parseTime('9h30')).toBeNull();
		expect(formatTime(570)).toBe('09:30');
		expect(displayTime(570)).toBe('9 h 30');
		expect(displayTime(600)).toBe('10 h');
	});
});

describe('studio : fiche', () => {
	it('normalise la fiche et ignore les salles vides', () => {
		const parsed = studioProfileSchema.parse({
			...base,
			services: ['MIXING', 'RECORDING', 'MIXING'],
			rooms: [
				{ name: '  Salle   A ', description: ' 25 m² ', hourlyRate: ' 35 ' },
				{ name: '', description: '', hourlyRate: '' }
			],
			gear: 'Console\n\n  Micros   U87  \n',
			hours: [
				{ weekday: 3, opensAt: '14:00', closesAt: '22:00' },
				{ weekday: 1, opensAt: '10:00', closesAt: '19:00' }
			]
		});
		expect(parsed.services).toEqual(['RECORDING', 'MIXING']);
		expect(parsed.rooms).toEqual([{ name: 'Salle A', description: '25 m²', hourlyRate: 35 }]);
		expect(parsed.gear).toBe('Console\nMicros U87');
		expect(parsed.hours.map((h) => h.weekday)).toEqual([1, 3]);
		expect(parsed.hours[0]).toEqual({ weekday: 1, opensAt: 600, closesAt: 1140 });
		expect(parsed.bio).toBeNull();
	});

	it('refuse une salle sans nom, un tarif farfelu, des horaires à l’envers', () => {
		const issues = (input: object) => {
			const r = studioProfileSchema.safeParse({ ...base, ...input });
			return r.success ? [] : r.error.issues.map((i) => i.path.join('.'));
		};
		expect(issues({ rooms: [{ name: '', description: '', hourlyRate: '20' }] })).toContain(
			'rooms.0.name'
		);
		expect(issues({ rooms: [{ name: 'A', description: '', hourlyRate: '12,5' }] })).toContain(
			'rooms.0.hourlyRate'
		);
		expect(issues({ rooms: [{ name: 'A', description: '', hourlyRate: '5000' }] })).toContain(
			'rooms.0.hourlyRate'
		);
		expect(issues({ hours: [{ weekday: 2, opensAt: '20:00', closesAt: '10:00' }] })).toContain(
			'hours.0'
		);
		expect(
			issues({
				hours: [
					{ weekday: 2, opensAt: '10:00', closesAt: '12:00' },
					{ weekday: 2, opensAt: '14:00', closesAt: '18:00' }
				]
			})
		).toContain('hours.1');
	});
});

describe('studio : publication', () => {
	const complete = {
		hasCommune: true,
		services: ['RECORDING'],
		rooms: [{ hourlyRate: 35 }],
		pricingNotes: '',
		gear: 'Console',
		byAppointment: false,
		hours: [{}]
	};

	it('une fiche complète peut être publiée', () => {
		expect(publicationGaps(complete)).toEqual([]);
	});

	it('dit ce qui manque, dans l’ordre du formulaire', () => {
		expect(
			publicationGaps({
				hasCommune: false,
				services: [],
				rooms: [],
				pricingNotes: '',
				gear: ' ',
				byAppointment: false,
				hours: []
			})
		).toEqual(['commune', 'services', 'rooms', 'pricing', 'gear', 'hours']);
	});

	it('un tarif : à l’heure pour une salle, ou des conditions', () => {
		const noRate = { ...complete, rooms: [{ hourlyRate: null }] };
		expect(publicationGaps(noRate)).toEqual(['pricing']);
		expect(publicationGaps({ ...noRate, pricingNotes: 'Forfait journée 250 €' })).toEqual([]);
	});

	it('sur rendez-vous remplace les horaires', () => {
		expect(publicationGaps({ ...complete, hours: [], byAppointment: true })).toEqual([]);
	});
});

describe('studio : sessions et quêtes (P4-03c)', () => {
	it('seules certaines collaborations se tiennent au studio', () => {
		expect(isStudioSessionKind('REHEARSAL')).toBe(true);
		expect(isStudioSessionKind('MIXING')).toBe(true);
		expect(isStudioSessionKind('GIG')).toBe(false);
		expect(isStudioSessionKind('JAM')).toBe(false);
	});

	it('les quêtes suivent la fiche et les sessions', () => {
		const none = { sessions: 0, distinctClients: 0, rehearsals: 0, creditedRecordings: 0 };
		const done = (input: Parameters<typeof studioQuests>[0]) =>
			studioQuests(input)
				.filter((q) => q.done)
				.map((q) => q.id);
		expect(done({ published: false, hasHours: false, stats: none })).toEqual([]);
		expect(
			done({
				published: true,
				hasHours: true,
				stats: { sessions: 2, distinctClients: 1, rehearsals: 0, creditedRecordings: 1 }
			})
		).toEqual(['fiche', 'hours', 'firstSession', 'firstRecording']);
	});
});
