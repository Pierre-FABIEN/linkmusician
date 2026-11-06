<script lang="ts">
	// LINKMUSICIAN: annonces (P2-02), voir +page.server.ts.
	import TipCard from '#lib/components/linkmusician/TipCard.svelte';
	import SEO from '#lib/components/SEO.svelte';
	import { Badge } from '#shadcn/badge';
	import { MapPin, Megaphone, Plus, Users } from 'lucide-svelte';
	import {
		OPPORTUNITY_KINDS,
		OPPORTUNITY_KIND_INFO,
		STATUS_LABELS
	} from '#lib/opportunities/rules';
	import { INSTRUMENT_LEVELS } from '#lib/skills/levels';
	import { APPLICATION_STATUS_LABELS } from '#lib/opportunities/applications';

	let { data } = $props();
	const day = new Intl.DateTimeFormat('fr-FR', {
		weekday: 'short',
		day: 'numeric',
		month: 'short'
	});
	const levelName = (l: number | null) => (l ? INSTRUMENT_LEVELS[l - 1]?.label : null);
</script>

<SEO title="Annonces" noindex nofollow />

<div class="min-h-screen w-screen px-4 pt-6 pb-24">
	<div class="mx-auto max-w-3xl space-y-6">
		<header class="flex flex-wrap items-end justify-between gap-3">
			<div class="space-y-1">
				<h1 class="text-3xl font-black tracking-tight">Annonces</h1>
				<p class="text-muted-foreground">
					Les quêtes des autres{data.commune ? ` autour de ${data.commune}` : ''} : une jam, un groupe
					qui recrute, une session.
				</p>
			</div>
			<a
				href="/annonces/nouvelle"
				class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground"
			>
				<Plus class="size-4" aria-hidden="true" /> Publier une annonce
			</a>
		</header>

		<TipCard tip={data.tip} />

		<nav aria-label="Type d'annonce" class="flex flex-wrap gap-2">
			<a
				href="/annonces"
				aria-current={data.kind === null ? 'page' : undefined}
				class="min-h-11 content-center rounded-full border px-4 text-sm {data.kind === null
					? 'border-transparent bg-foreground text-background'
					: ''}">Toutes</a
			>
			{#each OPPORTUNITY_KINDS as k (k)}
				<a
					href="?type={k}"
					aria-current={data.kind === k ? 'page' : undefined}
					class="min-h-11 content-center rounded-full border px-4 text-sm {data.kind === k
						? 'border-transparent bg-foreground text-background'
						: ''}">{OPPORTUNITY_KIND_INFO[k].label}</a
				>
			{/each}
		</nav>

		{#if !data.commune}
			<p class="rounded-2xl border bg-card p-6 text-center">
				Indique ta ville pour voir les annonces près de chez toi.
				<a href="/profil/ville" class="block pt-2 font-semibold underline">Indiquer ma ville</a>
			</p>
		{:else if data.nearby.length === 0}
			<div class="space-y-2 rounded-2xl border bg-card p-6 text-center">
				<Megaphone class="mx-auto size-6 text-primary" aria-hidden="true" />
				<p class="font-semibold">Pas encore d'annonce autour de toi.</p>
				<p class="text-sm text-muted-foreground">Lance la première : une jam ce week-end ?</p>
			</div>
		{:else}
			<ul class="space-y-3" aria-label="Annonces autour de toi">
				{#each data.nearby as o (o.id)}
					<li>
						<a
							href="/annonces/{o.id}"
							class="block space-y-2 rounded-2xl border bg-card p-4 transition hover:border-primary hover:shadow-md"
						>
							<span class="flex flex-wrap items-center gap-2">
								<Badge variant="secondary">{OPPORTUNITY_KIND_INFO[o.kind].label}</Badge>
								{#if o.startsAt}<Badge variant="outline">{day.format(new Date(o.startsAt))}</Badge
									>{/if}
							</span>
							<span class="block text-lg font-bold">{o.title}</span>
							<span class="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
								<span class="inline-flex items-center gap-1"
									><MapPin class="size-3.5" aria-hidden="true" />{o.distance}{o.commune
										? ` · ${o.commune}`
										: ''}</span
								>
								{#if o.instrument}<span
										>Cherche : {o.instrument}{levelName(o.minLevel)
											? `, ${levelName(o.minLevel)} ou plus`
											: ''}</span
									>{/if}
								<span class="inline-flex items-center gap-1"
									><Users class="size-3.5" aria-hidden="true" />{o.slots} place{o.slots > 1
										? 's'
										: ''}</span
								>
								<span>par {o.issuer}</span>
							</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}

		{#if data.applications.length > 0}
			<section class="space-y-2" aria-labelledby="my-applications-title">
				<h2 id="my-applications-title" class="font-semibold">Mes candidatures</h2>
				<ul class="space-y-2" aria-label="Mes candidatures">
					{#each data.applications as a (a.id)}
						<li>
							<a
								href={a.status === 'ACCEPTED' && a.conversationId
									? `/messages/${a.conversationId}`
									: `/annonces/${a.opportunity.id}`}
								class="flex min-h-11 items-center justify-between gap-3 rounded-xl border p-3 text-sm hover:border-primary"
							>
								<span class="truncate">{a.opportunity.title}</span>
								<Badge variant={a.status === 'ACCEPTED' ? 'default' : 'outline'}
									>{APPLICATION_STATUS_LABELS[a.status]}</Badge
								>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if data.mine.length > 0}
			<section class="space-y-2" aria-labelledby="mine-title">
				<h2 id="mine-title" class="font-semibold">Mes annonces</h2>
				<ul class="space-y-2" aria-label="Mes annonces">
					{#each data.mine as o (o.id)}
						<li>
							<a
								href="/annonces/{o.id}"
								class="flex min-h-11 items-center justify-between gap-3 rounded-xl border p-3 text-sm hover:border-primary"
							>
								<span class="truncate"
									>{o.title}{#if o.band}<span class="text-muted-foreground">
											· {o.band}</span
										>{/if}</span
								>
								<span class="flex shrink-0 items-center gap-2">
									{#if o.pendingApplications > 0}
										<Badge class="bg-fuchsia-600 text-white"
											>{o.pendingApplications} candidature{o.pendingApplications > 1
												? 's'
												: ''}</Badge
										>
									{/if}
									<Badge variant={o.status === 'OPEN' ? 'default' : 'outline'}
										>{STATUS_LABELS[o.status]}</Badge
									>
								</span>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	</div>
</div>
