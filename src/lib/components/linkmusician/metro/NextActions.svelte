<script lang="ts">
	/**
	 * LINKMUSICIAN: prochaines actions (N3, conception 21 §9). Trois au plus,
	 * déjà triées et autorisées par le serveur (`#lib/server/career/next`) :
	 * chaque tuile dit ce qui se passe, pourquoi maintenant, et ouvre l'écran
	 * du geste (jamais une écriture directe). Rien quand il n'y a rien : une
	 * absence n'est pas un manque (NL2). Aucun « Plus tard » avant N4.
	 */
	import { ArrowRight } from 'lucide-svelte';
	import Tile from './Tile.svelte';
	import { TONE_OF } from './tones';
	import type { SuggestionRank } from '#lib/career/next';

	type Action = {
		key: string;
		rank: SuggestionRank;
		title: string;
		why: string;
		href: string;
		cta: string;
	};
	let { actions }: { actions: Action[] } = $props();

	/** Le mot porte la nature de l'action ; la couleur ne fait qu'accompagner. */
	const KICKER: Record<SuggestionRank, string> = {
		1: 'Quelqu’un t’attend',
		2: 'Une demande pour toi',
		3: 'Ton travail en cours',
		4: 'Un besoin de ton morceau',
		5: 'Si tu veux'
	};
</script>

{#if actions.length > 0}
	<section class="space-y-3" aria-labelledby="next-actions-title" data-testid="next-actions">
		<h2 id="next-actions-title" class="lm-kicker text-muted-foreground">À faire maintenant</h2>
		<ul class="grid gap-3" aria-label="Prochaines actions">
			{#each actions as a, i (a.key)}
				<li class="min-w-0">
					<Tile
						href={a.href}
						tone={i === 0 && a.rank <= 2 ? TONE_OF.work : 'paper'}
						index={i}
						class="lm-tile--flow h-full space-y-1 p-4"
						data-rank={a.rank}
					>
						<span class="lm-tile__kicker block">{KICKER[a.rank]}</span>
						<span class="lm-tile__title block wrap-break-word">{a.title}</span>
						<span class="lm-tile__text block wrap-break-word">{a.why}</span>
						<span class="flex items-center gap-1 pt-1 font-semibold">
							{a.cta}<ArrowRight class="size-4" aria-hidden="true" />
						</span>
					</Tile>
				</li>
			{/each}
		</ul>
	</section>
{/if}
