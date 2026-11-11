<script lang="ts">
	/**
	 * LINKMUSICIAN: écran « bientôt » de l'espace (P0-05b). Dit honnêtement ce
	 * qui arrive et propose ce qu'on peut déjà faire.
	 */
	import SEO from '#lib/components/SEO.svelte';
	import { Sparkles } from 'lucide-svelte';

	let {
		title,
		pitch,
		features,
		meanwhile
	}: {
		title: string;
		pitch: string;
		features: readonly string[];
		meanwhile: readonly { href: string; label: string }[];
	} = $props();
</script>

<SEO {title} noindex nofollow />

<div class="min-h-screen w-screen px-4 pt-6 pb-24">
	<section class="lm-tile lm-tile--flow mx-auto max-w-2xl space-y-6 p-6">
		<div class="space-y-2">
			<p
				class="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground uppercase"
			>
				<Sparkles class="size-3.5" aria-hidden="true" /> Bientôt
			</p>
			<h1 class="lm-title">{title}</h1>
			<p class="text-muted-foreground">{pitch}</p>
		</div>
		<div>
			<h2 class="mb-2 font-semibold">Ce qui arrive</h2>
			<ul class="list-disc space-y-1 pl-5 text-sm">
				{#each features as f (f)}<li>{f}</li>{/each}
			</ul>
		</div>
		<div>
			<h2 class="mb-2 font-semibold">En attendant</h2>
			<ul class="flex flex-wrap gap-2">
				{#each meanwhile as m (m.href)}
					<li>
						<a
							href={m.href}
							class="inline-block rounded-md border px-3 py-1.5 text-sm hover:bg-muted">{m.label}</a
						>
					</li>
				{/each}
			</ul>
		</div>
	</section>
</div>
