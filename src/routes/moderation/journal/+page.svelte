<script lang="ts">
	// LINKMUSICIAN: journal de modération (P3-09), voir +page.server.ts.
	import SEO from '#lib/components/SEO.svelte';

	let { data } = $props();
	const date = (d: Date | string) =>
		new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
	const nextHref = $derived(
		data.next
			? `?${new URLSearchParams({ ...(data.family ? { famille: data.family } : {}), avant: data.next })}`
			: null
	);
	import MetroPage from '#lib/components/linkmusician/metro/MetroPage.svelte';
</script>

<SEO title="Journal de modération" noindex nofollow />

<MetroPage>
	<div class="min-h-screen w-screen px-4 py-24">
		<div class="mx-auto max-w-3xl space-y-6">
			<a
				href="/moderation"
				class="inline-flex min-h-10 items-center rounded-full border px-3 text-sm">← Modération</a
			>
			<h1 class="lm-title lm-title--sm">Journal de modération</h1>
			<p class="text-sm text-muted-foreground">
				Chaque décision de la modération : qui, quoi, sur quelle cible, et pourquoi.
			</p>

			<form method="GET" class="flex flex-wrap items-end gap-2">
				<label class="block space-y-1 text-sm font-medium">
					Type de décision
					<select name="famille" class="lm-field block">
						<option value="" selected={data.family === ''}>Toutes</option>
						{#each data.families as f (f.value)}
							<option value={f.value} selected={data.family === f.value}>{f.label}</option>
						{/each}
					</select>
				</label>
				<button class="min-h-10 rounded-md border px-3">Filtrer</button>
			</form>

			{#if data.entries.length === 0}
				<p class="text-sm text-muted-foreground">Aucune décision pour l’instant.</p>
			{:else}
				<ol class="lm-tile lm-tile--flow divide-y" aria-label="Décisions de modération">
					{#each data.entries as e (e.id)}
						<li class="space-y-1 p-3 text-sm">
							<p class="flex flex-wrap items-baseline justify-between gap-2">
								<span class="font-semibold">{e.label}</span>
								<time class="text-xs text-muted-foreground" datetime={new Date(e.at).toISOString()}
									>{date(e.at)}</time
								>
							</p>
							<p class="text-muted-foreground">
								Par {e.by} ·
								{#if e.target?.href}
									<a href={e.target.href} class="underline">{e.target.label}</a>
								{:else if e.target}
									{e.target.label}
								{:else}
									{e.targetType}
								{/if}
							</p>
							{#if e.note}<p>« {e.note} »</p>{/if}
						</li>
					{/each}
				</ol>
				{#if nextHref}
					<a
						href={nextHref}
						class="inline-flex min-h-10 items-center rounded-full border px-4 text-sm"
						>Décisions plus anciennes</a
					>
				{/if}
			{/if}
		</div>
	</div>
</MetroPage>
