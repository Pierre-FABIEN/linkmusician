<script lang="ts">
	/**
	 * LINKMUSICIAN: morceaux composés d'un profil ou d'un groupe (P3-11), avec
	 * leurs crédits confirmés. Jamais d'idée : elles restent dans l'équipe.
	 */
	import * as Card from '#shadcn/card';
	import { Music } from 'lucide-svelte';

	type Work = {
		id: string;
		title: string;
		proof: 'DECLARED' | 'CORROBORATED' | null;
		credits: number;
		band: { handle: string; name: string } | null;
		roles: string[];
	};
	let { works, signedIn }: { works: Work[]; signedIn: boolean } = $props();
</script>

{#if works.length > 0}
	<Card.Root>
		<Card.Header>
			<Card.Title
				><h2 class="flex items-center gap-2">
					<Music class="size-5" aria-hidden="true" /> Morceaux
				</h2></Card.Title
			>
		</Card.Header>
		<Card.Content>
			<ul class="space-y-3 text-sm" aria-label="Morceaux composés">
				{#each works as w (w.id)}
					<li>
						{#if signedIn}
							<a href="/morceaux/{w.id}" class="font-semibold underline">{w.title}</a>
						{:else}
							<span class="font-semibold">{w.title}</span>
						{/if}
						{#if w.band}
							<span class="text-muted-foreground"
								>· avec <a href="/@{w.band.handle}" class="underline">{w.band.name}</a></span
							>
						{/if}
						<span class="block text-muted-foreground">
							{#if w.roles.length > 0}{w.roles.join(', ')} ·
							{/if}
							{w.credits > 1 ? `${w.credits} personnes créditées` : 'Composé en solo'}
						</span>
					</li>
				{/each}
			</ul>
		</Card.Content>
	</Card.Root>
{/if}
