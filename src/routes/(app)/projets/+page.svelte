<script lang="ts">
	// LINKMUSICIAN: liste minimale des projets (P2), voir +page.server.ts.
	import SEO from '#lib/components/SEO.svelte';
	import MetroPageHeader from '#lib/components/linkmusician/metro/MetroPageHeader.svelte';
	import MetroList from '#lib/components/linkmusician/metro/MetroList.svelte';
	import MetroEmpty from '#lib/components/linkmusician/metro/MetroEmpty.svelte';
	import { FolderOpen } from 'lucide-svelte';

	let { data } = $props();
</script>

<SEO title="Projets" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-3xl space-y-6">
		<MetroPageHeader
			kicker="Collab"
			title="Projets"
			intro="Un EP, une tournée, une production : rassemble tes morceaux autour d’un objectif. Rien de ce que tu ranges ne change de mains."
		>
			{#snippet actions()}
				<a href="/projets/nouveau" class="lm-btn">Nouveau projet</a>
			{/snippet}
		</MetroPageHeader>

		{#if data.projects.length === 0}
			<MetroEmpty
				icon={FolderOpen}
				text="Aucun projet pour l’instant. C’est facultatif : tes morceaux et tes collaborations fonctionnent sans."
				action={{ href: '/projets/nouveau', label: 'Créer un projet' }}
			/>
		{:else}
			<MetroList
				items={data.projects}
				key={(p) => p.id}
				label="Mes projets"
				href={(p) => `/projets/${p.id}`}
			>
				{#snippet row(p)}
					<span class="font-medium">{p.name}</span>
					<span class="block text-sm text-muted-foreground">
						{[p.kindLabel, p.statusLabel, p.owner].filter(Boolean).join(' · ')}
					</span>
				{/snippet}
			</MetroList>
		{/if}
	</div>
</div>
