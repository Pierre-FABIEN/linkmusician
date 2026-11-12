<script lang="ts">
	/** DASH-03 : menu partagé ; chaque tuile ouvre son écran dédié. */
	import { CalendarDays, CircleCheck, Inbox, MessageCircle } from 'lucide-svelte';
	import type { PriorityAction } from '#lib/linkmusician/priorityActions';
	import MetroMenu from './MetroMenu.svelte';
	const icons = {
		agenda: CalendarDays,
		confirmations: CircleCheck,
		applications: Inbox,
		requests: MessageCircle
	};
	let { actions }: { actions: PriorityAction[] } = $props();
	const items = $derived(actions.map((a) => ({ ...a, icon: icons[a.kind] })));
</script>

<section aria-label="Actions prioritaires" class="space-y-3">
	<p class="text-sm text-muted-foreground">Aperçus de ton compte, partagés entre tes métiers.</p>
	<MetroMenu {items} />
</section>
