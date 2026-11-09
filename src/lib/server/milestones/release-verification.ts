import { BRAND } from '#lib/linkmusician/brand';
import { checkReleaseReference, type ReleaseReferenceKind } from '#lib/milestones/verification';
import { withCircuitBreaker } from '#lib/server/circuit-breaker';

export type ReleaseMilestoneKey = 'FIRST_EP' | 'FIRST_ALBUM';

export type ReleaseVerificationResult =
	| { status: 'verified'; releaseId: string; title: string; url: string }
	| { status: 'not_found' }
	| { status: 'mismatch' }
	| { status: 'unavailable' };

export type DemoVerificationResult =
	| { status: 'verified'; title: string }
	| { status: 'not_found' }
	| { status: 'mismatch' }
	| { status: 'unavailable' };

type MusicBrainzRelease = {
	id?: unknown;
	title?: unknown;
	barcode?: unknown;
	'artist-credit'?: unknown;
	'release-group'?: unknown;
};

type MusicBrainzReleaseGroup = {
	'primary-type'?: unknown;
	'secondary-types'?: unknown;
};

const API = 'https://musicbrainz.org/ws/2';

function canonicalExternalUrl(raw: string) {
	const url = new URL(raw);
	url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
	url.search = '';
	url.hash = '';
	url.pathname = url.pathname.replace(/\/$/, '');
	return url.toString();
}

function normalizedName(value: string) {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, ' ')
		.trim();
}

function artistCredit(value: unknown): string | null {
	if (!Array.isArray(value) || value.length === 0) return null;
	const parts: string[] = [];
	for (const item of value) {
		if (typeof item === 'string') {
			parts.push(item);
			continue;
		}
		if (!item || typeof item !== 'object') return null;
		const credit = item as { name?: unknown; joinphrase?: unknown; artist?: { name?: unknown } };
		const name =
			typeof credit.name === 'string'
				? credit.name
				: typeof credit.artist?.name === 'string'
					? credit.artist.name
					: null;
		if (!name) return null;
		parts.push(name, typeof credit.joinphrase === 'string' ? credit.joinphrase : '');
	}
	return parts.join('').trim() || null;
}

function isRequestedReleaseType(group: MusicBrainzReleaseGroup, key: ReleaseMilestoneKey) {
	if (group['primary-type'] !== 'Album' || !Array.isArray(group['secondary-types'])) return false;
	const isEp = group['secondary-types'].includes('EP');
	return key === 'FIRST_EP' ? isEp : !isEp;
}

async function getJson(url: string, fetcher: typeof fetch) {
	const response = await fetcher(url, {
		headers: {
			Accept: 'application/json',
			'User-Agent': `${BRAND.name}/1.0 (${BRAND.url}; mailto:${BRAND.email})`
		},
		signal: AbortSignal.timeout(5000)
	});
	if (!response.ok) throw new Error(`MusicBrainz returned ${response.status}`);
	return response.json() as Promise<unknown>;
}

function releaseMatches(
	release: MusicBrainzRelease,
	input: { kind: ReleaseReferenceKind; value: string; artistName: string; key: ReleaseMilestoneKey }
) {
	if (typeof release.id !== 'string' || typeof release.title !== 'string') return false;
	if (input.kind === 'UPC' && release.barcode !== input.value) return false;
	const credit = artistCredit(release['artist-credit']);
	if (!credit || normalizedName(credit) !== normalizedName(input.artistName)) return false;
	const group = release['release-group'] as MusicBrainzReleaseGroup | undefined;
	return !!group && isRequestedReleaseType(group, input.key);
}

/** Vérifie une démo seulement si MusicBrainz relie son URL à l'artiste du groupe. */
export async function verifyMusicBrainzDemo(
	input: { url: string; artistName: string },
	fetcher: typeof fetch = fetch
): Promise<DemoVerificationResult> {
	if (!input.artistName.trim()) return { status: 'mismatch' };
	let resource: string;
	try {
		resource = canonicalExternalUrl(input.url);
	} catch {
		return { status: 'mismatch' };
	}

	try {
		return await withCircuitBreaker('musicbrainz-release', async () => {
			const search = new URL(`${API}/url/`);
			search.searchParams.set('query', `url:"${resource}"`);
			search.searchParams.set('fmt', 'json');
			search.searchParams.set('limit', '5');
			const searchData = await getJson(search.toString(), fetcher);
			if (!searchData || typeof searchData !== 'object') {
				throw new Error('Invalid MusicBrainz URL search response');
			}
			const matches = (searchData as { urls?: unknown }).urls;
			if (!Array.isArray(matches)) throw new Error('Invalid MusicBrainz URL response');
			const match = matches.find(
				(item) =>
					!!item &&
					typeof item === 'object' &&
					typeof (item as { id?: unknown }).id === 'string' &&
					typeof (item as { resource?: unknown }).resource === 'string' &&
					canonicalExternalUrl((item as { resource: string }).resource) === resource
			);
			if (!match) return { status: 'not_found' } as const;

			const urlId = (match as { id: string }).id;
			const lookup = new URL(`${API}/url/${encodeURIComponent(urlId)}`);
			lookup.searchParams.set('inc', 'recording-rels');
			lookup.searchParams.set('fmt', 'json');
			const detail = await getJson(lookup.toString(), fetcher);
			if (!detail || typeof detail !== 'object') {
				throw new Error('Invalid MusicBrainz URL lookup response');
			}
			const relations = (detail as { relations?: unknown }).relations;
			if (!Array.isArray(relations)) throw new Error('Invalid MusicBrainz relations response');
			const recordings = relations.flatMap((relation) => {
				if (!relation || typeof relation !== 'object') return [];
				const value = relation as {
					'target-type'?: unknown;
					recording?: { title?: unknown; 'artist-credit'?: unknown };
				};
				return value['target-type'] === 'recording' && value.recording ? [value.recording] : [];
			});
			const recording = recordings.find((item) => {
				const credit = artistCredit(item['artist-credit']);
				return credit && normalizedName(credit) === normalizedName(input.artistName);
			});
			if (!recording) return { status: recordings.length > 0 ? 'mismatch' : 'not_found' } as const;
			return {
				status: 'verified',
				title: typeof recording.title === 'string' ? recording.title : 'Démo publique'
			} as const;
		});
	} catch {
		return { status: 'unavailable' };
	}
}

/** Recherche MusicBrainz. Une API indisponible ne transforme jamais l'étape en preuve. */
export async function verifyMusicBrainzRelease(
	input: {
		kind: ReleaseReferenceKind;
		value: string;
		artistName: string;
		key: ReleaseMilestoneKey;
	},
	fetcher: typeof fetch = fetch
): Promise<ReleaseVerificationResult> {
	const checked = checkReleaseReference(input.kind, input.value);
	if (!checked.ok || !input.artistName.trim()) return { status: 'mismatch' };

	try {
		return await withCircuitBreaker('musicbrainz-release', async () => {
			const url =
				input.kind === 'UPC'
					? `${API}/release/?query=barcode:${checked.normalized}&fmt=json&limit=10`
					: `${API}/isrc/${checked.normalized}?inc=releases&fmt=json`;
			const data = await getJson(url, fetcher);
			if (!data || typeof data !== 'object') throw new Error('Invalid MusicBrainz response');

			let releases: MusicBrainzRelease[] = [];
			if (input.kind === 'UPC') {
				const found = (data as { releases?: unknown }).releases;
				if (!Array.isArray(found)) throw new Error('Invalid MusicBrainz release response');
				releases = found as MusicBrainzRelease[];
			} else {
				const recordings = (data as { recordings?: unknown }).recordings;
				if (!Array.isArray(recordings)) throw new Error('Invalid MusicBrainz ISRC response');
				releases = recordings.flatMap((recording) => {
					if (!recording || typeof recording !== 'object') return [];
					const found = (recording as { releases?: unknown }).releases;
					return Array.isArray(found) ? (found as MusicBrainzRelease[]) : [];
				});
			}

			if (releases.length === 0) return { status: 'not_found' } as const;
			const match = releases.find((release) =>
				releaseMatches(release, { ...input, value: checked.normalized })
			);
			if (!match) return { status: 'mismatch' } as const;
			return {
				status: 'verified',
				releaseId: match.id as string,
				title: match.title as string,
				url: `https://musicbrainz.org/release/${match.id}`
			} as const;
		});
	} catch {
		return { status: 'unavailable' };
	}
}
