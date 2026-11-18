<script lang="ts">
	/**
	 * LINKMUSICIAN: pastille d'une épreuve de la carte (N2) : son nom et son
	 * état, écrits en toutes lettres, avec une icône qui ne fait
	 * qu'accompagner (l'état ne repose jamais sur la couleur seule).
	 */
	import { CircleCheck, CircleDashed, Clock, Target } from 'lucide-svelte';
	import { TRIAL_STATE_LABEL, type TrialState } from '#lib/career/map';

	let { name, state }: { name: string; state: TrialState } = $props();
	const ICON = { passed: CircleCheck, within_reach: Target, open: CircleDashed, soon: Clock };
	const Icon = $derived(ICON[state]);
</script>

<span class="lm-pill inline-flex max-w-full items-center gap-1 wrap-break-word" data-state={state}>
	<Icon class="size-3.5 shrink-0" aria-hidden="true" />
	<span class="min-w-0">{name} · {TRIAL_STATE_LABEL[state]}</span>
</span>
