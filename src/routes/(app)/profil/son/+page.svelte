<script lang="ts">
	// LINKMUSICIAN: « Mon profil d'ingé son » (P4-02), voir +page.server.ts.
	import TrackCompletenessCard from '#lib/components/linkmusician/profile/TrackCompletenessCard.svelte';
	import { untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { superForm } from 'sveltekit-superforms/client';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import CraftReferencesFields from '#lib/components/linkmusician/crafts/CraftReferencesFields.svelte';
	import { Button } from '#shadcn/button';
	import SEO from '#lib/components/SEO.svelte';
	import { soundProfileSchema } from '#lib/schema/crafts/soundProfileSchema';
	import { RETRY_FRIENDLY_FORM } from '#lib/forms/superformOptions';
	import {
		CRAFT_MOBILITY,
		CRAFT_MOBILITY_LABELS,
		MAX_GEAR_LENGTH,
		SOUND_SPECIALTIES,
		SOUND_SPECIALTY_INFO
	} from '#lib/crafts/sound';

	let { data } = $props();

	const profileForm = superForm(
		untrack(() => data.form),
		{
			validators: zodClient(soundProfileSchema),
			id: 'soundProfileForm',
			dataType: 'json',
			resetForm: false,
			...RETRY_FRIENDLY_FORM,
			onUpdated: ({ form }) => {
				if (form.valid && form.message) toast.success(form.message);
			}
		}
	);
	const { form, errors, enhance, submitting } = profileForm;
</script>

<SEO title="Mon profil d'ingé son" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-5xl space-y-8">
		<div>
			<a href="/profil" class="text-sm text-muted-foreground underline">← Mon profil</a>
			<h1 class="lm-title mt-2">Mon profil d'ingé son</h1>
			<p class="text-sm text-muted-foreground">
				Ce que tu fais et comment tu travailles. Les artistes te trouvent dans la recherche dès que
				tu as coché <a href="/profil/metier/inge-son" class="underline">ce que tu proposes</a>.
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
				<p class="font-semibold">Ajoute d'abord le métier « Ingé son ».</p>
				<p class="text-sm text-muted-foreground">
					Tu peux avoir plusieurs métiers, par exemple musicien·ne et ingé son.
				</p>
				<a href="/reglages/metiers" class="lm-btn">Choisir mes métiers</a>
			</div>
		{:else}
			<form method="POST" use:enhance class="space-y-10">
				<fieldset class="space-y-2">
					<legend class="text-lg font-semibold">Mes spécialités</legend>
					<div class="grid gap-2 sm:grid-cols-2">
						{#each SOUND_SPECIALTIES as item (item)}
							<label class="lm-tile lm-tile--flow flex cursor-pointer items-start gap-2 p-3">
								<input
									type="checkbox"
									value={item}
									class="mt-1 size-4"
									bind:group={$form.specialties}
								/>
								<span>
									<span class="font-medium">{SOUND_SPECIALTY_INFO[item].label}</span>
									<span class="block text-sm text-muted-foreground"
										>{SOUND_SPECIALTY_INFO[item].hint}</span
									>
								</span>
							</label>
						{/each}
					</div>
				</fieldset>

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
					<p class="text-xs text-muted-foreground">
						Ton rayon de déplacement est celui de <a href="/profil" class="underline">Mon profil</a
						>.
					</p>
				</fieldset>

				<section class="space-y-2">
					<label for="gear" class="block text-lg font-semibold">Mon matériel</label>
					<p class="text-sm text-muted-foreground">
						Console, micros, logiciels, système de diffusion : une ligne par élément.
					</p>
					<textarea
						id="gear"
						rows="5"
						class="lm-field w-full"
						placeholder="Pro Tools&#10;Neumann U87&#10;Yamaha CL5 (façade)"
						bind:value={$form.gear}
					></textarea>
					<p class="text-right text-xs text-muted-foreground">
						{$form.gear.length}/{MAX_GEAR_LENGTH}
					</p>
					{#if $errors.gear}<p class="text-sm text-destructive">{$errors.gear[0]}</p>{/if}
				</section>

				<CraftReferencesFields
					bind:references={$form.references}
					errors={$errors.references}
					title="Mes travaux en écoute"
					hint="Un titre que tu as enregistré, mixé ou sonorisé, avec un lien public (SoundCloud, YouTube, Bandcamp…). Un avant / après parle beaucoup."
					titlePlaceholder="Mix de « Nuit blanche » (Les Pavés)"
					addLabel="Ajouter un travail"
				/>

				<Button type="submit" class="w-full" disabled={$submitting}>Enregistrer</Button>
			</form>
		{/if}
	</div>
</div>
