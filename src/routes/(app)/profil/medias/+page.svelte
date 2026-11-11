<script lang="ts">
	// LINKMUSICIAN: « Mes médias », voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { Button } from '#shadcn/button';
	import { Badge } from '#shadcn/badge';
	import MediaPlayer from '#lib/components/linkmusician/MediaPlayer.svelte';
	import MediaUpload from '#lib/components/linkmusician/MediaUpload.svelte';
	import { MEDIA_STATUS_LABELS, MAX_TITLE_LENGTH } from '#lib/media/rules';
	import SEO from '#lib/components/SEO.svelte';

	let { data, form } = $props();

	$effect(() => {
		if (form?.message) toast.success(form.message);
		if (form?.error) toast.error(form.error);
	});

	const full = $derived(data.quota.used >= data.quota.limit);
</script>

<SEO title="Mes médias" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-7xl space-y-8">
		<div>
			<a href="/profil" class="text-sm text-muted-foreground underline">← Mon profil</a>
			<h1 class="lm-title mt-2">Mes médias</h1>
			<p class="text-sm text-muted-foreground">
				Fais entendre ce que tu joues : envoie un fichier, ou ajoute un lien YouTube, SoundCloud ou
				Bandcamp.
				<span class="block"
					>{data.quota.used} / {data.quota.limit} médias (la limite augmente avec ta
					<a href="/reglages" class="underline">confiance</a>).</span
				>
			</p>
		</div>

		<div class="grid items-start gap-8 xl:grid-cols-[minmax(20rem,0.8fr)_minmax(0,1.2fr)]">
			<div class="space-y-6">
				<MediaUpload instruments={data.instruments} disabled={full} />

				<form method="POST" action="?/addLink" use:enhance class="space-y-3 rounded-2xl border p-4">
					<h2 class="font-semibold">Ajouter un lien</h2>
					<div class="space-y-1">
						<label for="url" class="block text-sm font-medium">Adresse</label>
						<input
							id="url"
							name="url"
							type="text"
							inputmode="url"
							autocomplete="url"
							spellcheck="false"
							required
							placeholder="youtube.com/watch?v=…, soundcloud.com/…, nom.bandcamp.com/track/…"
							value={form?.url ?? ''}
							class="lm-field w-full"
						/>
					</div>
					<div class="space-y-1">
						<label for="title" class="block text-sm font-medium">Titre (facultatif)</label>
						<input
							id="title"
							name="title"
							type="text"
							maxlength={MAX_TITLE_LENGTH}
							placeholder="Repris de la plateforme si vide"
							class="lm-field w-full"
						/>
					</div>
					{#if data.instruments.length > 0}
						<div class="space-y-1">
							<label for="instrumentId" class="block text-sm font-medium"
								>Instrument joué (facultatif)</label
							>
							<select id="instrumentId" name="instrumentId" class="lm-field w-full">
								<option value="">—</option>
								{#each data.instruments as i (i.id)}
									<option value={i.id}>{i.name}</option>
								{/each}
							</select>
						</div>
					{/if}
					<label class="flex cursor-pointer items-center gap-2 text-sm">
						<input type="checkbox" name="isDemo" class="size-4" checked />
						C'est une démo de moi (je joue ou chante dessus)
					</label>
					<Button type="submit" class="w-full" disabled={full}>
						{full ? 'Limite de médias atteinte' : 'Ajouter'}
					</Button>
				</form>
			</div>

			<section class="space-y-4" aria-labelledby="list-title">
				<h2 id="list-title" class="font-semibold">Mes médias ({data.media.length})</h2>
				{#if data.media.length === 0}
					<p class="text-sm text-muted-foreground">Aucun média pour l'instant.</p>
				{/if}
				<ul class="grid gap-4 md:grid-cols-2">
					{#each data.media as m (m.id)}
						<li class="space-y-2 rounded-lg border p-3">
							<div class="flex flex-wrap items-center justify-between gap-2">
								<span class="font-medium">{m.title}</span>
								<span class="flex items-center gap-2">
									{#if m.isDemo}<Badge variant="secondary">démo</Badge>{/if}
									<Badge variant={m.status === 'PUBLISHED' ? 'default' : 'outline'}
										>{MEDIA_STATUS_LABELS[m.status]}</Badge
									>
								</span>
							</div>
							{#if m.instrument}<p class="text-xs text-muted-foreground">{m.instrument}</p>{/if}
							<MediaPlayer media={m} />
							<div class="flex justify-between text-sm">
								{#if m.status === 'PUBLISHED'}
									<a href="/medias/{m.id}" class="underline">Lien public</a>
								{:else}
									<span></span>
								{/if}
								<form method="POST" action="?/delete" use:enhance>
									<input type="hidden" name="id" value={m.id} />
									<button type="submit" class="text-destructive underline">Supprimer</button>
								</form>
							</div>
						</li>
					{/each}
				</ul>
			</section>
		</div>
	</div>
</div>
