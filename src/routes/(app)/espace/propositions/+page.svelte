<script lang="ts">
	// LINKMUSICIAN: « Ce que Melokiva me propose » (N4), voir +page.server.ts.
	// Une page courte : ce qui est écarté, ce qui est reporté, et la différence
	// avec une fonctionnalité désactivée (il n'y en a pas : rien n'est retiré).
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import SEO from '#lib/components/SEO.svelte';
	import MetroPageHeader from '#lib/components/linkmusician/metro/MetroPageHeader.svelte';

	let { data, form } = $props();
	$effect(() => {
		if (form?.message) toast.success(form.message);
		if (form?.error) toast.error(form.error);
	});
	const date = (value: Date) =>
		new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'Europe/Paris' }).format(value);
</script>

<SEO title="Ce que Melokiva me propose" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-3xl space-y-6">
		<MetroPageHeader
			kicker="Mon espace"
			title="Ce que Melokiva me propose"
			intro="Tu choisis les suggestions que tu veux voir. Écarter une suggestion ne retire rien : tes morceaux, tes réalisations, tes droits et chaque écran restent là. Les demandes qui t’attendent (confirmations, invitations) s’affichent toujours."
			back={{ href: '/espace', label: 'Mon espace' }}
		/>

		<section class="space-y-3" aria-labelledby="declined-title">
			<h2 id="declined-title" class="lm-kicker text-muted-foreground">Pas pour moi</h2>
			{#if data.declined.length === 0}
				<p class="lm-tile lm-tile--flow p-4 text-sm text-muted-foreground">
					Rien d’écarté : toutes les suggestions utiles peuvent t’être proposées.
				</p>
			{:else}
				<ul class="lm-tile lm-tile--flow divide-y text-sm" aria-label="Suggestions écartées">
					{#each data.declined as d (d.id)}
						<li class="flex flex-wrap items-center justify-between gap-2 p-3">
							<span class="min-w-0 wrap-break-word">{d.label}</span>
							<form method="POST" action="?/reactivate" use:enhance>
								<input type="hidden" name="id" value={d.id} />
								<button
									class="lm-btn min-h-11"
									data-variant="ghost"
									aria-label="Réactiver : {d.label}">Réactiver</button
								>
							</form>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		{#if data.later.length > 0}
			<section class="space-y-3" aria-labelledby="later-title">
				<h2 id="later-title" class="lm-kicker text-muted-foreground">Reporté</h2>
				<p class="text-sm text-muted-foreground">
					Une suggestion reportée revient à la date indiquée, ou plus tôt si quelque chose change.
				</p>
				<ul class="lm-tile lm-tile--flow divide-y text-sm" aria-label="Suggestions reportées">
					{#each data.later as l (l.id)}
						<li class="flex flex-wrap items-center justify-between gap-2 p-3">
							<span class="min-w-0 wrap-break-word"
								>{l.label}
								<span class="text-muted-foreground">· jusqu’au {date(l.until)}</span></span
							>
							<form method="POST" action="?/reactivate" use:enhance>
								<input type="hidden" name="id" value={l.id} />
								<button
									class="lm-btn min-h-11"
									data-variant="ghost"
									aria-label="Revoir maintenant : {l.label}">Revoir maintenant</button
								>
							</form>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if data.branches.length > 0}
			<section class="space-y-3" aria-labelledby="branches-title">
				<h2 id="branches-title" class="lm-kicker text-muted-foreground">Par branche</h2>
				<p class="text-sm text-muted-foreground">
					Ne plus voir les suggestions facultatives d’une branche. Ses écrans restent accessibles.
				</p>
				<ul class="lm-tile lm-tile--flow divide-y text-sm" aria-label="Branches">
					{#each data.branches as b (b.target)}
						<li class="flex flex-wrap items-center justify-between gap-2 p-3">
							<span class="min-w-0 wrap-break-word">
								<span class="block font-semibold">{b.label}</span>
								<span class="block text-muted-foreground">{b.pitch}</span>
							</span>
							<form method="POST" action="?/decline" use:enhance>
								<input type="hidden" name="target" value={b.target} />
								<button
									class="lm-btn min-h-11"
									data-variant="ghost"
									aria-label="Pas pour moi : {b.label}">Pas pour moi</button
								>
							</form>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	</div>
</div>
