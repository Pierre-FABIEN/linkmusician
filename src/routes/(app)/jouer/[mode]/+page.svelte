<script lang="ts">
	// LINKMUSICIAN: présentation pas à pas d'un mode (P2-12b), voir +page.server.ts.
	import SEO from '#lib/components/SEO.svelte';
	import { Guitar, Trophy } from 'lucide-svelte';
	import { PLAY_MODE_INFO } from '#lib/linkmusician/modes';

	let { data } = $props();
	const info = $derived(PLAY_MODE_INFO[data.mode]);
	const Icon = $derived(data.mode === 'JAM' ? Guitar : Trophy);
	let step = $state(0);
	const last = $derived(step === info.intro.length - 1);
	const current = $derived(info.intro[step]);
</script>

<SEO title={info.label} noindex nofollow />

<div class="min-h-screen w-screen px-4 pt-6 pb-24">
	<section
		class="mx-auto flex max-w-lg flex-col gap-6 rounded-3xl p-6 text-white shadow-xl {data.mode ===
		'JAM'
			? 'bg-gradient-to-br from-orange-600 to-pink-600'
			: 'bg-gradient-to-br from-violet-700 to-fuchsia-600'}"
		aria-labelledby="intro-title"
	>
		<div class="flex items-center justify-between">
			<p class="flex items-center gap-2 text-sm font-bold uppercase">
				<Icon class="size-5" aria-hidden="true" />
				{info.label}
			</p>
			<p class="text-sm font-semibold" aria-live="polite">
				Étape {step + 1} sur {info.intro.length}
			</p>
		</div>

		<ol class="flex gap-2" aria-hidden="true">
			{#each info.intro as _, i (i)}
				<li class="h-1.5 flex-1 rounded-full {i <= step ? 'bg-white' : 'bg-white/30'}"></li>
			{/each}
		</ol>

		<div class="lm-pop min-h-40 space-y-3" role="group" aria-roledescription="étape">
			{#key step}
				<h1 id="intro-title" class="text-3xl font-black tracking-tight">{current.title}</h1>
				<p class="text-lg leading-relaxed text-white/95">{current.text}</p>
				{#if last && data.firstStep}
					<p class="rounded-2xl bg-black/20 p-4 font-semibold">
						Ta première étape : {data.firstStep}
					</p>
				{/if}
			{/key}
		</div>

		<div class="flex items-center justify-between gap-3">
			{#if step > 0}
				<button
					type="button"
					onclick={() => (step -= 1)}
					class="min-h-11 rounded-xl px-4 font-semibold text-white/90 hover:bg-white/10"
					>Retour</button
				>
			{:else}
				<form method="POST" action="?/start">
					<button class="min-h-11 rounded-xl px-4 text-sm text-white/80 underline">Passer</button>
				</form>
			{/if}
			{#if last}
				<form method="POST" action="?/start">
					<button class="min-h-11 rounded-xl bg-white px-6 font-black text-violet-800"
						>C'est parti !</button
					>
				</form>
			{:else}
				<button
					type="button"
					onclick={() => (step += 1)}
					class="min-h-11 rounded-xl bg-white px-6 font-black text-violet-800">Suivant</button
				>
			{/if}
		</div>
	</section>
</div>
