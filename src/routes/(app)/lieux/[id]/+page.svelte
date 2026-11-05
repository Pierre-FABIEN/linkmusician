<script lang="ts">
	// LINKMUSICIAN: fiche d'un lieu (P2-14a), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import SEO from '#lib/components/SEO.svelte';
	import { MapPin } from 'lucide-svelte';
	import { REPORT_REASONS, REPORT_REASON_LABELS, MAX_REPORT_DETAILS } from '#lib/moderation/rules';

	let { data, form } = $props();
	const day = new Intl.DateTimeFormat('fr-FR', {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit',
		timeZone: 'Europe/Paris'
	});

	$effect(() => {
		if (data.added) toast.success('Lieu ajouté à l’annuaire. Merci !');
	});
	$effect(() => {
		if (form?.message) toast.success(form.message);
		if (form?.error) toast.error(form.error);
	});
</script>

<SEO title={data.venue.name} noindex nofollow />

<div class="min-h-screen w-screen px-4 pt-6 pb-24">
	<article class="mx-auto max-w-2xl space-y-6">
		<div class="space-y-2">
			<a href="/lieux" class="text-sm text-muted-foreground underline">← Lieux de jam</a>
			<h1 class="text-3xl font-black tracking-tight">{data.venue.name}</h1>
			<p class="flex items-center gap-1 text-muted-foreground">
				<MapPin class="size-4" aria-hidden="true" />
				{data.venue.kindLabel} · {data.venue.communeName} ({data.venue.departmentCode})
			</p>
		</div>

		<section class="space-y-2 rounded-2xl border bg-card p-4" aria-labelledby="jams-title">
			<h2 id="jams-title" class="text-lg font-semibold">Jams à venir</h2>
			{#if data.jams.length === 0}
				<p class="text-sm text-muted-foreground">Pas de jam prévue ici pour l’instant.</p>
			{:else}
				<ul class="space-y-2">
					{#each data.jams as j (j.id)}
						<li>
							<a href="/jams/{j.id}" class="block rounded-xl border p-3 hover:border-primary">
								<span class="block font-semibold">{j.title}</span>
								<span class="text-sm text-muted-foreground"
									>{day.format(new Date(j.startsAt))} · {j.coming} vien{j.coming > 1
										? 'nent'
										: 't'}</span
								>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
			<a href="/jams/nouvelle?lieu={data.venue.id}" class="inline-block font-semibold underline"
				>Publier une jam ici</a
			>
		</section>

		{#if !data.venue.claimed}
			<p class="text-sm text-muted-foreground">
				Fiche ajoutée par un membre. Le lieu pourra la reprendre à son compte quand les comptes
				lieux arriveront.
			</p>
		{/if}

		<details class="rounded-lg border p-3 text-sm">
			<summary class="cursor-pointer text-muted-foreground">Signaler ce lieu</summary>
			<form method="POST" action="?/report" use:enhance class="mt-3 space-y-3">
				<label class="block space-y-1 font-medium">
					Motif
					<select name="reason" required class="w-full rounded-md border bg-background p-2">
						<option value="">—</option>
						{#each REPORT_REASONS as r (r)}<option value={r}>{REPORT_REASON_LABELS[r]}</option
							>{/each}
					</select>
				</label>
				<label class="block space-y-1 font-medium">
					Précisions (facultatif)
					<textarea
						name="details"
						rows="3"
						maxlength={MAX_REPORT_DETAILS}
						placeholder="Par exemple : c'est un domicile, ce lieu n'existe pas"
						class="w-full rounded-md border bg-background p-2"
					></textarea>
				</label>
				<button type="submit" class="rounded-md border px-3 py-1.5">Envoyer le signalement</button>
			</form>
		</details>
	</article>
</div>
