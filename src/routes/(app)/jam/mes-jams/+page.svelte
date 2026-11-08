<script lang="ts">
	// LINKMUSICIAN: « Mes jams » (P2-14c, P2-15, D50), voir +page.server.ts.
	import SEO from '#lib/components/SEO.svelte';
	import SubPageHeader from '#lib/components/linkmusician/SubPageHeader.svelte';
	import { CalendarDays } from 'lucide-svelte';

	let { data } = $props();
	const day = new Intl.DateTimeFormat('fr-FR', {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		timeZone: 'Europe/Paris'
	});
</script>

<SEO title="Mes jams" noindex nofollow />

<div class="min-h-screen w-full bg-muted/20 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-10">
	<div class="mx-auto max-w-7xl space-y-6">
		<SubPageHeader
			title="Mes jams"
			intro="Les jams où l’on t’invite, et celles où tu es allé·e : dis si tu y étais, apprécie les présent·es."
		/>
		{#if data.invites.length === 0 && data.recent.length === 0}
			<div class="space-y-2 rounded-2xl border bg-card p-6 text-center">
				<CalendarDays class="mx-auto size-6 text-primary" aria-hidden="true" />
				<p class="font-semibold">Pas encore de jam ici.</p>
				<p class="text-sm text-muted-foreground">
					Dis « Je viens » à une jam : elle apparaîtra ici après.
				</p>
				<a href="/jam/agenda" class="inline-block pt-1 font-semibold underline"
					>Voir les jams à venir</a
				>
			</div>
		{/if}
		<div class="grid gap-4 xl:grid-cols-2">
			{#if data.invites.length > 0}
				<section
					class="space-y-3 rounded-2xl border-2 border-primary bg-card p-4 sm:p-5"
					aria-labelledby="invites-title"
				>
					<h2 id="invites-title" class="text-lg font-semibold">
						On t’invite à jouer ({data.invites.length})
					</h2>
					<ul class="space-y-2">
						{#each data.invites as j (j.id)}
							<li>
								<a
									href="/jams/{j.id}"
									class="block rounded-xl border p-3 transition hover:border-primary"
								>
									<span class="block font-semibold">{j.title}</span>
									<span class="text-sm text-muted-foreground"
										>{day.format(new Date(j.startsAt))} · {j.venue.name} · Répondre</span
									>
								</a>
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			{#if data.recent.length > 0}
				<section
					class="space-y-3 rounded-2xl border bg-card p-4 sm:p-5"
					aria-labelledby="recent-title"
				>
					<div class="flex flex-wrap items-baseline justify-between gap-2">
						<h2 id="recent-title" class="text-lg font-semibold">Tes dernières jams</h2>
						<a href="/jam/carnet" class="text-sm font-semibold underline">Mon carnet de jams</a>
					</div>
					<ul class="space-y-2">
						{#each data.recent as j (j.id)}
							<li>
								<a
									href="/jams/{j.id}/presents"
									class="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-xl border p-3 transition hover:border-primary"
								>
									<span>
										<span class="block font-semibold">{j.title}</span>
										<span class="text-sm text-muted-foreground"
											>{day.format(new Date(j.startsAt))} · {j.venue}</span
										>
									</span>
									<span class="text-sm font-semibold text-primary"
										>{j.attended ? 'Apprécier les présent·es' : 'Tu y étais ?'}</span
									>
								</a>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		</div>
	</div>
</div>
