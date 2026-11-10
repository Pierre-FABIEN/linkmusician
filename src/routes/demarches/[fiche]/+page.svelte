<script lang="ts">
	// LINKMUSICIAN: une fiche du guide des démarches (P3-15a), voir +page.server.ts.
	import { afterNavigate } from '$app/navigation';
	import SEO from '#lib/components/SEO.svelte';
	import MarkdownContent from '#lib/components/linkmusician/aide/MarkdownContent.svelte';
	import { anchorLinks, scrollToId } from '#lib/components/linkmusician/aide/anchors';
	import { seoConfig } from '#lib/seo.config';
	import { ArrowLeft, ExternalLink, FileText } from 'lucide-svelte';

	let { data } = $props();
	const fiche = $derived(data.fiche);
	const day = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'UTC' });
	const verified = $derived(day.format(new Date(`${fiche.verifiedAt}T00:00:00Z`)));

	afterNavigate(({ to }) => {
		const hash = to?.url.hash;
		if (hash) setTimeout(() => scrollToId(decodeURIComponent(hash.slice(1))), 50);
	});
</script>

<SEO
	title={`${fiche.title} · Démarches`}
	description={fiche.summary}
	url={`${seoConfig.site.url}/demarches/${fiche.slug}`}
/>

<div class="min-h-screen w-full px-4 {data.memberShell ? 'pt-6 pb-24' : 'py-24'}">
	<article class="mx-auto max-w-3xl min-w-0 space-y-6" use:anchorLinks>
		<a
			href="/demarches"
			class="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground underline"
		>
			<ArrowLeft class="size-4" aria-hidden="true" /> Toutes les démarches
		</a>
		<header class="space-y-3">
			<span
				class="inline-flex size-12 items-center justify-center rounded-2xl bg-muted"
				aria-hidden="true"
			>
				<FileText class="size-6" />
			</span>
			<p class="text-sm font-medium text-muted-foreground">{fiche.moment}</p>
			<h1 class="text-3xl font-black tracking-tight sm:text-4xl">{data.help.title}</h1>
			{#if data.help.lead}<p class="text-lg text-muted-foreground">{data.help.lead}</p>{/if}
			<p class="text-sm text-muted-foreground">
				Vérifiée le {verified}
				{#if fiche.reviewedBy}
					· relue par {fiche.reviewedBy.who}
				{:else}
					· relecture par un·e professionnel·le en cours
				{/if}
			</p>
		</header>

		<MarkdownContent html={data.help.html} />

		<section class="space-y-2 rounded-2xl border bg-card p-4" aria-labelledby="sources-title">
			<h2 id="sources-title" class="font-semibold">Sources</h2>
			<ul class="space-y-1 text-sm">
				{#each fiche.sources as s (s.url + s.label)}
					<li>
						<a
							href={s.url}
							rel="noopener noreferrer"
							target="_blank"
							class="inline-flex min-h-11 items-center gap-1 text-primary underline"
						>
							{s.label}
							<ExternalLink class="size-3.5 shrink-0" aria-hidden="true" />
						</a>
					</li>
				{/each}
			</ul>
		</section>

		<p class="text-sm text-muted-foreground">
			Information générale, pas un conseil personnalisé : les règles changent, vérifie sur les sites
			cités ou auprès d’une structure d’accompagnement. LinkMusician n’a de partenariat avec aucun
			des organismes cités.
		</p>

		{#if data.related.length > 0}
			<nav aria-label="Sur le même sujet" class="space-y-2 border-t pt-6">
				<p class="font-semibold">Sur le même moment</p>
				<ul class="flex flex-wrap gap-2">
					{#each data.related as r (r.slug)}
						<li>
							<a
								href="/demarches/{r.slug}"
								class="inline-flex min-h-11 items-center rounded-full border px-3 text-sm hover:bg-muted"
								>{r.title}</a
							>
						</li>
					{/each}
				</ul>
			</nav>
		{/if}
	</article>
</div>
