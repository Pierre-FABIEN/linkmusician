<script lang="ts">
	/**
	 * LINKMUSICIAN: palier nommé (P1-02). Les paliers décrivent un parcours,
	 * jamais une compétence (conception 02 §5) ; un ton par grande étape, en
	 * pastille Metro (MET-01). Le nom du palier accompagne toujours le ton.
	 */
	import { Route } from 'lucide-svelte';
	import type { Tone } from '../metro/tones';

	let { id, label, prefix }: { id: string; label: string; prefix?: string } = $props();
	const tones: Record<string, Tone> = {
		FIRST_STEPS: 'paper',
		NETWORKED: 'rose',
		COLLABORATOR: 'blue',
		STAGE: 'orange',
		LOCAL_PILLAR: 'violet',
		REFERENCE: 'amber'
	};
	// Rangs de groupe (P3-08) : mêmes couleurs, par grande étape.
	const band: Record<string, Tone> = {
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
	const craft: Record<string, Tone> = {
		HOME_STUDIO: tones.FIRST_STEPS,
		FIRST_PROJECTS: tones.NETWORKED,
		PORTFOLIO: tones.COLLABORATOR,
		ESTABLISHED: tones.LOCAL_PILLAR
	};
	// Rangs du studio (P4-03) : mêmes couleurs, par grande étape.
	const studio: Record<string, Tone> = {
		OPEN: tones.NETWORKED,
		ACTIVE: tones.COLLABORATOR,
		RECOGNIZED: tones.LOCAL_PILLAR,
		ESSENTIAL: tones.REFERENCE
	};
	// Rangs de la scène (P5-01) : organisateur·rice, manager et booker, lieu.
	const scene: Record<string, Tone> = {
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
	class="lm-pill lm-pill--lg"
	data-tone={tones[id] ?? band[id] ?? craft[id] ?? studio[id] ?? scene[id] ?? tones.FIRST_STEPS}
>
	<Route class="size-3.5" aria-hidden="true" />
	{#if prefix}<span class="sr-only">{prefix} </span>{/if}{label}
</span>
