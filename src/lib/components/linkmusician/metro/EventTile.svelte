<script lang="ts">
	import Tile from './Tile.svelte';
	import { MapPin, Users, Heart } from 'lucide-svelte';

	import type { Tone } from './tones';

	let {
		tone = 'orange',
		month,
		day,
		time,
		title,
		description,
		place,
		attendees,
		availability,
		joined = false,
		onJoin
	}: {
		tone?: Tone;
		month: string;
		day: string;
		time: string;
		title: string;
		description: string;
		place: string;
		attendees: string;
		availability: string;
		joined?: boolean;
		onJoin?: () => void;
	} = $props();
</script>

<Tile {tone} size="wide" class="lm-pattern-tile lm-pattern-tile--event lm-event-tile">
	<div class="flex items-start gap-5">
		<div class="lm-event-tile__date"><span>{month}</span><strong>{day}</strong></div>
		<div class="min-w-0 flex-1 space-y-3">
			<p class="lm-tile__kicker">Événement · {time}</p>
			<h2 class="lm-event-tile__title">{title}</h2>
			<p class="lm-tile__text">{description}</p>
			<p class="flex flex-wrap gap-3 text-sm">
				<span class="inline-flex items-center gap-1"
					><MapPin class="size-4" aria-hidden="true" />{place}</span
				>
				<span class="inline-flex items-center gap-1"
					><Users class="size-4" aria-hidden="true" />{attendees}</span
				>
			</p>
		</div>
	</div>
	<div class="flex flex-wrap items-center justify-between gap-3">
		<span class="lm-event-tile__availability"><span></span>{availability}</span>
		{#if onJoin}
			<button class="lm-btn" type="button" onclick={onJoin} aria-pressed={joined}>
				<Heart class="size-4" aria-hidden="true" />{joined ? 'Ajouté' : 'Je viens'}
			</button>
		{/if}
	</div>
</Tile>
