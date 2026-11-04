<script lang="ts">
	/** LINKMUSICIAN: distance affichée par tranche, jamais en mètres (P1-02). */
	import { MapPin } from 'lucide-svelte';
	import { distanceBand } from '#lib/geo/distance';

	let { meters, commune = null }: { meters: number; commune?: string | null } = $props();
</script>

<span
	class="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
>
	<MapPin class="size-3" aria-hidden="true" />
	{distanceBand(meters)}{commune ? ` · ${commune}` : ''}
</span>
