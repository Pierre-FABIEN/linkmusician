<script lang="ts">
	// LINKMUSICIAN: « Les musicos dispo autour de moi » (P2-13, D50), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import SEO from '#lib/components/SEO.svelte';
	import SubPageHeader from '#lib/components/linkmusician/SubPageHeader.svelte';
	import { AVAILABILITY_SLOTS, MAX_NOTE, SLOT_LABELS } from '#lib/jam/availability';
	import { Badge } from '#shadcn/badge';
	import { MapPin, Radio } from 'lucide-svelte';

	let { data, form } = $props();
	$effect(() => {
		if (form?.message) toast.success(form.message);
		if (form?.error) toast.error(form.error);
	});
	const until = new Intl.DateTimeFormat('fr-FR', {
		weekday: 'long',
		hour: '2-digit',
		minute: '2-digit'
	});
</script>

<SEO title="Musicos dispo autour de moi" noindex nofollow />

<div class="min-h-screen w-full bg-muted/20 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-10">
	<div class="mx-auto max-w-7xl space-y-6">
		<SubPageHeader
			backHref="/jam"
			backLabel="Mode jam"
			title="Les musicos dispo autour de moi"
			intro={data.commune
				? `Qui a envie de jouer près de ${data.commune}, et dis-le si c’est ton cas.`
				: 'Qui a envie de jouer près de chez toi, et dis-le si c’est ton cas.'}
		/>
		<div class="grid items-start gap-5 lg:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.2fr)]">
			<section
				id="dispo"
				class="scroll-mt-24 space-y-4 rounded-2xl border bg-card p-4 shadow-sm sm:p-5"
				aria-labelledby="dispo-title"
			>
				<h2 id="dispo-title" class="flex items-center gap-2 text-lg font-semibold">
					<Radio class="size-5 text-primary" aria-hidden="true" /> Je suis dispo
				</h2>
				{#if !data.canBeDispo}
					<p class="text-sm text-muted-foreground">
						Pour ta sécurité, ta disponibilité n'est pas affichée aux autres. Tu peux rejoindre les
						jams ouvertes (Jams à venir), dans des lieux publics, qui finissent avant 22 h.
					</p>
				{:else if data.mine}
					<p>
						<strong>Tu es dispo {SLOT_LABELS[data.mine.slot].toLowerCase()}</strong>, jusqu'à {until.format(
							new Date(data.mine.endsAt)
						)}.{#if data.mine.note}
							« {data.mine.note} »{/if}
					</p>
					<form method="POST" action="?/pasDispo" use:enhance>
						<button class="min-h-11 rounded-xl border px-4 font-semibold"
							>Je ne suis plus dispo</button
						>
					</form>
				{:else}
					<p class="text-sm text-muted-foreground">
						Fais savoir aux musicien·nes autour de toi que tu as envie de jouer. Ça s'éteint tout
						seul à la fin du créneau.
					</p>
					<form method="POST" action="?/dispo" use:enhance class="space-y-3">
						<fieldset class="flex flex-wrap gap-2">
							<legend class="sr-only">Quand ?</legend>
							{#each AVAILABILITY_SLOTS as s, i (s)}
								<label
									class="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 has-[:checked]:border-primary has-[:checked]:bg-primary/10"
								>
									<input type="radio" name="slot" value={s} checked={i === 0} class="size-4" />
									{SLOT_LABELS[s]}
								</label>
							{/each}
						</fieldset>
						<label class="block space-y-1 text-sm font-medium">
							Ton envie (facultatif)
							<input
								name="note"
								maxlength={MAX_NOTE}
								placeholder="Envie d'un bœuf funk, j'ai ma basse"
								class="w-full rounded-md border bg-background p-2"
							/>
						</label>
						<button
							type="submit"
							class="min-h-11 rounded-xl bg-primary px-5 font-semibold text-primary-foreground"
							>Je suis dispo</button
						>
					</form>
				{/if}
			</section>

			{#if data.commune}
				<section id="dispos" class="scroll-mt-24 space-y-4" aria-labelledby="available-title">
					<div>
						<p class="text-sm font-semibold uppercase tracking-wide text-primary">Rencontres</p>
						<h2 id="available-title" class="text-xl font-bold">Dispos autour de toi</h2>
					</div>
					{#if data.available.length === 0}
						<p class="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
							Personne n'est dispo pour l'instant. Mets-toi dispo : tu seras peut-être le déclic !
						</p>
					{:else}
						<ul class="grid gap-3 sm:grid-cols-2" aria-label="Musicien·nes dispos">
							{#each data.available as a (a.handle)}
								<li class="space-y-2 rounded-2xl border bg-card p-4">
									<div class="flex items-start justify-between gap-2">
										<a href="/@{a.handle}" class="font-bold hover:underline">{a.displayName}</a>
										<Badge variant="secondary">{SLOT_LABELS[a.slot]}</Badge>
									</div>
									{#if a.instruments.length > 0}<p class="text-sm">
											{a.instruments.join(' · ')}
										</p>{/if}
									{#if a.note}<p class="text-sm italic">« {a.note} »</p>{/if}
									<p class="flex items-center gap-1 text-xs text-muted-foreground">
										<MapPin class="size-3" aria-hidden="true" />{a.distance}{a.commune
											? ` · ${a.commune}`
											: ''}
									</p>
									<a
										href="/messages/nouveau?a={a.handle}"
										class="inline-flex min-h-11 items-center rounded-xl border px-3 text-sm font-semibold"
										>Lui proposer de jouer</a
									>
								</li>
							{/each}
						</ul>
					{/if}
				</section>
			{:else}
				<p class="rounded-2xl border bg-card p-6 text-center">
					Indique ta ville pour voir les musicien·nes dispos près de chez toi.
					<a href="/profil/ville" class="block pt-2 font-semibold underline">Indiquer ma ville</a>
				</p>
			{/if}
		</div>
	</div>
</div>
