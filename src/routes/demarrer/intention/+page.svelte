<script lang="ts">
	// LINKMUSICIAN: onboarding, étape « Intention » (P1-10).
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { Users, Mic2, Guitar, Repeat, Handshake, GraduationCap, Compass } from 'lucide-svelte';
	import * as Card from '#shadcn/card';
	import { Button } from '#shadcn/button';
	import SEO from '#lib/components/SEO.svelte';

	let { data } = $props();
	let selected = $state<string[]>(untrack(() => [...data.lookingFor]));
	const options = [
		{ v: 'BAND', icon: Users, t: 'Rejoindre ou monter un groupe' },
		{ v: 'JAMS', icon: Guitar, t: 'Des jams' },
		{ v: 'REPLACEMENTS', icon: Repeat, t: 'Faire des remplacements' },
		{ v: 'COLLABORATION', icon: Handshake, t: 'Collaborer (composition, featuring)' },
		{ v: 'STUDIO_SESSIONS', icon: Mic2, t: 'Des sessions studio' },
		{ v: 'LESSONS_TAKE', icon: GraduationCap, t: 'Prendre des cours' }
	];
</script>

<SEO title="Ce que tu cherches" noindex nofollow />

<Card.Root class="shadow-xl">
	<Card.Content>
		<form method="POST" use:enhance class="space-y-5">
			<div>
				<h1 class="text-2xl font-black">Tu cherches…</h1>
				<p class="text-sm text-muted-foreground">
					Plusieurs choix possibles. Cela oriente ce qu'on te montre en premier.
				</p>
			</div>
			<div class="grid gap-2 sm:grid-cols-2">
				{#each options as o (o.v)}
					{@const on = selected.includes(o.v)}
					<label
						class="flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-fuchsia-400 {on
							? 'border-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-950/30'
							: 'border-transparent bg-muted/50'}"
					>
						<input
							type="checkbox"
							name="lookingFor"
							value={o.v}
							bind:group={selected}
							class="sr-only"
						/>
						<o.icon class="size-5 shrink-0 text-fuchsia-600" aria-hidden="true" /><span
							class="font-medium">{o.t}</span
						>
					</label>
				{/each}
			</div>
			<div class="flex flex-wrap justify-between gap-2">
				<Button variant="ghost" href="/demarrer/ville">Retour</Button>
				<div class="flex gap-2">
					{#if selected.length === 0}
						<Button type="submit" variant="outline"
							><Compass class="mr-1 size-4" /> Juste explorer</Button
						>
					{:else}
						<Button type="submit" class="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
							>Voir qui est près de moi</Button
						>
					{/if}
				</div>
			</div>
		</form>
	</Card.Content>
</Card.Root>
