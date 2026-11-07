<script lang="ts">
	/** LINKMUSICIAN: onglets de Messages (P3-16b, D46) : Conversations, Contacts. */
	let { current }: { current: 'conversations' | 'contacts' } = $props();
	const tabs = [
		{ id: 'conversations', label: 'Conversations', href: '/messages' },
		{ id: 'contacts', label: 'Contacts', href: '/messages/contacts' }
	] as const;
</script>

<nav aria-label="Messages" class="flex gap-1 rounded-full bg-muted p-1">
	{#each tabs as t (t.id)}
		<a
			href={t.href}
			aria-current={t.id === current ? 'page' : undefined}
			class="flex min-h-11 flex-1 items-center justify-center rounded-full text-sm font-semibold {t.id ===
			current
				? 'bg-background shadow-sm'
				: 'text-muted-foreground'}">{t.label}</a
		>
	{/each}
</nav>
