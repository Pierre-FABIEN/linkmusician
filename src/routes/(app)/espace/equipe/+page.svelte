<script lang="ts">
	// LINKMUSICIAN: mon équipe (P3-12), voir +page.server.ts.
	import SEO from '#lib/components/SEO.svelte';
	import MetroPageHeader from '#lib/components/linkmusician/metro/MetroPageHeader.svelte';
	import TierBadge from '#lib/components/linkmusician/progress/TierBadge.svelte';
	import { UsersRound } from 'lucide-svelte';

	let { data } = $props();
</script>

<SEO title="Mon équipe" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-3xl space-y-8">
		<MetroPageHeader
			kicker="Collab"
			title="Mon équipe"
			intro="Tes groupes, et les personnes avec qui tu as le plus collaboré."
		/>

		<section class="space-y-3" aria-labelledby="bands-title">
			<h2 id="bands-title" class="text-xl font-bold">Mes groupes</h2>
			{#if data.bands.length === 0}
				<p class="lm-tile lm-tile--flow p-4 text-sm">
					Pas encore de groupe. <a href="/groupes/nouveau" class="font-semibold underline"
						>Monter un groupe</a
					>
					ou <a href="/annonces" class="font-semibold underline">répondre à une annonce</a>.
				</p>
			{:else}
				<ul class="space-y-2" aria-label="Mes groupes">
					{#each data.bands as b (b.handle)}
						<li>
							<a
								href="/groupes/{b.handle}"
								class="lm-tile lm-tile--flow flex min-h-14 flex-wrap items-center justify-between gap-2 p-4"
							>
								<span class="flex items-center gap-2 font-semibold"
									><UsersRound class="size-4" aria-hidden="true" />{b.name}</span
								>
								{#if b.tier}<TierBadge {...b.tier} prefix="Rang du groupe :" />{/if}
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section class="space-y-3" aria-labelledby="partners-title">
			<h2 id="partners-title" class="text-xl font-bold">Partenaires réguliers</h2>
			{#if data.partners.length === 0}
				<p class="lm-tile lm-tile--flow p-4 text-sm text-muted-foreground">
					Quand tu auras confirmé des collaborations, les personnes avec qui tu joues le plus
					apparaîtront ici.
				</p>
			{:else}
				<ul class="grid gap-2 sm:grid-cols-2" aria-label="Partenaires réguliers">
					{#each data.partners as p (p.handle)}
						<li class="lm-tile lm-tile--flow p-4">
							<a href="/@{p.handle}" class="font-semibold underline">{p.displayName}</a>
							<span class="block text-sm text-muted-foreground"
								>{p.count} collaboration{p.count > 1 ? 's' : ''} confirmée{p.count > 1
									? 's'
									: ''}</span
							>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
</div>
