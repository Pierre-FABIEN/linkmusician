<script lang="ts">
	// LINKMUSICIAN: « Mes jams » (P2-14c, P2-15, D50), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import SEO from '#lib/components/SEO.svelte';
	import MetroPageHeader from '#lib/components/linkmusician/metro/MetroPageHeader.svelte';
	import { CalendarDays } from 'lucide-svelte';

	let { data, form } = $props();
	$effect(() => {
		if (form?.message) toast.success(form.message);
		if (form?.error) toast.error(form.error);
	});
	const pill = 'min-h-11 rounded-full border px-4 text-sm font-semibold hover:bg-muted';
	const day = new Intl.DateTimeFormat('fr-FR', {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		timeZone: 'Europe/Paris'
	});
</script>

<SEO title="Mes jams" noindex nofollow />

<div class="min-h-screen w-full px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-10">
	<div class="mx-auto max-w-7xl space-y-6">
		<MetroPageHeader
			kicker="Rencontre"
			title="Mes jams"
			intro="Les jams où l’on t’invite, et celles où tu es allé·e : dis si tu y étais, apprécie les présent·es."
		/>
		{#if data.invites.length === 0 && data.recent.length === 0 && data.hostInvites.length === 0 && data.hostings.length === 0}
			<div class="lm-tile lm-tile--flow space-y-2 p-6 text-center">
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
			<!-- Animer les scènes ouvertes d'un lieu (P5-04b) -->
			{#if data.hostInvites.length > 0}
				<section
					class="space-y-3 rounded-2xl border-2 border-primary bg-card p-4 sm:p-5"
					aria-labelledby="host-invites-title"
				>
					<h2 id="host-invites-title" class="text-lg font-semibold">Un lieu t’invite à animer</h2>
					<ul class="space-y-3">
						{#each data.hostInvites as h (h.hostId)}
							<li class="space-y-2 rounded-xl border p-3 text-sm">
								<p>
									<a href="/lieux/{h.venueId}" class="font-semibold hover:underline">{h.venue}</a>, {h.commune}{h.invitedBy
										? ` · invitation de ${h.invitedBy}`
										: ''}
								</p>
								<p class="text-muted-foreground">
									Tu pourras mener ses scènes ouvertes : accueillir les musicien·nes, composer les
									plateaux. Tu ne gères pas le lieu.
								</p>
								<form method="POST" action="?/answerHost" use:enhance class="flex flex-wrap gap-2">
									<input type="hidden" name="hostId" value={h.hostId} />
									<button
										name="accept"
										value="1"
										class="min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
										>Accepter</button
									>
									<button name="accept" value="0" class={pill}>Décliner</button>
								</form>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
			{#if data.hostings.length > 0}
				<section
					class="space-y-3 rounded-2xl border bg-card p-4 sm:p-5"
					aria-labelledby="hostings-title"
				>
					<h2 id="hostings-title" class="text-lg font-semibold">Tu animes</h2>
					<ul class="space-y-2">
						{#each data.hostings as h (h.hostId)}
							<li
								class="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm"
							>
								<span>
									<a href="/lieux/{h.venueId}" class="font-semibold hover:underline">{h.venue}</a>
									<span class="block text-muted-foreground"
										>{h.leads.length > 0
											? `Tu mènes : ${h.leads.join(', ')}`
											: 'Le lieu peut te confier une scène ouverte.'}</span
									>
								</span>
								<form method="POST" action="?/leaveHost" use:enhance>
									<input type="hidden" name="hostId" value={h.hostId} />
									<button class={pill}
										>Arrêter d’animer<span class="sr-only"> : {h.venue}</span></button
									>
								</form>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
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
								<a href="/jams/{j.id}" class="lm-tile lm-tile--flow block p-3">
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
				<section class="lm-tile lm-tile--flow space-y-3 p-4 sm:p-5" aria-labelledby="recent-title">
					<div class="flex flex-wrap items-baseline justify-between gap-2">
						<h2 id="recent-title" class="text-lg font-semibold">Tes dernières jams</h2>
						<a href="/jam/carnet" class="text-sm font-semibold underline">Mon carnet de jams</a>
					</div>
					<ul class="space-y-2">
						{#each data.recent as j (j.id)}
							<li>
								<a
									href="/jams/{j.id}/presents"
									class="lm-tile lm-tile--flow flex min-h-11 flex-wrap items-center justify-between gap-2 p-3"
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
