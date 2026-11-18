<script lang="ts">
	// LINKMUSICIAN: créer un projet (P2), voir +page.server.ts. Une colonne, pas
	// de tunnel : nom, type, porteur si j'en gère, le reste replié.
	import { enhance } from '$app/forms';
	import SEO from '#lib/components/SEO.svelte';
	import MetroPageHeader from '#lib/components/linkmusician/metro/MetroPageHeader.svelte';
	import MetroChoice from '#lib/components/linkmusician/metro/MetroChoice.svelte';
	import MetroField from '#lib/components/linkmusician/metro/MetroField.svelte';
	import {
		MAX_PROJECT_DESCRIPTION,
		MAX_PROJECT_NAME,
		PROJECT_KIND_LABELS,
		PROJECT_KINDS,
		type ProjectKindValue
	} from '#lib/projects/rules';

	let { data, form } = $props();
	let sending = $state(false);
	// Avec use:enhance, un refus ne remonte pas la page : le type choisi reste.
	let kind = $state<ProjectKindValue | undefined>(undefined);
	const kinds = PROJECT_KINDS.map((value) => ({ value, label: PROJECT_KIND_LABELS[value] }));
	const ownerValue = $derived(form?.values?.owner ?? data.defaultOwner ?? '');
</script>

<SEO title="Nouveau projet" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-3xl space-y-6">
		<MetroPageHeader
			kicker="Nouveau projet"
			title="Un projet"
			intro="Rassemble des morceaux autour d’un objectif. Rien de ce que tu ranges ne change de mains, et rien n’est obligatoire."
		/>

		{#if form?.error}
			<p role="alert" class="lm-alert p-3 text-sm">{form.error}</p>
		{/if}

		<form
			method="POST"
			class="space-y-6"
			use:enhance={() => {
				sending = true;
				return async ({ update }) => {
					await update();
					sending = false;
				};
			}}
		>
			<MetroField
				id="name"
				label="Nom du projet"
				help="Les personnes que tu inviteras plus tard verront ce nom."
			>
				{#snippet children(attrs)}
					<input
						{...attrs}
						name="name"
						required
						minlength="2"
						maxlength={MAX_PROJECT_NAME}
						value={form?.values?.name ?? ''}
						placeholder="EP Lumière"
					/>
				{/snippet}
			</MetroField>

			<fieldset class="space-y-2">
				<legend class="text-sm font-medium">C’est quoi ?</legend>
				<MetroChoice options={kinds} bind:value={kind} label="Type de projet" name="kind" />
			</fieldset>

			{#if data.owners.length > 1}
				<fieldset class="space-y-2">
					<legend class="text-sm font-medium">Porté par</legend>
					<p class="text-sm text-muted-foreground">Seules les structures que tu gères.</p>
					{#each data.owners as o (o.id)}
						<label class="flex min-h-11 items-center gap-2">
							<input
								type="radio"
								name="owner"
								value={o.isMe ? '' : o.id}
								checked={(o.isMe ? '' : o.id) === ownerValue}
							/>
							{o.isMe ? 'Moi' : o.name}
						</label>
					{/each}
				</fieldset>
			{/if}

			<details class="space-y-4" open={!!(form?.values?.description || form?.values?.dueOn)}>
				<summary class="min-h-11 cursor-pointer py-2 text-sm font-medium">
					Ajouter des dates et une phrase
				</summary>
				<div class="space-y-4 pt-2">
					<MetroField id="description" label="Objectif en une phrase" optional>
						{#snippet children(attrs)}
							<textarea
								{...attrs}
								name="description"
								rows="2"
								maxlength={MAX_PROJECT_DESCRIPTION}
								value={form?.values?.description ?? ''}
							></textarea>
						{/snippet}
					</MetroField>
					<div class="grid gap-4 sm:grid-cols-2">
						<MetroField id="startsOn" label="Début" optional>
							{#snippet children(attrs)}
								<input
									{...attrs}
									type="date"
									name="startsOn"
									value={form?.values?.startsOn ?? ''}
								/>
							{/snippet}
						</MetroField>
						<MetroField id="dueOn" label="Échéance" optional>
							{#snippet children(attrs)}
								<input {...attrs} type="date" name="dueOn" value={form?.values?.dueOn ?? ''} />
							{/snippet}
						</MetroField>
					</div>
				</div>
			</details>

			<button disabled={sending} class="lm-btn disabled:opacity-60">
				{sending ? 'Un instant…' : 'Créer le projet'}
			</button>
		</form>
	</div>
</div>
