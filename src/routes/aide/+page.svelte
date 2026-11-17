<script lang="ts">
	// LINKMUSICIAN: centre d’aide consultable par besoin, thème ou recherche.
	import SEO from '#lib/components/SEO.svelte';
	import MarkdownContent from '#lib/components/linkmusician/aide/MarkdownContent.svelte';
	import { HELP_PAGES, helpHref } from '#lib/aide/catalog';
	import { seoConfig } from '#lib/seo.config';
	import { Search, ArrowUpRight, LifeBuoy } from 'lucide-svelte';
	let { data } = $props();
	let query = $state('');
	let theme = $state('');
	let showAll = $state(false);
	const categories = HELP_PAGES.filter((page) => page.slug);
	function normalize(value: string) {
		return value
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase();
	}
	const words = $derived(normalize(query).trim().split(/\s+/).filter(Boolean));
	const results = $derived(
		data.topics.filter(
			(topic) =>
				(!theme || topic.slug === theme) &&
				words.every((word) =>
					normalize(`${topic.title} ${topic.category} ${topic.text}`).includes(word)
				)
		)
	);
	const visibleResults = $derived(
		query.trim() || theme || showAll
			? results
			: categories.flatMap((category) =>
					results.filter((topic) => topic.slug === category.slug).slice(0, 2)
				)
	);
</script>

<SEO
	title="Aide · LinkMusician"
	description="Trouve une réponse sur ton compte, les jams, tes projets et ta sécurité."
	url={`${seoConfig.site.url}/aide`}
/>

<div class="min-h-screen w-full px-4 {data.memberShell ? 'pt-6 pb-24' : 'py-24'}">
	<main class="mx-auto max-w-5xl space-y-8">
		<header class="max-w-2xl space-y-3">
			<p class="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
				<LifeBuoy class="size-5" aria-hidden="true" /> Centre d’aide
			</p>
			<h1 class="lm-title">Comment peut-on t’aider ?</h1>
			<p class="text-lg text-muted-foreground">
				Une question, une réponse. Trouve le bon sujet pour continuer à faire de la musique.
			</p>
		</header>

		<section aria-label="Trouver une réponse" class="space-y-4">
			<label for="help-search" class="block font-semibold">Rechercher dans l’aide</label>
			<div class="relative">
				<Search class="absolute top-3.5 left-4 size-5 text-muted-foreground" aria-hidden="true" />
				<input
					id="help-search"
					type="search"
					bind:value={query}
					placeholder="Ex. inviter un membre, points, confidentialité…"
					class="min-h-12 w-full rounded-xl border border-border bg-background py-3 pr-4 pl-12 text-base"
				/>
			</div>
			<div class="flex flex-wrap gap-2" aria-label="Filtrer par thème">
				<button
					class="lm-btn"
					data-variant={theme === '' ? 'primary' : 'ghost'}
					aria-pressed={theme === ''}
					onclick={() => (theme = '')}>Tous les thèmes</button
				>
				{#each categories as category (category.slug)}
					<button
						class="lm-btn"
						data-variant={theme === category.slug ? 'primary' : 'ghost'}
						aria-pressed={theme === category.slug}
						onclick={() => (theme = category.slug)}>{category.nav}</button
					>
				{/each}
			</div>
		</section>

		{#if !query.trim() && !theme}
			<section class="space-y-3" aria-labelledby="help-guides">
				<h2 id="help-guides" class="text-xl font-semibold">Explorer les guides</h2>
				<ul
					class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
					aria-label="Toutes les pages de l’aide"
				>
					{#each categories as category (category.slug)}
						<li>
							<a href={helpHref(category)} class="lm-tile lm-tile--flow block h-full space-y-2 p-4"
								><span class="flex items-center justify-between gap-2 font-semibold"
									>{category.nav}<ArrowUpRight class="size-4 shrink-0" aria-hidden="true" /></span
								><span class="block text-sm text-muted-foreground">{category.summary}</span></a
							>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<section class="space-y-4" aria-labelledby="help-results">
			<div class="flex flex-wrap items-baseline justify-between gap-2">
				<h2 id="help-results" class="text-xl font-semibold">
					{query.trim()
						? 'Résultats de recherche'
						: theme
							? categories.find((c) => c.slug === theme)?.nav
							: showAll
								? 'Tous les sujets'
								: 'Quelques sujets pour commencer'}
				</h2>
				<p role="status" class="text-sm text-muted-foreground">
					{results.length} sujet{results.length > 1 ? 's' : ''}
				</p>
			</div>
			{#if results.length}
				<ul class="grid gap-3 sm:grid-cols-2">
					{#each visibleResults as topic (topic.href)}
						<li>
							<a href={topic.href} class="lm-tile lm-tile--flow block h-full space-y-2 p-4"
								><span class="block text-xs font-semibold text-muted-foreground"
									>{topic.category}</span
								><span class="block font-semibold">{topic.title}</span><span
									class="block text-sm text-muted-foreground">{topic.excerpt}</span
								></a
							>
						</li>
					{/each}
				</ul>
				{#if !query.trim() && !theme && !showAll && results.length > visibleResults.length}
					<button class="lm-btn" onclick={() => (showAll = true)}
						>Afficher les {results.length} sujets</button
					>
				{/if}
			{:else}
				<div class="rounded-xl border border-border p-6">
					<p class="font-semibold">Aucun sujet trouvé</p>
					<p class="mt-2 text-muted-foreground">
						Essaie un mot plus simple ou explore tous les thèmes.
					</p>
					<button
						class="lm-btn mt-4"
						onclick={() => {
							query = '';
							theme = '';
						}}>Effacer la recherche et les filtres</button
					>
				</div>
			{/if}
		</section>

		<details class="rounded-xl border border-border p-4">
			<summary class="cursor-pointer font-semibold"
				>Découvrir LinkMusician et les questions fréquentes</summary
			>
			<div class="mt-6"><MarkdownContent html={data.help.html} /></div>
		</details>
		<aside class="border-t pt-6">
			<h2 class="font-semibold">Tu as encore besoin d’aide ?</h2>
			<p class="mt-2 text-sm text-muted-foreground">
				Décris ton problème et la page concernée via <a href="/contact" class="underline"
					>le formulaire de contact</a
				>.
			</p>
		</aside>
	</main>
</div>
