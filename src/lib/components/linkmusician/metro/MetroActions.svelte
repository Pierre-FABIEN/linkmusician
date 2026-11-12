<script lang="ts">
	/**
	 * LINKMUSICIAN: raccourcis Metro en haut à droite (D55) : découvrir,
	 * messages, notifications, aide. Une icône par entrée, une pastille pour ce
	 * qui attend ; le nom reste lisible par les lecteurs d'écran et en
	 * infobulle. Cibles de 44 px au moins. L'aide se replie sur téléphone
	 * (elle reste dans le menu du compte) pour que l'en-tête tienne en 360 px.
	 */
	import { Bell, Compass, LifeBuoy, MessageCircle } from 'lucide-svelte';
	import { badgeLabel } from '#lib/notifications/types';

	type Key = 'discover' | 'messages' | 'notifications' | 'help';
	let {
		messages = 0,
		notifications = 0,
		hrefs = {},
		current = null,
		help = true
	}: {
		messages?: number;
		notifications?: number;
		hrefs?: Partial<Record<Key, string>>;
		/** Raccourci de la page affichée (`aria-current`). */
		current?: Key | null;
		/** Montrer le raccourci d'aide (masqué sous 480 px). */
		help?: boolean;
	} = $props();

	const plural = (n: number, one: string, many: string) => (n > 1 ? many : one);
	const items = $derived(
		[
			{
				key: 'discover' as const,
				label: 'Découvrir',
				icon: Compass,
				count: 0,
				href: hrefs.discover ?? '/decouvrir'
			},
			{
				key: 'messages' as const,
				label:
					messages > 0
						? `Messages : ${messages} ${plural(messages, 'non lu', 'non lus')}`
						: 'Messages',
				icon: MessageCircle,
				count: messages,
				href: hrefs.messages ?? '/messages'
			},
			{
				key: 'notifications' as const,
				label:
					notifications > 0
						? `Notifications : ${notifications} ${plural(notifications, 'nouvelle', 'nouvelles')}`
						: 'Notifications',
				icon: Bell,
				count: notifications,
				href: hrefs.notifications ?? '/notifications'
			},
			{ key: 'help' as const, label: 'Aide', icon: LifeBuoy, count: 0, href: hrefs.help ?? '/aide' }
		].filter((item) => help || item.key !== 'help')
	);
</script>

<nav class="lm-actions" aria-label="Raccourcis">
	{#each items as item (item.key)}
		{@const Icon = item.icon}
		<a
			class="lm-action"
			data-fold={item.key === 'help' || undefined}
			href={item.href}
			title={item.label}
			aria-label={item.label}
			aria-current={current === item.key ? 'page' : undefined}
		>
			<Icon class="size-5" aria-hidden="true" />
			{#if item.count > 0}
				<span class="lm-action__count" aria-hidden="true">{badgeLabel(item.count)}</span>
			{/if}
		</a>
	{/each}
</nav>
