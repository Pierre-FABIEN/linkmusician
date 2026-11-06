<script lang="ts">
	// LINKMUSICIAN: monter un groupe (P3-01), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import SEO from '#lib/components/SEO.svelte';
	import { MAX_BAND_NAME, MAX_MEMBER_TITLE } from '#lib/bands/rules';

	let { form } = $props();
	let sending = $state(false);
</script>

<SEO title="Monter un groupe" noindex nofollow />

<div class="min-h-screen w-screen px-4 pt-6 pb-24">
	<div class="mx-auto max-w-lg space-y-6 rounded-lg border p-6 shadow-lg">
		<div class="space-y-2">
			<a href="/groupes" class="text-sm text-muted-foreground underline">← Mes groupes</a>
			<h1 class="text-2xl font-bold">Monter un groupe</h1>
			<p class="text-sm text-muted-foreground">
				Tu en seras la personne responsable. Le groupe est formé dès qu’un premier membre te
				rejoint.
			</p>
		</div>

		{#if form?.error}
			<p role="alert" class="rounded-md border border-destructive p-3 text-sm text-destructive">
				{form.error}
			</p>
		{/if}

		<form
			method="POST"
			class="space-y-4"
			use:enhance={() => {
				sending = true;
				return async ({ update }) => {
					await update();
					sending = false;
				};
			}}
		>
			<label class="block space-y-1 font-medium">
				Nom du groupe
				<input
					name="name"
					required
					autocomplete="off"
					maxlength={MAX_BAND_NAME}
					value={form?.values?.name ?? ''}
					placeholder="Les Vaches Folles"
					class="w-full rounded-md border bg-background p-2 text-sm font-normal"
				/>
			</label>
			<label class="block space-y-1 font-medium">
				Ce que tu y fais <span class="font-normal text-muted-foreground">(facultatif)</span>
				<input
					name="title"
					autocomplete="off"
					maxlength={MAX_MEMBER_TITLE}
					value={form?.values?.title ?? ''}
					placeholder="guitare, chant"
					class="w-full rounded-md border bg-background p-2 text-sm font-normal"
				/>
			</label>
			<button
				disabled={sending}
				class="min-h-11 w-full rounded-full bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-60"
				>Créer le groupe</button
			>
		</form>
	</div>
</div>
