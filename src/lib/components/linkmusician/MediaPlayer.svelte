<script lang="ts">
	/**
	 * LINKMUSICIAN: affichage d'un média (P1-08) : fichier Cloudinary (audio,
	 * vidéo, photo) ou lien externe (lecteur intégré reconstruit).
	 */
	import MediaEmbed from './MediaEmbed.svelte';

	type Media = { kind: string; title: string; fileUrl: string | null; externalUrl: string | null };
	let { media }: { media: Media } = $props();
</script>

{#if media.externalUrl}
	<MediaEmbed url={media.externalUrl} title={media.title} />
{:else if media.fileUrl && media.kind === 'AUDIO'}
	<audio controls preload="none" src={media.fileUrl} class="w-full">
		<a href={media.fileUrl}>Écouter {media.title}</a>
	</audio>
{:else if media.fileUrl && media.kind === 'VIDEO'}
	<!-- svelte-ignore a11y_media_has_caption -->
	<video controls preload="metadata" src={media.fileUrl} class="w-full rounded-md border"></video>
{:else if media.fileUrl && media.kind === 'IMAGE'}
	<img
		src={media.fileUrl}
		alt={media.title}
		loading="lazy"
		class="max-h-96 rounded-md border object-contain"
	/>
{/if}
