<script lang="ts">
	// LINKMUSICIAN: « Qui était là ? » (P2-15), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import SEO from '#lib/components/SEO.svelte';
	import {
		CalendarDays,
		Heart,
		MapPin,
		MessageCircle,
		Repeat,
		UserCheck,
		UserPlus
	} from 'lucide-svelte';

	let { data, form } = $props();

	$effect(() => {
		if (form?.message) toast.success(form.message);
		if (form?.error) toast.error(form.error);
	});
	const day = new Intl.DateTimeFormat('fr-FR', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		timeZone: 'Europe/Paris'
	});
	const others = $derived(data.present.filter((p) => !p.isMe));
	const button = 'min-h-11 rounded-xl px-4 font-semibold';
	const chip = 'min-h-11 rounded-full border px-3 text-sm font-semibold hover:border-primary';
</script>

<SEO title="Qui était là ? · {data.jam.title}" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<article class="mx-auto max-w-6xl space-y-6 lg:space-y-8">
		<div class="space-y-2">
			<a href="/jam" class="text-sm text-muted-foreground underline">← Mode jam</a>
			<h1 class="lm-title">Qui était là ?</h1>
			<p class="font-semibold">{data.jam.title}</p>
			<p class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
				<span class="inline-flex items-center gap-1"
					><CalendarDays class="size-4" aria-hidden="true" />{day.format(
						new Date(data.jam.startsAt)
					)}</span
				>
				<span class="inline-flex items-center gap-1"
					><MapPin class="size-4" aria-hidden="true" />{data.jam.venue.name} · {data.jam.venue
						.communeName}</span
				>
			</p>
		</div>

		{#if data.removed}
			<p class="lm-tile lm-tile--flow p-4 text-sm">
				L’hôte t’a retiré·e des présent·es de cette jam.
			</p>
		{:else if !data.iWasThere}
			<section class="space-y-3 rounded-2xl border-2 border-primary bg-card p-4">
				<h2 class="text-lg font-semibold">Tu y étais ?</h2>
				<p class="text-sm text-muted-foreground">
					Dis-le pour retrouver les autres présent·es et leur laisser une appréciation. Ça ne
					rapporte rien en soi : ce sont les appréciations reçues qui comptent.
				</p>
				<form method="POST" action="?/there" use:enhance>
					<button class="{button} bg-primary text-primary-foreground">J’y étais</button>
				</form>
			</section>
		{:else}
			<section class="lm-tile lm-tile--flow space-y-2 p-4 text-sm">
				<p>
					Tu y étais. Touche une personne pour lui laisser une appréciation, jusqu’au
					{day.format(new Date(data.jam.deadline))}.
				</p>
				{#if !data.canEndorse}
					<p class="text-muted-foreground">
						Les appréciations s’ouvrent quand ton compte a un peu d’ancienneté (palier de confiance
						1). Les autres peuvent déjà t’apprécier.
					</p>
				{/if}
			</section>
		{/if}

		<section class="space-y-3" aria-labelledby="present-title">
			<h2 id="present-title" class="text-lg font-semibold">
				{data.present.length} présent·e{data.present.length > 1 ? 's' : ''}
			</h2>
			{#if others.length === 0}
				<p class="lm-tile lm-tile--flow p-4 text-sm text-muted-foreground">
					Personne d’autre n’a encore dit qu’il ou elle y était. Reviens dans quelques jours !
				</p>
			{:else}
				<ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4" aria-label="Présent·es">
					{#each others as p (p.handle)}
						<li class="lm-tile lm-tile--flow">
							<details class="group">
								<summary
									class="flex cursor-pointer list-none flex-col items-center gap-2 p-4 text-center"
								>
									<span
										class="flex size-16 items-center justify-center rounded-full bg-primary/15 text-xl font-black text-primary"
										aria-hidden="true">{p.initials}</span
									>
									<span class="font-semibold">{p.displayName}</span>
									<span class="text-sm text-muted-foreground"
										>{p.instrument?.name ?? 'Instrument non précisé'}{p.isHost
											? ' · hôte'
											: ''}</span
									>
									{#if p.appreciated}
										<span class="inline-flex items-center gap-1 text-sm font-semibold text-primary"
											><Heart class="size-3.5" aria-hidden="true" />{p.appreciated}</span
										>
									{/if}
								</summary>
								<div class="space-y-3 border-t p-3">
									{#if data.iWasThere && data.canEndorse && data.jam.open && !p.appreciated}
										<form
											method="POST"
											action="?/endorse"
											use:enhance
											class="flex flex-wrap gap-2"
											aria-label="Apprécier {p.displayName}"
										>
											<input type="hidden" name="to" value={p.handle} />
											{#each data.qualities as q (q.value)}
												<button name="quality" value={q.value} class={chip}>{q.label}</button>
											{/each}
											{#if p.instrument}
												<button name="instrument" value={p.instrument.slug} class={chip}
													>{p.instrument.name.toLowerCase()}</button
												>
											{/if}
										</form>
									{/if}
									{#if p.inNetwork}
										<p class="flex min-h-11 items-center gap-2 text-sm font-semibold text-primary">
											<UserCheck class="size-4" aria-hidden="true" />Dans tes contacts
										</p>
									{:else if data.iWasThere}
										<form method="POST" action="?/keep" use:enhance>
											<input type="hidden" name="handle" value={p.handle} />
											<button
												class="flex min-h-11 items-center gap-2 text-sm font-semibold underline"
												><UserPlus class="size-4" aria-hidden="true" />Garder le contact</button
											>
										</form>
									{/if}
									<a
										href="/messages/nouveau?a={p.handle}"
										class="flex min-h-11 items-center gap-2 text-sm font-semibold underline"
										><MessageCircle class="size-4" aria-hidden="true" />Écrire</a
									>
									{#if data.jam.isHost}
										<form method="POST" action="?/remove" use:enhance>
											<input type="hidden" name="handle" value={p.handle} />
											<button class="min-h-11 text-sm text-destructive underline"
												>Pas là : retirer {p.displayName}</button
											>
										</form>
									{/if}
								</div>
							</details>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		{#if data.organizer}
			<a
				href="/jams/nouvelle?rejouer={data.jam.id}&lieu={data.jam.venue.id}"
				class="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 font-semibold"
			>
				<Repeat class="size-4" aria-hidden="true" /> Rejouer ensemble
			</a>
		{/if}

		{#if data.iWasThere}
			<form method="POST" action="?/notThere" use:enhance>
				<button class="min-h-11 text-sm text-muted-foreground underline"
					>Finalement, je n’y étais pas</button
				>
			</form>
		{/if}
	</article>
</div>
