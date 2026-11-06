<script lang="ts">
	// LINKMUSICIAN: espace connecté : coquille partagée (`AppShell`, onglets
	// selon le mode de jeu) et célébrations. La garde est dans
	// +layout.server.ts ; la barre flottante du boilerplate est masquée
	// (`routes/+layout.svelte`).
	import AppShell from '#lib/components/linkmusician/AppShell.svelte';
	import Celebrations from '#lib/components/linkmusician/progress/Celebrations.svelte';

	let { children, data } = $props();
</script>

<AppShell
	user={data.user ?? null}
	unread={data.unread}
	notifications={data.notifications}
	preferredMode={data.preferredMode}
>
	{@render children()}
	<Celebrations items={data.celebrations.items} upTo={data.celebrations.upTo} />
</AppShell>
