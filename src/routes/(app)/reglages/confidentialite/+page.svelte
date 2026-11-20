<script lang="ts">
	// LINKMUSICIAN: confidentialité de mes jams (D81), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import SEO from '#lib/components/SEO.svelte';
	import { ShieldCheck } from 'lucide-svelte';
	import type { ActivityShareValue } from '#lib/privacy/activities';

	let { data, form } = $props();

	$effect(() => {
		if (form?.message) toast.success(form.message);
		if (form?.error) toast.error(form.error);
	});

	const s = $derived(data.settings);
	// Valeurs enregistrées, modifiables localement avant d'enregistrer.
	let past = $derived<ActivityShareValue>(s.past);
	let future = $derived<ActivityShareValue>(s.future);
	const wantsPublic = $derived(past === 'PUBLIC' || future === 'PUBLIC');
	const shares = $derived(
		(['PRIVATE', 'SELECTED', 'PUBLIC'] as const).filter((v) => v !== 'PUBLIC' || s.canBePublic)
	);
	const field = 'lm-field w-full';
</script>

<SEO title="Confidentialité de mes jams" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-3xl space-y-6">
		<div class="space-y-2">
			<a href="/reglages" class="text-sm text-muted-foreground underline">← Réglages</a>
			<h1 class="lm-title">Confidentialité de mes jams</h1>
			<p class="text-sm text-muted-foreground">
				Tu partages ta musique, pas tes déplacements. Par défaut, personne ne voit à quelles jams tu
				vas ni où tu étais. Tu choisis qui le voit, et tu peux changer d’avis à tout moment.
			</p>
		</div>

		<section class="lm-tile lm-tile--flow space-y-4 p-4" aria-labelledby="modes-title">
			<h2 id="modes-title" class="flex items-center gap-2 text-lg font-semibold">
				<ShieldCheck class="size-5" aria-hidden="true" /> Qui voit mes jams
			</h2>
			<form method="POST" action="?/modes" use:enhance class="space-y-4">
				<label class="block space-y-1 font-medium">
					Mes jams passées (« J’y étais », mon carnet)
					<select name="past" bind:value={past} class={field}>
						{#each shares as v (v)}<option value={v}>{data.labels[v]}</option>{/each}
					</select>
				</label>
				<label class="block space-y-1 font-medium">
					Mes jams à venir (« Je viens », la formation)
					<select name="future" bind:value={future} class={field}>
						{#each shares as v (v)}<option value={v}>{data.labels[v]}</option>{/each}
					</select>
					<span class="block text-sm font-normal text-muted-foreground"
						>Partager tes jams passées ne partage jamais tes jams à venir.</span
					>
				</label>
				{#if wantsPublic}
					<label class="flex items-start gap-2 text-sm">
						<input type="checkbox" name="publicConsent" class="mt-1 size-5" required />
						<span
							>Je comprends que <strong>tous les membres</strong> pourront voir à quelles jams je vais,
							ou je suis allé·e, et donc savoir où je suis.</span
						>
					</label>
				{/if}
				<button type="submit" class="lm-btn">Enregistrer</button>
			</form>
			{#if !s.canBePublic}
				<p class="text-sm text-muted-foreground">
					Pour ta sécurité, le partage avec tous les membres n’est pas proposé avant 18 ans.
				</p>
			{/if}
		</section>

		<section class="lm-tile lm-tile--flow space-y-3 p-4" aria-labelledby="grants-title">
			<h2 id="grants-title" class="text-lg font-semibold">Personnes que j’autorise</h2>
			<p class="text-sm text-muted-foreground">
				Elles voient tes jams quand tu as choisi « {data.labels.SELECTED} ». Ajouter quelqu’un à tes contacts
				ne lui donne jamais cet accès.
			</p>
			<form method="POST" action="?/grant" use:enhance class="flex flex-wrap items-end gap-2">
				<label class="min-w-0 flex-1 space-y-1 text-sm font-medium">
					Identifiant
					<input name="handle" required placeholder="@identifiant" class={field} />
				</label>
				<button type="submit" class="lm-btn">Autoriser</button>
			</form>
			{#if s.grants.length > 0}
				<ul class="space-y-2" aria-label="Personnes autorisées">
					{#each s.grants as g (g.id)}
						<li class="flex flex-wrap items-center justify-between gap-2">
							<a href="/@{g.handle}" class="underline">{g.displayName}</a>
							<form method="POST" action="?/revoke" use:enhance>
								<input type="hidden" name="actorId" value={g.id} />
								<button class="lm-btn" data-variant="ghost">Retirer</button>
							</form>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section class="lm-tile lm-tile--flow space-y-3 p-4" aria-labelledby="exclusions-title">
			<h2 id="exclusions-title" class="text-lg font-semibold">Masquer mes jams à une personne</h2>
			<p class="text-sm text-muted-foreground">
				Elle ne verra jamais tes jams, quel que soit ton partage, même sur place. Vous pouvez
				toujours vous écrire, et elle n’est pas prévenue.
			</p>
			<form method="POST" action="?/exclude" use:enhance class="flex flex-wrap items-end gap-2">
				<label class="min-w-0 flex-1 space-y-1 text-sm font-medium">
					Identifiant
					<input name="handle" required placeholder="@identifiant" class={field} />
				</label>
				<button type="submit" class="lm-btn">Masquer</button>
			</form>
			{#if s.exclusions.length > 0}
				<ul class="space-y-2" aria-label="Personnes à qui mes jams sont masquées">
					{#each s.exclusions as e (e.id)}
						<li class="flex flex-wrap items-center justify-between gap-2">
							<span>{e.displayName}</span>
							<form method="POST" action="?/include" use:enhance>
								<input type="hidden" name="actorId" value={e.id} />
								<button class="lm-btn" data-variant="ghost">Ne plus masquer</button>
							</form>
						</li>
					{/each}
				</ul>
			{/if}
			<p class="text-sm">
				Pour couper tout contact, <a href="/reglages#blocked-title" class="font-semibold underline"
					>bloque la personne</a
				> : vous ne vous verrez plus du tout.
			</p>
		</section>
	</div>
</div>
