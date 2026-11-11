<script lang="ts">
	// LINKMUSICIAN: présentation pas à pas d'un mode (P2-12b), voir +page.server.ts.
	// Metro (MET-02) : une tuile au ton du mode, sur l'Aurora.
	import SEO from '#lib/components/SEO.svelte';
	import { Guitar, Trophy } from 'lucide-svelte';
	import Aurora from '#lib/components/linkmusician/metro/Aurora.svelte';
	import Tile from '#lib/components/linkmusician/metro/Tile.svelte';
	import { toneOfMode } from '#lib/components/linkmusician/metro/tones';
	import { PLAY_MODE_INFO } from '#lib/linkmusician/modes';

	let { data } = $props();
	const info = $derived(PLAY_MODE_INFO[data.mode]);
	const Icon = $derived(data.mode === 'JAM' ? Guitar : Trophy);
	let step = $state(0);
	const last = $derived(step === info.intro.length - 1);
	const current = $derived(info.intro[step]);
</script>

<SEO title={info.label} noindex nofollow />

<Aurora
	intensity="subtle"
	speed={1}
	tones={data.mode === 'JAM'
		? ['var(--tone-orange)', 'var(--tone-rose)', 'var(--tone-amber)']
		: ['var(--tone-violet)', 'var(--tone-blue)', 'var(--tone-rose)']}
	fade
	class="min-h-screen w-full"
>
	<div class="w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
		<Tile tone={toneOfMode(data.mode)} icon={Icon} class="mx-auto max-w-3xl">
			<section class="flex flex-col gap-6 sm:p-2 lg:gap-8 lg:p-4" aria-labelledby="intro-title">
				<div class="flex items-center justify-between">
					<p class="lm-tile__kicker flex items-center gap-2">
						<Icon class="size-5" aria-hidden="true" />
						{info.label}
					</p>
					<p class="text-sm font-semibold" aria-live="polite">
						Étape {step + 1} sur {info.intro.length}
					</p>
				</div>

				<ol class="flex gap-2" aria-hidden="true">
					{#each info.intro as _, i (i)}
						<li class="h-1.5 flex-1 rounded-full bg-current {i <= step ? '' : 'opacity-30'}"></li>
					{/each}
				</ol>

				<div
					class="lm-pop min-h-40 space-y-3 lg:min-h-48 lg:space-y-4"
					role="group"
					aria-roledescription="étape"
				>
					{#key step}
						<h1 id="intro-title" class="lm-title">
							{current.title}
						</h1>
						<p class="text-lg leading-relaxed lg:text-xl">{current.text}</p>
						{#if last && data.firstStep}
							<p class="lm-note p-4 font-semibold" data-tone="amber">
								Ta première étape : {data.firstStep}
							</p>
						{/if}
					{/key}
				</div>

				<div class="flex items-center justify-between gap-3">
					{#if step > 0}
						<button type="button" onclick={() => (step -= 1)} class="lm-btn" data-variant="ghost"
							>Retour</button
						>
					{:else}
						<form method="POST" action="?/start">
							<button class="min-h-11 px-2 text-sm underline">Passer</button>
						</form>
					{/if}
					{#if last}
						<form method="POST" action="?/start">
							<button class="lm-btn">C'est parti !</button>
						</form>
					{:else}
						<button type="button" onclick={() => (step += 1)} class="lm-btn">Suivant</button>
					{/if}
				</div>
			</section>
		</Tile>
	</div>
</Aurora>
