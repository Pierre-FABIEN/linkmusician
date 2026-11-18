<script lang="ts">
	/**
	 * LINKMUSICIAN: héros de l'accueil Collab (U0, UX-1 : D74, conception 20
	 * §5.2) : la première prochaine action du moteur N3. Une information, une
	 * raison courte, un seul geste ; « Plus tard » et « Pas pour moi » à part
	 * (N4), jamais sur une demande des rangs 1 et 2.
	 */
	import { ArrowRight, Target } from 'lucide-svelte';
	import Tile from './Tile.svelte';
	import SuggestionChoices from './SuggestionChoices.svelte';
	import { toneOfMode } from './tones';
	import { RANK_KICKER, type SuggestionRank } from '#lib/career/next';

	let {
		action
	}: {
		action: {
			key: string;
			rank: SuggestionRank;
			title: string;
			why: string;
			href: string;
			cta: string;
			postpone?: boolean;
			decline?: boolean;
		};
	} = $props();
</script>

<Tile
	tone={toneOfMode('CAREER')}
	icon={Target}
	class="lm-next-step"
	data-testid="action-hero"
	data-rank={action.rank}
>
	<section class="space-y-3" aria-labelledby="action-hero-title">
		<p class="lm-tile__kicker">{RANK_KICKER[action.rank]}</p>
		<h2 id="action-hero-title" class="lm-title lm-title--sm wrap-break-word">{action.title}</h2>
		<p class="lm-tile__text max-w-prose wrap-break-word">{action.why}</p>
		<a href={action.href} class="lm-btn">
			{action.cta}
			<ArrowRight class="size-4" aria-hidden="true" />
		</a>
		<SuggestionChoices
			key={action.key}
			title={action.title}
			postpone={action.postpone}
			decline={action.decline}
		/>
	</section>
</Tile>
