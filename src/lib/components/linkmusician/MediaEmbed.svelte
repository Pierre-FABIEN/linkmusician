<script lang="ts">
	/**
	 * LINKMUSICIAN: lecteur d'un média externe (P1-08). L'adresse du lecteur est
	 * reconstruite par `parseExternalMedia` à partir d'un identifiant contrôlé :
	 * jamais de HTML venu de la plateforme.
	 */
	import { parseExternalMedia } from '#lib/media/external';

	let { url, title }: { url: string; title: string } = $props();
	const parsed = $derived(parseExternalMedia(url));
</script>

{#if parsed.ok && parsed.media.embedUrl}
	<iframe
		src={parsed.media.embedUrl}
		{title}
		loading="lazy"
		class="w-full rounded-md border {parsed.media.provider === 'YOUTUBE'
			? 'aspect-video'
			: 'h-[166px]'}"
		sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
		allow="encrypted-media; picture-in-picture; fullscreen"
		referrerpolicy="strict-origin-when-cross-origin"
	></iframe>
{:else if parsed.ok}
	<a
		href={parsed.media.url}
		target="_blank"
		rel="noopener noreferrer nofollow"
		class="text-sm underline"
	>
		Écouter sur {parsed.media.provider === 'BANDCAMP' ? 'Bandcamp' : 'SoundCloud'} ↗
	</a>
{/if}
