<script lang="ts">
	/**
	 * LINKMUSICIAN: distance affichée par tranche, jamais en mètres (P1-02).
	 * Reçoit la tranche déjà calculée par le serveur (`distanceBand`) : les
	 * mètres ne quittent jamais le serveur (DASH-20a).
	 */
	import { MapPin } from 'lucide-svelte';

	let { band, commune = null }: { band: string; commune?: string | null } = $props();
</script>

<span
	class="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
>
	<MapPin class="size-3" aria-hidden="true" />
	{band}{commune ? ` · ${commune}` : ''}
</span>
