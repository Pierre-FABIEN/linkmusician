// LINKMUSICIAN : « vie de jam » de la démo, jouée par `npm run seed:demo` après
// les scénarios. Avec les 13 musicien·nes de démo (aucun profil ajouté), elle
// remplit le mode jam :
//
// | Données                                        | Où le voir                                   |
// | ---------------------------------------------- | -------------------------------------------- |
// | 3 lieux de plus (jazz, café-concert, scène     | `/jam/agenda` (lieux), `/lieux`              |
// |   ouverte)                                     |                                              |
// | ~16 jams passées sur deux mois, présences,     | `/jam/carnet`, `/jams/…/presents`, profils   |
// |   « J'y étais », beaucoup d'appréciations      |   (« apprécié par N »), points               |
// | Jams des 7 derniers jours à moitié appréciées  | `/jam/apprecier` (« N à apprécier »)         |
// | Une jam en cours (rejouée à chaque seed)       | `/jam` (« Jam en cours »)                    |
// | 8 jams à venir, « Je viens », invitations du   | `/jam/agenda`, `/jam/mes-jams` (invitations) |
// |   lead en attente                              |                                              |
// | Carnets : contacts gardés après les jams       | `/messages/contacts`, `/jam/carnet`          |
// | Conversations entre gens qui ont joué ensemble | `/messages`                                  |
// | Groupes de contacts et discussions de groupe   | `/messages/contacts`, `/messages` (invités)  |
// | « Je suis dispo » (rafraîchi à chaque seed)    | `/jam/dispos`                                |
//
// La progression passe par le vrai moteur (`emitAndProcess`) : aucune XP
// écrite à la main. Les mineur·es (Jade) ne vont qu'aux jams qui finissent
// avant 22 h, ne sont jamais dispo affiché·es ni dans une discussion de
// groupe (D5, D46). Rejouable : les jams passées et à venir ne se refont pas
// si « Jeudi jazz au Comptoir » existe ; la jam en cours et les dispos sont
// rafraîchies.
import type { PrismaClient } from '@prisma/client';
import type { Commune } from '../src/lib/geo/fuzz';
import { isIndexable } from '../src/lib/actors/visibility';
import type { JAM_QUALITY_LABELS } from '../src/lib/jam/afterJam';
import { pairKey } from '../src/lib/messaging/rules';
import {
	DAY,
	ago,
	appreciate,
	attended,
	demoContext,
	id,
	inDays,
	instrumentId,
	jam,
	keep,
	talk,
	venue,
	type Ctx,
	type JamSpec
} from './seed-scenarios';

const HOUR = 60 * 60 * 1000;
const MARKER = 'Jeudi jazz au Comptoir';
const LIVE_PREFIX = 'Bœuf du moment';
type Quality = keyof typeof JAM_QUALITY_LABELS;
const QUALITIES: Quality[] = ['GROOVE', 'LISTENING', 'IMPRO', 'RELIABLE'];

/** Hasard reproductible : la même démo à chaque base. */
function random(seed: number) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

type Series = {
	title: string;
	host: string;
	venue: 'comptoir' | 'cafe' | 'canal' | 'bar' | 'mjc' | 'studio';
	genre: string;
	/** Heure de début (UTC) et durée en heures. */
	hour: number;
	hours: number;
	/** Jours passés (positifs) ou à venir (négatifs). */
	days: number[];
	spots: [string, number][];
	description: string;
};

const SERIES: Series[] = [
	{
		title: MARKER,
		host: 'lucas-sax',
		venue: 'comptoir',
		genre: 'jazz',
		hour: 19,
		hours: 3,
		days: [52, 38, 24, 10, 3, -4, -11],
		spots: [
			['piano', 1],
			['contrebasse', 1],
			['batterie', 1]
		],
		description: 'Standards et improvisation : apporte ta grille, on lance les thèmes ensemble.'
	},
	{
		title: 'Scène ouverte du Canal',
		host: 'clara-guitare',
		venue: 'canal',
		genre: 'pop',
		hour: 18,
		hours: 3,
		days: [45, 31, 17, 2, -5, -19],
		spots: [
			['chant', 2],
			['guitare-acoustique', 1]
		],
		description: 'Trois morceaux chacun·e, backline sur place, public bienveillant.'
	},
	{
		title: 'Bœuf funk du mardi',
		host: 'malik-batterie',
		venue: 'bar',
		genre: 'funk',
		hour: 20,
		hours: 3,
		days: [33, 19, 5, -2, -9],
		spots: [
			['basse', 1],
			['saxophone-tenor', 1],
			['chant', 1]
		],
		description: 'Grooves funk et soul, on tourne sur la batterie et la basse.'
	},
	{
		title: 'Atelier jam ados-adultes',
		host: 'awa-clavier',
		venue: 'mjc',
		genre: 'pop',
		hour: 14,
		hours: 3,
		days: [28, 14, 1, -6],
		spots: [
			['batterie', 1],
			['ukulele', 1],
			['chant', 1]
		],
		description: 'L’après-midi à la MJC, tous niveaux, on finit bien avant le dîner.'
	},
	{
		title: 'Session folk & trad',
		host: 'zoe-violon',
		venue: 'cafe',
		genre: 'folk',
		hour: 19,
		hours: 3,
		days: [40, 21, 6, -13],
		spots: [
			['violon', 1],
			['guitare-acoustique', 1],
			['accordeon', 1]
		],
		description: 'Bourrées, reels et chansons à reprendre en chœur.'
	},
	{
		title: 'Jam rock au studio',
		host: 'samir-son',
		venue: 'studio',
		genre: 'rock',
		hour: 18,
		hours: 3,
		days: [35, 12, -3, -16],
		spots: [
			['guitare-electrique', 1],
			['basse', 1],
			['batterie', 1]
		],
		description: 'Amplis allumés, riffs et reprises, son pris par Samir.'
	}
];

const MESSAGES: [string, string][] = [
	['Trop bien hier soir, on remet ça ?', 'Carrément ! Tu viens à la prochaine ?'],
	['Ton solo sur le deuxième morceau, wow.', 'Merci ! Ta rythmique m’a porté·e.'],
	['Tu bosses sur quel répertoire en ce moment ?', 'Pas mal de standards, et des compos.'],
	['On pourrait se caler une répète à deux ?', 'Oui ! Mardi ou jeudi soir pour toi ?'],
	['Je t’envoie la grille du morceau de la fin.', 'Top, je la travaille ce week-end.']
];

/** Personnages adultes (Jade, mineure, reste aux jams de l'après-midi). */
async function adults(ctx: Ctx) {
	const rows = await ctx.prisma.person.findMany({
		where: { actorId: { in: [...ctx.who.values()] } },
		select: { actorId: true, birthDate: true }
	});
	return new Set(rows.filter((r) => isIndexable(r.birthDate)).map((r) => r.actorId));
}

export async function seedJamLife(
	prisma: PrismaClient,
	commune: Commune,
	demoHandles: ReadonlyMap<string, string> = new Map()
) {
	const ctx = await demoContext(prisma, commune, null, demoHandles);
	const handles = [...ctx.who.keys()].filter((h) => h !== 'malik-batterie-2');
	const P = (h: string) => id(ctx, h);
	const play = (h: string) => ctx.plays.get(h) || 'chant';
	const adult = await adults(ctx);
	const rand = random(2026);
	const pick = <T>(list: T[], n: number) =>
		[...list]
			.map((v) => [rand(), v] as const)
			.sort((a, b) => a[0] - b[0])
			.slice(0, n)
			.map(([, v]) => v);

	const venues = {
		comptoir: (await venue(ctx, 'Le Comptoir Jazz', 'BAR', 'lucas-sax')).id,
		cafe: (await venue(ctx, 'Café des Sons', 'CAFE_CONCERT', 'zoe-violon')).id,
		canal: (await venue(ctx, 'Scène ouverte du Canal', 'OPEN_STAGE', 'clara-guitare')).id,
		bar: (await venue(ctx, 'Le Bœuf du Mardi', 'BAR', 'malik-batterie')).id,
		mjc: (await venue(ctx, 'MJC des Arts', 'MJC', 'awa-clavier')).id,
		studio: (await venue(ctx, 'Studio La Cave', 'REHEARSAL_SPACE', 'samir-son')).id
	};
	// Organisateurs de jams (D51).
	await prisma.person.updateMany({
		where: { actorId: { in: SERIES.map((s) => P(s.host)) } },
		data: { organizesJams: true }
	});

	// Ambitions de carrière (P3-12), si elles ne sont pas déjà choisies.
	const ambitions: [string, 'PLAY_BAND' | 'STAGE' | 'RECORD' | 'PRO' | 'SUPPORT'][] = [
		['malik-batterie', 'STAGE'],
		['ines-chant', 'RECORD'],
		['clara-guitare', 'STAGE'],
		['nora-prod', 'RECORD'],
		['samir-son', 'SUPPORT'],
		['lucas-sax', 'PRO'],
		['awa-clavier', 'PLAY_BAND'],
		['kevin-metal', 'PLAY_BAND']
	];
	for (const [h, ambition] of ambitions) {
		if (!handles.includes(h)) continue;
		await prisma.person.updateMany({
			where: { actorId: P(h), ambition: null },
			data: { ambition }
		});
	}

	await refreshLive(ctx, venues.cafe, handles, adult);
	await refreshDispos(ctx, handles, adult);

	if (await prisma.opportunity.findFirst({ where: { title: MARKER }, select: { id: true } })) {
		console.log(
			'  · vie de jam déjà en place (jams passées et à venir) : dispos et jam en cours rafraîchies.'
		);
		return;
	}

	// ─── Jams passées : présences, appréciations, carnets ───────────────────
	const played = new Map<string, Set<string>>();
	const together = (a: string, b: string) => {
		for (const [x, y] of [
			[a, b],
			[b, a]
		]) {
			if (!played.has(x)) played.set(x, new Set());
			played.get(x)!.add(y);
		}
	};
	let pastCount = 0;
	let endorsements = 0;
	for (const s of SERIES) {
		for (const days of s.days.filter((d) => d > 0)) {
			const startsAt = ago(days, s.hour);
			const endsAt = new Date(startsAt.getTime() + s.hours * HOUR);
			// Fini avant 22 h (heure de Paris, UTC+1 en hiver) : ouvert à Jade.
			const daytime = s.hour + s.hours <= 20;
			const row = await jam(ctx, {
				issuer: s.host,
				lead: s.host,
				venueId: venues[s.venue],
				title: s.title,
				description: s.description,
				genre: s.genre,
				startsAt,
				endsAt,
				spots: s.spots,
				backline: ['DRUMS', 'BASS_AMP', 'GUITAR_AMP', 'PA_MICS']
			} satisfies JamSpec);
			const pool = handles.filter((h) => h !== s.host && (daytime || adult.has(P(h))));
			const crew = [s.host, ...pick(pool, 4 + Math.floor(rand() * 4))];
			const late = s.hour + s.hours >= 23;
			for (const h of crew) await attended(ctx, row, P(h), play(h), late);
			for (const a of crew) for (const b of crew) if (a < b) together(a, b);

			// Appréciations : beaucoup pour les jams anciennes ; à moitié pour
			// celles de la semaine (il en reste à donner, `/jam/apprecier`).
			const recent = days <= 7;
			const share = recent ? 0.25 : 0.45;
			const after = new Date(endsAt.getTime() + 3 * HOUR);
			for (const from of crew) {
				for (const to of crew) {
					if (from === to || rand() > share) continue;
					await appreciate(ctx, row.id, P(from), P(to), QUALITIES[Math.floor(rand() * 4)], after);
					endorsements += 1;
				}
			}
			// « Garder le contact » : chacun·e garde une ou deux personnes.
			for (const owner of crew) {
				for (const contact of pick(
					crew.filter((h) => h !== owner),
					1 + Math.floor(rand() * 2)
				)) {
					await keep(ctx, P(owner), P(contact), after);
				}
			}
			pastCount += 1;
		}
	}
	console.log(`  · jams passées : ${pastCount}, appréciations : ${endorsements}`);

	// ─── Jams à venir : « Je viens », invitations du lead ───────────────────
	let upcoming = 0;
	let invites = 0;
	for (const s of SERIES) {
		for (const days of s.days.filter((d) => d < 0)) {
			const startsAt = inDays(-days, s.hour);
			const daytime = s.hour + s.hours <= 20;
			const row = await jam(ctx, {
				issuer: s.host,
				lead: s.host,
				venueId: venues[s.venue],
				title: s.title,
				description: s.description,
				genre: s.genre,
				startsAt,
				endsAt: new Date(startsAt.getTime() + s.hours * HOUR),
				spots: s.spots,
				backline: ['DRUMS', 'BASS_AMP', 'GUITAR_AMP', 'PA_MICS']
			});
			const pool = handles.filter((h) => h !== s.host && (daytime || adult.has(P(h))));
			const [invited, ...coming] = pick(pool, 3 + Math.floor(rand() * 3));
			for (const h of coming) {
				await prisma.jamAttendance.create({
					data: {
						opportunityId: row.id,
						actorId: P(h),
						instrumentId: await instrumentId(prisma, play(h)),
						createdAt: ago(2)
					}
				});
			}
			// Le lead réserve une place à quelqu'un de son réseau, en attente.
			if (invited) {
				await prisma.jamInvite.create({
					data: {
						opportunityId: row.id,
						actorId: P(invited),
						instrumentId: await instrumentId(prisma, play(invited)),
						createdAt: ago(1)
					}
				});
				await prisma.notification.create({
					data: {
						recipientActorId: P(invited),
						type: 'JAM_INVITE',
						fromActorId: P(s.host),
						href: `/jams/${row.id}`,
						title: s.title,
						createdAt: ago(1)
					}
				});
				invites += 1;
			}
			upcoming += 1;
		}
	}
	console.log(`  · jams à venir : ${upcoming}, invitations du lead en attente : ${invites}`);

	// ─── Conversations entre gens qui ont joué ensemble ─────────────────────
	let conversations = 0;
	for (const [a, others] of played) {
		for (const b of pick([...others], 2)) {
			if (a > b) continue;
			const exists = await prisma.conversation.findUnique({
				where: { pairKey: pairKey(P(a), P(b)) },
				select: { id: true }
			});
			if (exists) continue;
			const [hello, reply] = MESSAGES[conversations % MESSAGES.length];
			await talk(
				ctx,
				P(a),
				P(b),
				[
					['from', hello],
					['to', reply],
					['from', 'Parfait, on se dit ça à la prochaine jam !']
				],
				ago(1 + (conversations % 20), 10 + (conversations % 8))
			);
			conversations += 1;
		}
	}
	console.log(`  · conversations : ${conversations}`);

	// ─── Groupes de contacts et discussions de groupe ───────────────────────
	const groups: [owner: string, name: string][] = [
		['lucas-sax', 'Quartet jazz'],
		['clara-guitare', 'Habitué·es de la scène ouverte'],
		['zoe-violon', 'Folk du dimanche'],
		['theo-basse', 'Section rythmique'],
		['kevin-metal', 'Projet rock lourd']
	];
	let discussions = 0;
	for (const [owner, name] of groups) {
		const ties = await prisma.savedContact.findMany({
			where: { ownerId: P(owner) },
			select: { contactId: true }
		});
		const members = ties.map((t) => t.contactId).slice(0, 5);
		if (members.length < 2) continue;
		await prisma.contactGroup.create({
			data: {
				ownerId: P(owner),
				name,
				createdAt: ago(8),
				members: { create: members.map((contactId) => ({ contactId, addedAt: ago(8) })) }
			}
		});
		// Discussion : les adultes du groupe invités ; deux ont rejoint et écrit.
		const invitees = members.filter((m) => adult.has(m));
		if (invitees.length < 2) continue;
		const [joinA, joinB, ...waiting] = invitees;
		const opened = ago(6, 18);
		const lines: [string, string][] = [
			[P(owner), `On ouvre « ${name} » pour s’organiser : qui est dispo ce mois-ci ?`],
			[joinA, 'Moi ! Plutôt en semaine.'],
			[joinB, 'Partant·e aussi, je peux ramener un ampli.'],
			[P(owner), 'Super, je propose jeudi 20 h au Comptoir.']
		];
		const discussion = await prisma.groupDiscussion.create({
			select: { id: true },
			data: {
				title: name,
				creatorId: P(owner),
				createdAt: opened,
				lastMessageAt: new Date(opened.getTime() + lines.length * HOUR),
				members: {
					create: [
						{ actorId: P(owner), state: 'ACTIVE', joinedAt: opened, lastReadAt: opened },
						{ actorId: joinA, state: 'ACTIVE', joinedAt: opened },
						{ actorId: joinB, state: 'ACTIVE', joinedAt: opened },
						...waiting.map((actorId) => ({ actorId, state: 'INVITED' as const }))
					]
				},
				messages: {
					create: lines.map(([senderActorId, body], i) => ({
						senderActorId,
						body,
						createdAt: new Date(opened.getTime() + (i + 1) * HOUR)
					}))
				}
			}
		});
		for (const recipientActorId of waiting) {
			await prisma.notification.create({
				data: {
					recipientActorId,
					type: 'GROUP_DISCUSSION_INVITE',
					fromActorId: P(owner),
					href: `/messages/groupes/${discussion.id}`,
					title: name,
					createdAt: opened
				}
			});
		}
		discussions += 1;
	}
	console.log(`  · groupes de contacts : ${groups.length}, discussions de groupe : ${discussions}`);
}

/** La jam en cours (Café des Sons) : recréée si aucune ne l'est. */
async function refreshLive(ctx: Ctx, venueId: string, handles: string[], adult: Set<string>) {
	const now = Date.now();
	const live = await ctx.prisma.opportunity.findFirst({
		where: {
			title: { startsWith: LIVE_PREFIX },
			startsAt: { lte: new Date(now) },
			endsAt: { gte: new Date(now) }
		},
		select: { id: true }
	});
	if (live) return;
	const P = (h: string) => id(ctx, h);
	const row = await jam(ctx, {
		issuer: 'zoe-violon',
		lead: 'zoe-violon',
		venueId,
		title: `${LIVE_PREFIX} au Café des Sons`,
		description: 'La jam de ce soir : entre, sors ton instrument, on joue.',
		genre: 'folk',
		startsAt: new Date(now - HOUR),
		endsAt: new Date(now + 2 * HOUR),
		spots: [
			['guitare-acoustique', 1],
			['chant', 1]
		],
		backline: ['PA_MICS']
	});
	const crew = ['zoe-violon', 'lucas-sax', 'theo-basse', 'ines-chant', 'clara-guitare'].filter(
		(h) => handles.includes(h) && adult.has(P(h))
	);
	for (const [i, h] of crew.entries()) {
		await ctx.prisma.jamAttendance.create({
			data: {
				opportunityId: row.id,
				actorId: P(h),
				instrumentId: await instrumentId(ctx.prisma, ctx.plays.get(h) || 'chant'),
				// Trois ont déjà dit « J'y étais » : on peut les apprécier.
				attendedAt: i < 3 ? new Date(now - HOUR / 2) : null,
				createdAt: new Date(now - DAY)
			}
		});
	}
	console.log('  · jam en cours : Bœuf du moment au Café des Sons');
}

/** « Je suis dispo » : six adultes, créneaux à jour (jamais Jade, D5). */
async function refreshDispos(ctx: Ctx, handles: string[], adult: Set<string>) {
	const P = (h: string) => id(ctx, h);
	const now = new Date();
	const spec: [string, 'TONIGHT' | 'TOMORROW' | 'WEEKEND', number, string | null][] = [
		['zoe-violon', 'TONIGHT', 6, 'Envie de jazz manouche ce soir'],
		['theo-basse', 'TONIGHT', 5, 'Basse dans le coffre, funk ou soul'],
		['ines-chant', 'TONIGHT', 4, 'Je chante, cherche guitare ou piano'],
		['kevin-metal', 'WEEKEND', 96, 'Riffs lourds, ampli dans le coffre'],
		['hugo-dj', 'TOMORROW', 30, null],
		['manon-ukulele', 'TOMORROW', 28, 'Ukulélé et voix, folk tranquille']
	];
	const rows = spec.filter(([h]) => handles.includes(h) && adult.has(P(h)));
	await ctx.prisma.availability.deleteMany({ where: { actorId: { in: rows.map(([h]) => P(h)) } } });
	await ctx.prisma.availability.createMany({
		data: rows.map(([h, slot, hours, note]) => ({
			actorId: P(h),
			slot,
			startsAt: now,
			endsAt: new Date(now.getTime() + hours * HOUR),
			note
		}))
	});
	console.log(`  · « Je suis dispo » : ${rows.length} musicien·nes`);
}
