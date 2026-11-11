<script lang="ts">
	/** LINKMUSICIAN: pastille de niveau de compte (P1-02). Cosmétique seulement. */
	let { level, size = 'md' }: { level: number; size?: 'sm' | 'md' | 'lg' } = $props();
	const sizes = { sm: 'size-9 text-sm', md: 'size-14 text-xl', lg: 'size-20 text-3xl' };
</script>

<div
	data-tone="violet"
	class="relative grid shrink-0 place-items-center lm-fill rounded-full p-[3px] shadow-lg {sizes[
		size
	]}"
	title="Niveau {level}"
>
	<div class="grid size-full place-items-center rounded-full bg-background">
		<span class="font-black tabular-nums leading-none">{level}</span>
	</div>
	<span class="sr-only">Niveau {level}</span>
</div>
