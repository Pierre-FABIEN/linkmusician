<script lang="ts">
	// LINKMUSICIAN: « Mon profil », voir +page.server.ts.
	import TipCard from '#lib/components/linkmusician/TipCard.svelte';
	import { untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { superForm } from 'sveltekit-superforms/client';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { Button } from '#shadcn/button';
	import { profileSchema } from '#lib/schema/actors/profileSchema';
	import { RETRY_FRIENDLY_FORM } from '#lib/forms/superformOptions';
	import {
		EQUIPMENT,
		EQUIPMENT_LABELS,
		LINK_INFO,
		LINK_KINDS,
		LOOKING_FOR,
		LOOKING_FOR_LABELS,
		MAX_BIO_LENGTH,
		PRO_STATUS_INFO,
		PRO_STATUSES,
		TRAVEL_RADII
	} from '#lib/actors/profile';
	import SEO from '#lib/components/SEO.svelte';

	let { data } = $props();

	const profileForm = superForm(
		untrack(() => data.form),
		{
			validators: zodClient(profileSchema),
			id: 'profileForm',
			dataType: 'json',
			resetForm: false,
			...RETRY_FRIENDLY_FORM,
			onUpdated: ({ form }) => {
				if (form.valid && form.message) toast.success(form.message);
			}
		}
	);
	const { form, errors, enhance, submitting } = profileForm;
	const currentYear = new Date().getFullYear();
</script>

<SEO title="Mon profil" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-5xl space-y-8 rounded-3xl border bg-card p-5 shadow-sm sm:p-8 lg:p-10">
		<div>
			<a href="/espace" class="text-sm text-muted-foreground underline">← Mon espace</a>
			<h1 class="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Mon profil</h1>
			<p class="text-sm text-muted-foreground">
				Tout est déclaratif et facultatif. Instruments, genres et influences :
				<a href="/profil/musical" class="underline">Mon profil musical</a>. Ta commune :
				<a href="/profil/ville" class="underline">Ma ville</a>. Démos et vidéos :
				<a href="/profil/medias" class="underline">Mes médias</a>.
			</p>
		</div>

		<TipCard tip={data.tip} />

		<!-- Liens en `type="text"` : un champ `url` refuserait « lea.bandcamp.com »
		     (sans https://) avant même l'envoi, alors que `checkLink` le complète. -->
		<form method="POST" use:enhance class="space-y-10">
			<section class="space-y-2">
				<label for="bio" class="block text-lg font-semibold">Présentation</label>
				<textarea
					id="bio"
					rows="5"
					class="w-full rounded-md border bg-background p-2 text-sm"
					placeholder="Qui tu es, ce que tu joues, ce que tu aimerais faire…"
					bind:value={$form.bio}
				></textarea>
				<p class="text-right text-xs text-muted-foreground">
					{$form.bio.length}/{MAX_BIO_LENGTH}
				</p>
				{#if $errors.bio}<p class="text-sm text-destructive">{$errors.bio[0]}</p>{/if}
			</section>

			<fieldset class="space-y-2">
				<legend class="text-lg font-semibold">Statut</legend>
				<p class="text-sm text-muted-foreground">Affiché avec la mention « déclaré ».</p>
				<div class="grid gap-2 sm:grid-cols-2">
					{#each PRO_STATUSES as status (status)}
						<label class="flex cursor-pointer items-start gap-2 rounded-lg border p-3">
							<input
								type="radio"
								name="proStatus"
								value={status}
								class="mt-1 size-4"
								bind:group={$form.proStatus}
							/>
							<span>
								<span class="font-medium">{PRO_STATUS_INFO[status].label}</span>
								<span class="block text-sm text-muted-foreground"
									>{PRO_STATUS_INFO[status].hint}</span
								>
							</span>
						</label>
					{/each}
				</div>
				<label class="flex cursor-pointer items-center gap-2 p-3 text-sm text-muted-foreground">
					<input
						type="radio"
						name="proStatus"
						value=""
						class="size-4"
						bind:group={$form.proStatus}
					/>
					Je préfère ne pas le préciser
				</label>
			</fieldset>

			<fieldset class="space-y-2">
				<legend class="text-lg font-semibold">Ce que je recherche</legend>
				<div class="grid gap-2 sm:grid-cols-2">
					{#each LOOKING_FOR as item (item)}
						<label class="flex cursor-pointer items-center gap-2 text-sm">
							<input type="checkbox" value={item} class="size-4" bind:group={$form.lookingFor} />
							{LOOKING_FOR_LABELS[item]}
						</label>
					{/each}
				</div>
			</fieldset>

			{#if data.mayOrganize}
				<!-- Organiser des jams (D51) : seul·es ces profils lancent une jam. -->
				<fieldset
					id="organiser"
					class="scroll-mt-24 space-y-2 rounded-2xl border p-4 {data.askOrganize
						? 'border-primary bg-primary/5'
						: ''}"
				>
					<legend class="px-1 text-lg font-semibold">Organiser des jams</legend>
					{#if data.askOrganize}
						<p class="text-sm font-medium">
							Pour lancer une jam, coche cette case puis enregistre ton profil.
						</p>
					{/if}
					<label class="flex cursor-pointer items-start gap-3 text-sm">
						<input
							type="checkbox"
							name="organizesJams"
							class="mt-0.5 size-4"
							bind:checked={$form.organizesJams}
						/>
						<span>
							<span class="font-semibold">Je suis prêt·e à organiser des jams</span>
							<span class="block text-muted-foreground">
								Tu pourras lancer des jams dans les lieux de l’annuaire. Les lieux et les
								organisateurs pourront te proposer d’en animer. Sans cocher, tu peux toujours écrire
								aux musicien·nes pour jouer ensemble.
							</span>
						</span>
					</label>
				</fieldset>
			{/if}

			<fieldset class="space-y-2">
				<legend class="text-lg font-semibold">Matériel à disposition</legend>
				<div class="grid gap-2 sm:grid-cols-2">
					{#each EQUIPMENT as item (item)}
						<label class="flex cursor-pointer items-center gap-2 text-sm">
							<input type="checkbox" value={item} class="size-4" bind:group={$form.equipment} />
							{EQUIPMENT_LABELS[item]}
						</label>
					{/each}
				</div>
			</fieldset>

			<section class="grid gap-6 sm:grid-cols-2">
				<div class="space-y-2">
					<label for="practiceSince" class="block font-semibold">Je joue depuis</label>
					<input
						id="practiceSince"
						type="number"
						inputmode="numeric"
						min="1940"
						max={currentYear}
						placeholder="Année, ex. 2012"
						class="w-full rounded-md border bg-background p-2 text-sm"
						bind:value={$form.practiceSince}
					/>
					{#if $errors.practiceSince}
						<p class="text-sm text-destructive">{$errors.practiceSince[0]}</p>
					{/if}
				</div>
				<div class="space-y-2">
					<label for="travelRadiusKm" class="block font-semibold">Je me déplace jusqu'à</label>
					<select
						id="travelRadiusKm"
						class="w-full rounded-md border bg-background p-2 text-sm"
						bind:value={$form.travelRadiusKm}
					>
						<option value={0}>Non précisé</option>
						{#each TRAVEL_RADII as radius (radius)}
							<option value={radius}>{radius} km</option>
						{/each}
					</select>
				</div>
			</section>

			<fieldset class="space-y-3">
				<legend class="text-lg font-semibold">Liens</legend>
				{#each LINK_KINDS as kind (kind)}
					<div class="space-y-1">
						<label for="link-{kind}" class="block text-sm font-medium"
							>{LINK_INFO[kind].label}</label
						>
						<input
							id="link-{kind}"
							type="text"
							inputmode="url"
							autocomplete="url"
							spellcheck="false"
							placeholder={LINK_INFO[kind].example}
							class="w-full rounded-md border bg-background p-2 text-sm"
							bind:value={$form.links[kind]}
						/>
						{#if $errors.links?.[kind]}
							<p class="text-sm text-destructive">{$errors.links[kind][0]}</p>
						{/if}
					</div>
				{/each}
			</fieldset>

			<Button type="submit" class="w-full" disabled={$submitting}>Enregistrer</Button>
		</form>
	</div>
</div>
