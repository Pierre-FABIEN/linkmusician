<script lang="ts">
	import BackToAnnonce from '#lib/components/linkmusician/profile/BackToAnnonce.svelte';
	// LINKMUSICIAN: fiche du groupe (P3-02), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import SEO from '#lib/components/SEO.svelte';
	import CommunePicker, {
		type CommuneChoice
	} from '#lib/components/linkmusician/CommunePicker.svelte';
	import { MAX_BAND_BIO, MAX_BAND_NAME } from '#lib/bands/rules';
	import { MAX_GENRES } from '#lib/skills/profile';
	import {
		BAND_FORMATIONS,
		BAND_FORMATION_INFO,
		BAND_REPERTOIRES,
		BAND_REPERTOIRE_INFO,
		formationHint
	} from '#lib/bands/lineup';

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
	// svelte-ignore state_referenced_locally
	let formation = $state<string>(data.band.formation ?? '');
	// svelte-ignore state_referenced_locally
	let repertoire = $state<string>(data.band.repertoire ?? '');
	const hint = $derived(
		formationHint(
			(formation || null) as Parameters<typeof formationHint>[0],
			data.band.activeMembers
		)
	);
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
	<div class="mx-auto max-w-6xl space-y-8">
		<div class="space-y-2">
			<a href="/groupes/{data.band.handle}" class="text-sm text-muted-foreground underline"
				>← {data.band.name}</a
			>
			<h1 class="lm-title">Fiche du groupe</h1>
			<BackToAnnonce />
			<p class="text-sm text-muted-foreground">
				Ce que tout le monde voit sur
				<a href="/@{data.band.handle}" class="underline">la page publique du groupe</a>. On
				n’enregistre que la commune, jamais d’adresse.
			</p>
		</div>

		{#if form?.error}
			<p role="alert" class="lm-alert p-3 text-sm">
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
					class="lm-field w-full"
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
					class="lm-field w-full"
				></textarea>
				<p class="text-right text-xs text-muted-foreground">{[...bio].length}/{MAX_BAND_BIO}</p>
			</div>
			<CommunePicker id="band-commune" label="Ville du groupe" bind:chosen={commune} />
			<!-- ONB-12c1 (D64) : ce que le groupe propose sur scène, pour les plateaux. -->
			<section aria-labelledby="lineup-title" class="space-y-3">
				<div class="space-y-1">
					<h2 id="lineup-title" class="font-medium">Sur scène</h2>
					<p class="text-sm text-muted-foreground">
						Aide un·e organisateur·rice qui cherche un duo ou un groupe de reprises à vous trouver.
						Facultatif : sans réponse, la fiche affiche « non précisé ».
					</p>
				</div>
				<div class="grid gap-3 sm:grid-cols-2">
					<fieldset class="lm-tile lm-tile--flow space-y-1 p-3" aria-describedby="formation-hint">
						<legend class="px-1 font-medium">Formation</legend>
						<label class="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
							<input type="radio" name="formation" value="" class="size-4" bind:group={formation} />
							Non précisé
						</label>
						{#each BAND_FORMATIONS as f (f)}
							<label class="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
								<input
									type="radio"
									name="formation"
									value={f}
									class="size-4"
									bind:group={formation}
								/>
								<span>
									{BAND_FORMATION_INFO[f].label}
									<span class="block text-xs text-muted-foreground"
										>{BAND_FORMATION_INFO[f].hint}</span
									>
								</span>
							</label>
						{/each}
						{#if hint}
							<p id="formation-hint" class="text-xs text-muted-foreground" aria-live="polite">
								{hint}
							</p>
						{/if}
					</fieldset>
					<fieldset class="lm-tile lm-tile--flow space-y-1 p-3">
						<legend class="px-1 font-medium">Répertoire</legend>
						<label class="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
							<input
								type="radio"
								name="repertoire"
								value=""
								class="size-4"
								bind:group={repertoire}
							/>
							Non précisé
						</label>
						{#each BAND_REPERTOIRES as r (r)}
							<label class="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
								<input
									type="radio"
									name="repertoire"
									value={r}
									class="size-4"
									bind:group={repertoire}
								/>
								<span>
									{BAND_REPERTOIRE_INFO[r].label}
									<span class="block text-xs text-muted-foreground"
										>{BAND_REPERTOIRE_INFO[r].hint}</span
									>
								</span>
							</label>
						{/each}
					</fieldset>
				</div>
			</section>
			<section aria-labelledby="genres-title" class="space-y-3">
				<h2 id="genres-title" class="font-medium">
					Genres <span class="text-sm font-normal text-muted-foreground"
						>({genreIds.length}/{MAX_GENRES})</span
					>
				</h2>
				<div class="grid gap-3 sm:grid-cols-2">
					{#each data.genres as genre (genre.id)}
						<fieldset class="lm-tile lm-tile--flow p-3">
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
			<button class="lm-btn w-full">Enregistrer la fiche</button>
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
						class="lm-field w-full"
					/>
				</label>
				<label class="block space-y-1 text-sm font-medium">
					Titre <span class="font-normal text-muted-foreground">(facultatif)</span>
					<input name="title" maxlength="120" class="lm-field w-full" />
				</label>
				<button class="lm-btn" data-variant="ghost">Ajouter le lien</button>
			</form>
			{#if data.media.length > 0}
				<ul class="space-y-2" aria-label="Liens du groupe">
					{#each data.media as m (m.id)}
						<li
							class="lm-tile lm-tile--flow flex items-center justify-between gap-2 px-4 py-2 text-sm"
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
