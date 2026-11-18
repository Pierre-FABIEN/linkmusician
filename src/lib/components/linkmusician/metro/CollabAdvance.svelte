<script lang="ts" module>
	import type { ComponentProps } from 'svelte';
	import type ActionHero from './ActionHero.svelte';
	import type NextStep from '../NextStep.svelte';
	import type NextActions from './NextActions.svelte';

	/** Le héros choisi par le serveur (`pickHero`, `#lib/career/next/hero`). */
	export type CollabHero =
		| { kind: 'action'; action: ComponentProps<typeof ActionHero>['action'] }
		| { kind: 'start' }
		| { kind: 'objective'; step: ComponentProps<typeof NextStep> };

	export type CollabAdvanceProps = {
		hero: CollabHero;
		rest: ComponentProps<typeof NextActions>['actions'];
		hasChoices: boolean;
	};
</script>

<script lang="ts">
	/**
	 * LINKMUSICIAN: tête du pivot « avancer » de Collab (U0, D74, conception 20
	 * §6.1), commune au musicien et aux autres métiers : le héros (une action
	 * réelle, sinon « Commence ici » ou l'objectif), la suite des prochaines
	 * actions, puis les tuiles « À traiter », candidatures, contacts et agenda.
	 */
	import ActionHeroView from './ActionHero.svelte';
	import StartHero from './StartHero.svelte';
	import NextStepView from '../NextStep.svelte';
	import NextActionsView from './NextActions.svelte';
	import PriorityActions from './PriorityActions.svelte';
	import type { PriorityAction } from '#lib/linkmusician/priorityActions';

	let {
		hero,
		rest,
		hasChoices,
		priorities
	}: CollabAdvanceProps & { priorities: PriorityAction[] } = $props();
</script>

<div class="space-y-6">
	{#if hero.kind === 'action'}
		<ActionHeroView action={hero.action} />
	{:else if hero.kind === 'start'}
		<StartHero />
	{:else}
		<NextStepView {...hero.step} />
	{/if}
	<NextActionsView actions={rest} {hasChoices} heroShown={hero.kind === 'action'} />
	<PriorityActions actions={priorities} />
</div>
