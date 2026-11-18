<script lang="ts">
	/**
	 * LINKMUSICIAN: prochaines actions (N3, conception 21 §9), déjà triées et
	 * autorisées par le serveur (`#lib/server/career/next`) : chaque tuile dit
	 * ce qui se passe, pourquoi maintenant, et ouvre l'écran du geste (jamais
	 * une écriture directe). Rien quand il n'y a rien : une absence n'est pas
	 * un manque (NL2). U0 : la première action est le héros ; ici, la suite.
	 *
	 * N4 : « Plus tard » et « Pas pour moi » à côté du lien, jamais dedans.
	 */
	import { ArrowRight } from 'lucide-svelte';
	import Tile from './Tile.svelte';
	import SuggestionChoices from './SuggestionChoices.svelte';
	import { TONE_OF } from './tones';
	import { RANK_KICKER, type SuggestionRank } from '#lib/career/next';

	type Action = {
		key: string;
		rank: SuggestionRank;
		title: string;
		why: string;
		href: string;
		cta: string;
		postpone?: boolean;
		decline?: boolean;
	};
	let {
		actions,
		hasChoices = false,
		/** Une action est déjà le héros : l'état « tout écarté » n'a pas lieu d'être. */
		heroShown = false
	}: { actions: Action[]; hasChoices?: boolean; heroShown?: boolean } = $props();
</script>

{#if actions.length > 0}
	<section class="space-y-3" aria-labelledby="next-actions-title" data-testid="next-actions">
		<h2 id="next-actions-title" class="lm-kicker text-muted-foreground">À faire maintenant</h2>
		<ul class="grid gap-3" aria-label="Prochaines actions">
			{#each actions as a, i (a.key)}
				<li class="min-w-0">
					<Tile
						tone={i === 0 && a.rank <= 2 ? TONE_OF.work : 'paper'}
						index={i}
						class="lm-tile--flow h-full space-y-2 p-4"
						data-rank={a.rank}
					>
						<a href={a.href} class="lm-next-action block space-y-1 rounded-md">
							<span class="lm-tile__kicker block">{RANK_KICKER[a.rank]}</span>
							<span class="lm-tile__title block wrap-break-word">{a.title}</span>
							<span class="lm-tile__text block wrap-break-word">{a.why}</span>
							<span class="flex items-center gap-1 pt-1 font-semibold">
								{a.cta}<ArrowRight class="size-4" aria-hidden="true" />
							</span>
						</a>
						<SuggestionChoices
							key={a.key}
							title={a.title}
							postpone={a.postpone}
							decline={a.decline}
						/>
					</Tile>
				</li>
			{/each}
		</ul>
		{#if hasChoices || actions.some((a) => a.postpone || a.decline)}
			<p class="text-sm">
				<a href="/espace/propositions" class="underline">Ce que Melokiva me propose</a>
			</p>
		{/if}
	</section>
{:else if hasChoices && !heroShown}
	<section class="space-y-2" aria-labelledby="next-actions-title" data-testid="next-actions">
		<h2 id="next-actions-title" class="lm-kicker text-muted-foreground">À faire maintenant</h2>
		<p class="lm-tile lm-tile--flow p-4 text-sm">
			Tu as choisi ce que Melokiva te propose.
			<a href="/espace/propositions" class="underline">Revoir mes choix</a>
		</p>
	</section>
{/if}
