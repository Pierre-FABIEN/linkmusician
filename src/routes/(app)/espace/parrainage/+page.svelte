<script lang="ts">
	// LINKMUSICIAN: parrainage (P4-13b), voir +page.server.ts. Un écran : la
	// présentation, puis ce qu'elle a donné.
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import SEO from '#lib/components/SEO.svelte';
	import MetroPageHeader from '#lib/components/linkmusician/metro/MetroPageHeader.svelte';
	import { Handshake } from 'lucide-svelte';
	import { MAX_INTRO_NOTE } from '#lib/career/introductions';

	let { data, form } = $props();
	let sending = $state(false);
	let note = $state('');

	$effect(() => {
		if (form?.message) {
			toast.success(form.message);
			note = '';
		}
	});

	const day = new Intl.DateTimeFormat('fr-FR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'Europe/Paris'
	});
	const input = 'w-full rounded-md border bg-background p-2 text-sm font-normal';
</script>

<SEO title="Parrainer" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-3xl space-y-6">
		<MetroPageHeader
			kicker="Collab"
			title="Parrainer"
			intro="Tu connais deux personnes qui devraient jouer ensemble ? Présente-les. Si elles collaborent, tu deviens Passeur."
		/>

		{#if !data.eligible}
			<div class="lm-tile lm-tile--flow space-y-2 p-6 text-center">
				<Handshake class="mx-auto size-6 text-primary" aria-hidden="true" />
				<p class="font-semibold">Le parrainage s’ouvre au palier Pilier local.</p>
				<p class="text-sm text-muted-foreground">
					Collaborations, concerts corroborés : quand ta scène te connaît, tu peux y faire entrer
					d’autres personnes.
				</p>
			</div>
		{:else}
			<section aria-labelledby="presenter" class="lm-tile lm-tile--flow space-y-4 p-4 sm:p-5">
				<h2 id="presenter" class="text-xl font-bold">Présenter deux personnes</h2>
				{#if data.contacts.length < 2}
					<p class="text-sm text-muted-foreground">
						Il te faut au moins deux personnes majeures dans <a
							href="/messages/contacts"
							class="underline">ton carnet</a
						>, avec qui tu as une conversation acceptée des deux côtés.
					</p>
				{:else}
					{#if form?.error}
						<p role="alert" class="lm-alert p-3 text-sm">
							{form.error}
						</p>
					{/if}
					<form
						method="POST"
						class="space-y-4"
						use:enhance={() => {
							sending = true;
							return async ({ update }) => {
								await update({ reset: false });
								sending = false;
							};
						}}
					>
						<div class="grid gap-4 sm:grid-cols-2">
							{#each [['first', 'Je présente'], ['second', 'à']] as [name, label] (name)}
								<label class="block space-y-1 font-medium">
									{label}
									<select {name} required class={input}>
										<option value="">Choisir…</option>
										{#each data.contacts as c (c.handle)}
											<option value={c.handle}>{c.displayName}</option>
										{/each}
									</select>
								</label>
							{/each}
						</div>
						<div class="space-y-1">
							<label for="note" class="block font-medium"
								>Un mot pour dire pourquoi <span class="font-normal text-muted-foreground"
									>(facultatif)</span
								></label
							>
							<textarea
								id="note"
								name="note"
								rows="3"
								maxlength={MAX_INTRO_NOTE}
								bind:value={note}
								placeholder="Vous cherchez tous les deux à monter un projet funk…"
								class={input}
							></textarea>
						</div>
						<p class="text-sm text-muted-foreground">
							Les deux reçoivent une notification avec le profil de l’autre. Le reste leur
							appartient.
						</p>
						<button disabled={sending} class="lm-btn w-full disabled:opacity-60"
							>Les présenter</button
						>
					</form>
				{/if}
			</section>
		{/if}

		{#if data.introductions.length > 0}
			<section aria-labelledby="mes-presentations" class="space-y-3">
				<h2 id="mes-presentations" class="text-xl font-bold">Mes présentations</h2>
				<ul class="lm-tile lm-tile--flow divide-y">
					{#each data.introductions as intro (intro.id)}
						<li class="flex flex-wrap items-center justify-between gap-2 p-4">
							<span>
								{#each [intro.first, intro.second] as p, i (i)}
									{#if i === 1}<span class="text-muted-foreground"> et </span>{/if}
									{#if p.handle}<a href="/@{p.handle}" class="font-medium underline">{p.name}</a
										>{:else}<span class="font-medium">{p.name}</span>{/if}
								{/each}
								<span class="block text-sm text-muted-foreground"
									>Présenté·es le {day.format(new Date(intro.createdAt))}</span
								>
							</span>
							{#if intro.succeededAt}
								<span class="lm-pill lm-pill--lg" data-tone="lime">Ont collaboré</span>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	</div>
</div>
