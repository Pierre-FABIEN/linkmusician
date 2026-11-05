<script lang="ts">
	// LINKMUSICIAN: carnet de jams et réseau musical (P2-16), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import SEO from '#lib/components/SEO.svelte';
	import { plural } from '#lib/jam/log';
	import { BookHeart, Heart, MapPin, Users } from 'lucide-svelte';

	let { data, form } = $props();

	$effect(() => {
		if (form?.message) toast.success(form.message);
	});
	const day = new Intl.DateTimeFormat('fr-FR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'Europe/Paris'
	});
	const tiles = $derived([
		plural(data.stats.jams, 'jam'),
		plural(data.stats.people, 'personne rencontrée', 'personnes rencontrées'),
		plural(data.stats.instruments, 'instrument croisé', 'instruments croisés'),
		plural(data.stats.styles, 'style'),
		plural(data.stats.communes, 'commune')
	]);
</script>

<SEO title="Mon carnet de jams" noindex nofollow />

<div class="min-h-screen w-screen px-4 pt-6 pb-24">
	<div class="mx-auto max-w-2xl space-y-8">
		<div class="space-y-2">
			<a href="/jam" class="text-sm text-muted-foreground underline">← Mode jam</a>
			<h1 class="flex items-center gap-2 text-3xl font-black tracking-tight">
				<BookHeart class="size-7" aria-hidden="true" /> Mon carnet de jams
			</h1>
			<p class="text-sm text-muted-foreground">
				Les jams où tu étais, les gens que tu y as croisés. Rien que pour toi.
			</p>
		</div>

		{#if data.entries.length === 0}
			<p class="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
				Ton carnet se remplit quand tu dis « J’y étais » après une jam.
				<a href="/jam#jams" class="block pt-2 font-semibold underline">Trouver une jam</a>
			</p>
		{:else}
			<ul class="flex flex-wrap gap-2" aria-label="Résumé du carnet">
				{#each tiles as t (t)}
					<li class="rounded-full border bg-card px-3 py-1 text-sm font-semibold">{t}</li>
				{/each}
			</ul>

			<ol class="space-y-4" aria-label="Jams du carnet">
				{#each data.entries as e (e.jamId)}
					<li class="space-y-3 rounded-2xl border bg-card p-4">
						<div>
							<p class="text-sm text-muted-foreground">{day.format(new Date(e.startsAt))}</p>
							<h2 class="text-lg font-bold">{e.title}</h2>
							<p class="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
								<MapPin class="size-3.5" aria-hidden="true" />{e.venue} · {e.communeName}{e.genre
									? ` · ${e.genre}`
									: ''}{e.played ? ` · tu jouais : ${e.played.toLowerCase()}` : ''}
							</p>
						</div>
						{#if e.others.length > 0}
							<ul class="flex flex-wrap gap-2 text-sm" aria-label="Croisé·es à {e.title}">
								{#each e.others as o (o.handle)}
									<li class="rounded-full border px-3 py-1">
										<a href="/@{o.handle}" class="underline">{o.displayName}</a>{o.instrument
											? ` · ${o.instrument.toLowerCase()}`
											: ''}{o.inNetwork ? ' · réseau' : ''}
									</li>
								{/each}
							</ul>
						{/if}
						{#if e.appreciations.length > 0}
							<p class="flex flex-wrap items-center gap-1 text-sm font-semibold text-primary">
								<Heart class="size-3.5" aria-hidden="true" />
								On t’a apprécié·e : {e.appreciations.join(', ')}
							</p>
						{/if}
					</li>
				{/each}
			</ol>
		{/if}

		<section class="space-y-3" aria-labelledby="network-title">
			<h2 id="network-title" class="flex items-center gap-2 text-xl font-bold">
				<Users class="size-5" aria-hidden="true" /> Mon réseau musical
			</h2>
			<p class="text-sm text-muted-foreground">
				Les gens avec qui tu as vraiment joué et que tu as gardé·es. Ils remontent en premier quand
				tu cherches quelqu’un ou que tu invites à une jam. Personne d’autre ne voit cette liste.
			</p>
			{#if data.network.length === 0}
				<p class="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
					Après une jam, touche « Garder le contact » sur les personnes avec qui tu veux rejouer.
				</p>
			{:else}
				<ul class="grid gap-3 sm:grid-cols-2">
					{#each data.network as n (n.handle)}
						<li class="flex items-start justify-between gap-2 rounded-2xl border bg-card p-4">
							<span>
								<a href="/@{n.handle}" class="font-semibold underline">{n.displayName}</a>
								<span class="block text-sm text-muted-foreground"
									>{n.instruments.join(' · ') || 'Instrument non précisé'}{n.jamsTogether > 0
										? ` · ${plural(n.jamsTogether, 'jam ensemble', 'jams ensemble')}`
										: ''}</span
								>
							</span>
							<form method="POST" action="?/leave" use:enhance>
								<input type="hidden" name="handle" value={n.handle} />
								<button class="min-h-11 px-2 text-sm text-muted-foreground underline"
									>Retirer</button
								>
							</form>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
</div>
