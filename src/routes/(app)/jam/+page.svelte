<script lang="ts">
	// LINKMUSICIAN: mode jam (P2-12), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import SEO from '#lib/components/SEO.svelte';
	import NextStep from '#lib/components/linkmusician/NextStep.svelte';
	import { AVAILABILITY_SLOTS, MAX_NOTE, SLOT_LABELS } from '#lib/jam/availability';
	import { Badge } from '#shadcn/badge';
	import { Guitar, MapPin, Plus, Radio, Users } from 'lucide-svelte';

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
	const day = new Intl.DateTimeFormat('fr-FR', {
		weekday: 'short',
		day: 'numeric',
		month: 'short'
	});
</script>

<SEO title="Mode jam" noindex nofollow />

<div class="min-h-screen w-screen px-4 pt-6 pb-24">
	<div class="mx-auto max-w-3xl space-y-6">
		<header
			class="space-y-3 rounded-3xl bg-gradient-to-br from-orange-600 to-pink-600 p-6 text-white shadow-xl"
		>
			<p class="flex items-center gap-2 text-sm font-bold uppercase">
				<Guitar class="size-5" aria-hidden="true" /> Mode jam
			</p>
			<h1 class="text-3xl font-black tracking-tight">Envie de jouer ?</h1>
			<p class="text-white/90">
				Pas de projet, pas de pression : des jams{data.commune ? ` autour de ${data.commune}` : ''} et
				des rencontres musicales.
			</p>
			<a
				href="/jams/nouvelle"
				class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 font-bold text-pink-700"
			>
				<Plus class="size-4" aria-hidden="true" /> Lancer une jam
			</a>
		</header>

		{#if data.invites.length > 0}
			<section
				class="space-y-3 rounded-2xl border-2 border-primary bg-card p-4"
				aria-labelledby="invites-title"
			>
				<h2 id="invites-title" class="text-lg font-semibold">
					On t’invite à jouer ({data.invites.length})
				</h2>
				<ul class="space-y-2">
					{#each data.invites as j (j.id)}
						<li>
							<a href="/jams/{j.id}" class="block rounded-xl border p-3 hover:border-primary">
								<span class="block font-semibold">{j.title}</span>
								<span class="text-sm text-muted-foreground"
									>{day.format(new Date(j.startsAt))} · {j.venue.name} · Répondre</span
								>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<NextStep {...data.nextStep} tone="jam" />

		<section
			id="dispo"
			class="scroll-mt-24 space-y-3 rounded-2xl border bg-card p-4"
			aria-labelledby="dispo-title"
		>
			<h2 id="dispo-title" class="flex items-center gap-2 text-lg font-semibold">
				<Radio class="size-5 text-primary" aria-hidden="true" /> Je suis dispo
			</h2>
			{#if !data.canBeDispo}
				<p class="text-sm text-muted-foreground">
					Pour ta sécurité, ta disponibilité n'est pas affichée aux autres. Tu peux rejoindre les
					jams ouvertes ci-dessous, dans des lieux publics, qui finissent avant 22 h.
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
					Fais savoir aux musicien·nes autour de toi que tu as envie de jouer. Ça s'éteint tout seul
					à la fin du créneau.
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
			<section id="dispos" class="scroll-mt-24 space-y-3" aria-labelledby="available-title">
				<h2 id="available-title" class="text-lg font-semibold">Dispos autour de toi</h2>
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
		{/if}

		<section id="jams" class="scroll-mt-24 space-y-3" aria-labelledby="jams-title">
			<h2 id="jams-title" class="text-lg font-semibold">Jams à venir autour de toi</h2>
			{#if !data.commune}
				<p class="rounded-2xl border bg-card p-6 text-center">
					Indique ta ville pour voir les jams près de chez toi.
					<a href="/profil/ville" class="block pt-2 font-semibold underline">Indiquer ma ville</a>
				</p>
			{:else if data.jams.length === 0}
				<p class="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
					Pas encore de jam prévue près de toi. Publie la première !
				</p>
			{:else}
				<ul class="space-y-3" aria-label="Jams à venir">
					{#each data.jams as j (j.id)}
						<li>
							<a
								href="/jams/{j.id}"
								class="block space-y-1 rounded-2xl border bg-card p-4 transition hover:border-primary hover:shadow-md"
							>
								<span class="flex flex-wrap items-center gap-2">
									<span class="text-lg font-bold">{j.title}</span>
									<Badge variant="outline">{day.format(new Date(j.startsAt))}</Badge>
								</span>
								<span class="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
									<span class="inline-flex items-center gap-1"
										><MapPin class="size-3.5" aria-hidden="true" />{j.venue.name} · {j.venue
											.communeName}</span
									>
									<span class="inline-flex items-center gap-1"
										><Users class="size-3.5" aria-hidden="true" />{j.coming} vien{j.coming > 1
											? 'nent'
											: 't'}</span
									>
									{#if j.imComing}<span class="font-semibold text-primary">Tu viens</span>{/if}
								</span>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section id="lieux" class="scroll-mt-24 space-y-3" aria-labelledby="venues-title">
			<div class="flex flex-wrap items-baseline justify-between gap-2">
				<h2 id="venues-title" class="text-lg font-semibold">Lieux de jam</h2>
				<a href="/lieux" class="text-sm font-semibold underline">Tous les lieux</a>
			</div>
			{#if data.venues.length === 0}
				<p class="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
					Bars, cafés-concerts, MJC, locaux de répète… Ajoute le lieu où tu aimes jouer : les autres
					le trouveront.
					<a href="/lieux/nouveau" class="block pt-2 font-semibold underline">Ajouter un lieu</a>
				</p>
			{:else}
				<ul class="grid gap-3 sm:grid-cols-3" aria-label="Lieux de jam autour de toi">
					{#each data.venues as v (v.id)}
						<li>
							<a
								href="/lieux/{v.id}"
								class="block rounded-2xl border bg-card p-4 transition hover:border-primary"
							>
								<span class="block font-semibold">{v.name}</span>
								<span class="text-sm text-muted-foreground">{v.kindLabel} · {v.distance}</span>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
</div>
