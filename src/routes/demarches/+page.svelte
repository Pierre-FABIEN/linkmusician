<script lang="ts">
	// LINKMUSICIAN: guide des démarches (P3-15a), voir +page.server.ts.
	import SEO from '#lib/components/SEO.svelte';
	import { seoConfig } from '#lib/seo.config';
	import { FileText } from 'lucide-svelte';

	let { data } = $props();
</script>

<SEO
	title="Démarches"
	description="Protéger un morceau, être payé·e pour un concert, l’association du groupe : l’essentiel, expliqué simplement."
	url={`${seoConfig.site.url}/demarches`}
/>

<div class="min-h-screen w-full px-4 {data.memberShell ? 'pt-6 pb-24' : 'py-24'}">
	<div class="mx-auto max-w-3xl space-y-8">
		<header class="space-y-3">
			<span
				class="inline-flex size-12 items-center justify-center rounded-2xl bg-muted"
				aria-hidden="true"
			>
				<FileText class="size-6" />
			</span>
			<h1 class="text-3xl font-black tracking-tight sm:text-4xl">Démarches</h1>
			<p class="text-lg text-muted-foreground">
				Protéger un morceau, être payé·e pour jouer, monter l’association du groupe : l’essentiel,
				au moment où la question se pose.
			</p>
		</header>

		{#each data.groups as group (group.label)}
			<section class="space-y-3" aria-labelledby="moment-{group.label}">
				<h2 id="moment-{group.label}" class="text-xl font-bold">{group.label}</h2>
				<ul class="grid gap-3 sm:grid-cols-2">
					{#each group.fiches as f (f.slug)}
						<li>
							<a
								href="/demarches/{f.slug}"
								class="flex h-full flex-col gap-1 rounded-2xl border bg-card p-4 hover:border-primary"
							>
								<span class="font-semibold">{f.title}</span>
								<span class="text-sm text-muted-foreground">{f.summary}</span>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/each}

		<p class="border-t pt-6 text-sm text-muted-foreground">
			Ces fiches donnent une information générale, pas un conseil personnalisé. Chacune cite ses
			sources et la date de sa dernière vérification. LinkMusician n’a de partenariat avec aucun des
			organismes cités.
		</p>
	</div>
</div>
