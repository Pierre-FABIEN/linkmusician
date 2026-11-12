<script lang="ts">
	// LINKMUSICIAN: animateur·rices d'un lieu (P5-04b), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import SEO from '#lib/components/SEO.svelte';
	import { MapPin } from 'lucide-svelte';
	import { LEAD_SUGGESTION_RADIUS_KM } from '#lib/jam/venueHosts';

	let { data, form } = $props();
	const input = 'w-full rounded-md border bg-background p-2 text-sm font-normal';
	const pill = 'min-h-11 rounded-full border px-4 text-sm font-semibold hover:bg-muted';

	$effect(() => {
		if (form?.message) toast.success(form.message);
		if (form?.error) toast.error(form.error);
	});
	const active = $derived(data.hosts.filter((h) => h.active));
	const invited = $derived(data.hosts.filter((h) => !h.active));
</script>

<SEO title="Animation · {data.venue.name}" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-3xl space-y-8 rounded-3xl border bg-card p-5 shadow-sm sm:p-8 lg:p-10">
		<div class="space-y-2">
			<a href="/lieux/{data.venue.id}/gerer" class="text-sm text-muted-foreground underline"
				>← Gérer {data.venue.name}</a
			>
			<h1 class="text-3xl font-black tracking-tight sm:text-4xl">Qui anime tes scènes ouvertes</h1>
			<p class="text-sm text-muted-foreground">
				Une animatrice ou un animateur accueille les musicien·nes et compose les plateaux de la
				soirée. Ça ne lui donne pas la gestion du lieu.
			</p>
		</div>

		<section class="space-y-3" aria-labelledby="hosts-title">
			<h2 id="hosts-title" class="text-xl font-bold">Animateur·rices</h2>
			{#if data.hosts.length === 0}
				<p class="text-sm text-muted-foreground">
					Personne pour l’instant. Invite une des personnes suggérées plus bas.
				</p>
			{:else}
				<ul class="space-y-2" aria-label="Animateur·rices du lieu">
					{#each [...active, ...invited] as h (h.hostId)}
						<li
							class="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-sm"
						>
							<span>
								<a href="/@{h.handle}" class="font-semibold hover:underline">{h.displayName}</a>
								{#if !h.active}<span class="text-muted-foreground"> · invitation envoyée</span>{/if}
							</span>
							<form method="POST" action="?/remove" use:enhance>
								<input type="hidden" name="hostId" value={h.hostId} />
								<button class={pill}
									>{h.active ? 'Retirer' : 'Annuler l’invitation'}<span class="sr-only">
										: {h.displayName}</span
									></button
								>
							</form>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		{#if data.series.length > 0}
			<section class="space-y-3" aria-labelledby="leads-title">
				<div class="space-y-1">
					<h2 id="leads-title" class="text-xl font-bold">Lead de chaque scène ouverte</h2>
					<p class="text-sm text-muted-foreground">
						La personne choisie mène toutes les prochaines soirées. Tu peux toujours changer le lead
						d’une soirée depuis sa page.
					</p>
				</div>
				{#if active.length === 0}
					<p class="text-sm text-muted-foreground">
						Il faut d’abord qu’une personne invitée accepte d’animer.
					</p>
				{:else}
					<ul class="space-y-2">
						{#each data.series as s (s.id)}
							<li class="rounded-xl border p-3">
								<form
									method="POST"
									action="?/setLead"
									use:enhance={() =>
										async ({ update }) =>
											update({ reset: false })}
									class="flex flex-wrap items-end gap-3"
								>
									<input type="hidden" name="seriesId" value={s.id} />
									<label class="block min-w-48 flex-1 space-y-1 text-sm font-medium">
										{s.title} <span class="font-normal text-muted-foreground">({s.label})</span>
										<select name="handle" class={input} value={s.lead?.handle ?? ''}>
											<option value="">Pas de lead par défaut</option>
											{#each active as h (h.hostId)}
												<option value={h.handle}>{h.displayName}</option>
											{/each}
										</select>
									</label>
									<button class={pill}>Enregistrer<span class="sr-only"> : {s.title}</span></button>
								</form>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{/if}

		<section class="space-y-3" aria-labelledby="suggestions-title">
			<div class="space-y-1">
				<h2 id="suggestions-title" class="text-xl font-bold">Suggestions autour du lieu</h2>
				<p class="text-sm text-muted-foreground">
					Des personnes prêtes à organiser des jams, à moins de {LEAD_SUGGESTION_RADIUS_KM} km de {data
						.venue.communeName}, d’abord celles que d’autres musicien·nes ont appréciées. Elles
					seules reçoivent ton invitation.
				</p>
			</div>
			{#if form?.inviteError}
				<p role="alert" class="rounded-md border border-destructive p-3 text-sm text-destructive">
					{form.inviteError}
				</p>
			{/if}
			{#if data.suggestions.length === 0}
				<p class="rounded-xl border bg-muted/40 p-3 text-sm">
					Personne autour pour l’instant. Si tu connais quelqu’un, invite cette personne par son nom
					d’utilisateur ci-dessous.
				</p>
			{:else}
				<ul class="grid gap-3 sm:grid-cols-2" aria-label="Suggestions d’animateur·rices">
					{#each data.suggestions as p (p.handle)}
						<li class="flex flex-col justify-between gap-3 rounded-xl border p-3 text-sm">
							<div class="space-y-1">
								<a href="/@{p.handle}" class="font-semibold hover:underline">{p.displayName}</a>
								{#if p.instruments.length > 0}
									<p class="text-muted-foreground">{p.instruments.join(', ')}</p>
								{/if}
								<p class="flex items-center gap-1 text-muted-foreground">
									<MapPin class="size-3.5" aria-hidden="true" />
									{p.commune ? `${p.commune}, ` : ''}{p.distance}
								</p>
								<p>{p.facts}</p>
							</div>
							<form method="POST" action="?/invite" use:enhance>
								<input type="hidden" name="handle" value={p.handle} />
								<button
									class="min-h-11 w-full rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
									>Inviter à animer<span class="sr-only"> : {p.displayName}</span></button
								>
							</form>
						</li>
					{/each}
				</ul>
			{/if}
			<form method="POST" action="?/invite" use:enhance class="flex flex-wrap items-end gap-2">
				<label class="block min-w-48 flex-1 space-y-1 text-sm font-medium">
					Inviter par nom d’utilisateur
					<input
						name="handle"
						required
						placeholder="@nom"
						autocomplete="off"
						value={form?.handle ?? ''}
						class={input}
					/>
				</label>
				<button class={pill}>Inviter</button>
			</form>
		</section>
	</div>
</div>
