<script lang="ts">
	// LINKMUSICIAN: une annonce (P2-02), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';
	import SEO from '#lib/components/SEO.svelte';
	import { Badge } from '#shadcn/badge';
	import { ArrowLeft, CalendarDays, MapPin, Users } from 'lucide-svelte';
	import { OPPORTUNITY_KIND_INFO, STATUS_LABELS } from '#lib/opportunities/rules';
	import { INSTRUMENT_LEVELS } from '#lib/skills/levels';
	import { REPORT_REASONS, REPORT_REASON_LABELS, MAX_REPORT_DETAILS } from '#lib/moderation/rules';

	let { data, form } = $props();
	const o = $derived(data.opportunity);

	$effect(() => {
		if (form?.message) toast.success(form.message);
		if (form?.error) toast.error(form.error);
	});
	$effect(() => {
		if (page.url.searchParams.get('publiee') === '1') toast.success('Ton annonce est publiée.');
	});

	const day = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
	const levelName = (l: number | null) => (l ? INSTRUMENT_LEVELS[l - 1]?.label : null);
	const conditions = $derived(
		[
			o.instrument &&
				`${o.instrument}${levelName(o.minLevel) ? ` (${levelName(o.minLevel)} ou plus)` : ''}`,
			!o.instrument && levelName(o.minLevel) && `Niveau ${levelName(o.minLevel)} ou plus`,
			o.genre && `Genre : ${o.genre}`,
			o.minTier && `Palier : ${o.minTier} ou plus`
		].filter(Boolean) as string[]
	);
</script>

<SEO title={o.title} noindex nofollow />

<div class="min-h-screen w-screen px-4 pt-6 pb-24">
	<article class="mx-auto max-w-2xl space-y-5">
		<a
			href="/annonces"
			class="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:underline"
		>
			<ArrowLeft class="size-4" aria-hidden="true" /> Annonces
		</a>
		<header class="space-y-2">
			<div class="flex flex-wrap gap-2">
				<Badge variant="secondary">{OPPORTUNITY_KIND_INFO[o.kind].label}</Badge>
				{#if o.status !== 'OPEN'}<Badge variant="outline">{STATUS_LABELS[o.status]}</Badge>{/if}
			</div>
			<h1 class="text-3xl font-black tracking-tight">{o.title}</h1>
			<p class="text-sm text-muted-foreground">
				par <a href="/@{o.issuer.handle}" class="font-medium underline">{o.issuer.displayName}</a>
			</p>
		</header>

		<ul class="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
			{#if o.commune}<li class="inline-flex items-center gap-1">
					<MapPin class="size-4" aria-hidden="true" />{o.commune}
				</li>{/if}
			{#if o.startsAt}<li class="inline-flex items-center gap-1">
					<CalendarDays class="size-4" aria-hidden="true" />{day.format(new Date(o.startsAt))}
				</li>{/if}
			<li class="inline-flex items-center gap-1">
				<Users class="size-4" aria-hidden="true" />{o.slots} place{o.slots > 1 ? 's' : ''}
			</li>
		</ul>

		<p class="whitespace-pre-line leading-relaxed">{o.description}</p>

		{#if conditions.length > 0}
			<section class="rounded-2xl border bg-card p-4" aria-labelledby="conditions-title">
				<h2 id="conditions-title" class="mb-2 font-semibold">Ce qui est recherché</h2>
				<ul class="list-disc space-y-1 pl-5 text-sm">
					{#each conditions as c (c)}<li>{c}</li>{/each}
				</ul>
			</section>
		{/if}

		{#if o.isOwner}
			<section class="space-y-2 rounded-2xl border bg-muted/40 p-4 text-sm">
				<p>
					C'est ton annonce. Visible jusqu'au {day.format(new Date(o.expiresAt))}, à {o.radiusKm} km autour
					de toi.
				</p>
				{#if o.active}
					<form method="POST" action="?/close" use:enhance>
						<button type="submit" class="min-h-11 rounded-xl border px-4 font-semibold"
							>Clôturer l'annonce</button
						>
					</form>
				{/if}
			</section>
		{:else}
			{#if o.active}
				<p class="rounded-2xl border bg-card p-4 text-sm">
					Les candidatures arrivent très bientôt. En attendant, tu peux
					<a href="/messages/nouveau?a={o.issuer.handle}" class="font-semibold underline"
						>écrire à {o.issuer.displayName}</a
					>.
				</p>
			{/if}
			<details class="rounded-lg border p-3 text-sm">
				<summary class="cursor-pointer text-muted-foreground">Signaler cette annonce</summary>
				<form method="POST" action="?/report" use:enhance class="mt-3 space-y-3">
					<label class="block space-y-1 font-medium">
						Motif
						<select name="reason" required class="w-full rounded-md border bg-background p-2">
							<option value="">—</option>
							{#each REPORT_REASONS as r (r)}<option value={r}>{REPORT_REASON_LABELS[r]}</option
								>{/each}
						</select>
					</label>
					<label class="block space-y-1 font-medium">
						Précisions (facultatif)
						<textarea
							name="details"
							rows="3"
							maxlength={MAX_REPORT_DETAILS}
							class="w-full rounded-md border bg-background p-2"
						></textarea>
					</label>
					<button type="submit" class="rounded-md border px-3 py-1.5">Envoyer le signalement</button
					>
				</form>
			</details>
		{/if}
	</article>
</div>
