<script lang="ts">
	// LINKMUSICIAN: « Mes studios » (P4-03a), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import SEO from '#lib/components/SEO.svelte';
	import { ROLE_LABELS } from '#lib/bands/rules';
	import { MAX_STUDIO_NAME } from '#lib/studios/rules';

	let { data, form } = $props();
	let sending = $state(false);
</script>

<SEO title="Mes studios" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-3xl space-y-8 rounded-3xl border bg-card p-5 shadow-sm sm:p-8 lg:p-10">
		<div class="space-y-2">
			<h1 class="text-3xl font-black tracking-tight sm:text-4xl">Mes studios</h1>
			<p class="text-sm text-muted-foreground">
				La fiche de ton studio : salles, matériel, tarifs, horaires. Une fois publiée, tout le monde
				la trouve et ton studio est <strong>Ouvert</strong>.
			</p>
		</div>

		{#if data.studios.length > 0}
			<ul class="space-y-2">
				{#each data.studios as studio (studio.handle)}
					<li>
						<a
							href="/studios/{studio.handle}"
							class="flex min-h-14 items-center justify-between gap-3 rounded-xl border p-3 hover:bg-muted"
						>
							<span class="font-semibold">{studio.name}</span>
							<span class="text-sm text-muted-foreground">
								{studio.published ? 'Publiée' : 'Brouillon'} · {ROLE_LABELS[studio.role]}
							</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}

		{#if data.canOpen}
			<section class="space-y-3" aria-labelledby="new-studio">
				<h2 id="new-studio" class="text-xl font-bold">
					{data.studios.length > 0 ? 'Ouvrir une autre fiche' : 'Ouvrir la fiche de ton studio'}
				</h2>
				{#if form?.error}
					<p role="alert" class="rounded-md border border-destructive p-3 text-sm text-destructive">
						{form.error}
					</p>
				{/if}
				<form
					method="POST"
					class="flex flex-col gap-3 sm:flex-row sm:items-end"
					use:enhance={() => {
						sending = true;
						return async ({ update }) => {
							await update();
							sending = false;
						};
					}}
				>
					<label class="block flex-1 space-y-1 font-medium">
						Nom du studio
						<input
							name="name"
							required
							autocomplete="off"
							maxlength={MAX_STUDIO_NAME}
							value={form?.name ?? ''}
							placeholder="Studio du Canal"
							class="w-full rounded-md border bg-background p-2 text-sm font-normal"
						/>
					</label>
					<button
						disabled={sending}
						class="min-h-11 rounded-full bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-60"
						>Créer la fiche</button
					>
				</form>
				<p class="text-sm text-muted-foreground">
					Tu en seras la personne responsable. Rien n’est visible avant que tu publies la fiche.
				</p>
			</section>
		{:else}
			<section class="space-y-3 rounded-xl border p-4">
				<h2 class="font-semibold">Un studio se gère avec un métier du son</h2>
				<p class="text-sm text-muted-foreground">
					Ajoute le métier d’ingé son ou de producteur·rice pour ouvrir la fiche de ton studio.
				</p>
				<a
					href="/reglages/metiers"
					class="inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold hover:bg-muted"
					>Mes métiers →</a
				>
			</section>
		{/if}
	</div>
</div>
