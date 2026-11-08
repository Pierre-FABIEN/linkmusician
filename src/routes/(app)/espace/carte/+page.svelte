<script lang="ts">
	// LINKMUSICIAN: carte de carrière (P3-13), voir +page.server.ts.
	import SEO from '#lib/components/SEO.svelte';
	import SubPageHeader from '#lib/components/linkmusician/SubPageHeader.svelte';
	import { CircleCheck, CloudFog, Flag, Lock, MapPin } from 'lucide-svelte';
	import { AMBITION_INFO } from '#lib/career/ambition';

	let { data } = $props();
	const m = $derived(data.map);
	const STATUS = {
		passed: 'Épreuve franchie',
		current: 'Acte en cours',
		open: 'Ouvert',
		fog: 'Dans le brouillard'
	} as const;
</script>

<SEO title="Ma carte de carrière" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-3xl space-y-6">
		<SubPageHeader
			title="Ma carte de carrière"
			intro="Huit actes, comme le vrai parcours d’un·e artiste. Chacun finit par une épreuve prouvée par quelqu’un d’autre. Pas d’ordre imposé : la carte montre ce que tu as prouvé."
		/>
		{#if data.ambition}
			<p class="text-sm">
				Mis en avant pour ton ambition : <strong>{AMBITION_INFO[data.ambition].label}</strong>.
				<a href="/espace/ambition" class="underline">Changer</a>
			</p>
		{/if}
		{#if m.soloOnly}
			<p class="rounded-2xl border bg-card p-4 text-sm">
				Tu as composé seul·e : bravo ! Pour franchir l’acte II, compose un morceau à plusieurs,
				chacun confirme son rôle, avec une maquette.
			</p>
		{/if}

		<ol class="space-y-3" aria-label="Actes de la carrière">
			{#each m.acts as a (a.number)}
				<li
					class="rounded-2xl border p-4 {a.status === 'current'
						? 'border-2 border-primary bg-primary/5'
						: a.status === 'fog'
							? 'border-dashed bg-muted/40'
							: 'bg-card'}"
					aria-current={a.status === 'current' ? 'step' : undefined}
				>
					<div class="flex flex-wrap items-start justify-between gap-2">
						<h2 class="flex items-center gap-2 text-lg font-bold">
							{#if a.status === 'passed'}
								<CircleCheck class="size-5 text-emerald-600" aria-hidden="true" />
							{:else if a.status === 'current'}
								<MapPin class="size-5 text-primary" aria-hidden="true" />
							{:else if a.status === 'fog'}
								<CloudFog class="size-5 text-muted-foreground" aria-hidden="true" />
							{:else}
								<Flag class="size-5 text-muted-foreground" aria-hidden="true" />
							{/if}
							Acte {a.roman} · {a.name}
						</h2>
						<span class="flex flex-wrap gap-1">
							{#if a.highlighted}
								<span
									class="rounded-full bg-fuchsia-100 px-2 py-0.5 text-xs font-semibold text-fuchsia-900 dark:bg-fuchsia-950 dark:text-fuchsia-100"
									>Ton ambition</span
								>
							{/if}
							<span class="rounded-full border px-2 py-0.5 text-xs font-semibold"
								>{STATUS[a.status]}</span
							>
						</span>
					</div>
					<p class="mt-1 text-sm text-muted-foreground">{a.content}</p>
					<p class="mt-2 text-sm"><strong>Épreuve :</strong> {a.trial}</p>
					{#if a.unlocks.length > 0}
						<div class="mt-2 text-sm">
							<p class="font-medium">
								{a.status === 'passed' ? 'Ce que ça t’a ouvert :' : 'Ce que ça ouvre :'}
							</p>
							<ul class="mt-1 space-y-1">
								{#each a.unlocks as u (u.label)}
									<li class="flex items-center gap-2">
										{#if a.status !== 'passed'}<Lock
												class="size-3.5 text-muted-foreground"
												aria-hidden="true"
											/>{/if}
										{#if u.href && a.status === 'passed'}
											<a href={u.href} class="underline">{u.label}</a>
										{:else}
											<span>{u.label}</span>
										{/if}
									</li>
								{/each}
							</ul>
						</div>
					{/if}
					{#if a.status === 'current' && a.cta}
						<a
							href={a.cta.href}
							class="mt-3 inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
							>{a.cta.label}</a
						>
					{:else if a.status === 'fog'}
						<p class="mt-2 text-xs text-muted-foreground">Bientôt dans LinkMusician.</p>
					{/if}
				</li>
			{/each}
		</ol>
	</div>
</div>
