<script lang="ts">
	// LINKMUSICIAN: guide des démarches (P3-15a), public comme l’aide ; un membre connecté y garde la navigation de
	// son espace (P2-12b), un visiteur voit la page seule.
	import AppShell from '#lib/components/linkmusician/AppShell.svelte';

	let { children, data } = $props();
</script>

{#if data.memberShell}
	<AppShell
		user={data.user ?? null}
		unread={data.memberShell.unread}
		notifications={data.memberShell.notifications}
		preferredMode={data.memberShell.preferredMode}
	>
		{@render children()}
	</AppShell>
{:else}
	{@render children()}
{/if}
