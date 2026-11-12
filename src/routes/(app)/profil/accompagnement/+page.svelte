<script lang="ts">
	// LINKMUSICIAN: « Mon profil de manager ou de booker » (P5-07), voir +page.server.ts.
	import TrackCompletenessCard from '#lib/components/linkmusician/profile/TrackCompletenessCard.svelte';
	import { untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { superForm } from 'sveltekit-superforms/client';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { Button } from '#shadcn/button';
	import SEO from '#lib/components/SEO.svelte';
	import { agentProfileSchema } from '#lib/schema/crafts/agentProfileSchema';
	import { RETRY_FRIENDLY_FORM } from '#lib/forms/superformOptions';
	import { MAX_AGENT_GENRES, MAX_AGENT_PITCH } from '#lib/crafts/agent';

	let { data } = $props();

	const profileForm = superForm(
		untrack(() => data.form),
		{
			validators: zodClient(agentProfileSchema),
			id: 'agentProfileForm',
			dataType: 'json',
			resetForm: false,
			...RETRY_FRIENDLY_FORM,
			onUpdated: ({ form }) => {
				if (form.valid && form.message) toast.success(form.message);
			}
		}
	);
	const { form, errors, enhance, submitting } = profileForm;
	const genresFull = $derived($form.genreIds.length >= MAX_AGENT_GENRES);
</script>

<SEO title="Mon profil de manager ou de booker" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-5xl space-y-8 rounded-3xl border bg-card p-5 shadow-sm sm:p-8 lg:p-10">
		<div>
			<a href="/profil" class="text-sm text-muted-foreground underline">← Mon profil</a>
			<h1 class="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
				Mon profil de manager ou de booker
			</h1>
			<p class="text-sm text-muted-foreground">
				Les genres que tu suis et ce que tu cherches. Ta zone, c’est
				<a href="/profil/ville" class="underline">ta ville</a>. Les artistes que tu accompagnes
				s’affichent dès qu’ils ont confirmé, depuis
				<a href="/accompagnement" class="underline">Accompagnement</a>.
			</p>
		</div>

		<!-- LINKMUSICIAN: complétude du métier (ONB-13a, D62) : sans offre, pas de recherche. -->
		{#if 'completeness' in data}
			{#each data.completeness as c (c.track)}
				<TrackCompletenessCard completeness={c} common={data.commonMissing} />
			{/each}
		{/if}

		{#if !data.hasTrack}
			<div class="space-y-3 rounded-2xl border bg-muted/40 p-5">
				<p class="font-semibold">Ajoute d’abord le métier « Manager » ou « Booker ».</p>
				<p class="text-sm text-muted-foreground">
					Tu peux avoir plusieurs métiers, par exemple musicien·ne et booker.
				</p>
				<a
					href="/reglages/metiers"
					class="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 font-semibold text-primary-foreground"
					>Choisir mes métiers</a
				>
			</div>
		{:else}
			<form method="POST" use:enhance class="space-y-10">
				<section aria-labelledby="genres-title" class="space-y-3">
					<h2 id="genres-title" class="text-lg font-semibold">
						Les genres que je suis <span class="text-sm font-normal text-muted-foreground"
							>({$form.genreIds.length}/{MAX_AGENT_GENRES})</span
						>
					</h2>
					<details open={$form.genreIds.length === 0}>
						<summary class="min-h-11 cursor-pointer content-center text-sm font-medium text-primary"
							>Choisir mes genres</summary
						>
						<div class="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{#each data.genres as genre (genre.id)}
								<fieldset class="rounded-lg border p-3">
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

				<section class="space-y-2">
					<label for="pitch" class="block text-lg font-semibold">Ce que je cherche</label>
					<p class="text-sm text-muted-foreground">
						Facultatif. Par exemple : « Je booke des groupes rock en Occitanie, salles de 100 à 400
						places. »
					</p>
					<textarea
						id="pitch"
						rows="3"
						maxlength={MAX_AGENT_PITCH}
						class="w-full rounded-md border bg-background p-2 text-sm"
						bind:value={$form.pitch}
					></textarea>
					<p class="text-right text-xs text-muted-foreground">
						{$form.pitch.length}/{MAX_AGENT_PITCH}
					</p>
					{#if $errors.pitch}<p class="text-sm text-destructive">{$errors.pitch[0]}</p>{/if}
				</section>

				<Button type="submit" class="w-full" disabled={$submitting}>Enregistrer</Button>
			</form>
		{/if}
	</div>
</div>
