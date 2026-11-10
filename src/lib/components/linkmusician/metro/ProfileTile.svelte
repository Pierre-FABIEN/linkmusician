<script lang="ts">
	import Tile from './Tile.svelte';
	import { ArrowRight } from 'lucide-svelte';

	type Tone = 'violet' | 'rose' | 'blue' | 'orange' | 'amber' | 'lime' | 'cyan' | 'ink' | 'paper';

	let {
		tone = 'lime',
		href,
		initials,
		name,
		instrument,
		genres,
		location,
		distance
	}: {
		tone?: Tone;
		href: string;
		initials: string;
		name: string;
		instrument: string;
		genres: string[];
		location: string;
		distance: string;
	} = $props();
</script>

<Tile {tone} size="md" {href} class="lm-pattern-tile lm-profile-tile">
	<p class="lm-tile__kicker">Profil musicien·ne</p>
	<div class="flex items-center gap-4">
		<div class="lm-profile-tile__avatar" aria-hidden="true">{initials}</div>
		<div class="min-w-0 space-y-1">
			<h2 class="lm-profile-tile__name">{name}</h2>
			<p class="lm-tile__text">{instrument}</p>
		</div>
	</div>
	<div class="space-y-2">
		<div class="flex flex-wrap gap-2">
			{#each genres as genre (genre)}<span class="lm-pill">{genre}</span>{/each}
		</div>
		<p class="lm-tile__text">{location} · {distance}</p>
	</div>
	<span class="lm-pattern-action"
		>Ouvrir le profil <ArrowRight class="size-4" aria-hidden="true" /></span
	>
</Tile>
