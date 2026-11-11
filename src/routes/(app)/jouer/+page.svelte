<script lang="ts">
	// LINKMUSICIAN: menu du jeu (P2-12, P2-12b), voir +page.server.ts. Accueil
	// Metro (MET-02) : deux grandes tuiles au ton de leur mode, sur l'Aurora.
	import SEO from '#lib/components/SEO.svelte';
	import { ChevronRight, Guitar, Trophy } from 'lucide-svelte';
	import Aurora from '#lib/components/linkmusician/metro/Aurora.svelte';
	import Tile from '#lib/components/linkmusician/metro/Tile.svelte';
	import { toneOfMode } from '#lib/components/linkmusician/metro/tones';
	import LevelBadge from '#lib/components/linkmusician/progress/LevelBadge.svelte';
	import { orderedModes } from '#lib/linkmusician/modes';

	let { data } = $props();
	const modes = $derived(orderedModes(data.preferredMode));
	const icons = { CAREER: Trophy, JAM: Guitar } as const;
	const fx = { CAREER: 'trophy', JAM: 'notes' } as const;
	const firstName = $derived(data.person.displayName.split(' ')[0]);
</script>

<SEO title="Jouer" noindex nofollow />

<Aurora
	intensity="subtle"
	speed={1}
	tones={['var(--tone-violet)', 'var(--tone-orange)', 'var(--tone-rose)', 'var(--tone-amber)']}
	fade
	class="min-h-screen w-full"
>
	<div class="w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
		<div class="mx-auto max-w-6xl space-y-8">
			<header class="flex items-center gap-4">
				<LevelBadge level={data.level} />
				<div class="space-y-1">
					<p class="lm-kicker text-muted-foreground">Salut {firstName} !</p>
					<h1 class="lm-title">Choisis ton mode</h1>
				</div>
			</header>

			<form method="POST" action="?/choose" class="grid gap-4 sm:grid-cols-2">
				{#each modes as m, i (m.mode)}
					{@const Icon = icons[m.mode]}
					<Tile
						type="submit"
						name="mode"
						value={m.mode}
						tone={toneOfMode(m.mode)}
						icon={Icon}
						fx={fx[m.mode]}
						index={i}
						class="lm-mode-tile"
					>
						<span class="flex min-h-6 items-center justify-end">
							{#if m.resume}<span class="lm-pill">Reprendre</span>{/if}
						</span>
						<span class="space-y-3">
							<span class="lm-title block">{m.label}</span>
							<span class="lm-tile__text block max-w-xl lg:text-base">{m.pitch}</span>
							<span class="lm-tile__text block max-w-xl font-semibold">{m.how}</span>
						</span>
						<span class="lm-btn self-start"
							>Jouer <ChevronRight class="size-4" aria-hidden="true" /></span
						>
					</Tile>
				{/each}
			</form>
			<p class="text-center text-sm text-muted-foreground lg:text-base">
				Tu peux changer de mode à tout moment avec la pastille en haut de l'écran.
			</p>
			<p class="text-center text-sm">
				Comment ça marche ?
				<a href="/aide/mode-jam" class="font-semibold underline">Le mode jam</a> ·
				<a href="/aide/mode-carriere" class="font-semibold underline">Le mode carrière</a>
			</p>
		</div>
	</div>
</Aurora>
