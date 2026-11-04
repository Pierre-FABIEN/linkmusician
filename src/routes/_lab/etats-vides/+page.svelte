<script lang="ts">
	// LINKMUSICIAN: maquettes des états vides (P1-02), conception 05 §1 : dire
	// honnêtement qu'il y a peu de monde, et proposer quoi faire.
	import * as Card from '#shadcn/card';
	import { Button } from '#shadcn/button';
	import { Sprout, Music, Award, Inbox, Bell, Share2 } from 'lucide-svelte';
</script>

<div class="grid gap-6 md:grid-cols-2">
	<Card.Root class="md:col-span-2">
		<Card.Content class="flex flex-col items-center gap-4 py-4 text-center">
			<span
				class="grid size-16 place-items-center rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700"
				><Sprout class="size-8" /></span
			>
			<h2 class="text-2xl font-black">Tu es parmi les premiers à Annecy</h2>
			<p class="max-w-md text-muted-foreground">
				2 musiciens dans un rayon de 25 km pour l'instant. On te prévient dès qu'un·e bassiste ou un
				groupe arrive près de chez toi.
			</p>
			<div class="flex flex-wrap justify-center gap-2">
				<Button>Élargir à 50 km</Button>
				<Button variant="outline"><Bell class="mr-1 size-4" /> M'alerter</Button>
				<Button variant="outline"><Share2 class="mr-1 size-4" /> Inviter des musiciens</Button>
			</div>
		</Card.Content>
	</Card.Root>

	{#each [{ icon: Music, t: 'Pas encore de démo', d: 'Une démo, c’est ce qui donne envie de jouer avec toi. Un lien YouTube ou SoundCloud suffit.', a: 'Ajouter une démo', x: '+100 XP' }, { icon: Award, t: 'Aucun succès pour l’instant', d: 'Le premier arrive en complétant ton profil.', a: 'Compléter mon profil', x: '+150 XP' }, { icon: Inbox, t: 'Pas de message', d: 'Réponds à une annonce près de chez toi pour démarrer une conversation.', a: 'Voir les annonces', x: '+30 XP' }] as e (e.t)}
		<Card.Root>
			<Card.Content class="flex flex-col items-start gap-3">
				<span class="grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground"
					><e.icon class="size-5" /></span
				>
				<h3 class="font-bold">{e.t}</h3>
				<p class="text-sm text-muted-foreground">{e.d}</p>
				<div class="flex items-center gap-3">
					<Button size="sm">{e.a}</Button>
					<span class="text-xs font-semibold text-fuchsia-700">{e.x}</span>
				</div>
			</Card.Content>
		</Card.Root>
	{/each}
</div>
