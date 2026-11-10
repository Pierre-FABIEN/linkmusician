/**
 * Calibrage du barème des métiers du son par personas simulés (P4-01,
 * conception 02 §2.3). Chaque persona rejoue six mois d'activité typique,
 * avec des artistes TL1 le premier mois du pilote, puis TL2 (comme la revue
 * de phase 2). Si une modification du barème fait sortir un persona de sa
 * cible, ce test échoue.
 */
import { describe, expect, it } from 'vitest';
import type { CraftService, CraftTrack } from './crafts';
import { SERVICE_TRACK } from './crafts';
import { MemoryLedger } from './memory';
import { craftTier, studioTier, type CraftSummary } from './tiers';
import type { TrustLevel } from './trust';

const start = new Date('2026-01-05T10:00:00Z');
const day = (n: number) => new Date(start.getTime() + n * 86_400_000);
const WEEK = 7;
let seq = 0;

/** Rejoue l'activité d'une personne du son et suit son rang semaine après semaine. */
class Pro {
	readonly ledger = new MemoryLedger();
	private projects = 0;
	private artists = new Set<string>();
	private releases = 0;
	private listening = 0;
	/** Semaine où chaque rang est atteint pour la première fois. */
	readonly reachedAt: Record<string, number> = {};
	readonly levelAt: Record<number, number> = {};

	constructor(
		readonly id: string,
		readonly track: CraftTrack
	) {}

	/** Artistes TL1 le premier mois, TL2 ensuite. */
	private trust(artists: string[], week: number) {
		for (const a of artists) this.ledger.setTrust(a, (week < 4 ? 1 : 2) as TrustLevel);
	}

	listen() {
		this.listening++;
	}

	work(week: number, service: CraftService, artists: string[], offset = 0) {
		expect(SERVICE_TRACK[service]).toBe(this.track);
		this.trust(artists, week);
		this.ledger.apply({
			id: `e${++seq}`,
			occurredAt: day(week * WEEK + offset),
			type: 'collaboration.completed',
			collaborationId: `c${seq}`,
			participantIds: [this.id, ...artists],
			services: { [this.id]: service }
		});
		this.projects++;
		for (const a of artists) this.artists.add(a);
	}

	release(week: number) {
		this.ledger.apply({
			id: `e${++seq}`,
			occurredAt: day(week * WEEK + 6),
			type: 'release.credit_verified',
			actorId: this.id,
			releaseId: `r${seq}`,
			track: this.track
		});
		this.releases++;
	}

	summary(): CraftSummary {
		return {
			listeningWorks: this.listening,
			projects: this.projects,
			distinctArtists: this.artists.size,
			verifiedReleaseCredits: this.releases
		};
	}

	/** À appeler en fin de semaine. */
	endOfWeek(week: number) {
		for (const id of craftTier(this.summary()).reached) this.reachedAt[id] ??= week + 1;
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

/** Un groupe client : deux musicien·nes qui confirment. */
const band = (n: number) => [`b${n}-a`, `b${n}-b`];

describe('personas des métiers du son (conception 02 §2.3)', () => {
	it('Ingé son de studio : un client toutes les 2 semaines, enregistrement puis mixage', () => {
		const sam = new Pro('sam', 'SOUND_ENGINEER');
		sam.listen();
		for (let week = 0; week < 26; week++) {
			const client = Math.floor(week / 2);
			if (week % 2 === 0) sam.work(week, 'RECORDING', band(client));
			else {
				sam.work(week, 'MIXING', band(client));
				if (client % 2 === 0) sam.work(week, 'MASTERING', band(client), 3);
			}
			if (week === 20) sam.release(week);
			sam.endOfWeek(week);
		}
		// Niveau 5 en 1 à 3 mois, comme qui joue ; Portfolio dès le 3ᵉ client.
		expect(sam.levels).toEqual([3, 7, 11]);
		expect(sam.reachedAt.PORTFOLIO).toBeLessThanOrEqual(6);
		// « Établi·e » attend une sortie vérifiée, même avec 30 projets.
		expect(sam.reachedAt.ESTABLISHED).toBe(21);
	});

	it('Ingé son live : deux dates en façade par mois, presque toujours des groupes différents', () => {
		const ines = new Pro('ines', 'SOUND_ENGINEER');
		for (let week = 0; week < 26; week++) {
			if (week % 2 === 0) ines.work(week, 'LIVE_SOUND', band(100 + (week % 12 === 0 ? 0 : week)));
			ines.endOfWeek(week);
		}
		expect(ines.levels).toEqual([2, 4, 6]);
		expect(ines.reachedAt.PORTFOLIO).toBeLessThanOrEqual(13);
		// Pas de travail en écoute : pas de « Home studio », sans gêner la suite.
		expect(ines.reachedAt.HOME_STUDIO).toBeUndefined();
	});

	it('Home studio : un mixage par mois pour deux ami·es, à tour de rôle', () => {
		const hugo = new Pro('hugo', 'SOUND_ENGINEER');
		hugo.listen();
		for (let week = 0; week < 26; week++) {
			if (week % 4 === 0) hugo.work(week, 'MIXING', [week % 8 === 0 ? 'ami-1' : 'ami-2']);
			hugo.endOfWeek(week);
		}
		// Deux ami·es ne font pas un portfolio : il faut trois artistes.
		expect(hugo.levels).toEqual([2, 4, 4]);
		expect(hugo.reachedAt.PORTFOLIO).toBeUndefined();
		expect(craftTier(hugo.summary()).tier?.id).toBe('FIRST_PROJECTS');
	});

	it('Productrice urbaine : deux productions par mois, six artistes qui reviennent', () => {
		const nora = new Pro('nora', 'PRODUCER');
		nora.listen();
		for (let week = 0; week < 26; week++) {
			if (week % 2 === 0) nora.work(week, 'PRODUCTION', [`rap-${(week / 2) % 6}`]);
			if (week % 6 === 3) nora.work(week, 'ARRANGEMENT', [`rap-${week % 6}`]);
			nora.endOfWeek(week);
		}
		expect(nora.levels).toEqual([3, 7, 8]);
		expect(nora.reachedAt.PORTFOLIO).toBeLessThanOrEqual(13);
		expect(nora.reachedAt.ESTABLISHED).toBeUndefined();
		// Tout va sur la piste producteur·rice, rien sur la piste ingé son.
		expect(nora.ledger.xp('nora', 'SOUND_ENGINEER')).toBe(0);
	});

	it('Farmeur du son : 40 sessions avec deux comptes TL0', () => {
		const l = new MemoryLedger({ f1: 0, f2: 0 });
		for (let i = 0; i < 40; i++)
			l.apply({
				id: `e${++seq}`,
				occurredAt: day(2 + i * 2),
				type: 'collaboration.completed',
				collaborationId: `f${i}`,
				participantIds: ['farmeur', i % 2 ? 'f1' : 'f2'],
				services: { farmeur: 'RECORDING' }
			});
		// Pas plus qu'un Curieux (310 XP, niveau 3) : rendements et confiance.
		expect(l.xp('farmeur')).toBeLessThanOrEqual(310);
		expect(l.level('farmeur')).toBeLessThanOrEqual(3);
	});

	it('Studio associatif : deux sessions par semaine', () => {
		let week = 0;
		const reachedAt: Record<string, number> = {};
		const clients = new Set<string>();
		let sessions = 0;
		for (; week < 26; week++) {
			for (let k = 0; k < 2; k++) {
				sessions++;
				clients.add(`client-${(week * 2 + k) % 14}`);
			}
			const s = { published: true, sessions, distinctClients: clients.size, verifiedReleases: 0 };
			for (const id of studioTier(s).reached) reachedAt[id] ??= week + 1;
		}
		expect(reachedAt.ACTIVE).toBeLessThanOrEqual(4);
		expect(reachedAt.RECOGNIZED).toBeLessThanOrEqual(13);
		expect(reachedAt.ESSENTIAL).toBeUndefined();
	});

	it('D20 : une même session crédite chacun·e sur sa piste', () => {
		const l = new MemoryLedger({ lea: 2, malik: 2, sam: 2 });
		const gains = l.apply({
			id: `e${++seq}`,
			occurredAt: day(10),
			type: 'collaboration.completed',
			collaborationId: 'session',
			participantIds: ['lea', 'malik', 'sam'],
			services: { sam: 'RECORDING' }
		});
		expect(gains.map((g) => [g.actorId, g.track, g.amount, g.reason])).toEqual([
			['lea', 'MUSICIAN', 400, 'Collaboration confirmée'],
			['malik', 'MUSICIAN', 400, 'Collaboration confirmée'],
			['sam', 'SOUND_ENGINEER', 300, 'Session d’enregistrement confirmée']
		]);
		// Le niveau de compte additionne les pistes de la personne.
		l.apply({
			id: `e${++seq}`,
			occurredAt: day(11),
			type: 'collaboration.completed',
			collaborationId: 'jam-band',
			participantIds: ['sam', 'lea']
		});
		expect(l.xp('sam', 'MUSICIAN')).toBe(200);
		expect(l.level('sam')).toBe(3);
	});

	it('un crédit de sortie vérifiée rapporte 300 sur la piste créditée', () => {
		const l = new MemoryLedger();
		const [gain] = l.apply({
			id: `e${++seq}`,
			occurredAt: day(30),
			type: 'release.credit_verified',
			actorId: 'nora',
			releaseId: 'ep-1',
			track: 'PRODUCER'
		});
		expect(gain).toMatchObject({ track: 'PRODUCER', amount: 300, multiplier: 1 });
	});

	it('rangs : conditions, pas un seuil d’XP', () => {
		const base = { listeningWorks: 0, projects: 0, distinctArtists: 0, verifiedReleaseCredits: 0 };
		expect(craftTier(base).tier).toBeNull();
		expect(craftTier({ ...base, projects: 30, distinctArtists: 2 }).tier?.id).toBe(
			'FIRST_PROJECTS'
		);
		expect(craftTier({ ...base, projects: 30, distinctArtists: 12 }).tier?.id).toBe('PORTFOLIO');
		expect(
			craftTier({ ...base, projects: 30, distinctArtists: 12, verifiedReleaseCredits: 5 }).tier?.id
		).toBe('REFERENCE');
		expect(
			studioTier({ published: false, sessions: 0, distinctClients: 0, verifiedReleases: 0 }).tier
		).toBeNull();
	});
});
