// LINKMUSICIAN: données fictives des maquettes (P1-02).
export const lea = {
	displayName: 'Léa Martin',
	handle: 'lea-groove',
	initials: 'LM',
	commune: 'Toulouse',
	pro: 'Semi-pro (déclaré)',
	since: 2011,
	bio: 'Bassiste funk et soul depuis 15 ans. Je cherche un groupe qui répète le soir, et des jams le dimanche. Influences : Pino Palladino, Vulfpeck, Erykah Badu.',
	tier: { id: 'COLLABORATOR', label: 'Collaboratrice' },
	level: 6,
	xp: 1565,
	xpIntoLevel: 65,
	xpForNextLevel: 600,
	instruments: [
		{ name: 'Basse électrique', level: 4 as const, primary: true, demos: 2, endorsements: 4 },
		{ name: 'Contrebasse', level: 2 as const, primary: false, demos: 0, endorsements: 0 },
		{ name: 'Chœurs', level: 3 as const, primary: false, demos: 1, endorsements: 1 }
	],
	genres: ['Funk', 'Néo-soul', 'Jazz fusion', 'Afrobeat'],
	lookingFor: ['Rejoindre ou monter un groupe', 'Jams', 'Remplacements'],
	links: ['Bandcamp', 'Instagram']
};

export const quests = [
	{ label: 'Joue 3 concerts corroborés', href: '#', progress: { current: 1, target: 3 } },
	{ label: 'Réponds à une annonce et échange avec quelqu’un', href: '#', xp: 30 },
	{
		label: 'Collabore avec 2 personnes différentes (3 collaborations)',
		href: '#',
		progress: { current: 2, target: 3 }
	}
];

export const achievements = [
	{
		name: 'Carte de visite',
		description: 'Profil complété.',
		unlockedAt: '2026-09-02',
		rarity: 62
	},
	{
		name: 'Premier son',
		description: 'Première démo publiée.',
		unlockedAt: '2026-09-05',
		rarity: 41
	},
	{
		name: 'Premier contact abouti',
		description: 'Un premier échange né d’une annonce.',
		unlockedAt: '2026-09-11',
		rarity: 33
	},
	{
		name: 'Première collaboration',
		description: 'Confirmée des deux côtés.',
		unlockedAt: '2026-10-03',
		rarity: 12
	},
	{
		name: 'Fondateur·rice',
		description: 'Membre d’un groupe à sa formation.',
		unlockedAt: null,
		rarity: null
	}
];

export const gains = [
	{ reason: 'Collaboration confirmée', xp: 400, date: '3 oct.' },
	{ reason: 'Collaboration confirmée ×0,5', xp: 200, date: '21 sept.' },
	{ reason: 'Entrée dans un groupe', xp: 200, date: '14 sept.' },
	{ reason: 'Première démo publiée', xp: 100, date: '5 sept.' },
	{ reason: 'Profil complété', xp: 150, date: '2 sept.' }
];

export const nearby = [
	{
		name: 'Malik B.',
		initials: 'MB',
		role: 'Batterie · Confirmé (déclaré)',
		genres: ['Funk', 'Hip-hop'],
		meters: 3_200,
		commune: 'Toulouse',
		tier: { id: 'NETWORKED', label: 'En réseau' }
	},
	{
		name: 'Les Volts',
		initials: 'LV',
		role: 'Groupe · cherche bassiste',
		genres: ['Rock indé', 'Post-punk'],
		meters: 7_800,
		commune: 'Blagnac',
		tier: { id: 'STAGE', label: 'Live' }
	},
	{
		name: 'Inès R.',
		initials: 'IR',
		role: 'Chant · Avancé (déclaré)',
		genres: ['Soul', 'R&B'],
		meters: 12_000,
		commune: 'Colomiers',
		tier: { id: 'FIRST_STEPS', label: 'Premiers pas' }
	},
	{
		name: 'Jam du dimanche',
		initials: 'JD',
		role: 'Annonce · jam ouverte',
		genres: ['Funk', 'Jazz'],
		meters: 4_500,
		commune: 'Toulouse',
		tier: null
	},
	{
		name: 'Tom K.',
		initials: 'TK',
		role: 'Claviers · Amateur (déclaré)',
		genres: ['Néo-soul'],
		meters: 21_000,
		commune: 'Muret',
		tier: { id: 'FIRST_STEPS', label: 'Premiers pas' }
	}
];
