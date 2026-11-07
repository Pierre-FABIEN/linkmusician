<script lang="ts">
	// LINKMUSICIAN: fiche du groupe (P3-02), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import SEO from '#lib/components/SEO.svelte';
	import CommunePicker, {
		type CommuneChoice
	} from '#lib/components/linkmusician/CommunePicker.svelte';
	import { MAX_BAND_BIO, MAX_BAND_NAME } from '#lib/bands/rules';
	import { MAX_GENRES } from '#lib/skills/profile';

	let { data, form } = $props();

	$effect(() => {
		if (form?.message) toast.success(form.message);
	});

	// Valeurs initiales seulement : la personne modifie ensuite librement.
	// svelte-ignore state_referenced_locally
	let genreIds = $state<string[]>(data.genreIds);
	// svelte-ignore state_referenced_locally
	let commune = $state<CommuneChoice | null>(data.commune);
	// svelte-ignore state_referenced_locally
	let bio = $state(data.band.bio ?? '');
	const genresFull = $derived(genreIds.length >= MAX_GENRES);
	const STATUS: Record<string, string> = {
		PUBLISHED: 'publié',
		PENDING_REVIEW: 'en attente de validation',
		PROCESSING: 'en cours',
		REJECTED: 'refusé'
	};
</script>

<SEO title="Modifier {data.band.name}" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-6xl space-y-8 rounded-3xl border bg-card p-5 sm:p-8 lg:p-10">
		<div class="space-y-2">
			<a href="/groupes/{data.band.handle}" class="text-sm text-muted-foreground underline"
				>← {data.band.name}</a
			>
			<h1 class="text-3xl font-black tracking-tight sm:text-4xl">Fiche du groupe</h1>
			<p class="text-sm text-muted-foreground">
				Ce que tout le monde voit sur
				<a href="/@{data.band.handle}" class="underline">la page publique du groupe</a>. On
				n’enregistre que la commune, jamais d’adresse.
			</p>
		</div>

		{#if form?.error}
			<p role="alert" class="rounded-md border border-destructive p-3 text-sm text-destructive">
				{form.error}
			</p>
		{/if}

		<form
			method="POST"
			action="?/save"
			use:enhance={() =>
				async ({ update }) =>
					update({ reset: false })}
			class="space-y-6"
		>
			<label class="block space-y-1 font-medium">
				Nom du groupe
				<input
					name="name"
					required
					autocomplete="off"
					maxlength={MAX_BAND_NAME}
					value={data.band.name}
					class="w-full rounded-md border bg-background p-2 text-sm font-normal"
				/>
			</label>
			<div class="space-y-1">
				<label for="band-bio" class="block font-medium">Présentation</label>
				<textarea
					id="band-bio"
					name="bio"
					rows="4"
					maxlength={MAX_BAND_BIO}
					bind:value={bio}
					placeholder="Ce que vous jouez, ce que vous cherchez, où vous répétez…"
					class="w-full rounded-md border bg-background p-2 text-sm"
				></textarea>
				<p class="text-right text-xs text-muted-foreground">{[...bio].length}/{MAX_BAND_BIO}</p>
			</div>
			<CommunePicker id="band-commune" label="Ville du groupe" bind:chosen={commune} />
			<section aria-labelledby="genres-title" class="space-y-3">
				<h2 id="genres-title" class="font-medium">
					Genres <span class="text-sm font-normal text-muted-foreground"
						>({genreIds.length}/{MAX_GENRES})</span
					>
				</h2>
				<div class="grid gap-3 sm:grid-cols-2">
					{#each data.genres as genre (genre.id)}
						<fieldset class="rounded-lg border p-3">
							<legend class="sr-only">{genre.name}</legend>
							{#each [genre, ...genre.children] as item, i (item.id)}
								{@const checked = genreIds.includes(item.id)}
								<label
									class="flex cursor-pointer items-center gap-2 py-0.5 text-sm {i === 0
										? 'font-medium'
										: 'pl-5'} {genresFull && !checked ? 'opacity-50' : ''}"
								>
									<input
										type="checkbox"
										name="genreIds"
										value={item.id}
										class="size-4"
										disabled={genresFull && !checked}
										bind:group={genreIds}
									/>
									{item.name}
								</label>
							{/each}
						</fieldset>
					{/each}
				</div>
			</section>
			<button
				class="min-h-11 w-full rounded-full bg-primary px-4 font-semibold text-primary-foreground"
				>Enregistrer la fiche</button
			>
		</form>

		<section class="space-y-3 border-t pt-6" aria-labelledby="links-title">
			<h2 id="links-title" class="text-xl font-bold">À écouter</h2>
			<p class="text-sm text-muted-foreground">
				Un lien YouTube, SoundCloud ou Bandcamp du groupe.
			</p>
			<form method="POST" action="?/addLink" class="space-y-3" use:enhance>
				<label class="block space-y-1 text-sm font-medium">
					Lien
					<input
						name="url"
						type="url"
						required
						value={form?.url ?? ''}
						placeholder="https://soundcloud.com/…"
						class="w-full rounded-md border bg-background p-2 font-normal"
					/>
				</label>
				<label class="block space-y-1 text-sm font-medium">
					Titre <span class="font-normal text-muted-foreground">(facultatif)</span>
					<input
						name="title"
						maxlength="120"
						class="w-full rounded-md border bg-background p-2 font-normal"
					/>
				</label>
				<button class="min-h-11 rounded-full border px-4 font-semibold">Ajouter le lien</button>
			</form>
			{#if data.media.length > 0}
				<ul class="space-y-2" aria-label="Liens du groupe">
					{#each data.media as m (m.id)}
						<li
							class="flex items-center justify-between gap-2 rounded-2xl border bg-card px-4 py-2 text-sm"
						>
							<span>
								<span class="font-semibold">{m.title}</span>
								<span class="block text-muted-foreground">{STATUS[m.status] ?? m.status}</span>
							</span>
							<form method="POST" action="?/deleteLink" use:enhance>
								<input type="hidden" name="id" value={m.id} />
								<button class="min-h-11 px-2 text-muted-foreground underline">Retirer</button>
							</form>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
</div>
