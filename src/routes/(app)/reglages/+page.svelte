<script lang="ts">
	// LINKMUSICIAN: réglages, voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';
	import SEO from '#lib/components/SEO.svelte';

	let { data, form } = $props();

	$effect(() => {
		if (form?.saved) toast.success(form.saved);
		if (page.url.searchParams.get('bloque') === '1') toast.success('Personne bloquée.');
	});
	const t = $derived(data.trust);
</script>

<SEO title="Réglages" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-7xl space-y-8">
		<div>
			<a href="/espace" class="text-sm text-muted-foreground underline">← Mon espace</a>
			<h1 class="lm-title mt-2">Réglages</h1>
		</div>

		<div class="grid items-start gap-5 lg:grid-cols-2">
			<section class="lm-tile lm-tile--flow space-y-3 p-5" aria-labelledby="trust-title">
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
					<div class="lm-tile lm-tile--flow p-3">
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

			<section class="lm-tile lm-tile--flow space-y-2 p-5" aria-labelledby="quotas-title">
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

			<section class="lm-tile lm-tile--flow space-y-3 p-5" aria-labelledby="visibility-title">
				<h2 id="visibility-title" class="text-lg font-semibold">Mon profil public</h2>
				<p class="text-sm text-muted-foreground">
					{#if data.hidden}
						Ton profil public est masqué : personne ne peut le consulter, ni tes médias.
					{:else}
						Visible à l'adresse
						<a href="/@{data.handle}" class="underline">/@{data.handle}</a>. Ton XP et ton
						historique de gains n'y apparaissent jamais.
					{/if}
				</p>
				<form method="POST" action="?/visibility" use:enhance class="space-y-3">
					<label class="flex items-center gap-2 text-sm">
						<input type="checkbox" name="hidden" checked={data.hidden} class="size-4" />
						Masquer mon profil public
					</label>
					<button type="submit" class="lm-btn" data-variant="ghost">Enregistrer</button>
				</form>
			</section>

			<section
				id="notifications"
				class="lm-tile lm-tile--flow scroll-mt-24 space-y-3 p-5"
				aria-labelledby="notif-title"
			>
				<h2 id="notif-title" class="text-lg font-semibold">Notifications</h2>
				<p class="text-sm text-muted-foreground">
					Choisis ce qui s'affiche sous la cloche et ce que tu reçois par email. L'email est un
					résumé : au plus un par jour, seulement quand il y a du neuf. Tes gains et tes succès
					s'annoncent aussi à ton arrivée, et tes messages gardent leur pastille.
				</p>
				<form method="POST" action="?/notifications" use:enhance class="space-y-3">
					<table class="w-full text-sm">
						<caption class="sr-only">Notifications par sujet</caption>
						<thead>
							<tr class="text-left text-xs text-muted-foreground">
								<th scope="col" class="py-2 font-medium">Sujet</th>
								<th scope="col" class="w-20 py-2 text-center font-medium">Dans l'app</th>
								<th scope="col" class="w-20 py-2 text-center font-medium">Par email</th>
							</tr>
						</thead>
						<tbody>
							{#each data.notificationPreferences as pref (pref.type)}
								<tr class="border-t">
									<th scope="row" class="py-2 pr-2 text-left font-normal">{pref.label}</th>
									<td class="text-center">
										{#if pref.inApp !== null}
											<label class="inline-flex size-11 items-center justify-center">
												<span class="sr-only">{pref.label} dans l'app</span>
												<input
													type="checkbox"
													name="inApp"
													value={pref.type}
													checked={pref.inApp}
													class="size-4"
												/>
											</label>
										{:else}
											<span class="text-muted-foreground" aria-label="Toujours dans l'app">—</span>
										{/if}
									</td>
									<td class="text-center">
										<label class="inline-flex size-11 items-center justify-center">
											<span class="sr-only">{pref.label} par email</span>
											<input
												type="checkbox"
												name="email"
												value={pref.type}
												checked={pref.email}
												class="size-4"
											/>
										</label>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
					<button type="submit" class="lm-btn" data-variant="ghost"
						>Enregistrer mes notifications</button
					>
				</form>
			</section>

			<section class="lm-tile lm-tile--flow space-y-3 p-5" aria-labelledby="blocked-title">
				<h2 id="blocked-title" class="text-lg font-semibold">Personnes bloquées</h2>
				{#if data.blocked.length === 0}
					<p class="text-sm text-muted-foreground">Tu n'as bloqué personne.</p>
				{:else}
					<ul class="space-y-2" aria-label="Personnes bloquées">
						{#each data.blocked as b (b.actorId)}
							<li class="lm-tile lm-tile--flow flex items-center justify-between gap-3 p-2 text-sm">
								<span class="truncate">{b.displayName}</span>
								<form method="POST" action="?/unblock" use:enhance>
									<input type="hidden" name="actorId" value={b.actorId} />
									<button type="submit" class="lm-btn" data-variant="ghost">Débloquer</button>
								</form>
							</li>
						{/each}
					</ul>
				{/if}
			</section>

			<section class="lm-tile lm-tile--flow space-y-1 p-5">
				<h2 class="text-lg font-semibold">Mon compte</h2>
				<ul class="space-y-1 text-sm">
					<li><a href="/reglages/metiers" class="underline">Mes métiers</a></li>
					<li><a href="/auth/settings" class="underline">Email, mot de passe, sécurité</a></li>
				</ul>
			</section>
		</div>
	</div>
</div>
