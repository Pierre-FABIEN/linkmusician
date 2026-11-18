<script lang="ts">
	/** DASH-03 : menu partagé ; chaque tuile ouvre son écran dédié. */
	import type { ComponentProps } from 'svelte';
	import { CalendarDays, CircleCheck, Inbox, MessageCircle } from 'lucide-svelte';
	import type { PriorityAction } from '#lib/linkmusician/priorityActions';
	import MetroMenu from './MetroMenu.svelte';
	import NextActions from './NextActions.svelte';
	const icons = {
		agenda: CalendarDays,
		confirmations: CircleCheck,
		applications: Inbox,
		requests: MessageCircle
	};
	let {
		actions,
		next = []
	}: {
		actions: PriorityAction[];
		/** Prochaines actions (N3), au-dessus des aperçus. */
		next?: ComponentProps<typeof NextActions>['actions'];
	} = $props();
	const items = $derived(actions.map((a) => ({ ...a, icon: icons[a.kind] })));
</script>

<NextActions actions={next} />
<section aria-label="Actions prioritaires" class="space-y-3">
	<p class="text-sm text-muted-foreground">Aperçus de ton compte, partagés entre tes métiers.</p>
	<MetroMenu {items} />
</section>
