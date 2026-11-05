<script lang="ts">
	// LINKMUSICIAN: mode jam (P2-12), voir +page.server.ts.
	import SEO from '#lib/components/SEO.svelte';
	import { Badge } from '#shadcn/badge';
	import { Guitar, MapPin, Plus, Radio, Users } from 'lucide-svelte';

	let { data } = $props();
	const day = new Intl.DateTimeFormat('fr-FR', {
		weekday: 'short',
		day: 'numeric',
		month: 'short'
	});
</script>

<SEO title="Mode jam" noindex nofollow />

<div class="min-h-screen w-screen px-4 pt-6 pb-24">
	<div class="mx-auto max-w-3xl space-y-6">
		<header
			class="space-y-3 rounded-3xl bg-gradient-to-br from-orange-600 to-pink-600 p-6 text-white shadow-xl"
		>
			<p class="flex items-center gap-2 text-sm font-bold uppercase">
				<Guitar class="size-5" aria-hidden="true" /> Mode jam
			</p>
			<h1 class="text-3xl font-black tracking-tight">Envie de jouer ?</h1>
			<p class="text-white/90">
				Pas de projet, pas de pression : des jams{data.commune ? ` autour de ${data.commune}` : ''} et
				des rencontres musicales.
			</p>
			<a
				href="/annonces/nouvelle?type=JAM"
				class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 font-bold text-pink-700"
			>
				<Plus class="size-4" aria-hidden="true" /> Lancer une jam
			</a>
		</header>

		<p class="flex items-center gap-2 rounded-2xl border bg-card p-4 text-sm">
			<Radio class="size-5 shrink-0 text-primary" aria-hidden="true" />
			<span
				><strong>Bientôt : « Je suis dispo »</strong> pour que les musicien·nes du coin sachent que tu
				veux jouer ce soir.</span
			>
		</p>

		<section class="space-y-3" aria-labelledby="jams-title">
			<h2 id="jams-title" class="text-lg font-semibold">Jams ouvertes autour de toi</h2>
			{#if !data.commune}
				<p class="rounded-2xl border bg-card p-6 text-center">
					Indique ta ville pour voir les jams près de chez toi.
					<a href="/profil/ville" class="block pt-2 font-semibold underline">Indiquer ma ville</a>
				</p>
			{:else if data.jams.length === 0}
				<p class="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
					Pas encore de jam ouverte près de toi. Lance la première !
				</p>
			{:else}
				<ul class="space-y-3" aria-label="Jams ouvertes">
					{#each data.jams as j (j.id)}
						<li>
							<a
								href="/annonces/{j.id}"
								class="block space-y-1 rounded-2xl border bg-card p-4 transition hover:border-primary hover:shadow-md"
							>
								<span class="flex flex-wrap items-center gap-2">
									<span class="text-lg font-bold">{j.title}</span>
									{#if j.startsAt}<Badge variant="outline">{day.format(new Date(j.startsAt))}</Badge
										>{/if}
								</span>
								<span class="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
									<span class="inline-flex items-center gap-1"
										><MapPin class="size-3.5" aria-hidden="true" />{j.distance}{j.commune
											? ` · ${j.commune}`
											: ''}</span
									>
									<span class="inline-flex items-center gap-1"
										><Users class="size-3.5" aria-hidden="true" />{j.slots} place{j.slots > 1
											? 's'
											: ''}</span
									>
									<span>par {j.issuer}</span>
								</span>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
</div>
