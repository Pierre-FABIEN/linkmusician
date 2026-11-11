/**
 * Calibrage du barème et des rangs de la scène par personas simulés (P5-01,
 * conception 02 §2.3, 08 §8 à §10 et §14). Chaque persona rejoue six mois
 * (un an pour les rangs lents) d'activité typique, avec des artistes TL1 le
 * premier mois du pilote, puis TL2 (comme `personas-son.test.ts`). Si une
 * modification du barème ou des rangs fait sortir un persona de sa cible,
 * ce test échoue.
 */
import { describe, expect, it } from 'vitest';
import { MemoryLedger } from './memory';
import {
	agentTier,
	promoterTier,
	venueTier,
	type AgentSummary,
	type PromoterSummary,
	type VenueSummary
} from './tiers';
import type { TrustLevel } from './trust';
import type { Track } from './types';

const start = new Date('2026-01-05T10:00:00Z');
const day = (n: number) => new Date(start.getTime() + n * 86_400_000);
const WEEK = 7;
let seq = 0;

/** Une personne qui confirme pour l'artiste (un·e membre du groupe). */
const confirmer = (artist: string) => `${artist}-membre`;

type Gig = {
	artists: string[];
	/** Artistes de l'affiche dont c'est la toute première date. */
	firsts?: string[];
	verified?: boolean;
	offset?: number;
	/** Lieu de la date (le lieu de la scène par défaut). */
	venue?: string;
};

/**
 * Une scène : qui organise (ou booke), le lieu éventuel, et le registre. Suit
 * le rang de l'organisateur·rice, du lieu et de l'agent semaine après semaine.
 */
class Scene {
	readonly ledger = new MemoryLedger();
	readonly promoter = { events: 0, artists: new Set<string>(), festivals: 0 };
	readonly venue = { published: true, dates: 0, artists: new Set<string>(), touring: 0 };
	readonly agent = { artists: new Set<string>(), developed: 0 };
	readonly reachedAt: Record<string, number> = {};
	readonly levelAt: Record<number, number> = {};

	constructor(
		readonly id: string,
		readonly role: 'organizer' | 'booker',
		readonly track: Track
	) {}

	/** Artistes TL1 le premier mois, TL2 ensuite. */
	private trust(artists: string[], week: number) {
		for (const a of artists) this.ledger.setTrust(confirmer(a), (week < 4 ? 1 : 2) as TrustLevel);
	}

	gig(week: number, { artists, firsts = [], verified = false, offset = 4, venue = 'lieu' }: Gig) {
		this.trust(artists, week);
		this.ledger.apply({
			id: `e${++seq}`,
			occurredAt: day(week * WEEK + offset),
			type: 'gig.held',
			gigId: `g${seq}`,
			organizerIds: this.role === 'organizer' ? [this.id] : [],
			bookerIds: this.role === 'booker' ? [this.id] : [],
			performerIds: artists,
			confirmerIds: artists.map(confirmer),
			venueOrgId: venue,
			firstDateIds: firsts,
			verified
		});
		this.promoter.events++;
		this.venue.dates++;
		for (const a of artists) {
			this.promoter.artists.add(a);
			this.venue.artists.add(a);
		}
		if (verified && artists.length >= 10) this.promoter.festivals++;
	}

	/** Jam publique tenue au lieu (P5-04) : compte pour le rang du lieu, sans XP ici. */
	jam() {
		this.venue.dates++;
	}

	manage(week: number, artist: string, kind: 'MANAGER' | 'BOOKER') {
		this.trust([artist], week);
		this.ledger.apply({
			id: `e${++seq}`,
			occurredAt: day(week * WEEK + 2),
			type: 'management.confirmed',
			managerId: this.id,
			artistId: artist,
			confirmedById: confirmer(artist),
			kind
		});
		this.agent.artists.add(artist);
	}

	promoterSummary(): PromoterSummary {
		return {
			events: this.promoter.events,
			distinctArtists: this.promoter.artists.size,
			verifiedFestivals: this.promoter.festivals
		};
	}

	venueSummary(): VenueSummary {
		return {
			published: this.venue.published,
			dates: this.venue.dates,
			distinctArtists: this.venue.artists.size,
			touringAlumni: this.venue.touring
		};
	}

	agentSummary(): AgentSummary {
		return { artists: this.agent.artists.size, developedArtists: this.agent.developed };
	}

	/** À appeler en fin de semaine. */
	endOfWeek(week: number) {
		const reached = [
			...promoterTier(this.promoterSummary()).reached.map((id) => `promoter.${id}`),
			...venueTier(this.venueSummary()).reached.map((id) => `venue.${id}`),
			...agentTier(this.agentSummary()).reached.map((id) => `agent.${id}`)
		];
		for (const id of reached) this.reachedAt[id] ??= week + 1;
		this.levelAt[week + 1] = this.ledger.level(this.id);
	}

	/** Niveau à 1, 3 et 6 mois (semaines 4, 13 et 26). */
	get levels() {
		return [this.levelAt[4], this.levelAt[13], this.levelAt[26]];
	}

	get xp() {
		return this.ledger.xp(this.id, this.track);
	}
}

describe('personas de la scène (conception 02 §2.3, 08 §8 à §10, §14)', () => {
	it('Bar à scène ouverte : une jam chaque jeudi, un concert par mois', () => {
		const bar = new Scene('bar', 'organizer', 'PROMOTER');
		for (let week = 0; week < 26; week++) {
			bar.jam();
			if (week % 4 === 2) bar.gig(week, { artists: [`bar-groupe-${week}`] });
			bar.endOfWeek(week);
		}
		// Le lieu devient une scène ouverte dès la 3ᵉ semaine, grâce aux jams.
		expect(bar.reachedAt['venue.OPEN_STAGE']).toBe(3);
		// Six concerts en six mois : pas encore un lieu de la scène locale.
		expect(bar.reachedAt['venue.LOCAL_VENUE']).toBeUndefined();
		expect(bar.reachedAt['promoter.REGULAR']).toBe(19);
		// Les jams ne rapportent pas d'XP ici (P5-04) : niveau modeste.
		expect(bar.levels).toEqual([2, 3, 5]);
	});

	it('Café-concert : deux soirées par semaine, des groupes qui reviennent', () => {
		const cafe = new Scene('cafe', 'organizer', 'PROMOTER');
		let n = 0;
		for (let week = 0; week < 26; week++) {
			for (const offset of [4, 5]) {
				// 40 groupes en rotation, une deuxième partie une fois sur deux.
				const artists = [`cafe-${n % 40}`];
				if (n % 2 === 0) artists.push(`cafe-${(n + 17) % 40}`);
				cafe.gig(week, { artists, offset, firsts: n % 10 === 0 ? [artists[0]] : [] });
				n++;
			}
			cafe.endOfWeek(week);
		}
		expect(cafe.reachedAt['promoter.REGULAR']).toBe(3);
		expect(cafe.reachedAt['venue.OPEN_STAGE']).toBe(2);
		expect(cafe.reachedAt['venue.LOCAL_VENUE']).toBe(10);
		// Scène locale en un trimestre : 20 soirées, 30 groupes distincts.
		expect(cafe.reachedAt['promoter.LOCAL_SCENE']).toBeGreaterThanOrEqual(8);
		expect(cafe.reachedAt['promoter.LOCAL_SCENE']).toBeLessThanOrEqual(13);
		// Un peu au-dessus de l'ingé son de studio (3, 7, 11) : deux dates par semaine.
		expect(cafe.levels).toEqual([4, 9, 12]);
		// Sans groupe passé en tournée, pas de lieu culte.
		expect(cafe.reachedAt['venue.CULT_VENUE']).toBeUndefined();
	});

	it('MJC : un tremplin par mois, trois jeunes groupes dont deux débutent', () => {
		const mjc = new Scene('mjc', 'organizer', 'PROMOTER');
		for (let week = 0; week < 26; week++) {
			if (week % 4 === 1) {
				const artists = [0, 1, 2].map((k) => `mjc-${week}-${k}`);
				mjc.gig(week, { artists, firsts: artists.slice(0, 2) });
			}
			mjc.endOfWeek(week);
		}
		expect(mjc.reachedAt['promoter.FIRST_EVENT']).toBe(2);
		expect(mjc.reachedAt['venue.OPEN_STAGE']).toBe(10);
		expect(mjc.reachedAt['promoter.REGULAR']).toBe(18);
		// Lancer des groupes rapporte : autant qu'un concert de plus.
		expect(mjc.levels).toEqual([2, 5, 7]);
	});

	it('Association organisatrice : une soirée par mois, puis un festival vérifié', () => {
		const asso = new Scene('asso', 'organizer', 'PROMOTER');
		for (let week = 0; week < 52; week++) {
			if (week % 4 === 0) {
				asso.gig(week, { artists: [0, 1, 2].map((k) => `asso-${(week / 4) * 3 + k}`) });
			}
			if (week === 30) {
				const artists = Array.from({ length: 12 }, (_, k) => `festival-${k}`);
				asso.gig(week, { artists, offset: 5, verified: true });
			}
			asso.endOfWeek(week);
		}
		expect(asso.reachedAt['promoter.REGULAR']).toBe(17);
		// Le festival (12 groupes, organisation vérifiée) donne le rang d'un coup.
		expect(asso.reachedAt['promoter.FESTIVAL']).toBe(31);
		// 14 événements en un an : la scène locale attend encore.
		expect(asso.reachedAt['promoter.LOCAL_SCENE']).toBeUndefined();
		expect(asso.levels).toEqual([2, 4, 5]);
	});

	it('Booker indépendant : quatre artistes, trois dates par mois', () => {
		const bk = new Scene('booker', 'booker', 'BOOKER');
		const roster = ['bk-a', 'bk-b', 'bk-c', 'bk-d'];
		for (let week = 0; week < 26; week++) {
			if (week < roster.length) bk.manage(week, roster[week], 'BOOKER');
			// Neuf salles de la région, chacune revient tous les trois mois environ.
			if (week % 4 !== 3)
				bk.gig(week, { artists: [roster[week % roster.length]], venue: `salle-${week % 9}` });
			// Un artiste du roster passe Démo puis Live sous son accompagnement.
			if (week === 20) bk.agent.developed = 1;
			bk.endOfWeek(week);
		}
		expect(bk.reachedAt['agent.FIRST_ARTIST']).toBe(1);
		expect(bk.reachedAt['agent.DEVELOPER']).toBe(21);
		expect(bk.reachedAt['agent.AGENCY']).toBeUndefined();
		// Les mêmes artistes reviennent, mais dans des salles différentes : pas de frein.
		expect(bk.levels).toEqual([2, 5, 7]);
		// L'accompagnement d'un booker ne rapporte rien : ses points viennent des dates.
		expect(bk.ledger.gains.filter((g) => g.ruleId === 'management.confirmed')).toEqual([]);
		expect(bk.ledger.xp('booker', 'PROMOTER')).toBe(0);
	});

	it('Booker qui élargit son roster : un nouvel artiste par mois', () => {
		const bk = new Scene('booker-2', 'booker', 'BOOKER');
		const roster: string[] = [];
		for (let week = 0; week < 26; week++) {
			if (week % 4 === 0) {
				roster.push(`bk2-${week / 4}`);
				bk.manage(week, roster.at(-1)!, 'BOOKER');
			}
			if (week % 4 !== 3)
				bk.gig(week, {
					artists: [roster[(week * 3) % roster.length]],
					venue: `salle-${week % 7}`
				});
			bk.endOfWeek(week);
		}
		expect(bk.levels).toEqual([2, 5, 7]);
	});

	it('Manager débutant : un artiste au 2ᵉ mois, un deuxième au 4ᵉ', () => {
		const mgr = new Scene('manager', 'organizer', 'MANAGER');
		for (let week = 0; week < 52; week++) {
			if (week === 6) mgr.manage(week, 'mgr-a', 'MANAGER');
			if (week === 16) mgr.manage(week, 'mgr-b', 'MANAGER');
			if (week === 40) mgr.agent.developed = 1;
			mgr.endOfWeek(week);
		}
		expect(mgr.reachedAt['agent.FIRST_ARTIST']).toBe(7);
		expect(mgr.reachedAt['agent.DEVELOPER']).toBe(41);
		// Peu d'XP en propre : sa carrière monte avec ses artistes (part de 10 %, Q21).
		expect(mgr.xp).toBe(400);
		expect(mgr.levels).toEqual([1, 2, 3]);
	});

	it('Farmeur de dates : 40 concerts « confirmés » par deux comptes TL0', () => {
		const l = new MemoryLedger({ 'f1-membre': 0, 'f2-membre': 0 });
		for (let i = 0; i < 40; i++) {
			const artist = i % 2 ? 'f1' : 'f2';
			l.apply({
				id: `e${++seq}`,
				occurredAt: day(2 + i * 2),
				type: 'gig.held',
				gigId: `fg${i}`,
				organizerIds: ['farmeur'],
				performerIds: [artist],
				confirmerIds: [`${artist}-membre`],
				firstDateIds: i < 2 ? [artist] : [],
				verified: false
			});
		}
		// Pas plus qu'un Curieux (niveau 3) : rendements par artiste et confiance.
		expect(l.xp('farmeur')).toBe(90);
		expect(l.level('farmeur')).toBeLessThanOrEqual(3);
	});
});

describe('règles de la scène', () => {
	it('gig.held : rien pour les musicien·nes, 200 à qui organise, 150 à qui booke', () => {
		const l = new MemoryLedger({ 'g-membre': 2, lea: 2 });
		const gains = l.apply({
			id: `e${++seq}`,
			occurredAt: day(10),
			type: 'gig.held',
			gigId: 'date',
			organizerIds: ['orga'],
			bookerIds: ['bk'],
			performerIds: ['groupe', 'lea'],
			confirmerIds: ['g-membre', 'lea'],
			venueOrgId: 'lieu',
			firstDateIds: ['groupe'],
			verified: true
		});
		expect(gains.map((g) => [g.actorId, g.track, g.amount, g.reason])).toEqual([
			['orga', 'PROMOTER', 200, 'Événement tenu'],
			['bk', 'BOOKER', 150, 'Date bookée et jouée'],
			['orga', 'PROMOTER', 100, 'Artiste programmé pour sa première date']
		]);
		expect(l.xp('lea')).toBe(0);
		expect(l.xp('groupe')).toBe(0);
		// Le lieu gagne un rang, jamais d'XP (Q24).
		expect(l.xp('lieu')).toBe(0);
	});

	it('gig.held : une date confirmée seulement par qui l’organise ne rapporte rien', () => {
		const l = new MemoryLedger({ orga: 3 });
		const gains = l.apply({
			id: `e${++seq}`,
			occurredAt: day(10),
			type: 'gig.held',
			gigId: 'auto',
			organizerIds: ['orga'],
			performerIds: ['orga', 'groupe'],
			confirmerIds: ['orga'],
			verified: false
		});
		expect(gains).toEqual([]);
	});

	it('gig.held : jouer à sa propre soirée ne compte pas comme artiste programmé', () => {
		const l = new MemoryLedger({ 'g-membre': 2 });
		const gains = l.apply({
			id: `e${++seq}`,
			occurredAt: day(10),
			type: 'gig.held',
			gigId: 'soiree',
			organizerIds: ['orga'],
			performerIds: ['orga'],
			confirmerIds: ['g-membre'],
			firstDateIds: ['orga'],
			verified: false
		});
		expect(gains).toEqual([]);
	});

	it('gig.held : la même affiche revient, × 1, × 0,5, × 0,25, puis 0', () => {
		const l = new MemoryLedger({ 'g-membre': 2 });
		const amounts = [0, 1, 2, 3].map(
			(i) =>
				l.apply({
					id: `e${++seq}`,
					occurredAt: day(10 + i * 7),
					type: 'gig.held',
					gigId: `r${i}`,
					organizerIds: ['orga'],
					performerIds: ['groupe'],
					confirmerIds: ['g-membre'],
					verified: false
				})[0]?.amount ?? 0
		);
		expect(amounts).toEqual([200, 100, 50, 0]);
	});

	it('gig.held : le booker décroît par artiste et par lieu, l’organisateur par artiste', () => {
		const l = new MemoryLedger({ 'g-membre': 2 });
		const date = (venueOrgId: string, i: number) =>
			l.apply({
				id: `e${++seq}`,
				occurredAt: day(10 + i * 7),
				type: 'gig.held',
				gigId: `t${i}`,
				organizerIds: [],
				bookerIds: ['bk'],
				performerIds: ['groupe'],
				confirmerIds: ['g-membre'],
				venueOrgId,
				verified: false
			})[0]?.amount ?? 0;
		expect([date('a', 0), date('b', 1), date('a', 2), date('c', 3)]).toEqual([150, 150, 75, 150]);
	});

	it('management.confirmed : 200 au manager, rien à soi-même ni au booker', () => {
		const l = new MemoryLedger({ artiste: 2, mgr: 2 });
		const confirm = (managerId: string, confirmedById: string, kind: 'MANAGER' | 'BOOKER') =>
			l.apply({
				id: `e${++seq}`,
				occurredAt: day(20),
				type: 'management.confirmed',
				managerId,
				artistId: 'artiste',
				confirmedById,
				kind
			});
		expect(confirm('mgr', 'artiste', 'MANAGER')).toMatchObject([
			{ actorId: 'mgr', track: 'MANAGER', amount: 200, multiplier: 1 }
		]);
		expect(confirm('mgr', 'mgr', 'MANAGER')).toEqual([]);
		expect(confirm('bk', 'artiste', 'BOOKER')).toEqual([]);
	});

	it('rangs de la scène : des conditions, pas un seuil d’XP', () => {
		expect(promoterTier({ events: 0, distinctArtists: 0, verifiedFestivals: 0 }).tier).toBeNull();
		expect(promoterTier({ events: 40, distinctArtists: 12, verifiedFestivals: 0 }).tier?.id).toBe(
			'REGULAR'
		);
		expect(promoterTier({ events: 1, distinctArtists: 12, verifiedFestivals: 1 }).tier?.id).toBe(
			'FESTIVAL'
		);
		expect(agentTier({ artists: 0, developedArtists: 0 }).tier).toBeNull();
		expect(agentTier({ artists: 12, developedArtists: 2 }).tier?.id).toBe('DEVELOPER');
		expect(agentTier({ artists: 5, developedArtists: 3 }).tier?.id).toBe('AGENCY');
		const venue = { published: false, dates: 0, distinctArtists: 0, touringAlumni: 0 };
		expect(venueTier(venue).tier).toBeNull();
		expect(venueTier({ ...venue, published: true, dates: 80, distinctArtists: 10 }).tier?.id).toBe(
			'OPEN_STAGE'
		);
		expect(
			venueTier({ ...venue, published: true, dates: 50, distinctArtists: 40, touringAlumni: 5 })
				.tier?.id
		).toBe('CULT_VENUE');
	});
});
