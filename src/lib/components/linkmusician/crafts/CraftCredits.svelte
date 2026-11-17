<script lang="ts">
	import ProofBadge from '#lib/components/linkmusician/profile/ProofBadge.svelte';
	// LINKMUSICIAN: crédits confirmés d'une carte métier du profil public
	// (P4-07) : les morceaux où la personne a assuré la prise de son, le
	// mixage, le mastering ou la production. Un crédit en attente n'y est pas.
	let { credits }: { credits: { id: string; title: string; roles: string[] }[] } = $props();
</script>

{#if credits.length > 0}
	<div class="space-y-2">
		<h3 class="flex items-center gap-2 text-sm font-semibold">
			Crédits confirmés <ProofBadge level="CONFIRMED" />
		</h3>
		<ul class="space-y-1">
			{#each credits as c (c.id)}
				<li class="flex min-h-11 flex-wrap items-center gap-x-2 text-sm">
					<a href="/morceaux/{c.id}" class="font-medium text-primary underline">{c.title}</a>
					<span class="text-muted-foreground">{c.roles.join(', ')}</span>
				</li>
			{/each}
		</ul>
		<p class="text-xs text-muted-foreground">Confirmés par l’équipe du morceau.</p>
	</div>
{/if}
