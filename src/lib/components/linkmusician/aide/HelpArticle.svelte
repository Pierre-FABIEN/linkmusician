<script lang="ts">
	/**
	 * LINKMUSICIAN: une page du centre d'aide (`/aide`). Le contenu est du
	 * HTML rendu côté serveur depuis `src/lib/aide/pages/*.md` (contenu du
	 * dépôt, jamais saisi par un·e utilisateur·rice).
	 */
	import { afterNavigate } from '$app/navigation';
	import { anchorLinks, scrollToId } from './anchors';
	import SEO from '#lib/components/SEO.svelte';
	import MarkdownContent from './MarkdownContent.svelte';
	import { seoConfig } from '#lib/seo.config';
	import {
		HELP_PAGES,
		helpHref,
		neighbours,
		type HelpIcon,
		type HelpPage
	} from '#lib/aide/catalog';
	import {
		ArrowLeft,
		ArrowRight,
		Footprints,
		Guitar,
		LifeBuoy,
		Map,
		ShieldCheck,
		Trophy,
		UsersRound
	} from 'lucide-svelte';

	type Help = {
		title: string;
		lead: string | null;
		html: string;
		toc: { id: string; text: string }[];
	};
	let { page, help, memberShell }: { page: HelpPage; help: Help; memberShell: boolean } = $props();

	const ICONS: Record<HelpIcon, typeof LifeBuoy> = {
		home: LifeBuoy,
		start: Footprints,
		jam: Guitar,
		career: Map,
		points: Trophy,
		meet: UsersRound,
		safety: ShieldCheck
	};
	const home = $derived(page.slug === '');
	const around = $derived(neighbours(page.slug));
	const Icon = $derived(ICONS[page.icon]);
	// Accueil : les cartes des pages s'insèrent avant les questions fréquentes.
	const parts = $derived.by(() => {
		const marker = '<h2 id="questions-frequentes"';
		const at = help.html.indexOf(marker);
		return home && at >= 0 ? [help.html.slice(0, at), help.html.slice(at)] : [help.html, ''];
	});
	const others = HELP_PAGES.filter((p) => p.slug !== '');

	// Arrivée par un lien `/aide/…#ancre` (depuis une autre page).
	afterNavigate(({ to }) => {
		const hash = to?.url.hash;
		if (hash) setTimeout(() => scrollToId(decodeURIComponent(hash.slice(1))), 50);
	});
</script>

<SEO
	title={home ? 'Aide' : `${help.title} · Aide`}
	description={page.summary}
	url={`${seoConfig.site.url}${helpHref(page)}`}
/>

<div class="min-h-screen w-screen px-4 {memberShell ? 'pt-6 pb-24' : 'py-24'}">
	<div class="mx-auto max-w-5xl lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
		<nav aria-label="Pages de l’aide" class="hidden lg:block">
			<ul class="space-y-1 text-sm">
				{#each HELP_PAGES as p (p.file)}
					{@const PageIcon = ICONS[p.icon]}
					<li>
						<a
							href={helpHref(p)}
							aria-current={p.slug === page.slug ? 'page' : undefined}
							class="flex min-h-11 items-center gap-2 rounded-xl px-3 hover:bg-muted {p.slug ===
							page.slug
								? 'bg-muted font-semibold'
								: 'text-muted-foreground'}"
						>
							<PageIcon class="size-4 shrink-0" aria-hidden="true" />
							{p.nav}
						</a>
					</li>
				{/each}
			</ul>
		</nav>

		<article class="min-w-0 space-y-6" use:anchorLinks>
			{#if !home}
				<a
					href="/aide"
					class="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground underline"
				>
					<ArrowLeft class="size-4" aria-hidden="true" /> Aide
				</a>
			{/if}
			<header class="space-y-3">
				<span
					class="inline-flex size-12 items-center justify-center rounded-2xl bg-muted"
					aria-hidden="true"
				>
					<Icon class="size-6" />
				</span>
				<h1 class="lm-title">{help.title}</h1>
				{#if help.lead}<p class="text-lg text-muted-foreground">{help.lead}</p>{/if}
			</header>

			{#if !home && help.toc.length > 2}
				<nav aria-label="Sur cette page" class="lm-tile lm-tile--flow p-4 text-sm">
					<p class="mb-2 font-semibold">Sur cette page</p>
					<ul class="flex flex-wrap gap-2">
						{#each help.toc as t (t.id)}
							<li>
								<a href="#{t.id}" class="lm-btn" data-variant="ghost">{t.text}</a>
							</li>
						{/each}
					</ul>
				</nav>
			{/if}

			<MarkdownContent html={parts[0]} />

			{#if home}
				<ul class="grid gap-3 sm:grid-cols-2" aria-label="Toutes les pages de l’aide">
					{#each others as p, i (p.file)}
						{@const PageIcon = ICONS[p.icon]}
						<li>
							<a href={helpHref(p)} class="lm-tile lm-tile--flow flex h-full gap-3 p-4">
								<PageIcon class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
								<span>
									<span class="block font-semibold">{i + 1}. {p.nav}</span>
									<span class="block text-sm text-muted-foreground">{p.summary}</span>
								</span>
							</a>
						</li>
					{/each}
				</ul>
			{/if}

			{#if parts[1]}
				<MarkdownContent html={parts[1]} />
			{/if}

			<nav aria-label="Pages voisines" class="grid gap-3 border-t pt-6 sm:grid-cols-2">
				{#if around.previous}
					<a
						href={helpHref(around.previous)}
						class="lm-tile lm-tile--flow flex min-h-11 flex-col p-4"
					>
						<span class="flex items-center gap-1 text-sm text-muted-foreground">
							<ArrowLeft class="size-4" aria-hidden="true" /> Page précédente
						</span>
						<span class="font-semibold">{around.previous.nav}</span>
					</a>
				{:else}
					<span></span>
				{/if}
				{#if around.next}
					<a
						href={helpHref(around.next)}
						class="lm-tile lm-tile--flow flex min-h-11 flex-col p-4 text-right"
					>
						<span class="flex items-center justify-end gap-1 text-sm text-muted-foreground">
							Page suivante <ArrowRight class="size-4" aria-hidden="true" />
						</span>
						<span class="font-semibold">{around.next.nav}</span>
					</a>
				{/if}
			</nav>
		</article>
	</div>
</div>
