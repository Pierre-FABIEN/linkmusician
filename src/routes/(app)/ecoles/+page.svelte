<script lang="ts">
	// LINKMUSICIAN: « Mes écoles » (P5-11), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import SEO from '#lib/components/SEO.svelte';
	import MetroPageHeader from '#lib/components/linkmusician/metro/MetroPageHeader.svelte';
	import { MAX_SCHOOL_NAME, SCHOOL_KINDS, SCHOOL_KIND_LABELS } from '#lib/schools/rules';

	let { data, form } = $props();
	let sending = $state(false);
	const managed = $derived(data.schools.filter((s) => s.manager));
	const joined = $derived(data.schools.filter((s) => !s.manager));
</script>

<SEO title="Mes écoles" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-3xl space-y-8">
		<MetroPageHeader
			title="Mes écoles"
			intro="Ton école de musique, ta MJC ou ton conservatoire : ses ateliers jam, réservés à ses élèves, pour apprendre à jouer avec d’autres avant la scène."
		/>

		<a href={resolve('/(app)/structure/historique')} class="lm-link"
			>Historique de mes participations</a
		>

		{#if joined.length > 0}
			<section class="space-y-2" aria-labelledby="joined">
				<h2 id="joined" class="text-xl font-bold">Mes écoles</h2>
				<ul class="space-y-2">
					{#each joined as s (s.handle)}
						<li>
							<a
								href="/ecoles/{s.handle}"
								class="flex min-h-14 items-center justify-between gap-3 rounded-2xl border bg-card p-4 hover:border-primary"
							>
								<span class="font-semibold">{s.name}</span>
								<span class="text-sm text-muted-foreground">{SCHOOL_KIND_LABELS[s.kind]}</span>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if managed.length > 0}
			<section class="space-y-2" aria-labelledby="managed">
				<h2 id="managed" class="text-xl font-bold">Les écoles que je gère</h2>
				<ul class="space-y-2">
					{#each managed as s (s.handle)}
						<li>
							<a
								href="/ecoles/{s.handle}"
								class="flex min-h-14 items-center justify-between gap-3 rounded-2xl border bg-card p-4 hover:border-primary"
							>
								<span class="font-semibold">{s.name}</span>
								<span class="text-sm text-muted-foreground">{SCHOOL_KIND_LABELS[s.kind]}</span>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if data.schools.length === 0}
			<p class="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
				Tu n’es dans aucune école. Ton prof t’a envoyé un lien ? Ouvre-le : tu rejoindras son école
				et ses ateliers.
			</p>
		{/if}

		{#if data.canOpen}
			<section class="space-y-3 rounded-2xl border bg-card p-4" aria-labelledby="open">
				<h2 id="open" class="text-xl font-bold">Tu enseignes ? Ouvre ton école</h2>
				<p class="text-sm text-muted-foreground">
					Tu en seras responsable : tu invites tes élèves par un lien et tu publies des ateliers jam
					qu’eux seuls voient. Personne d’autre ne voit qui sont tes élèves.
				</p>
				{#if form?.error}
					<p role="alert" class="rounded-md border border-destructive p-3 text-sm text-destructive">
						{form.error}
					</p>
				{/if}
				<form
					method="POST"
					action="?/create"
					class="grid gap-3 sm:grid-cols-2"
					use:enhance={() => {
						sending = true;
						return async ({ update }) => {
							await update();
							sending = false;
						};
					}}
				>
					<label class="block space-y-1 font-medium">
						Nom de l’école
						<input
							name="name"
							required
							autocomplete="off"
							maxlength={MAX_SCHOOL_NAME}
							value={form?.name ?? ''}
							placeholder="École de musique du Faubourg"
							class="w-full rounded-md border bg-background p-2 text-sm font-normal"
						/>
					</label>
					<label class="block space-y-1 font-medium">
						Type
						<select
							name="kind"
							class="w-full rounded-md border bg-background p-2 text-sm font-normal"
						>
							{#each SCHOOL_KINDS as kind (kind)}
								<option value={kind}>{SCHOOL_KIND_LABELS[kind]}</option>
							{/each}
						</select>
					</label>
					<button
						disabled={sending}
						class="min-h-11 rounded-full bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-60 sm:col-span-2"
						>Ouvrir l’école</button
					>
				</form>
			</section>
		{/if}
	</div>
</div>
