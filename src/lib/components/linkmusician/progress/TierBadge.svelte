<script lang="ts">
	/**
	 * LINKMUSICIAN: palier nommé (P1-02). Les paliers décrivent un parcours,
	 * jamais une compétence (conception 02 §5) ; une couleur par palier.
	 */
	import { Route } from 'lucide-svelte';

	let { id, label }: { id: string; label: string } = $props();
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
</script>

<span
	class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ring-1 {tones[
		id
	] ?? tones.FIRST_STEPS}"
>
	<Route class="size-3.5" aria-hidden="true" />
	{label}
</span>
