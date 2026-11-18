<script lang="ts">
	/**
	 * LINKMUSICIAN: prochaines actions (N3, conception 21 §9). Trois au plus,
	 * déjà triées et autorisées par le serveur (`#lib/server/career/next`) :
	 * chaque tuile dit ce qui se passe, pourquoi maintenant, et ouvre l'écran
	 * du geste (jamais une écriture directe). Rien quand il n'y a rien : une
	 * absence n'est pas un manque (NL2).
	 *
	 * N4 : « Plus tard » (rangs 3 à 5) et « Pas pour moi » (rangs 4 et 5), à
	 * côté du lien, jamais dedans. Le serveur revérifie la clé ; la liste se
	 * recharge et la suivante prend la place.
	 */
	import { enhance, type SubmitFunction } from '$app/forms';
	import { goto } from '$app/navigation';
	import { ArrowRight } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
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
		postpone?: boolean;
		decline?: boolean;
	};
	let { actions, hasChoices = false }: { actions: Action[]; hasChoices?: boolean } = $props();

	/** Le mot porte la nature de l'action ; la couleur ne fait qu'accompagner. */
	const KICKER: Record<SuggestionRank, string> = {
		1: 'Quelqu’un t’attend',
		2: 'Une demande pour toi',
		3: 'Ton travail en cours',
		4: 'Un besoin de ton morceau',
		5: 'Si tu veux'
	};

	let pending = $state<string | null>(null);
	const choose =
		(key: string): SubmitFunction =>
		() => {
			pending = key;
			return async ({ result, update }) => {
				pending = null;
				if (result.type === 'success' && typeof result.data?.message === 'string')
					toast.success(result.data.message, {
						action: { label: 'Mes choix', onClick: () => goto('/espace/propositions') }
					});
				else if (result.type === 'failure')
					toast.error(String(result.data?.choiceError ?? 'Ce choix n’a pas pu être enregistré.'));
				await update();
			};
		};
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
							<span class="lm-tile__kicker block">{KICKER[a.rank]}</span>
							<span class="lm-tile__title block wrap-break-word">{a.title}</span>
							<span class="lm-tile__text block wrap-break-word">{a.why}</span>
							<span class="flex items-center gap-1 pt-1 font-semibold">
								{a.cta}<ArrowRight class="size-4" aria-hidden="true" />
							</span>
						</a>
						{#if a.postpone || a.decline}
							<div class="flex flex-wrap gap-2">
								{#if a.postpone}
									<form method="POST" action="/espace?/later" use:enhance={choose(a.key)}>
										<input type="hidden" name="key" value={a.key} />
										<button
											class="lm-btn min-h-11"
											data-variant="ghost"
											disabled={pending !== null}
											aria-label="Plus tard : {a.title}">Plus tard</button
										>
									</form>
								{/if}
								{#if a.decline}
									<form method="POST" action="/espace?/notForMe" use:enhance={choose(a.key)}>
										<input type="hidden" name="key" value={a.key} />
										<button
											class="lm-btn min-h-11"
											data-variant="ghost"
											disabled={pending !== null}
											aria-label="Pas pour moi : {a.title}">Pas pour moi</button
										>
									</form>
								{/if}
							</div>
						{/if}
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
{:else if hasChoices}
	<section class="space-y-2" aria-labelledby="next-actions-title" data-testid="next-actions">
		<h2 id="next-actions-title" class="lm-kicker text-muted-foreground">À faire maintenant</h2>
		<p class="lm-tile lm-tile--flow p-4 text-sm">
			Tu as choisi ce que Melokiva te propose.
			<a href="/espace/propositions" class="underline">Revoir mes choix</a>
		</p>
	</section>
{/if}
