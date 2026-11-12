<script lang="ts">
	import { Download } from 'lucide-svelte';
	import { actTitle } from '#lib/career/map';
	import { sheetLines, type CareerSheet } from '#lib/career/sheet';

	let {
		sheet,
		handle,
		shareable = false
	}: { sheet: CareerSheet; handle?: string; shareable?: boolean } = $props();
	const lines = $derived(sheetLines(sheet));
</script>

<section class="space-y-3" aria-labelledby="career-sheet-title">
	<div>
		<h2 id="career-sheet-title" class="text-xl font-bold">Fiche de carrière</h2>
		<p class="text-sm text-muted-foreground">Des faits confirmés par d’autres, pas un score.</p>
	</div>
	<dl class="grid grid-cols-2 gap-2 sm:grid-cols-3">
		{#each lines as line (line.label)}
			<div class="lm-tile lm-tile--flow min-w-0 p-3">
				<dt class="text-xs text-muted-foreground">{line.label}</dt>
				<dd class="mt-1 wrap-break-word font-semibold">{line.value}</dd>
			</div>
		{/each}
	</dl>
	{#if handle && shareable && sheet.actsPassed.length > 0}
		<div class="lm-tile lm-tile--flow space-y-2 p-3">
			<p class="text-sm font-semibold">Cartes souvenirs à partager</p>
			<ul class="flex flex-wrap gap-2">
				{#each sheet.actsPassed as act (act)}
					<li>
						<a
							href="/api/carriere/souvenir/{handle}/{act}.png"
							download="linkmusician-acte-{act}.png"
							class="lm-btn gap-2 bg-background"
							data-variant="ghost"
						>
							<Download class="size-4" aria-hidden="true" />
							Télécharger · {actTitle(act)}
						</a>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</section>
