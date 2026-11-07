<script lang="ts">
	// LINKMUSICIAN: feuille de route de la startup, voir +page.server.ts. Le
	// texte se modifie dans `docs/lancement/README.md`.
	import MarkdownContent from '#lib/components/linkmusician/aide/MarkdownContent.svelte';
	import { anchorLinks } from '#lib/components/linkmusician/aide/anchors';
	import { Rocket } from 'lucide-svelte';

	let { data } = $props();
	const roadmap = $derived(data.roadmap);
</script>

<svelte:head><title>Lancement de la startup · Administration</title></svelte:head>

<div class="mx-auto max-w-4xl space-y-6 p-6" use:anchorLinks>
	<header class="space-y-3">
		<span
			class="inline-flex size-12 items-center justify-center rounded-2xl bg-muted"
			aria-hidden="true"
		>
			<Rocket class="size-6" />
		</span>
		<h1 class="text-3xl font-black tracking-tight sm:text-4xl">{roadmap.title}</h1>
		{#if roadmap.lead}<p class="text-lg text-muted-foreground">{roadmap.lead}</p>{/if}
		<p class="text-sm text-muted-foreground">
			Document interne, réservé à l’administration. Il se met à jour dans
			<code>docs/lancement/README.md</code>.
		</p>
	</header>

	<nav aria-label="Sur cette page" class="rounded-2xl border bg-card p-4 text-sm">
		<p class="mb-2 font-semibold">Sur cette page</p>
		<ul class="flex flex-wrap gap-2">
			{#each roadmap.toc as t (t.id)}
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

	<MarkdownContent html={roadmap.html} />
</div>
