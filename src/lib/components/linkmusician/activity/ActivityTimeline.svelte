<script lang="ts">
	import type { ActivityEntry } from '#lib/activity/timeline';
	let { entries, title, id }: { entries: ActivityEntry[]; title: string; id: string } = $props();
	const dateFormat = new Intl.DateTimeFormat('fr-FR', {
		dateStyle: 'long',
		timeStyle: 'short',
		timeZone: 'Europe/Paris'
	});
</script>

<section aria-labelledby={id} class="space-y-3">
	<h2 {id} class="text-lg font-semibold">{title}</h2>
	{#if entries.length === 0}
		<p>Aucune activité enregistrée.</p>
	{:else}
		<ol class="space-y-3">
			{#each entries as entry (entry.id)}
				<li class="lm-tile lm-tile--flow space-y-1 break-words p-4">
					<p class="font-semibold">{entry.action}</p>
					<p>{entry.author}</p>
					<time datetime={entry.occurredAt.toISOString()}>
						{dateFormat.format(entry.occurredAt)} (heure de Paris)
					</time>
				</li>
			{/each}
		</ol>
	{/if}
</section>
