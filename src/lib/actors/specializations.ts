/**
 * Référentiel des spécialités et des intentions par métier (ONB-01, D56).
 * Module pur, partagé par le serveur et le navigateur.
 *
 * Quatre vocabulaires distincts, jamais mélangés :
 * - **spécialité** : ce que la personne exerce dans un métier (ici) ;
 * - **compétences** : les référentiels existants (instruments, genres) ;
 * - **je propose** (`OFFER`) et **je recherche** (`NEED`) : deux listes de
 *   codes par métier, indépendantes. Elles sont vides ici : chaque lot de
 *   métier (ONB-03 à ONB-11) remplit les siennes.
 *
 * Une entrée est identifiée par la paire `(métier, code)` : `ARRANGEMENT`
 * existe pour les producteur·rices, `ARRANGER` pour les musicien·nes, sans
 * confusion. Un code n'est **jamais supprimé** ni renommé, car des profils y
 * font référence : on le marque `retired`. La personne qui l'avait le garde,
 * personne ne peut plus l'ajouter.
 *
 * Les codes déjà en base (enums `SoundSpecialty`, `ProducerSpecialty`,
 * `PromoterEventKind`) sont repris à l'identique (`legacy`), avec leurs
 * libellés : ils restent la source de la recherche jusqu'à ONB-04, 05 et 08.
 *
 * Le statut suit le métier : un métier « bientôt » (D15) a des spécialités
 * « bientôt ». Ce module n'ouvre aucun métier.
 *
 * Aucune spécialité n'impose un instrument (Epic ONB). Les spécialités
 * musicien·ne ne sont jamais exigées ni déduites des instruments (Q42).
 */
import { TRACK_KINDS, TRACKS, type TrackKindValue } from './tracks';
import { SOUND_SPECIALTIES, SOUND_SPECIALTY_INFO } from '#lib/crafts/sound';
import { PRODUCER_SPECIALTIES, PRODUCER_SPECIALTY_INFO } from '#lib/crafts/producer';
import { PROMOTER_EVENT_KINDS, PROMOTER_EVENT_KIND_INFO } from '#lib/crafts/promoter';

export type SpecializationStatus = 'active' | 'soon' | 'retired';

/** Pour les musicien·nes : un instrument, la voix et une profession restent distincts. */
export type MusicianSpecializationGroup = 'instrument' | 'voice' | 'role';

/**
 * Champ propre à une spécialité (sous-formulaire), décrit par les lots
 * ONB-03 à ONB-11. Un champ absent ou vide vaut « inconnu », jamais « non ».
 */
export type ConditionalField = {
	key: string;
	label: string;
	kind: 'boolean' | 'single' | 'multi' | 'text';
	options?: readonly { code: string; label: string }[];
};

type Definition = {
	code: string;
	label: string;
	description: string;
	group?: MusicianSpecializationGroup;
	/** Retirée du catalogue : conservée chez qui l'avait, plus proposée. */
	retired?: true;
	/** Valeur d'un enum Prisma existant, reprise telle quelle. */
	legacy?: true;
	fields?: readonly ConditionalField[];
};

export type SpecializationInfo = {
	track: TrackKindValue;
	code: string;
	label: string;
	description: string;
	status: SpecializationStatus;
	legacy: boolean;
	group: MusicianSpecializationGroup | null;
	fields: readonly ConditionalField[];
};

/** Reprend un code existant avec son libellé : une seule source pour les deux écrans. */
function legacy<C extends string>(
	code: C,
	info: Readonly<Record<C, { label: string; hint: string }>>
): Definition {
	return { code, label: info[code].label, description: info[code].hint, legacy: true };
}

const sound = <C extends (typeof SOUND_SPECIALTIES)[number]>(code: C) =>
	legacy(code, SOUND_SPECIALTY_INFO);
const producer = <C extends (typeof PRODUCER_SPECIALTIES)[number]>(code: C) =>
	legacy(code, PRODUCER_SPECIALTY_INFO);
const promoter = <C extends (typeof PROMOTER_EVENT_KINDS)[number]>(code: C) =>
	legacy(code, PROMOTER_EVENT_KIND_INFO);

/** Catalogue, dans l'ordre d'affichage de chaque métier. */
const DEFINITIONS: Readonly<Record<TrackKindValue, readonly Definition[]>> = {
	MUSICIAN: [
		{
			code: 'GUITARIST',
			group: 'instrument',
			label: 'Guitariste',
			description: 'Guitare électrique, acoustique ou classique.'
		},
		{
			code: 'BASSIST',
			group: 'instrument',
			label: 'Bassiste',
			description: 'Basse électrique, contrebasse.'
		},
		{
			code: 'DRUMMER',
			group: 'instrument',
			label: 'Batteur·se',
			description: 'Batterie acoustique ou électronique.'
		},
		{
			code: 'PERCUSSIONIST',
			group: 'instrument',
			label: 'Percussionniste',
			description: 'Percussions à main, d’orchestre ou du monde.'
		},
		{
			code: 'PIANIST',
			group: 'instrument',
			label: 'Pianiste',
			description: 'Piano acoustique ou numérique.'
		},
		{
			code: 'KEYBOARDIST',
			group: 'instrument',
			label: 'Claviériste',
			description: 'Synthés, orgue, claviers de scène.'
		},
		{
			code: 'SINGER',
			group: 'voice',
			label: 'Chanteur·se ou choriste',
			description: 'Chant lead, chœurs, rap, spoken word.'
		},
		{
			code: 'STRINGS',
			group: 'instrument',
			label: 'Cordes frottées',
			description: 'Violon, alto, violoncelle.'
		},
		{
			code: 'BRASS',
			group: 'instrument',
			label: 'Cuivres',
			description: 'Trompette, trombone, tuba, cor.'
		},
		{
			code: 'WOODWINDS',
			group: 'instrument',
			label: 'Bois',
			description: 'Saxophone, flûte, clarinette, hautbois.'
		},
		{
			code: 'DJ',
			group: 'role',
			label: 'DJ',
			description: 'Tu mixes des morceaux en soirée ou en set.'
		},
		{
			code: 'COMPOSER',
			group: 'role',
			label: 'Compositeur·rice',
			description: 'Tu écris la musique : mélodies, harmonies, structure.'
		},
		{
			code: 'LYRICIST',
			group: 'role',
			label: 'Auteur·rice ou parolier·ère',
			description: 'Tu écris des textes et des paroles.'
		},
		{
			code: 'ARRANGER',
			group: 'role',
			label: 'Arrangeur·se',
			description: 'Tu écris les parties des autres instruments.'
		}
	],
	SOUND_ENGINEER: [
		sound('RECORDING'),
		sound('MIXING'),
		sound('MASTERING'),
		sound('LIVE_FOH'),
		sound('LIVE_MONITORS'),
		{
			code: 'EDITING_RESTORATION',
			label: 'Édition et restauration',
			description: 'Nettoyer, monter, restaurer des enregistrements.'
		},
		{
			code: 'BROADCAST',
			label: 'Broadcast',
			description: 'Le son pour la radio, la télévision, le streaming en direct.'
		},
		{
			code: 'SOUND_DESIGN',
			label: 'Sound design',
			description: 'Créer des sons pour l’image, le jeu, la scène.'
		},
		{ code: 'RF', label: 'Liaisons HF', description: 'Micros sans fil, ears, plans de fréquences.' }
	],
	PRODUCER: [
		{
			code: 'RECORD_PRODUCTION',
			label: 'Réalisation artistique',
			description: 'Diriger les séances et les choix artistiques d’un enregistrement.'
		},
		producer('PRODUCTION'),
		producer('BEATMAKING'),
		producer('ARRANGEMENT'),
		{
			code: 'TOPLINE',
			label: 'Composition et topline',
			description: 'Écrire la mélodie et la ligne vocale d’un titre.'
		},
		{
			code: 'ARTISTIC_DIRECTION',
			label: 'Direction artistique',
			description: 'Définir l’univers et la cohérence d’un projet.'
		},
		{
			code: 'EXECUTIVE_PRODUCTION',
			label: 'Production exécutive',
			description: 'Financer et piloter un projet : budget, planning, équipe.'
		},
		{
			code: 'ELECTRONIC_PRODUCTION',
			label: 'Production électronique',
			description: 'Produire des musiques électroniques, en studio ou en live.'
		}
	],
	MANAGER: [
		{
			code: 'ARTIST_MANAGEMENT',
			label: 'Management d’artiste ou de groupe',
			description: 'Accompagner la carrière au quotidien.'
		},
		{
			code: 'ARTIST_DEVELOPMENT',
			label: 'Développement et conseil',
			description: 'Structurer un projet, conseiller sur la stratégie.'
		},
		{
			code: 'TOUR_MANAGEMENT',
			label: 'Tour management',
			description: 'Encadrer une tournée sur la route.'
		},
		{
			code: 'AGENCY',
			label: 'Agence',
			description: 'Tu travailles au sein d’une agence de management.'
		}
	],
	BOOKER: [
		{
			code: 'ARTIST_BOOKING',
			label: 'Booking d’artistes',
			description: 'Trouver des dates pour les artistes que tu représentes.'
		},
		{
			code: 'TOUR_BOOKING',
			label: 'Booking de tournée',
			description: 'Construire une tournée, date après date.'
		},
		{
			code: 'PROGRAMMING',
			label: 'Programmation de salle ou de festival',
			description: 'Choisir les artistes d’un lieu ou d’un festival.'
		},
		{
			code: 'DIFFUSION',
			label: 'Diffusion',
			description: 'Vendre des spectacles aux salles, aux collectivités.'
		},
		{
			code: 'SHOWCASES',
			label: 'Showcases',
			description: 'Organiser des présentations devant des professionnel·les.'
		}
	],
	PROMOTER: [
		promoter('OPEN_STAGES'),
		promoter('CONCERTS'),
		promoter('FESTIVAL'),
		promoter('CLUB_NIGHTS'),
		{
			code: 'CONTEST',
			label: 'Tremplins',
			description: 'Des concours de groupes, avec un jury ou un public.'
		},
		promoter('TOURS'),
		{
			code: 'PRIVATE_EVENTS',
			label: 'Événements privés',
			description: 'Mariages, soirées d’entreprise, anniversaires.'
		}
	],
	LABEL_PRO: [
		{
			code: 'LABEL_DIRECTION',
			label: 'Direction de label',
			description: 'Diriger le label, sa ligne et ses moyens.'
		},
		{ code: 'A_AND_R', label: 'A&R', description: 'Repérer des artistes et les signer.' },
		{
			code: 'ARTIST_DEVELOPMENT',
			label: 'Suivi artistique',
			description: 'Accompagner les artistes signés dans leurs projets.'
		},
		{
			code: 'RECORDINGS',
			label: 'Production phonographique',
			description: 'Produire et financer des enregistrements.'
		},
		{
			code: 'DISTRIBUTION',
			label: 'Distribution',
			description: 'Mettre les sorties en plateformes et en magasins.'
		},
		{ code: 'MARKETING', label: 'Marketing', description: 'Préparer et accompagner les sorties.' },
		{
			code: 'CATALOG',
			label: 'Gestion de catalogue',
			description: 'Exploiter les enregistrements existants.'
		},
		{
			code: 'LICENSING',
			label: 'Licences',
			description: 'Céder des enregistrements à d’autres labels ou pays.'
		}
	],
	PUBLISHER: [
		{
			code: 'PUBLISHING',
			label: 'Édition musicale',
			description: 'Signer des auteur·rices et compositeur·rices, exploiter leurs œuvres.'
		},
		{
			code: 'ADMINISTRATION',
			label: 'Administration des œuvres',
			description: 'Déclarations, contrats, répartitions.'
		},
		{
			code: 'SYNC',
			label: 'Synchronisation',
			description: 'Placer des œuvres à l’image : film, pub, jeu.'
		},
		{
			code: 'PLACEMENT',
			label: 'Placement',
			description: 'Proposer des titres à des interprètes.'
		},
		{
			code: 'SUB_PUBLISHING',
			label: 'Sous-édition',
			description: 'Représenter un catalogue étranger sur un territoire.'
		},
		{
			code: 'LICENSING',
			label: 'Licences',
			description: 'Accorder des autorisations d’utilisation des œuvres.'
		},
		{
			code: 'MUSIC_SUPERVISION',
			label: 'Supervision musicale',
			description: 'Choisir la musique d’un film, d’une série, d’une pub.'
		}
	],
	MUSIC_COMMS: [
		{
			code: 'PRESS_RELATIONS',
			label: 'Relations presse',
			description: 'Faire connaître les projets aux médias.'
		},
		{
			code: 'JOURNALISM',
			label: 'Journalisme',
			description: 'Écrire sur la musique : chroniques, interviews.'
		},
		{
			code: 'COMMUNITY_MANAGEMENT',
			label: 'Community management',
			description: 'Animer les réseaux sociaux d’artistes ou de structures.'
		},
		{
			code: 'MARKETING',
			label: 'Marketing',
			description: 'Campagnes, stratégie de sortie, publicité.'
		},
		{
			code: 'CONTENT_CREATION',
			label: 'Création de contenu',
			description: 'Vidéos, posts, formats courts autour de la musique.'
		},
		{
			code: 'RADIO_PODCAST',
			label: 'Radio et podcast',
			description: 'Animer ou produire des émissions.'
		},
		{ code: 'PHOTO', label: 'Photo', description: 'Photos de concert, de presse, de pochette.' },
		{ code: 'VIDEO', label: 'Vidéo', description: 'Clips, captations, live sessions.' },
		{
			code: 'COMMUNICATION',
			label: 'Communication',
			description: 'Identité, supports, stratégie de communication.'
		}
	]
};

function statusOf(track: TrackKindValue, def: Definition): SpecializationStatus {
	if (def.retired) return 'retired';
	return TRACKS[track].available ? 'active' : 'soon';
}

/** Spécialités de chaque métier, dans l'ordre d'affichage, retirées comprises. */
/** Une valeur par métier, typée sans conversion. */
function byTrack<T>(make: (track: TrackKindValue) => T): Record<TrackKindValue, T> {
	const out = {} as Record<TrackKindValue, T>;
	for (const track of TRACK_KINDS) out[track] = make(track);
	return out;
}

/** Spécialités de chaque métier, dans l'ordre d'affichage, retirées comprises. */
export const SPECIALIZATIONS: Readonly<Record<TrackKindValue, readonly SpecializationInfo[]>> =
	byTrack((track) =>
		DEFINITIONS[track].map((def) => ({
			track,
			code: def.code,
			label: def.label,
			description: def.description,
			status: statusOf(track, def),
			legacy: def.legacy === true,
			group: def.group ?? null,
			fields: def.fields ?? []
		}))
	);

/** Spécialités qu'on peut encore choisir (hors retirées). */
export function selectableSpecializations(track: TrackKindValue): readonly SpecializationInfo[] {
	return SPECIALIZATIONS[track].filter((s) => s.status !== 'retired');
}

export function findSpecialization(track: TrackKindValue, code: string): SpecializationInfo | null {
	return SPECIALIZATIONS[track].find((s) => s.code === code) ?? null;
}

// ─── Intentions : « Je propose » et « Je recherche » ─────────────────────────

export const INTENT_DIRECTIONS = ['OFFER', 'NEED'] as const;
export type IntentDirection = (typeof INTENT_DIRECTIONS)[number];

export const INTENT_DIRECTION_LABELS: Readonly<Record<IntentDirection, string>> = {
	OFFER: 'Je propose',
	NEED: 'Je recherche'
};

export type IntentInfo = {
	code: string;
	label: string;
	description: string;
	retired?: true;
};

/**
 * Catalogues par métier et par sens. Deux listes séparées : un code de
 * l'offre n'est pas un code de la demande, même à libellé voisin.
 * Remplis par ONB-03 (musicien·ne) à ONB-11 (communication).
 */
export const INTENTS: Readonly<
	Record<TrackKindValue, Readonly<Record<IntentDirection, readonly IntentInfo[]>>>
> = byTrack(() => ({ OFFER: [], NEED: [] }));

// ─── Sélection d'une personne pour un métier ─────────────────────────────────

/** Les trois listes que l'on enregistre par métier. */
export const SELECTION_LISTS = ['specializations', 'offers', 'needs'] as const;
export type SelectionList = (typeof SELECTION_LISTS)[number];

export const MAX_CODES_PER_LIST = 30;

type Entry = { code: string; retired: boolean };

/** Catalogue d'une liste, dans l'ordre d'affichage. */
export function catalogOf(track: TrackKindValue, list: SelectionList): readonly Entry[] {
	if (list === 'specializations')
		return SPECIALIZATIONS[track].map((s) => ({ code: s.code, retired: s.status === 'retired' }));
	const direction: IntentDirection = list === 'offers' ? 'OFFER' : 'NEED';
	return INTENTS[track][direction].map((i) => ({ code: i.code, retired: i.retired === true }));
}

export type CodesCheck =
	{ ok: true; codes: string[] } | { ok: false; reason: 'unknown' | 'retired'; code: string };

/**
 * Vérifie et normalise une liste de codes : doublons retirés, ordre du
 * catalogue. Refuse un code inconnu (ou d'un autre métier) et l'**ajout**
 * d'un code retiré ; un code retiré que la personne avait déjà (`held`) est
 * conservé, même s'il n'est pas renvoyé par le formulaire, qui ne l'affiche
 * plus comme choix.
 */
export function checkCodes(
	track: TrackKindValue,
	list: SelectionList,
	codes: readonly string[],
	held: readonly string[] = []
): CodesCheck {
	const catalog = catalogOf(track, list);
	for (const code of codes) {
		const entry = catalog.find((e) => e.code === code);
		if (!entry) return { ok: false, reason: 'unknown', code };
		if (entry.retired && !held.includes(code)) return { ok: false, reason: 'retired', code };
	}
	const keep = (e: Entry) => codes.includes(e.code) || (e.retired && held.includes(e.code));
	return { ok: true, codes: catalog.filter(keep).map((e) => e.code) };
}

export const CODES_MESSAGES: Readonly<Record<Exclude<CodesCheck, { ok: true }>['reason'], string>> =
	{
		unknown: 'Ce choix n’existe pas pour ce métier.',
		retired: 'Ce choix n’est plus proposé.'
	};

/** Ce qu'une personne déclare pour un métier. */
export type TrackDetails = {
	track: TrackKindValue;
	specializations: string[];
	offers: string[];
	needs: string[];
};

/** Forme stockée : une ligne par code (`person_track_specializations`, `person_track_intents`). */
export type TrackDetailsRow = { track: TrackKindValue; list: SelectionList; code: string };

/** Lignes à enregistrer, dans l'ordre des métiers puis des catalogues. */
export function serializeTrackDetails(details: readonly TrackDetails[]): TrackDetailsRow[] {
	const rows: TrackDetailsRow[] = [];
	for (const track of TRACK_KINDS) {
		const d = details.find((x) => x.track === track);
		if (!d) continue;
		for (const list of SELECTION_LISTS) {
			const chosen = d[list];
			for (const e of catalogOf(track, list)) {
				if (chosen.includes(e.code)) rows.push({ track, list, code: e.code });
			}
		}
	}
	return rows;
}

/**
 * Relit les lignes stockées pour les métiers donnés. Un code absent du
 * catalogue (ne devrait pas arriver : on ne supprime jamais) est ignoré à
 * la lecture, sans être effacé de la base.
 */
export function parseTrackDetails(
	tracks: readonly TrackKindValue[],
	rows: readonly TrackDetailsRow[]
): TrackDetails[] {
	return TRACK_KINDS.filter((t) => tracks.includes(t)).map((track) => {
		const pick = (list: SelectionList) =>
			catalogOf(track, list)
				.filter((e) => rows.some((r) => r.track === track && r.list === list && r.code === e.code))
				.map((e) => e.code);
		return {
			track,
			specializations: pick('specializations'),
			offers: pick('offers'),
			needs: pick('needs')
		};
	});
}
