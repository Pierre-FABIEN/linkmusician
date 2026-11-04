<script lang="ts">
	// LINKMUSICIAN: navigation du laboratoire de maquettes (P1-02).
	import { page } from '$app/state';
	import SEO from '#lib/components/SEO.svelte';

	let { children } = $props();
	const links = [
		{ href: '/_lab', label: 'Composants' },
		{ href: '/_lab/onboarding', label: 'Onboarding' },
		{ href: '/_lab/premier-resultat', label: 'Premier résultat' },
		{ href: '/_lab/tableau-de-bord', label: 'Tableau de bord' },
		{ href: '/_lab/profil', label: 'Profil public' },
		{ href: '/_lab/etats-vides', label: 'États vides' }
	];
</script>

<SEO title="Maquettes" noindex nofollow />

<div class="min-h-screen w-screen px-4 pt-24 pb-16">
	<div class="mx-auto max-w-5xl space-y-8">
		<header class="space-y-3">
			<p class="text-xs font-semibold tracking-widest text-fuchsia-600 uppercase">
				Maquettes · données fictives · P1-02
			</p>
			<nav aria-label="Maquettes" class="flex flex-wrap gap-2">
				{#each links as l (l.href)}
					<a
						href={l.href}
						class="rounded-full border px-3 py-1 text-sm transition {page.url.pathname === l.href
							? 'border-transparent bg-foreground text-background'
							: 'hover:border-fuchsia-400'}">{l.label}</a
					>
				{/each}
			</nav>
		</header>
		{@render children()}
	</div>
</div>
