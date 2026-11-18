<script lang="ts">
	/**
	 * LINKMUSICIAN: « Commence ici » (U0, conception 20 §6.2) : un compte sans
	 * activité voit trois portes réelles, au même rang. Rien ne dit ce qu'il
	 * « n'a pas fait » (NL2) ; la troisième mène à Rencontre.
	 */
	import { ArrowRight, Compass } from 'lucide-svelte';
	import Tile from './Tile.svelte';
	import { toneOfMode } from './tones';
	import { START_DOORS } from '#lib/career/next';
</script>

<Tile tone={toneOfMode('CAREER')} icon={Compass} class="lm-next-step" data-testid="start-hero">
	<section class="space-y-3" aria-labelledby="start-hero-title">
		<p class="lm-tile__kicker">Bienvenue dans Collab</p>
		<h2 id="start-hero-title" class="lm-title lm-title--sm">Commence ici</h2>
		<p class="lm-tile__text max-w-prose">Trois façons de démarrer, dans l’ordre que tu veux.</p>
		<ul class="grid gap-2 sm:grid-cols-3" aria-label="Pour commencer">
			{#each START_DOORS as door (door.href)}
				<li class="min-w-0">
					<a href={door.href} class="lm-btn h-full w-full flex-col items-start text-left">
						<span class="flex items-center gap-1 font-semibold"
							>{door.title}<ArrowRight class="size-4" aria-hidden="true" /></span
						>
						<span class="text-sm font-normal wrap-break-word">{door.text}</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>
</Tile>
