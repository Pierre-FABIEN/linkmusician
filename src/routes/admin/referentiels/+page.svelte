<script lang="ts">
	// LINKMUSICIAN: référentiels instruments et genres, en lecture seule.
	import { INSTRUMENT_FAMILY_LABELS } from '#lib/skills/instruments';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const instrumentCount = $derived(data.families.reduce((n, f) => n + f.instruments.length, 0));
	const genreCount = $derived(data.genres.reduce((n, g) => n + 1 + g.children.length, 0));
</script>

<svelte:head>
	<title>Référentiels — Admin</title>
</svelte:head>

<div class="space-y-8 px-6">
	<div>
		<h1 class="text-2xl font-semibold">Référentiels</h1>
		<p class="text-sm text-muted-foreground">
			Lecture seule. Pour modifier ces listes : <code>prisma/seed-data/</code>, puis
			<code>npm run seed:referentiels</code>. Une entrée retirée est désactivée, jamais supprimée.
		</p>
	</div>

	<section aria-labelledby="instruments-title">
		<h2 id="instruments-title" class="mb-3 text-lg font-medium">
			Instruments <span class="text-muted-foreground">({instrumentCount})</span>
		</h2>
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.families as { family, instruments } (family)}
				<div class="rounded-lg border p-4">
					<h3 class="mb-2 font-medium">
						{INSTRUMENT_FAMILY_LABELS[family]}
						<span class="text-sm text-muted-foreground">({instruments.length})</span>
					</h3>
					<ul class="space-y-1 text-sm">
						{#each instruments as instrument (instrument.id)}
							<li class={instrument.active ? '' : 'text-muted-foreground line-through'}>
								{instrument.name}
								<code class="text-xs text-muted-foreground">{instrument.slug}</code>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>
	</section>

	<section aria-labelledby="genres-title">
		<h2 id="genres-title" class="mb-3 text-lg font-medium">
			Genres <span class="text-muted-foreground">({genreCount})</span>
		</h2>
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.genres as genre (genre.id)}
				<div class="rounded-lg border p-4">
					<h3 class="mb-2 font-medium {genre.active ? '' : 'text-muted-foreground line-through'}">
						{genre.name} <code class="text-xs text-muted-foreground">{genre.slug}</code>
					</h3>
					<ul class="space-y-1 text-sm">
						{#each genre.children as child (child.id)}
							<li class={child.active ? '' : 'text-muted-foreground line-through'}>
								{child.name} <code class="text-xs text-muted-foreground">{child.slug}</code>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>
	</section>
</div>
