<script lang="ts">
	/**
	 * LINKMUSICIAN: palier nommé (P1-02). Les paliers décrivent un parcours,
	 * jamais une compétence (conception 02 §5) ; une couleur par palier.
	 */
	import { Route } from 'lucide-svelte';

	let { id, label, prefix }: { id: string; label: string; prefix?: string } = $props();
	const tones: Record<string, string> = {
		FIRST_STEPS: 'bg-slate-100 text-slate-800 ring-slate-300 dark:bg-slate-800 dark:text-slate-100',
		NETWORKED: 'bg-sky-100 text-sky-900 ring-sky-300 dark:bg-sky-950 dark:text-sky-100',
		COLLABORATOR:
			'bg-emerald-100 text-emerald-900 ring-emerald-300 dark:bg-emerald-950 dark:text-emerald-100',
		STAGE: 'bg-orange-100 text-orange-900 ring-orange-300 dark:bg-orange-950 dark:text-orange-100',
		LOCAL_PILLAR:
			'bg-violet-100 text-violet-900 ring-violet-300 dark:bg-violet-950 dark:text-violet-100',
		REFERENCE: 'bg-amber-100 text-amber-900 ring-amber-300 dark:bg-amber-950 dark:text-amber-100'
	};
	// Rangs de groupe (P3-08) : mêmes couleurs, par grande étape.
	const band: Record<string, string> = {
		FORMATION: tones.FIRST_STEPS,
		FIRST_REHEARSAL: tones.NETWORKED,
		FIRST_COMPOSITION: tones.NETWORKED,
		FIRST_RECORDING: tones.COLLABORATOR,
		FIRST_PUBLIC_DEMO: tones.COLLABORATOR,
		FIRST_GIG: tones.STAGE,
		FIRST_TOUR: tones.STAGE,
		FIRST_EP: tones.LOCAL_PILLAR,
		FIRST_ALBUM: tones.LOCAL_PILLAR,
		SIGNING: tones.REFERENCE
	};
</script>

<span
	class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ring-1 {tones[
		id
	] ??
		band[id] ??
		tones.FIRST_STEPS}"
>
	<Route class="size-3.5" aria-hidden="true" />
	{#if prefix}<span class="sr-only">{prefix} </span>{/if}{label}
</span>
