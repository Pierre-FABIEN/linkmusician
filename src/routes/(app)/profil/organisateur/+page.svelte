<script lang="ts">
	import CraftVisibilityNote from '#lib/components/linkmusician/profile/CraftVisibilityNote.svelte';
	// LINKMUSICIAN: « Mon profil d'organisateur·rice » (P5-05a), voir +page.server.ts.
	import TrackCompletenessCard from '#lib/components/linkmusician/profile/TrackCompletenessCard.svelte';
	import { untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { superForm } from 'sveltekit-superforms/client';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { Button } from '#shadcn/button';
	import SEO from '#lib/components/SEO.svelte';
	import CraftReferencesFields from '#lib/components/linkmusician/crafts/CraftReferencesFields.svelte';
	import { promoterProfileSchema } from '#lib/schema/crafts/promoterProfileSchema';
	import { RETRY_FRIENDLY_FORM } from '#lib/forms/superformOptions';
	import {
		MAX_CAPACITY,
		MAX_PROMOTER_GENRES,
		PROMOTER_EVENT_KINDS,
		PROMOTER_EVENT_KIND_INFO
	} from '#lib/crafts/promoter';

	let { data } = $props();

	const profileForm = superForm(
		untrack(() => data.form),
		{
			validators: zodClient(promoterProfileSchema),
			id: 'promoterProfileForm',
			dataType: 'json',
			resetForm: false,
			...RETRY_FRIENDLY_FORM,
			onUpdated: ({ form }) => {
				if (form.valid && form.message) toast.success(form.message);
			}
		}
	);
	const { form, errors, enhance, submitting } = profileForm;
	const genresFull = $derived($form.genreIds.length >= MAX_PROMOTER_GENRES);
	// Jauge : champ texte numérique, vide = non précisée.
	let capacityText = $state(untrack(() => ($form.capacity ? String($form.capacity) : '')));
	$effect(() => {
		const n = Number(capacityText);
		$form.capacity = capacityText.trim() === '' || Number.isNaN(n) ? null : n;
	});
</script>

<SEO title="Mon profil d’organisateur·rice" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-5xl space-y-8">
		<div>
			<a href="/profil" class="text-sm text-muted-foreground underline">← Mon profil</a>
			<h1 class="lm-title mt-2">Mon profil d’organisateur·rice</h1>
			<p class="text-sm text-muted-foreground">
				Ce que tu organises et ce que tu programmes. Les groupes et les pros te trouvent dans la
				recherche dès que tu as coché
				<a href="/profil/metier/organisateur" class="underline">ce que tu proposes</a>.
			</p>
		</div>

		<!-- LINKMUSICIAN: complétude du métier (ONB-13a, D62) : sans offre, pas de recherche. -->
		{#if 'completeness' in data}
			{#each data.completeness as c (c.track)}
				<TrackCompletenessCard completeness={c} common={data.commonMissing} />
			{/each}
		{/if}

		{#if !data.hasTrack}
			<div class="lm-tile lm-tile--flow space-y-3 p-5">
				<p class="font-semibold">Ajoute d’abord le métier « Organisateur·rice ».</p>
				<p class="text-sm text-muted-foreground">
					Tu peux avoir plusieurs métiers, par exemple musicien·ne et organisateur·rice.
				</p>
				<a href="/reglages/metiers" class="lm-btn">Choisir mes métiers</a>
			</div>
		{:else}
			{#if 'visibility' in data && data.visibility}
				<CraftVisibilityNote track="PROMOTER" {...data.visibility} />
			{/if}
			<form method="POST" use:enhance class="space-y-10">
				<fieldset class="space-y-2">
					<legend class="text-lg font-semibold">Ce que j’organise</legend>
					<div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
						{#each PROMOTER_EVENT_KINDS as item (item)}
							<label class="lm-tile lm-tile--flow flex cursor-pointer items-start gap-2 p-3">
								<input
									type="checkbox"
									value={item}
									class="mt-1 size-4 shrink-0"
									bind:group={$form.eventKinds}
								/>
								<span>
									<span class="font-medium">{PROMOTER_EVENT_KIND_INFO[item].label}</span>
									<span class="block text-sm text-muted-foreground"
										>{PROMOTER_EVENT_KIND_INFO[item].hint}</span
									>
								</span>
							</label>
						{/each}
					</div>
				</fieldset>

				<section aria-labelledby="genres-title" class="space-y-3">
					<h2 id="genres-title" class="text-lg font-semibold">
						Les genres que je programme <span class="text-sm font-normal text-muted-foreground"
							>({$form.genreIds.length}/{MAX_PROMOTER_GENRES})</span
						>
					</h2>
					<!-- Mobile d'abord : la liste complète reste repliée. -->
					<details open={$form.genreIds.length === 0}>
						<summary class="min-h-11 cursor-pointer content-center text-sm font-medium text-primary"
							>Choisir mes genres</summary
						>
						<div class="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{#each data.genres as genre (genre.id)}
								<fieldset class="lm-tile lm-tile--flow p-3">
									<legend class="sr-only">{genre.name}</legend>
									{#each [genre, ...genre.children] as item, i (item.id)}
										{@const checked = $form.genreIds.includes(item.id)}
										<label
											class="flex cursor-pointer items-center gap-2 py-0.5 text-sm {i === 0
												? 'font-medium'
												: 'pl-5'} {genresFull && !checked ? 'opacity-50' : ''}"
										>
											<input
												type="checkbox"
												value={item.id}
												class="size-4"
												disabled={genresFull && !checked}
												bind:group={$form.genreIds}
											/>
											{item.name}
										</label>
									{/each}
								</fieldset>
							{/each}
						</div>
					</details>
					{#if $errors.genreIds?._errors}
						<p class="text-sm text-destructive">{$errors.genreIds._errors[0]}</p>
					{/if}
				</section>

				<section class="max-w-sm space-y-2">
					<label for="capacity" class="block text-lg font-semibold">Ma jauge habituelle</label>
					<p class="text-sm text-muted-foreground">
						Facultatif. Le nombre de personnes que tes événements accueillent d’ordinaire.
					</p>
					<input
						id="capacity"
						inputmode="numeric"
						pattern="[0-9]*"
						maxlength={String(MAX_CAPACITY).length}
						class="lm-field w-full"
						placeholder="120"
						bind:value={capacityText}
					/>
					{#if $errors.capacity}<p class="text-sm text-destructive">{$errors.capacity[0]}</p>{/if}
				</section>

				<CraftReferencesFields
					bind:references={$form.references}
					errors={$errors.references}
					title="Mes événements passés"
					hint="Une page d’événement, une affiche, un article, avec un lien public."
					titlePlaceholder="Plateau rock au Bikini, mars 2026"
					addLabel="Ajouter un événement"
				/>

				<Button type="submit" class="w-full" disabled={$submitting}>Enregistrer</Button>
			</form>
		{/if}
	</div>
</div>
