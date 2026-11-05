<script lang="ts">
	// LINKMUSICIAN: réglages, voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import SEO from '#lib/components/SEO.svelte';

	let { data, form } = $props();

	$effect(() => {
		if (form?.saved) toast.success(form.saved);
	});
	const t = $derived(data.trust);
</script>

<SEO title="Réglages" noindex nofollow />

<div class="min-h-screen w-screen px-4 pt-6 pb-24">
	<div class="mx-auto max-w-lg space-y-8 rounded-lg border p-6 shadow-lg backdrop-blur-3xl">
		<div>
			<a href="/espace" class="text-sm text-muted-foreground underline">← Mon espace</a>
			<h1 class="mt-2 text-2xl font-bold">Réglages</h1>
		</div>

		<section class="space-y-3" aria-labelledby="trust-title">
			<h2 id="trust-title" class="text-lg font-semibold">Ton palier de confiance</h2>
			<p class="text-2xl font-bold">
				{data.names[t.level]}
				<span class="text-base font-normal text-muted-foreground">(niveau {t.level})</span>
			</p>
			<p class="text-sm text-muted-foreground">
				La confiance protège la communauté : elle grandit avec l'ancienneté et les échanges réels,
				jamais avec l'XP. Elle peut aussi redescendre en cas de sanction.
			</p>

			{#if t.next !== null}
				<div class="rounded-lg border p-3">
					<h3 class="mb-2 text-sm font-semibold">Pour passer {data.names[t.next]}</h3>
					<ul class="space-y-1 text-sm">
						{#each t.requirements as r (r.label)}
							<li class={r.met ? 'text-muted-foreground' : ''}>
								<span aria-hidden="true">{r.met ? '✅' : '⬜'}</span>
								{r.label}<span class="sr-only">{r.met ? ' : fait' : ' : à faire'}</span>
							</li>
						{/each}
					</ul>
				</div>
			{:else}
				<p class="text-sm">
					Tu as atteint le palier le plus haut. Merci de faire vivre la communauté !
				</p>
			{/if}
		</section>

		<section class="space-y-2" aria-labelledby="quotas-title">
			<h2 id="quotas-title" class="text-lg font-semibold">Tes limites actuelles</h2>
			<table class="w-full text-sm">
				<tbody>
					<tr class="border-b">
						<td class="py-2">{data.quotaLabels.dailyFirstMessages}</td>
						<td class="py-2 text-right font-medium">{t.permissions.dailyFirstMessages}</td>
					</tr>
					<tr class="border-b">
						<td class="py-2">{data.quotaLabels.activeOpportunities}</td>
						<td class="py-2 text-right font-medium">{t.permissions.activeOpportunities}</td>
					</tr>
					<tr class="border-b">
						<td class="py-2">{data.quotaLabels.mediaItems}</td>
						<td class="py-2 text-right font-medium">{t.permissions.mediaItems}</td>
					</tr>
					<tr class="border-b">
						<td class="py-2">Endosser un·e collaborateur·rice</td>
						<td class="py-2 text-right font-medium"
							>{t.permissions.canEndorse ? 'Oui' : 'Pas encore'}</td
						>
					</tr>
					<tr>
						<td class="py-2">Corroborer les étapes d'autres groupes</td>
						<td class="py-2 text-right font-medium">
							{t.permissions.canCorroborate ? 'Oui' : 'Pas encore'}
						</td>
					</tr>
				</tbody>
			</table>
		</section>

		<section class="space-y-3" aria-labelledby="visibility-title">
			<h2 id="visibility-title" class="text-lg font-semibold">Mon profil public</h2>
			<p class="text-sm text-muted-foreground">
				{#if data.hidden}
					Ton profil public est masqué : personne ne peut le consulter, ni tes médias.
				{:else}
					Visible à l'adresse
					<a href="/@{data.handle}" class="underline">/@{data.handle}</a>. Ton XP et ton historique
					de gains n'y apparaissent jamais.
				{/if}
			</p>
			<form method="POST" action="?/visibility" use:enhance class="space-y-3">
				<label class="flex items-center gap-2 text-sm">
					<input type="checkbox" name="hidden" checked={data.hidden} class="size-4" />
					Masquer mon profil public
				</label>
				<button type="submit" class="rounded-md border px-3 py-1.5 text-sm">Enregistrer</button>
			</form>
		</section>

		<section class="space-y-1">
			<h2 class="text-lg font-semibold">Mon compte</h2>
			<ul class="space-y-1 text-sm">
				<li><a href="/reglages/metiers" class="underline">Mes métiers</a></li>
				<li><a href="/auth/settings" class="underline">Email, mot de passe, sécurité</a></li>
			</ul>
		</section>
	</div>
</div>
