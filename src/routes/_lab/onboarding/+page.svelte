<script lang="ts">
	// LINKMUSICIAN: maquette de l'onboarding en 6 étapes (P1-02 → P1-10),
	// conception 05 §1. Objectif : 5 profils pertinents en moins de 2 minutes.
	import * as Card from '#shadcn/card';
	import { Button } from '#shadcn/button';
	import { Badge } from '#shadcn/badge';
	import { Check, Guitar, Mic2, Users, Compass, MapPin } from 'lucide-svelte';
	import InstrumentSkill from '#lib/components/linkmusician/progress/InstrumentSkill.svelte';

	const steps = ['Compte', 'Qui es-tu ?', 'Instruments', 'Genres', 'Ville', 'Intention'];
	let step = $state(1);
	let intention = $state('groupe');
</script>

<div class="mx-auto max-w-xl space-y-6">
	<ol class="flex items-center gap-1" aria-label="Étapes">
		{#each steps as label, i (label)}
			<li class="flex flex-1 flex-col items-center gap-1.5">
				<button
					type="button"
					onclick={() => (step = i)}
					aria-current={i === step ? 'step' : undefined}
					class="grid size-8 place-items-center rounded-full text-sm font-bold transition {i < step
						? 'bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white'
						: i === step
							? 'bg-foreground text-background ring-4 ring-fuchsia-200'
							: 'bg-muted text-muted-foreground'}"
				>
					{#if i < step}<Check class="size-4" />{:else}{i + 1}{/if}
				</button>
				<span class="hidden text-center text-[11px] text-muted-foreground sm:block">{label}</span>
			</li>
		{/each}
	</ol>

	<Card.Root class="shadow-xl">
		<Card.Content class="space-y-5">
			{#if step === 0}
				<h1 class="text-2xl font-black">Bienvenue sur LinkMusician</h1>
				<p class="text-muted-foreground">
					Email, mot de passe (ou Google), ton pseudo et ta date de naissance (16 ans minimum).
				</p>
				<p class="rounded-lg bg-muted p-3 text-sm">Écran existant : <code>/auth/signup</code>.</p>
			{:else if step === 1}
				<h1 class="text-2xl font-black">Qui es-tu ?</h1>
				<div class="grid gap-2">
					<label
						class="flex items-center gap-3 rounded-xl border-2 border-fuchsia-500 bg-fuchsia-50 p-4 dark:bg-fuchsia-950/30"
					>
						<Guitar class="size-6 text-fuchsia-600" /><span class="flex-1 font-semibold"
							>Musicien·ne</span
						><Check class="size-5 text-fuchsia-600" />
					</label>
					{#each ['Producteur·rice', 'Ingé son', 'Organisateur·rice'] as m (m)}
						<label class="flex items-center gap-3 rounded-xl border p-4 opacity-80">
							<span class="flex-1">{m}</span><Badge variant="secondary">bientôt</Badge>
						</label>
					{/each}
				</div>
			{:else if step === 2}
				<h1 class="text-2xl font-black">Tes instruments</h1>
				<p class="text-sm text-muted-foreground">
					1 à 3 pour commencer. Le niveau se lit « je peux… », pas avec des adjectifs.
				</p>
				<InstrumentSkill name="Basse électrique" level={4} primary />
				<InstrumentSkill name="Chœurs" level={3} />
				<button
					type="button"
					class="w-full rounded-xl border border-dashed p-3 text-sm text-muted-foreground"
					>+ Ajouter un instrument</button
				>
			{:else if step === 3}
				<h1 class="text-2xl font-black">Tes genres</h1>
				<div class="flex flex-wrap gap-2">
					{#each ['Funk', 'Néo-soul', 'Jazz fusion', 'Afrobeat', 'Rock indé', 'Hip-hop', 'Électro', 'Chanson française'] as g, i (g)}
						<span
							class="rounded-full border px-3 py-1.5 text-sm {i < 4
								? 'border-transparent bg-foreground text-background'
								: ''}">{g}</span
						>
					{/each}
				</div>
				<p class="text-sm text-muted-foreground">
					Influences (facultatif) : Vulfpeck, Erykah Badu…
				</p>
			{:else if step === 4}
				<h1 class="text-2xl font-black">Où joues-tu ?</h1>
				<div class="flex items-center gap-2 rounded-xl border p-3">
					<MapPin class="size-5 text-muted-foreground" /> Toulouse (31)
				</div>
				<p class="text-sm text-muted-foreground">
					Seulement ta commune, jamais ta position. Les autres voient « 5 à 10 km ».
				</p>
				<div class="flex gap-2">
					{#each ['10 km', '25 km', '50 km', '100 km'] as r, i (r)}
						<span
							class="rounded-full border px-3 py-1.5 text-sm {i === 1
								? 'border-transparent bg-foreground text-background'
								: ''}">{r}</span
						>
					{/each}
				</div>
			{:else}
				<h1 class="text-2xl font-black">Tu cherches…</h1>
				<div class="grid gap-2 sm:grid-cols-2">
					{#each [{ v: 'groupe', icon: Users, t: 'Un groupe' }, { v: 'musiciens', icon: Mic2, t: 'Des musiciens pour mon groupe' }, { v: 'jams', icon: Guitar, t: 'Des jams' }, { v: 'explorer', icon: Compass, t: 'Juste explorer' }] as o (o.v)}
						<button
							type="button"
							onclick={() => (intention = o.v)}
							class="flex items-center gap-3 rounded-xl border-2 p-4 text-left transition {intention ===
							o.v
								? 'border-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-950/30'
								: 'border-transparent bg-muted/50'}"
						>
							<o.icon class="size-5 text-fuchsia-600" /><span class="font-medium">{o.t}</span>
						</button>
					{/each}
				</div>
			{/if}

			<div class="flex justify-between pt-2">
				<Button variant="ghost" disabled={step === 0} onclick={() => (step = Math.max(0, step - 1))}
					>Retour</Button
				>
				{#if step < steps.length - 1}
					<Button onclick={() => (step += 1)}>Continuer</Button>
				{:else}
					<Button
						href="/_lab/premier-resultat"
						class="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
						>Voir qui est près de moi</Button
					>
				{/if}
			</div>
		</Card.Content>
	</Card.Root>
	<p class="text-center text-xs text-muted-foreground">
		Étape {step + 1} sur 6 · on peut quitter et reprendre où on en était.
	</p>
</div>
