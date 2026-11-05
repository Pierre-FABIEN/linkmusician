<script lang="ts">
	// LINKMUSICIAN: fiche d'une jam (P2-14b), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import SEO from '#lib/components/SEO.svelte';
	import { CalendarDays, MapPin, Users } from 'lucide-svelte';

	let { data, form } = $props();

	$effect(() => {
		if (data.published) toast.success('Ta jam est publiée !');
	});
	$effect(() => {
		if (form?.message) toast.success(form.message);
		if (form?.error) toast.error(form.error);
	});
	const when = new Intl.DateTimeFormat('fr-FR', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		hour: '2-digit',
		minute: '2-digit',
		timeZone: 'Europe/Paris'
	});
	const hour = new Intl.DateTimeFormat('fr-FR', {
		hour: '2-digit',
		minute: '2-digit',
		timeZone: 'Europe/Paris'
	});
</script>

<SEO title={data.jam.title} noindex nofollow />

<div class="min-h-screen w-screen px-4 pt-6 pb-24">
	<article class="mx-auto max-w-2xl space-y-6">
		<div class="space-y-2">
			<a href="/jam" class="text-sm text-muted-foreground underline">← Mode jam</a>
			<h1 class="text-3xl font-black tracking-tight">{data.jam.title}</h1>
			<p class="flex items-center gap-2">
				<CalendarDays class="size-4" aria-hidden="true" />
				{when.format(new Date(data.jam.startsAt))} → {hour.format(new Date(data.jam.endsAt))}
			</p>
			<p class="flex items-center gap-2">
				<MapPin class="size-4" aria-hidden="true" />
				<a href="/lieux/{data.jam.venue.id}" class="font-semibold underline"
					>{data.jam.venue.name}</a
				>
				· {data.jam.venue.communeName}
			</p>
			<p class="text-sm text-muted-foreground">
				Hôte : <a href="/@{data.jam.host.handle}" class="underline">{data.jam.host.displayName}</a>
			</p>
		</div>

		{#if data.jam.description}<p class="whitespace-pre-line">{data.jam.description}</p>{/if}

		{#if data.jam.spots.length > 0}
			<section class="space-y-2" aria-labelledby="spots-title">
				<h2 id="spots-title" class="font-semibold">On cherche</h2>
				<ul class="flex flex-wrap gap-2">
					{#each data.jam.spots as s (s.instrument)}
						<li class="rounded-full border px-3 py-1 text-sm">{s.instrument} × {s.count}</li>
					{/each}
				</ul>
			</section>
		{/if}

		<section class="space-y-3 rounded-2xl border bg-card p-4">
			<p class="flex items-center gap-2 font-semibold">
				<Users class="size-4" aria-hidden="true" />
				{data.jam.coming} musicien·ne{data.jam.coming > 1 ? 's' : ''} vien{data.jam.coming > 1
					? 'nent'
					: 't'}
			</p>
			{#if data.jam.isHost}
				<p class="text-sm text-muted-foreground">C’est ta jam.</p>
			{:else if data.jam.imComing}
				<p class="text-sm">Tu viens. On compte sur toi !</p>
				<form method="POST" action="?/notComing" use:enhance>
					<button class="min-h-11 rounded-xl border px-4 font-semibold">Je ne viens plus</button>
				</form>
			{:else}
				<p class="text-sm text-muted-foreground">
					Tu peux venir seul·e, sans connaître personne. Après la jam, les présent·es pourront
					s’apprécier.
				</p>
				<form method="POST" action="?/come" use:enhance>
					<button class="min-h-11 rounded-xl bg-primary px-5 font-semibold text-primary-foreground"
						>Je viens</button
					>
				</form>
			{/if}
		</section>
	</article>
</div>
