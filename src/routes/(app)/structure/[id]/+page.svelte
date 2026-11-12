<script lang="ts">
	import SEO from '#lib/components/SEO.svelte';
	import { Building2 } from 'lucide-svelte';
	import MetroPageHeader from '#lib/components/linkmusician/metro/MetroPageHeader.svelte';
	import MetroEmpty from '#lib/components/linkmusician/metro/MetroEmpty.svelte';
	import MenuList from '#lib/components/linkmusician/MenuList.svelte';
	let { data } = $props();
	const s = $derived(data.structure);
</script>

<SEO title={s.name} noindex nofollow />
<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-3xl space-y-6">
		<MetroPageHeader title={s.name} kicker={s.typeLabel} intro={s.roleLabel} />
		{#if s.status !== 'ACTIVE'}
			<p class="lm-alert p-4">
				Ta participation est en attente. Elle ne donne aucun droit de gestion.
			</p>
		{:else if s.manager}
			<p class="text-sm text-muted-foreground">
				Tu fais partie de la gestion de cette structure. Chaque action reste soumise à ses règles ;
				ce rôle ne permet pas de signer au nom des autres.
			</p>
		{:else}
			<p class="text-sm text-muted-foreground">
				Tu es membre de cette structure. Cette participation ne donne pas accès à sa gestion.
			</p>
		{/if}
		{#if s.href}
			<MenuList
				label="Outils de la structure"
				items={[
					{
						href: s.href,
						title:
							s.status !== 'ACTIVE'
								? 'Voir ma participation en attente'
								: s.manager
									? 'Ouvrir les outils de gestion'
									: 'Ouvrir mon espace de membre',
						text:
							s.status !== 'ACTIVE'
								? 'Retrouver la demande ou répondre à l’invitation sur son écran.'
								: 'Retrouver les outils disponibles pour ton rôle.',
						icon: Building2
					}
				]}
			/>
		{:else}
			<MetroEmpty
				icon={Building2}
				text="Aucun outil n’est disponible pour cette participation."
				action={{ href: '/structure', label: 'Mes structures' }}
			/>
		{/if}
	</div>
</div>
