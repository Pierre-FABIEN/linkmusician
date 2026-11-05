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
	import {
		APPLICATION_STATUS_LABELS,
		MAX_APPLICATION,
		MIN_APPLICATION,
		isPending
	} from '#lib/opportunities/applications';

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

			<section class="space-y-3" aria-labelledby="applications-title">
				<h2 id="applications-title" class="text-lg font-semibold">
					Candidatures ({data.applications.length})
				</h2>
				{#if data.applications.length === 0}
					<p class="text-sm text-muted-foreground">
						Pas encore de candidature. Les musicien·nes autour de toi la voient dans leurs annonces.
					</p>
				{:else}
					<ul class="space-y-3" aria-label="Candidatures reçues">
						{#each data.applications as a (a.id)}
							<li class="space-y-2 rounded-2xl border bg-card p-4">
								<div class="flex flex-wrap items-center justify-between gap-2">
									<span class="font-semibold">
										{#if a.applicant.handle}
											<a href="/@{a.applicant.handle}" class="hover:underline"
												>{a.applicant.displayName}</a
											>
										{:else}{a.applicant.displayName}{/if}
									</span>
									<Badge variant={a.status === 'ACCEPTED' ? 'default' : 'outline'}
										>{APPLICATION_STATUS_LABELS[a.status]}</Badge
									>
								</div>
								{#if a.applicant.instruments.length > 0}
									<p class="text-xs text-muted-foreground">
										{a.applicant.instruments
											.map((i) => `${i.name} · ${levelName(i.level)}`)
											.join(' — ')}
									</p>
								{/if}
								<p class="whitespace-pre-line text-sm">{a.message}</p>
								{#if isPending(a.status)}
									<div class="flex flex-wrap gap-2">
										<form method="POST" action="?/accept" use:enhance>
											<input type="hidden" name="applicationId" value={a.id} />
											<button
												class="min-h-11 rounded-xl bg-primary px-4 font-semibold text-primary-foreground"
												>Accepter</button
											>
										</form>
										{#if a.status !== 'SHORTLISTED'}
											<form method="POST" action="?/shortlist" use:enhance>
												<input type="hidden" name="applicationId" value={a.id} />
												<button class="min-h-11 rounded-xl border px-4">Présélectionner</button>
											</form>
										{/if}
										<form method="POST" action="?/decline" use:enhance>
											<input type="hidden" name="applicationId" value={a.id} />
											<button class="min-h-11 rounded-xl border px-4">Refuser</button>
										</form>
									</div>
								{:else if a.conversationId}
									<a
										href="/messages/{a.conversationId}"
										class="inline-block font-semibold underline">Ouvrir la conversation</a
									>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{:else}
			{#if data.mine}
				<section
					class="space-y-2 rounded-2xl border bg-card p-4 text-sm"
					aria-labelledby="mine-title"
				>
					<h2 id="mine-title" class="font-semibold">
						Ta candidature : {APPLICATION_STATUS_LABELS[data.mine.status]}
					</h2>
					{#if data.mine.status === 'ACCEPTED' && data.mine.conversationId}
						<p>Bravo ! {o.issuer.displayName} a accepté : la conversation est ouverte.</p>
						<a
							href="/messages/{data.mine.conversationId}"
							class="inline-block font-semibold underline">Ouvrir la conversation</a
						>
					{:else if isPending(data.mine.status)}
						<form method="POST" action="?/withdraw" use:enhance>
							<input type="hidden" name="applicationId" value={data.mine.id} />
							<button class="min-h-11 rounded-xl border px-4">Retirer ma candidature</button>
						</form>
					{/if}
				</section>
			{:else if o.active && data.unmet.length > 0}
				<p class="rounded-2xl border bg-muted/40 p-4 text-sm">
					Cette annonce demande des conditions que ton profil ne remplit pas encore : {data.unmet.join(
						', '
					)}.
					<a href="/profil/musical" class="font-semibold underline"
						>Mettre à jour mon profil musical</a
					>
				</p>
			{:else if o.active}
				<form
					method="POST"
					action="?/apply"
					use:enhance
					class="space-y-3 rounded-2xl border bg-card p-4"
					aria-labelledby="apply-title"
				>
					<h2 id="apply-title" class="font-semibold">Postuler</h2>
					<label class="block space-y-1 text-sm font-medium">
						Ton message à {o.issuer.displayName}
						<textarea
							name="message"
							required
							rows="4"
							minlength={MIN_APPLICATION}
							maxlength={MAX_APPLICATION}
							placeholder="Présente-toi : ce que tu joues, depuis quand, tes disponibilités…"
							class="w-full rounded-md border bg-background p-2"
						></textarea>
					</label>
					<button
						type="submit"
						class="min-h-11 rounded-xl bg-primary px-5 font-semibold text-primary-foreground"
						>Envoyer ma candidature</button
					>
				</form>
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
