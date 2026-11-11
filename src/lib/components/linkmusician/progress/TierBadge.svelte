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
	// Rangs des métiers du son (P4-02b) : mêmes couleurs, par grande étape.
	const craft: Record<string, string> = {
		HOME_STUDIO: tones.FIRST_STEPS,
		FIRST_PROJECTS: tones.NETWORKED,
		PORTFOLIO: tones.COLLABORATOR,
		ESTABLISHED: tones.LOCAL_PILLAR
	};
	// Rangs du studio (P4-03) : mêmes couleurs, par grande étape.
	const studio: Record<string, string> = {
		OPEN: tones.NETWORKED,
		ACTIVE: tones.COLLABORATOR,
		RECOGNIZED: tones.LOCAL_PILLAR,
		ESSENTIAL: tones.REFERENCE
	};
	// Rangs de la scène (P5-01) : organisateur·rice, manager et booker, lieu.
	const scene: Record<string, string> = {
		FIRST_EVENT: tones.NETWORKED,
		REGULAR: tones.COLLABORATOR,
		LOCAL_SCENE: tones.LOCAL_PILLAR,
		FESTIVAL: tones.REFERENCE,
		FIRST_ARTIST: tones.NETWORKED,
		DEVELOPER: tones.LOCAL_PILLAR,
		AGENCY: tones.REFERENCE,
		VENUE_OPEN: tones.NETWORKED,
		OPEN_STAGE: tones.STAGE,
		LOCAL_VENUE: tones.LOCAL_PILLAR,
		CULT_VENUE: tones.REFERENCE
	};
</script>

<span
	class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ring-1 {tones[
		id
	] ??
		band[id] ??
		craft[id] ??
		studio[id] ??
		scene[id] ??
		tones.FIRST_STEPS}"
>
	<Route class="size-3.5" aria-hidden="true" />
	{#if prefix}<span class="sr-only">{prefix} </span>{/if}{label}
</span>
