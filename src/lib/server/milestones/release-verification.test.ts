import { describe, expect, it, vi } from 'vitest';
import { verifyMusicBrainzDemo, verifyMusicBrainzRelease } from './release-verification';

const release = (overrides: Record<string, unknown> = {}) => ({
	id: 'release-id',
	title: 'Premier disque',
	barcode: '012345678901',
	'artist-credit': [{ name: 'Les Étoiles', artist: { name: 'Les Étoiles' } }],
	'release-group': { 'primary-type': 'Album', 'secondary-types': ['EP'] },
	...overrides
});

function response(data: unknown) {
	return new Response(JSON.stringify(data), { status: 200 });
}

describe('vérification MusicBrainz des sorties', () => {
	it('vérifie un EP trouvé par UPC avec artiste et type correspondants', async () => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({ releases: [release()] }));

		await expect(
			verifyMusicBrainzRelease(
				{ kind: 'UPC', value: '012345678901', artistName: 'Les Etoiles', key: 'FIRST_EP' },
				fetcher
			)
		).resolves.toEqual({
			status: 'verified',
			releaseId: 'release-id',
			title: 'Premier disque',
			url: 'https://musicbrainz.org/release/release-id'
		});
		expect(fetcher).toHaveBeenCalledWith(
			expect.stringContaining('query=barcode:012345678901'),
			expect.objectContaining({
				headers: expect.objectContaining({ 'User-Agent': expect.any(String) })
			})
		);
	});

	it('refuse un nom d’artiste ou un type de sortie différent', async () => {
		const fetcher = vi.fn<typeof fetch>().mockImplementation(async () =>
			response({
				releases: [release({ 'release-group': { 'primary-type': 'Album', 'secondary-types': [] } })]
			})
		);

		await expect(
			verifyMusicBrainzRelease(
				{ kind: 'UPC', value: '012345678901', artistName: 'Autre groupe', key: 'FIRST_EP' },
				fetcher
			)
		).resolves.toEqual({ status: 'mismatch' });

		await expect(
			verifyMusicBrainzRelease(
				{ kind: 'UPC', value: '012345678901', artistName: 'Les Étoiles', key: 'FIRST_EP' },
				fetcher
			)
		).resolves.toEqual({ status: 'mismatch' });
	});

	it('résout un ISRC à travers les sorties de son enregistrement', async () => {
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValue(response({ recordings: [{ releases: [release({ barcode: null })] }] }));

		await expect(
			verifyMusicBrainzRelease(
				{ kind: 'ISRC', value: 'usabc1234567', artistName: 'Les Étoiles', key: 'FIRST_EP' },
				fetcher
			)
		).resolves.toMatchObject({ status: 'verified', releaseId: 'release-id' });
		expect(fetcher).toHaveBeenCalledWith(
			expect.stringContaining('/isrc/USABC1234567?'),
			expect.anything()
		);
	});

	it('compare aussi les noms d’artiste non latins', async () => {
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValue(
				response({ releases: [release({ 'artist-credit': [{ name: '東京' }] })] })
			);

		await expect(
			verifyMusicBrainzRelease(
				{ kind: 'UPC', value: '012345678901', artistName: '東京', key: 'FIRST_EP' },
				fetcher
			)
		).resolves.toMatchObject({ status: 'verified' });
	});

	it('ne valide pas une référence lorsque MusicBrainz est indisponible', async () => {
		const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('offline'));

		await expect(
			verifyMusicBrainzRelease(
				{ kind: 'UPC', value: '012345678901', artistName: 'Les Étoiles', key: 'FIRST_EP' },
				fetcher
			)
		).resolves.toEqual({ status: 'unavailable' });
	});

	it('vérifie une démo seulement si son URL exacte crédite le groupe', async () => {
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(
				response({
					urls: [{ id: 'musicbrainz-url', resource: 'https://open.spotify.com/track/demo123' }]
				})
			)
			.mockResolvedValueOnce(
				response({
					relations: [
						{
							type: 'streaming',
							'target-type': 'recording',
							recording: { title: 'Ma démo', 'artist-credit': [{ name: 'Les Étoiles' }] }
						}
					]
				})
			);

		await expect(
			verifyMusicBrainzDemo(
				{ url: 'https://open.spotify.com/track/demo123?si=share', artistName: 'Les Etoiles' },
				fetcher
			)
		).resolves.toMatchObject({ status: 'verified', title: 'Ma démo' });
		expect(fetcher).toHaveBeenCalledTimes(2);
	});

	it('ne vérifie pas une démo dont le crédit artiste ne correspond pas', async () => {
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(
				response({
					urls: [{ id: 'musicbrainz-url', resource: 'https://open.spotify.com/track/demo123' }]
				})
			)
			.mockResolvedValueOnce(
				response({
					relations: [
						{
							'target-type': 'recording',
							recording: { title: 'Autre artiste', 'artist-credit': [{ name: 'Un autre groupe' }] }
						}
					]
				})
			);

		await expect(
			verifyMusicBrainzDemo(
				{ url: 'https://open.spotify.com/track/demo123', artistName: 'Les Étoiles' },
				fetcher
			)
		).resolves.toEqual({ status: 'mismatch' });
	});
});
