<script lang="ts">
	/**
	 * LINKMUSICIAN: une page du centre d'aide (`/aide`). Le contenu est du
	 * HTML rendu côté serveur depuis `src/lib/aide/pages/*.md` (contenu du
	 * dépôt, jamais saisi par un·e utilisateur·rice).
	 */
	import { get } from 'svelte/store';
	import { afterNavigate, replaceState } from '$app/navigation';
	import SEO from '#lib/components/SEO.svelte';
	import SmoothScrollBarStore from '#lib/store/SmoothScrollBarStore';
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

	// Ancres : la page défile dans `smooth-scrollbar` (boilerplate), qui ne
	// suit pas les ancres du navigateur. On fait défiler jusqu'au titre et on
	// y place le focus (lecteurs d'écran, clavier).
	function scrollToId(id: string) {
		const target = document.getElementById(id);
		if (!target) return;
		const bar = get(SmoothScrollBarStore).smoothScroll;
		if (bar) {
			// Le contenu est positionné en absolu : on recalcule la hauteur
			// défilable avant de viser le titre.
			bar.update();
			const top =
				bar.scrollTop +
				target.getBoundingClientRect().top -
				bar.containerEl.getBoundingClientRect().top -
				24;
			bar.scrollTo(0, Math.max(0, top), 300);
		} else target.scrollIntoView();
		target.setAttribute('tabindex', '-1');
		target.focus({ preventScroll: true });
	}

	let article = $state<HTMLElement>();
	$effect(() => {
		const root = article;
		if (!root) return;
		const onClick = (event: MouseEvent) => {
			const link = (event.target as HTMLElement).closest('a');
			if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey) return;
			const url = new URL(link.href);
			if (url.pathname !== location.pathname || !url.hash) return;
			event.preventDefault();
			replaceState(url.hash, {});
			scrollToId(decodeURIComponent(url.hash.slice(1)));
		};
		root.addEventListener('click', onClick);
		return () => root.removeEventListener('click', onClick);
	});

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

		<article class="min-w-0 space-y-6" bind:this={article}>
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
				<h1 class="text-3xl font-black tracking-tight sm:text-4xl">{help.title}</h1>
				{#if help.lead}<p class="text-lg text-muted-foreground">{help.lead}</p>{/if}
			</header>

			{#if !home && help.toc.length > 2}
				<nav aria-label="Sur cette page" class="rounded-2xl border bg-card p-4 text-sm">
					<p class="mb-2 font-semibold">Sur cette page</p>
					<ul class="flex flex-wrap gap-2">
						{#each help.toc as t (t.id)}
							<li>
								<a
									href="#{t.id}"
									class="inline-flex min-h-11 items-center rounded-full border px-3 hover:bg-muted"
									>{t.text}</a
								>
							</li>
						{/each}
					</ul>
				</nav>
			{/if}

			<div class="aide-content">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- contenu du dépôt, rendu côté serveur -->
				{@html parts[0]}
			</div>

			{#if home}
				<ul class="grid gap-3 sm:grid-cols-2" aria-label="Toutes les pages de l’aide">
					{#each others as p, i (p.file)}
						{@const PageIcon = ICONS[p.icon]}
						<li>
							<a
								href={helpHref(p)}
								class="flex h-full gap-3 rounded-2xl border bg-card p-4 hover:border-primary"
							>
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
				<div class="aide-content">
					<!-- eslint-disable-next-line svelte/no-at-html-tags -- contenu du dépôt, rendu côté serveur -->
					{@html parts[1]}
				</div>
			{/if}

			<nav aria-label="Pages voisines" class="grid gap-3 border-t pt-6 sm:grid-cols-2">
				{#if around.previous}
					<a
						href={helpHref(around.previous)}
						class="flex min-h-11 flex-col rounded-2xl border p-4 hover:border-primary"
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
						class="flex min-h-11 flex-col rounded-2xl border p-4 text-right hover:border-primary"
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

<style>
	.aide-content {
		--aide-tip: oklch(0.75 0.15 75);
		--aide-warning: var(--destructive);
		--aide-soon: oklch(0.6 0.15 250);
		--aide-brief: oklch(0.55 0.2 285);
		line-height: 1.65;
	}
	.aide-content :global(h2) {
		margin: 2.5rem 0 0.75rem;
		font-size: 1.5rem;
		font-weight: 800;
		line-height: 1.25;
		scroll-margin-top: 1.5rem;
	}
	.aide-content :global(h3) {
		margin: 1.75rem 0 0.5rem;
		font-size: 1.15rem;
		font-weight: 700;
		scroll-margin-top: 1.5rem;
	}
	.aide-content :global(p),
	.aide-content :global(ul),
	.aide-content :global(ol) {
		margin: 0.75rem 0;
	}
	.aide-content :global(ul) {
		list-style: disc;
		padding-left: 1.25rem;
	}
	.aide-content :global(ol) {
		list-style: decimal;
		padding-left: 1.5rem;
	}
	.aide-content :global(li) {
		margin: 0.35rem 0;
	}
	.aide-content :global(a) {
		text-decoration: underline;
		text-underline-offset: 2px;
		font-weight: 500;
	}
	.aide-content :global(strong) {
		font-weight: 700;
	}
	.aide-content :global(code) {
		border-radius: 0.375rem;
		background: var(--muted);
		padding: 0.1rem 0.35rem;
		font-size: 0.9em;
	}
	.aide-content :global(.aide-table) {
		margin: 1rem 0;
		overflow-x: auto;
		border: 1px solid var(--border);
		border-radius: 1rem;
	}
	.aide-content :global(table) {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.925rem;
	}
	.aide-content :global(th) {
		background: var(--muted);
		text-align: left;
		font-weight: 700;
	}
	.aide-content :global(th),
	.aide-content :global(td) {
		padding: 0.6rem 0.8rem;
		vertical-align: top;
		border-bottom: 1px solid var(--border);
	}
	.aide-content :global(tr:last-child td) {
		border-bottom: 0;
	}
	.aide-content :global(.aide-callout) {
		margin: 1.25rem 0;
		border-radius: 1rem;
		border-left: 4px solid var(--aide-color);
		background: color-mix(in oklch, var(--aide-color) 10%, var(--card));
		padding: 0.25rem 1rem;
	}
	.aide-content :global(.aide-brief) {
		--aide-color: var(--aide-brief);
		padding: 0.75rem 1.25rem;
	}
	.aide-content :global(.aide-callout-title) {
		margin-bottom: 0.25rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-size: 0.8rem;
	}
	.aide-content :global(.aide-tip) {
		--aide-color: var(--aide-tip);
	}
	.aide-content :global(.aide-warning) {
		--aide-color: var(--aide-warning);
	}
	.aide-content :global(.aide-soon) {
		--aide-color: var(--aide-soon);
	}
	.aide-content :global(details) {
		margin: 0.5rem 0;
		border: 1px solid var(--border);
		border-radius: 1rem;
		background: var(--card);
		padding: 0 1rem;
	}
	.aide-content :global(summary) {
		display: flex;
		min-height: 2.75rem;
		cursor: pointer;
		align-items: center;
		font-weight: 600;
	}
	.aide-content :global(details[open] summary) {
		border-bottom: 1px solid var(--border);
	}
</style>
