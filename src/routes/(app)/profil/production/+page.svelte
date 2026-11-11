<script lang="ts">
	// LINKMUSICIAN: « Mon profil de producteur·rice » (P4-04), voir +page.server.ts.
	import { untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { superForm } from 'sveltekit-superforms/client';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { Button } from '#shadcn/button';
	import SEO from '#lib/components/SEO.svelte';
	import CraftReferencesFields from '#lib/components/linkmusician/crafts/CraftReferencesFields.svelte';
	import { producerProfileSchema } from '#lib/schema/crafts/producerProfileSchema';
	import { RETRY_FRIENDLY_FORM } from '#lib/forms/superformOptions';
	import { CRAFT_MOBILITY, CRAFT_MOBILITY_LABELS } from '#lib/crafts/common';
	import {
		MAX_PRODUCER_GENRES,
		MAX_RATE_LENGTH,
		MAX_SOFTWARE_LENGTH,
		PRODUCER_SPECIALTIES,
		PRODUCER_SPECIALTY_INFO
	} from '#lib/crafts/producer';

	let { data } = $props();

	const profileForm = superForm(
		untrack(() => data.form),
		{
			validators: zodClient(producerProfileSchema),
			id: 'producerProfileForm',
			dataType: 'json',
			resetForm: false,
			...RETRY_FRIENDLY_FORM,
			onUpdated: ({ form }) => {
				if (form.valid && form.message) toast.success(form.message);
			}
		}
	);
	const { form, errors, enhance, submitting } = profileForm;
	const genresFull = $derived($form.genreIds.length >= MAX_PRODUCER_GENRES);
</script>

<SEO title="Mon profil de producteur·rice" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-5xl space-y-8">
		<div>
			<a href="/profil" class="text-sm text-muted-foreground underline">← Mon profil</a>
			<h1 class="lm-title mt-2">Mon profil de producteur·rice</h1>
			<p class="text-sm text-muted-foreground">
				Ce que tu produis et comment tu travailles. Les artistes te trouvent dans la recherche dès
				que tu as coché une spécialité.
			</p>
		</div>

		{#if !data.hasTrack}
			<div class="lm-tile lm-tile--flow space-y-3 p-5">
				<p class="font-semibold">Ajoute d'abord le métier « Producteur·rice ».</p>
				<p class="text-sm text-muted-foreground">
					Tu peux avoir plusieurs métiers, par exemple musicien·ne et producteur·rice.
				</p>
				<a href="/reglages/metiers" class="lm-btn">Choisir mes métiers</a>
			</div>
		{:else}
			<form method="POST" use:enhance class="space-y-10">
				<fieldset class="space-y-2">
					<legend class="text-lg font-semibold">Mes spécialités</legend>
					<div class="grid gap-2 sm:grid-cols-3">
						{#each PRODUCER_SPECIALTIES as item (item)}
							<label class="lm-tile lm-tile--flow flex cursor-pointer items-start gap-2 p-3">
								<input
									type="checkbox"
									value={item}
									class="mt-1 size-4"
									bind:group={$form.specialties}
								/>
								<span>
									<span class="font-medium">{PRODUCER_SPECIALTY_INFO[item].label}</span>
									<span class="block text-sm text-muted-foreground"
										>{PRODUCER_SPECIALTY_INFO[item].hint}</span
									>
								</span>
							</label>
						{/each}
					</div>
				</fieldset>

				<section aria-labelledby="styles-title" class="space-y-3">
					<h2 id="styles-title" class="text-lg font-semibold">
						Les styles que je produis <span class="text-sm font-normal text-muted-foreground"
							>({$form.genreIds.length}/{MAX_PRODUCER_GENRES})</span
						>
					</h2>
					<!-- Mobile d'abord : la liste complète reste repliée. -->
					<details open={$form.genreIds.length === 0}>
						<summary class="min-h-11 cursor-pointer content-center text-sm font-medium text-primary"
							>Choisir mes styles</summary
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

				<div class="grid gap-6 lg:grid-cols-2">
					<section class="space-y-2">
						<label for="software" class="block text-lg font-semibold">Mes logiciels</label>
						<p class="text-sm text-muted-foreground">
							Une ligne par logiciel ou instrument virtuel.
						</p>
						<textarea
							id="software"
							rows="4"
							class="lm-field w-full"
							placeholder="Ableton Live&#10;FL Studio&#10;Serum"
							bind:value={$form.software}
						></textarea>
						<p class="text-right text-xs text-muted-foreground">
							{$form.software.length}/{MAX_SOFTWARE_LENGTH}
						</p>
						{#if $errors.software}<p class="text-sm text-destructive">{$errors.software[0]}</p>{/if}
					</section>

					<section class="space-y-2">
						<label for="rate" class="block text-lg font-semibold">Mes tarifs indicatifs</label>
						<p class="text-sm text-muted-foreground">
							Facultatif. Affiché avec la mention « indicatif » : le prix se discute avec l'artiste.
						</p>
						<input
							id="rate"
							class="lm-field w-full"
							placeholder="À partir de 150 € le titre"
							bind:value={$form.rate}
						/>
						<p class="text-right text-xs text-muted-foreground">
							{$form.rate.length}/{MAX_RATE_LENGTH}
						</p>
						{#if $errors.rate}<p class="text-sm text-destructive">{$errors.rate[0]}</p>{/if}
					</section>
				</div>

				<fieldset class="space-y-2">
					<legend class="text-lg font-semibold">Où je travaille</legend>
					<div class="grid gap-2">
						{#each CRAFT_MOBILITY as item (item)}
							<label class="flex cursor-pointer items-center gap-2 text-sm">
								<input type="checkbox" value={item} class="size-4" bind:group={$form.mobility} />
								{CRAFT_MOBILITY_LABELS[item]}
							</label>
						{/each}
					</div>
				</fieldset>

				<CraftReferencesFields
					bind:references={$form.references}
					errors={$errors.references}
					title="Mes productions en écoute"
					hint="Un titre que tu as produit ou arrangé, avec un lien public (SoundCloud, YouTube, Bandcamp…)."
					titlePlaceholder="« Lumière » (Nora feat. Malik)"
					addLabel="Ajouter une production"
				/>

				<Button type="submit" class="w-full" disabled={$submitting}>Enregistrer</Button>
			</form>
		{/if}
	</div>
</div>
