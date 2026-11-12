// LINKMUSICIAN (P0-06) : données de démonstration pour le développement.
//
//   npm run seed:demo                     autour de ta commune
//   npm run seed:demo -- --commune=69123  autour d'une commune (code INSEE)
//   npm run seed:demo -- --avec-moi       et te mêle aux scénarios (ton compte)
//
// Puis des **scénarios** (`prisma/seed-scenarios.ts`) qui font vivre les
// fonctionnalités : groupe et étapes prouvées, jams et appréciations,
// collaborations, morceaux, contacts, messagerie à trois messages. Avec
// `--avec-moi`, ton compte (la dernière personne réelle avec une commune)
// est invité dans le groupe, apprécié à une jam, a des contacts, un groupe
// de contacts, un message à lire et une étape à confirmer.
//
// Crée une douzaine de musicien·nes fictifs autour d'une commune, avec profil
// musical complet, ville, statut, recherche et parfois une démo, pour tester
// la recherche, le mode jam et le profil public. **Non destructif et
// rejouable** : seuls les comptes `@demo.linkmusician.test` sont concernés,
// et un compte déjà présent est laissé tel quel. Ton propre compte n'est
// touché qu'avec `--avec-moi`. Les points passent par le vrai moteur de progression
// (événements, registre, succès), jamais écrits à la main.
//
// Commune par défaut : celle de la dernière personne réelle qui en a une
// (toi, en dev), sinon Toulouse. Les communes voisines viennent de
// geo.api.gouv.fr ; sans réseau, des communes autour de Toulouse.
//
// Mot de passe des comptes : SEED_DEMO_PASSWORD, ou celui de `seed.js`.
// Jamais en production (VERCEL_ENV=production refusé).
import { seedJamLife } from './seed-jam-life';
import { seedOpenStage, seedRepresentations, seedScene, seedVenueHosts } from './seed-scene';
import dotenv from 'dotenv';
import { PrismaClient, type LookingFor, type ProStatus, type TrackKind } from '@prisma/client';
import { hash } from '@node-rs/argon2';
import { randomBytes } from 'node:crypto';
import type { Commune } from '../src/lib/geo/fuzz';
import { E2E_COMMUNES } from '../src/lib/geo/communes-e2e';
import { setActorLocation } from '../src/lib/server/geo/queries';
import { onProfileChanged } from '../src/lib/server/progression/profile';
import { emitAndProcess } from '../src/lib/server/progression/processor';
import { seedScenarios } from './seed-scenarios';

dotenv.config({ quiet: true });

if (process.env.VERCEL_ENV === 'production') {
	throw new Error('seed:demo refusé en production.');
}

const prisma = new PrismaClient();
const DOMAIN = 'demo.linkmusician.test';
const PASSWORD = process.env.SEED_DEMO_PASSWORD ?? 'DemoPass!2026';
const ARGON2 = { memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1 };
const DAY = 24 * 60 * 60 * 1000;

type Demo = {
	handle: string;
	name: string;
	born: string;
	/** Jours depuis l'inscription. */
	since: number;
	/** Index de la commune voisine (0 = la commune de référence). */
	near: number;
	tracks: TrackKind[];
	instruments: [slug: string, level: 1 | 2 | 3 | 4 | 5][];
	genres: string[];
	influences: string[];
	bio: string;
	pro: ProStatus;
	looking: LookingFor[];
	practiceSince: number;
	radius: 10 | 25 | 50 | 100;
	demo?: { title: string; url: string; provider: 'YOUTUBE' | 'SOUNDCLOUD' | 'BANDCAMP' };
};

/** Distribution fictive : instruments, niveaux, styles et envies variés. */
const CAST: Demo[] = [
	{
		handle: 'malik-batterie',
		name: 'Malik Benali',
		born: '1994-03-12',
		since: 92,
		near: 0,
		tracks: ['MUSICIAN'],
		instruments: [
			['batterie', 4],
			['percussions', 3]
		],
		genres: ['funk', 'soul', 'rock'],
		influences: ['Questlove', 'Vulfpeck'],
		bio: 'Batteur groove, 15 ans de scène. Dispo pour jams funk et remplacements.',
		pro: 'SEMI_PRO',
		looking: ['JAMS', 'REPLACEMENTS', 'BAND'],
		practiceSince: 2009,
		radius: 25,
		demo: {
			title: 'Groove du mardi (live)',
			url: 'https://soundcloud.com/demo-linkmusician/groove-du-mardi',
			provider: 'SOUNDCLOUD'
		}
	},
	{
		handle: 'ines-chant',
		name: 'Inès Garnier',
		born: '1999-07-02',
		since: 40,
		near: 1,
		tracks: ['MUSICIAN'],
		instruments: [
			['chant', 3],
			['piano', 2]
		],
		genres: ['soul', 'neo-soul', 'jazz-vocal'],
		influences: ['Erykah Badu', 'Ella Fitzgerald'],
		bio: 'Chanteuse soul, j’écris en français et en anglais. Je cherche un groupe pour monter un répertoire.',
		pro: 'AMATEUR',
		looking: ['BAND', 'COLLABORATION'],
		practiceSince: 2014,
		radius: 25
	},
	{
		handle: 'theo-basse',
		name: 'Théo Lambert',
		born: '1988-11-21',
		since: 120,
		near: 2,
		tracks: ['MUSICIAN', 'SOUND_ENGINEER'],
		instruments: [
			['basse', 5],
			['contrebasse', 3]
		],
		genres: ['jazz', 'funk', 'jazz-fusion'],
		influences: ['Jaco Pastorius', 'Marcus Miller'],
		bio: 'Bassiste pro (sessions, enseignement). Home studio pour enregistrer vos maquettes.',
		pro: 'PROFESSIONAL',
		looking: ['STUDIO_SESSIONS', 'LESSONS_GIVE', 'JAMS'],
		practiceSince: 2002,
		radius: 50,
		demo: {
			title: 'Walking bass — standard',
			url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
			provider: 'YOUTUBE'
		}
	},
	{
		handle: 'clara-guitare',
		name: 'Clara Nguyen',
		born: '2001-01-30',
		since: 18,
		near: 0,
		tracks: ['MUSICIAN'],
		instruments: [
			['guitare-electrique', 3],
			['guitare-acoustique', 3]
		],
		genres: ['rock-inde', 'post-punk', 'pop-inde'],
		influences: ['Wet Leg', 'The Cure'],
		bio: 'Guitariste rock indé, je compose des riffs et j’ai besoin d’une section rythmique !',
		pro: 'AMATEUR',
		looking: ['BAND', 'JAMS'],
		practiceSince: 2016,
		radius: 10
	},
	{
		handle: 'samir-son',
		name: 'Samir Haddad',
		born: '1985-05-17',
		since: 75,
		near: 3,
		tracks: ['SOUND_ENGINEER', 'MUSICIAN'],
		instruments: [
			['mao', 4],
			['claviers', 3]
		],
		genres: ['electro', 'hip-hop'],
		influences: ['Daft Punk', 'J Dilla'],
		bio: 'Ingé son studio et live. Enregistrement, mixage, mastering. Je joue aussi des claviers.',
		pro: 'PROFESSIONAL',
		looking: ['STUDIO_SESSIONS', 'COLLABORATION'],
		practiceSince: 2005,
		radius: 50
	},
	{
		handle: 'nora-prod',
		name: 'Nora Diallo',
		born: '1996-09-08',
		since: 55,
		near: 4,
		tracks: ['PRODUCER', 'MUSICIAN'],
		instruments: [
			['beatmaking', 4],
			['machines', 3]
		],
		genres: ['rap-francais', 'rnb', 'electro-pop'],
		influences: ['Timbaland', 'Myth Syzer'],
		bio: 'Productrice, je cherche des voix et des musicien·nes pour mes prochains projets.',
		pro: 'SEMI_PRO',
		looking: ['COLLABORATION', 'STUDIO_SESSIONS'],
		practiceSince: 2013,
		radius: 100,
		demo: {
			title: 'Instru — nuit blanche',
			url: 'https://soundcloud.com/demo-linkmusician/nuit-blanche',
			provider: 'SOUNDCLOUD'
		}
	},
	{
		handle: 'lucas-sax',
		name: 'Lucas Fabre',
		born: '1992-02-14',
		since: 30,
		near: 1,
		tracks: ['MUSICIAN'],
		instruments: [
			['saxophone-tenor', 4],
			['flute', 2]
		],
		genres: ['jazz', 'bebop', 'latin-jazz'],
		influences: ['John Coltrane', 'Sonny Rollins'],
		bio: 'Saxophoniste ténor, habitué des bœufs du jeudi. Partant pour un quartet.',
		pro: 'SEMI_PRO',
		looking: ['JAMS', 'BAND'],
		practiceSince: 2006,
		radius: 25
	},
	{
		handle: 'zoe-violon',
		name: 'Zoé Mercier',
		born: '2003-04-25',
		since: 8,
		near: 2,
		tracks: ['MUSICIAN'],
		instruments: [
			['violon', 4],
			['alto', 2]
		],
		genres: ['folk', 'pop-inde'],
		influences: ['Andrew Bird', 'Sufjan Stevens'],
		bio: 'Violoniste classique qui a envie de sortir des partitions. Folk, pop, tout m’intéresse.',
		pro: 'AMATEUR',
		looking: ['JAMS', 'COLLABORATION'],
		practiceSince: 2010,
		radius: 25
	},
	{
		handle: 'kevin-metal',
		name: 'Kévin Rousseau',
		born: '1990-12-03',
		since: 64,
		near: 5,
		tracks: ['MUSICIAN'],
		instruments: [
			['guitare-electrique', 4],
			['basse', 2]
		],
		genres: ['metal', 'metalcore', 'metal-progressif'],
		influences: ['Gojira', 'Periphery'],
		bio: 'Guitariste metal, 2 groupes à mon actif. Je monte un projet prog, cherche batteur.',
		pro: 'AMATEUR',
		looking: ['BAND'],
		practiceSince: 2007,
		radius: 50,
		demo: {
			title: 'Riff — maquette',
			url: 'https://demo-linkmusician.bandcamp.com/track/riff-maquette',
			provider: 'BANDCAMP'
		}
	},
	{
		handle: 'awa-clavier',
		name: 'Awa Traoré',
		born: '1997-06-19',
		since: 110,
		near: 3,
		tracks: ['MUSICIAN'],
		instruments: [
			['piano-electrique', 4],
			['chant', 3]
		],
		genres: ['soul', 'gospel', 'funk'],
		influences: ['Stevie Wonder', 'Cory Henry'],
		bio: 'Claviériste et choriste. Église le dimanche, funk le samedi.',
		pro: 'SEMI_PRO',
		looking: ['REPLACEMENTS', 'JAMS'],
		practiceSince: 2008,
		radius: 25
	},
	{
		handle: 'hugo-dj',
		name: 'Hugo Perrin',
		born: '1998-10-11',
		since: 22,
		near: 6,
		tracks: ['MUSICIAN', 'PROMOTER'],
		instruments: [
			['dj', 3],
			['synthe-modulaire', 2]
		],
		genres: ['electro', 'disco'],
		influences: ['Kerri Chandler', 'Jamie xx'],
		bio: 'DJ et organisateur de soirées. Je cherche des musicien·nes live pour des sets hybrides.',
		pro: 'AMATEUR',
		looking: ['COLLABORATION', 'JAMS'],
		practiceSince: 2017,
		radius: 50
	},
	{
		handle: 'manon-ukulele',
		name: 'Manon Leroy',
		born: '2007-08-30',
		since: 5,
		near: 1,
		tracks: ['MUSICIAN'],
		instruments: [
			['ukulele', 2],
			['chant', 2]
		],
		genres: ['pop', 'folk'],
		influences: ['Angèle', 'Pomme'],
		bio: 'Je débute, j’adore chanter en m’accompagnant. Je cherche à jouer avec d’autres !',
		pro: 'AMATEUR',
		looking: ['JAMS', 'LESSONS_TAKE'],
		practiceSince: 2022,
		radius: 10
	},
	// Vie pro et scène (seed-scene.ts, P5) : organisateur·rices et gérant·es de lieu.
	{
		handle: 'yanis-orga',
		name: 'Yanis Morel',
		born: '1987-06-14',
		since: 85,
		near: 0,
		tracks: ['PROMOTER', 'MUSICIAN'],
		instruments: [['guitare-acoustique', 2]],
		genres: ['rock', 'folk', 'jazz'],
		influences: ['Les Nuits de Fourvière', 'Rock en Seine'],
		bio: 'Président de l’Asso Bruit Rose et du Festival des Coteaux. Je programme la scène locale.',
		pro: 'PROFESSIONAL',
		looking: ['COLLABORATION'],
		practiceSince: 2004,
		radius: 100
	},
	{
		handle: 'lina-orga',
		name: 'Lina Petit',
		born: '1993-01-09',
		since: 60,
		near: 2,
		tracks: ['PROMOTER', 'MUSICIAN'],
		instruments: [['chant', 2]],
		genres: ['folk', 'soul', 'pop-inde'],
		influences: ['Feist', 'Lianne La Havas'],
		bio: 'Je monte des scènes découvertes et j’anime le Collectif Nuits Courtes.',
		pro: 'SEMI_PRO',
		looking: ['COLLABORATION', 'JAMS'],
		practiceSince: 2012,
		radius: 50
	},
	{
		handle: 'sophie-bar',
		name: 'Sophie Durand',
		born: '1984-09-22',
		since: 65,
		near: 0,
		// Gérante de lieu sans le métier d'organisatrice (Q18, Q34).
		tracks: ['MUSICIAN'],
		instruments: [['contrebasse', 2]],
		genres: ['jazz', 'soul'],
		influences: ['Charles Mingus'],
		bio: 'Je tiens Le Comptoir Jazz : bœufs le jeudi, concerts le week-end.',
		pro: 'AMATEUR',
		looking: ['JAMS'],
		practiceSince: 2010,
		radius: 25
	},
	{
		handle: 'paul-salle',
		name: 'Paul Garnier',
		born: '1979-03-03',
		since: 4,
		near: 0,
		tracks: ['MUSICIAN'],
		instruments: [['piano', 3]],
		genres: ['folk', 'jazz'],
		influences: ['Keith Jarrett'],
		bio: 'Gérant du Café des Sons. Je viens de demander à reprendre la fiche du café.',
		pro: 'AMATEUR',
		looking: ['JAMS'],
		practiceSince: 1995,
		radius: 25
	},
	// Manager et booker (seed-scene.ts, P5-07).
	{
		handle: 'elise-booker',
		name: 'Élise Fournier',
		born: '1990-02-11',
		since: 50,
		near: 1,
		tracks: ['BOOKER'],
		instruments: [],
		genres: ['jazz', 'funk', 'folk'],
		influences: ['Jazz in Marciac'],
		bio: 'Je booke des fanfares et des groupes de jazz dans le Sud-Ouest.',
		pro: 'PROFESSIONAL',
		looking: ['COLLABORATION'],
		practiceSince: 2014,
		radius: 100
	},
	{
		handle: 'marc-manager',
		name: 'Marc Lefèvre',
		born: '1981-07-30',
		since: 90,
		near: 3,
		tracks: ['MANAGER', 'MUSICIAN'],
		instruments: [['guitare-electrique', 2]],
		genres: ['rock', 'soul'],
		influences: ['Peter Grant'],
		bio: 'Manager de groupes de la scène toulousaine. J’aide à structurer, je ne joue plus beaucoup.',
		pro: 'SEMI_PRO',
		looking: ['COLLABORATION'],
		practiceSince: 1998,
		radius: 50
	},
	// Mineure (D5) : sa dispo n'est montrée à personne, jams finies avant 22 h,
	// pas de demande d'inconnu·es, pas de discussion de groupe.
	{
		handle: 'jade-batterie',
		name: 'Jade Martin',
		born: '2010-05-02',
		since: 20,
		near: 0,
		tracks: ['MUSICIAN'],
		instruments: [['batterie', 2]],
		genres: ['rock', 'pop'],
		influences: ['Meg White', 'Anika Nilles'],
		bio: '16 ans, batterie depuis trois ans au conservatoire. Je cherche des ateliers jam.',
		pro: 'AMATEUR',
		looking: ['JAMS', 'LESSONS_TAKE'],
		practiceSince: 2023,
		radius: 10
	}
];

/** Décalages (km, cap en degrés) des communes voisines autour de la référence. */
const OFFSETS: [km: number, bearing: number][] = [
	[0, 0],
	[4, 45],
	[8, 200],
	[12, 120],
	[18, 300],
	[25, 10],
	[35, 250]
];

type GeoApiCommune = Omit<Commune, 'centre'> & {
	centre: { type: 'Point'; coordinates: [number, number] };
};
const FIELDS = 'fields=nom,code,codeDepartement,codesPostaux,centre,population';

async function geoApi(path: string): Promise<GeoApiCommune[] | GeoApiCommune | null> {
	try {
		const response = await fetch(`https://geo.api.gouv.fr/${path}`, {
			signal: AbortSignal.timeout(8000)
		});
		return response.ok ? await response.json() : null;
	} catch {
		return null;
	}
}

const toCommune = (c: GeoApiCommune): Commune => ({
	code: c.code,
	nom: c.nom,
	codeDepartement: c.codeDepartement,
	codesPostaux: c.codesPostaux,
	population: c.population,
	centre: { lat: c.centre.coordinates[1], lng: c.centre.coordinates[0] }
});

function offset(center: Commune['centre'], km: number, bearing: number) {
	const rad = (bearing * Math.PI) / 180;
	const dLat = (km * Math.cos(rad)) / 111.32;
	const dLng = (km * Math.sin(rad)) / (111.32 * Math.cos((center.lat * Math.PI) / 180));
	return { lat: center.lat + dLat, lng: center.lng + dLng };
}

/** Commune de référence : argument, sinon la tienne, sinon Toulouse. */
async function referenceCode(): Promise<string> {
	const arg = process.argv.find((a) => a.startsWith('--commune='))?.split('=')[1];
	if (arg) return arg;
	const rows = await prisma.$queryRaw<{ communeCode: string }[]>`
		SELECT l."communeCode" FROM actor_locations l
		JOIN persons p ON p."actorId" = l."actorId"
		JOIN users u ON u.id = p."userId"
		WHERE u.email NOT LIKE ${`%@${DOMAIN}`}
		ORDER BY l."updatedAt" DESC LIMIT 1`;
	return rows[0]?.communeCode ?? '31555';
}

async function nearbyCommunes(): Promise<Commune[]> {
	const code = await referenceCode();
	const ref = await geoApi(`communes/${code}?${FIELDS}`);
	if (!ref || Array.isArray(ref)) {
		console.log('geo.api.gouv.fr injoignable : communes autour de Toulouse.');
		return [...E2E_COMMUNES.filter((c) => c.codeDepartement !== '75')];
	}
	const reference = toCommune(ref);
	const communes: Commune[] = [reference];
	for (const [km, bearing] of OFFSETS.slice(1)) {
		const { lat, lng } = offset(reference.centre, km, bearing);
		const found = await geoApi(`communes?lat=${lat}&lon=${lng}&${FIELDS}`);
		const first = Array.isArray(found) ? found[0] : null;
		communes.push(first ? toCommune(first) : reference);
	}
	console.log(
		`Autour de ${reference.nom} : ${[...new Set(communes.map((c) => c.nom))].join(', ')}.`
	);
	return communes;
}

/** Ton compte (la dernière personne réelle avec une commune), pour `--avec-moi`. */
async function myself() {
	const rows = await prisma.$queryRaw<{ actorId: string; displayName: string }[]>`
		SELECT a.id AS "actorId", a."displayName" FROM actor_locations l
		JOIN actors a ON a.id = l."actorId"
		JOIN persons p ON p."actorId" = l."actorId"
		JOIN users u ON u.id = p."userId"
		WHERE u.email NOT LIKE ${`%@${DOMAIN}`} AND a."deletedAt" IS NULL
		ORDER BY l."updatedAt" DESC LIMIT 1`;
	if (!rows[0]) console.log('--avec-moi : aucun compte réel avec une commune, scénarios sans toi.');
	return rows[0] ?? null;
}

const referralCode = () => `DEMO${randomBytes(4).toString('hex').toUpperCase()}`;

async function resolveDemoHandles() {
	const handles = new Map<string, string>();
	for (const demo of CAST) {
		for (let suffix = 0; suffix < 100; suffix++) {
			const handle =
				suffix === 0 ? demo.handle : `${demo.handle}-demo${suffix === 1 ? '' : `-${suffix}`}`;
			const email = `${handle}@${DOMAIN}`;
			const [actor, user] = await Promise.all([
				prisma.actor.findUnique({
					where: { handle },
					select: { person: { select: { user: { select: { email: true } } } } }
				}),
				prisma.user.findUnique({
					where: { email },
					select: { person: { select: { actor: { select: { handle: true } } } } }
				})
			]);
			const existingDemo =
				actor?.person?.user.email === email && user?.person?.actor.handle === handle;
			if (existingDemo || (!actor && !user)) {
				handles.set(demo.handle, handle);
				break;
			}
		}
		if (!handles.has(demo.handle)) {
			throw new Error(`Impossible de trouver un handle libre pour @${demo.handle}.`);
		}
	}
	return handles;
}

async function createDemo(demo: Demo, handle: string, commune: Commune, passwordHash: string) {
	const email = `${handle}@${DOMAIN}`;
	const existingUser = await prisma.user.findUnique({
		where: { email },
		select: {
			id: true,
			username: true,
			person: { select: { actor: { select: { handle: true } } } },
			authAccounts: { where: { providerId: 'credential' }, select: { providerId: true } }
		}
	});
	if (existingUser?.person?.actor?.handle === handle) return false;
	if (existingUser?.person?.actor || (existingUser && existingUser.username !== handle)) {
		throw new Error(`Le compte de démo ${email} existe déjà avec un profil différent.`);
	}

	const createdAt = new Date(Date.now() - demo.since * DAY);

	const [instruments, genres] = await Promise.all([
		prisma.instrument.findMany({ where: { slug: { in: demo.instruments.map(([s]) => s) } } }),
		prisma.genre.findMany({ where: { slug: { in: demo.genres } } })
	]);
	const actor = await prisma.$transaction(async (tx) => {
		const user =
			existingUser ??
			(await tx.user.create({
				data: {
					email,
					username: handle,
					name: demo.name,
					role: 'CLIENT',
					emailVerified: true,
					referralCode: referralCode(),
					createdAt
				},
				select: { id: true }
			}));
		if (!existingUser || existingUser.authAccounts.length === 0) {
			await tx.authAccount.create({
				data: {
					userId: user.id,
					providerId: 'credential',
					accountId: user.id,
					password: passwordHash
				}
			});
		}

		return tx.actor.create({
			data: {
				kind: 'PERSON',
				handle,
				displayName: demo.name,
				bio: demo.bio,
				createdAt,
				person: {
					create: {
						userId: user.id,
						birthDate: new Date(`${demo.born}T00:00:00Z`),
						termsAcceptedAt: createdAt,
						createdAt,
						onboardedAt: createdAt,
						proStatus: demo.pro,
						lookingFor: demo.looking,
						practiceSince: demo.practiceSince,
						travelRadiusKm: demo.radius,
						tracks: {
							create: demo.tracks.map((track, i) => ({ track, isPrimary: i === 0 }))
						},
						instruments: {
							create: demo.instruments.flatMap(([slug, level], i) => {
								const instrument = instruments.find((x) => x.slug === slug);
								return instrument
									? [{ instrumentId: instrument.id, declaredLevel: level, isPrimary: i === 0 }]
									: [];
							})
						}
					}
				},
				genres: { create: genres.map((g) => ({ genreId: g.id })) },
				influences: { create: demo.influences.map((label, sortOrder) => ({ label, sortOrder })) }
			}
		});
	});
	await setActorLocation(actor.id, commune, { db: prisma });

	// Progression : profil complété, puis démo publiée, par le vrai moteur.
	await onProfileChanged(actor.id, prisma);
	if (demo.demo) {
		const media = await prisma.media.create({
			data: {
				actorId: actor.id,
				kind: 'EXTERNAL_LINK',
				status: 'PUBLISHED',
				provider: demo.demo.provider,
				externalUrl: demo.demo.url,
				title: demo.demo.title,
				isDemo: true,
				instrumentId: instruments.find((x) => x.slug === demo.instruments[0][0])?.id,
				publishedAt: createdAt
			}
		});
		await prisma.$transaction((tx) =>
			emitAndProcess(tx, {
				type: 'media.published',
				actorId: actor.id,
				mediaId: media.id,
				kind: 'DEMO'
			})
		);
	}

	// Quelques jours de visite, pour des indicateurs vivants (P1-13).
	const days = Array.from({ length: Math.min(demo.since, 12) }, (_, k) =>
		new Date(createdAt.getTime() + Math.round((k * demo.since) / 12) * DAY)
			.toISOString()
			.slice(0, 10)
	);
	await prisma.actorActivityDay.createMany({
		data: [...new Set(days)].map((d) => ({ actorId: actor.id, day: new Date(`${d}T00:00:00Z`) })),
		skipDuplicates: true
	});
	return true;
}

try {
	const communes = await nearbyCommunes();
	const demoHandles = await resolveDemoHandles();
	const passwordHash = await hash(PASSWORD, ARGON2);
	let created = 0;
	for (const demo of CAST) {
		const commune = communes[demo.near % communes.length];
		const handle = demoHandles.get(demo.handle);
		if (!handle) throw new Error(`Handle de démo absent pour ${demo.handle}.`);
		if (await createDemo(demo, handle, commune, passwordHash)) {
			created += 1;
			console.log(`  + @${handle} (${commune.nom})`);
		}
	}
	console.log(
		`Démo LinkMusician : ${created} compte(s) créé(s), ${CAST.length - created} déjà présent(s).`
	);
	await seedScenarios(
		prisma,
		communes[0],
		process.argv.includes('--avec-moi') ? await myself() : null,
		new Map([...demoHandles].map(([handle, actualHandle]) => [actualHandle, handle]))
	);
	// Vie de jam : jams passées et à venir, appréciations, carnets, discussions.
	const handleMap = new Map(
		[...demoHandles].map(([handle, actualHandle]) => [actualHandle, handle])
	);
	await seedJamLife(prisma, communes[0], handleMap);
	// Vie pro et scène (P4-P5) : studio, métiers, organisations, lieux, plateaux, concerts.
	await seedScene(prisma, communes, handleMap);
	await seedOpenStage(prisma, communes, handleMap);
	await seedVenueHosts(prisma, communes, handleMap);
	await seedRepresentations(prisma, communes, handleMap);
	// Organisateurs de jams (D51) : les personnes qui en ont publié une.
	const hosts = await prisma.opportunity.findMany({
		where: { kind: 'JAM' },
		select: { issuerActorId: true },
		distinct: ['issuerActorId']
	});
	await prisma.person.updateMany({
		where: { actorId: { in: hosts.map((h) => h.issuerActorId) } },
		data: { organizesJams: true }
	});
	console.log(`\nComptes de connexion (mot de passe : ${PASSWORD}) :`);
	for (const handle of demoHandles.values()) console.log(`  ${handle}@${DOMAIN}`);
} catch (error) {
	console.error('Échec du seed de démo :', error);
	process.exitCode = 1;
} finally {
	await prisma.$disconnect();
}
