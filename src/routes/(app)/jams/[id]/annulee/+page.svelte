<script lang="ts">
	// LINKMUSICIAN: jam annulée (#91a), voir +page.server.ts.
	import SEO from '#lib/components/SEO.svelte';
	import { CalendarX, MapPin } from 'lucide-svelte';

	let { data } = $props();
	const day = new Intl.DateTimeFormat('fr-FR', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		hour: '2-digit',
		minute: '2-digit',
		timeZone: 'Europe/Paris'
	});
</script>

<SEO title="Jam annulée · {data.jam.title}" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<article class="mx-auto max-w-3xl space-y-6">
		<div class="space-y-2">
			<a href="/jam/agenda" class="text-sm text-muted-foreground underline">← Jams à venir</a>
			<h1 class="lm-title">{data.jam.title}</h1>
			<p class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
				<span>{day.format(new Date(data.jam.startsAt))}</span>
				{#if data.jam.venue}
					<span class="inline-flex items-center gap-1"
						><MapPin class="size-4" aria-hidden="true" />{data.jam.venue.name} · {data.jam.venue
							.communeName}</span
					>
				{/if}
			</p>
		</div>
		<section class="lm-alert space-y-2 p-4" role="status">
			<p class="flex items-center gap-2 font-semibold">
				<CalendarX class="size-5" aria-hidden="true" /> Cette jam est annulée. Ne te déplace pas.
			</p>
			{#if data.jam.reason}
				<p class="text-sm">Motif : {data.jam.reason}</p>
			{/if}
		</section>
		<a href="/jam/agenda" class="lm-btn">Trouver une autre jam</a>
	</article>
</div>
