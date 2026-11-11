<script lang="ts">
	// LINKMUSICIAN: coups de pouce (P4-13a), voir +page.server.ts. Un écran,
	// une chose : trois idées au plus, chacune mène à sa page.
	import SEO from '#lib/components/SEO.svelte';
	import MetroPageHeader from '#lib/components/linkmusician/metro/MetroPageHeader.svelte';
	import { Guitar, HandHelping, Mic2, UsersRound } from 'lucide-svelte';
	import type { NudgeKind } from '#lib/career/nudges';

	let { data } = $props();
	const ICONS: Record<NudgeKind, typeof Guitar> = {
		OPEN_ROLE: UsersRound,
		TO_RECORD: Mic2,
		JAMS_SOON: Guitar
	};
</script>

<SEO title="Coups de pouce" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-3xl space-y-6">
		<MetroPageHeader
			kicker="Mode carrière"
			title="Coups de pouce"
			intro="Des idées simples, tirées de ton réseau et de ce qui se passe près de chez toi. Rien d’obligatoire."
		/>
		{#if data.nudges.length === 0}
			<div class="lm-tile lm-tile--flow space-y-2 p-6 text-center">
				<HandHelping class="mx-auto size-6 text-primary" aria-hidden="true" />
				<p class="font-semibold">Pas d’idée pour l’instant.</p>
				<p class="text-sm text-muted-foreground">
					Les coups de pouce viennent de ton réseau : les gens avec qui tu as joué et que tu as
					gardés dans ton carnet.
				</p>
				<a href="/jam/agenda" class="inline-block pt-1 font-semibold underline"
					>Voir les jams à venir</a
				>
			</div>
		{:else}
			<ul class="space-y-3" aria-label="Coups de pouce">
				{#each data.nudges as nudge (nudge.kind)}
					{@const Icon = ICONS[nudge.kind]}
					<li class="lm-tile lm-tile--flow flex gap-4 p-4 sm:p-5">
						<span
							class="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"
						>
							<Icon class="size-5" aria-hidden="true" />
						</span>
						<div class="min-w-0 flex-1 space-y-2">
							<h2 class="font-semibold">{nudge.title}</h2>
							<p class="text-sm text-muted-foreground">{nudge.text}</p>
							<a href={nudge.href} class="lm-btn" data-variant="ghost">{nudge.cta}</a>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
