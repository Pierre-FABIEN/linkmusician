<script lang="ts">
	// LINKMUSICIAN: une fiche du guide des démarches (P3-15a), voir
	// +page.server.ts. HTML rendu côté serveur depuis le dépôt, jamais saisi
	// par un·e utilisateur·rice.
	import { afterNavigate } from '$app/navigation';
	import SEO from '#lib/components/SEO.svelte';
	import MarkdownContent from '#lib/components/linkmusician/aide/MarkdownContent.svelte';
	import { anchorLinks, scrollToId } from '#lib/components/linkmusician/aide/anchors';
	import { seoConfig } from '#lib/seo.config';
	import { demarcheHref, FICHES, frenchDate, MOMENT_INFO } from '#lib/demarches/catalog';
	import { ArrowLeft, CalendarCheck, ExternalLink, Info } from 'lucide-svelte';

	let { data } = $props();
	const c = $derived(data.content);
	const others = $derived(
		FICHES.filter((f) => f.moment === data.fiche.moment && f.slug !== data.fiche.slug)
	);

	afterNavigate(({ to }) => {
		const hash = to?.url.hash;
		if (hash) setTimeout(() => scrollToId(decodeURIComponent(hash.slice(1))), 50);
	});
</script>

<SEO
	title={`${c.title} · Démarches`}
	description={data.fiche.summary}
	url={`${seoConfig.site.url}${demarcheHref(data.fiche.slug)}`}
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
			<p class="text-sm font-semibold text-muted-foreground">
				{MOMENT_INFO[data.fiche.moment].label}
			</p>
			<h1 class="text-3xl font-black tracking-tight sm:text-4xl">{c.title}</h1>
			{#if c.lead}<p class="text-lg text-muted-foreground">{c.lead}</p>{/if}
			<p class="inline-flex items-center gap-2 text-sm text-muted-foreground">
				<CalendarCheck class="size-4 shrink-0" aria-hidden="true" />
				Vérifiée le {frenchDate(c.meta.verifiedOn)}
			</p>
		</header>

		<MarkdownContent html={c.html} />

		<section aria-labelledby="sources" class="space-y-2 rounded-2xl border bg-card p-4">
			<h2 id="sources" class="font-bold">Sources officielles</h2>
			<ul class="space-y-1 text-sm">
				{#each c.meta.sources as source (source.url)}
					<li>
						<a
							href={source.url}
							rel="noopener noreferrer"
							target="_blank"
							class="inline-flex min-h-11 items-center gap-1 text-primary underline"
						>
							{source.label}
							<ExternalLink class="size-3.5 shrink-0" aria-hidden="true" />
							<span class="sr-only">(nouvel onglet)</span>
						</a>
					</li>
				{/each}
			</ul>
		</section>

		<aside class="flex items-start gap-3 rounded-2xl border p-4 text-sm text-muted-foreground">
			<Info class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
			<p>
				Information générale, pas un conseil personnalisé : vérifie toujours auprès de l’organisme
				concerné.{#if !c.meta.reviewed}
					Cette fiche n’a pas encore été relue par un·e professionnel·le du métier.{/if}
				LinkMusician n’est lié à aucun des organismes cités.
			</p>
		</aside>

		{#if others.length}
			<nav aria-label="Démarches voisines" class="space-y-2 border-t pt-6">
				<p class="font-semibold">Dans « {MOMENT_INFO[data.fiche.moment].label} »</p>
				<ul class="grid gap-3 sm:grid-cols-2">
					{#each others as f (f.slug)}
						<li>
							<a
								href={demarcheHref(f.slug)}
								class="flex h-full flex-col rounded-2xl border p-4 hover:border-primary"
							>
								<span class="font-semibold">{f.nav}</span>
								<span class="text-sm text-muted-foreground">{f.summary}</span>
							</a>
						</li>
					{/each}
				</ul>
			</nav>
		{/if}
	</article>
</div>
