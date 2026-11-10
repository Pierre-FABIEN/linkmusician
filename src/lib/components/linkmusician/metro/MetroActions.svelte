<script lang="ts">
	/**
	 * LINKMUSICIAN: raccourcis Metro en haut à droite (refonte) : découvrir,
	 * messages, notifications, aide. Une icône par entrée, une pastille pour ce
	 * qui attend ; le nom reste lisible par les lecteurs d'écran et en infobulle.
	 * Cibles de 44 px au moins.
	 */
	import { Bell, Compass, LifeBuoy, MessageCircle } from 'lucide-svelte';

	let {
		messages = 0,
		notifications = 0,
		hrefs = {}
	}: {
		messages?: number;
		notifications?: number;
		hrefs?: Partial<Record<'discover' | 'messages' | 'notifications' | 'help', string>>;
	} = $props();

	const items = $derived([
		{
			key: 'discover',
			label: 'Découvrir',
			icon: Compass,
			count: 0,
			href: hrefs.discover ?? '/decouvrir'
		},
		{
			key: 'messages',
			label: 'Messages',
			icon: MessageCircle,
			count: messages,
			href: hrefs.messages ?? '/messages'
		},
		{
			key: 'notifications',
			label: 'Notifications',
			icon: Bell,
			count: notifications,
			href: hrefs.notifications ?? '/notifications'
		},
		{ key: 'help', label: 'Aide', icon: LifeBuoy, count: 0, href: hrefs.help ?? '/aide' }
	]);
</script>

<nav class="lm-actions" aria-label="Raccourcis">
	{#each items as item (item.key)}
		{@const Icon = item.icon}
		<a class="lm-action" href={item.href} title={item.label}>
			<Icon class="size-5" aria-hidden="true" />
			<span class="sr-only"
				>{item.label}{item.count > 0
					? ` : ${item.count} nouveau${item.count > 1 ? 'x' : ''}`
					: ''}</span
			>
			{#if item.count > 0}
				<span class="lm-action__count" aria-hidden="true">{item.count > 9 ? '9+' : item.count}</span
				>
			{/if}
		</a>
	{/each}
</nav>
