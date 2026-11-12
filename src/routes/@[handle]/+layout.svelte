<script lang="ts">
	// LINKMUSICIAN: page publique ; un membre connecté y garde la navigation de
	// son espace (P2-12b), un visiteur voit la page seule.
	import AppShell from '#lib/components/linkmusician/AppShell.svelte';
	import MetroPage from '#lib/components/linkmusician/metro/MetroPage.svelte';

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
	<MetroPage>{@render children()}</MetroPage>
{/if}
