<script lang="ts">
	// LINKMUSICIAN: menu du jeu (P2-12, P2-12b), voir +page.server.ts.
	import SEO from '#lib/components/SEO.svelte';
	import { ChevronRight, Guitar, Trophy } from 'lucide-svelte';
	import LevelBadge from '#lib/components/linkmusician/progress/LevelBadge.svelte';
	import { orderedModes } from '#lib/linkmusician/modes';

	let { data } = $props();
	const modes = $derived(orderedModes(data.preferredMode));
	const icons = { CAREER: Trophy, JAM: Guitar } as const;
	const firstName = $derived(data.person.displayName.split(' ')[0]);
</script>

<SEO title="Jouer" noindex nofollow />

<div class="min-h-screen w-screen px-4 pt-6 pb-24">
	<div class="mx-auto max-w-3xl space-y-6">
		<header class="flex items-center gap-4">
			<LevelBadge level={data.level} />
			<div>
				<p class="text-sm text-muted-foreground">Salut {firstName} !</p>
				<h1 class="text-3xl font-black tracking-tight">Choisis ton mode</h1>
			</div>
		</header>

		<form method="POST" action="?/choose" class="grid gap-4 sm:grid-cols-2">
			{#each modes as m (m.mode)}
				{@const Icon = icons[m.mode]}
				<button
					type="submit"
					name="mode"
					value={m.mode}
					class="group relative flex min-h-56 flex-col justify-between gap-4 overflow-hidden rounded-3xl p-6 text-left text-white shadow-xl transition hover:-translate-y-1 hover:shadow-2xl focus-visible:outline-4 {m.mode ===
					'CAREER'
						? 'bg-gradient-to-br from-violet-700 to-fuchsia-600'
						: 'bg-gradient-to-br from-orange-600 to-pink-600'}"
				>
					<span class="flex items-center justify-between">
						<Icon class="size-10" aria-hidden="true" />
						{#if m.resume}
							<span class="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase"
								>Reprendre</span
							>
						{/if}
					</span>
					<span class="space-y-2">
						<span class="block text-2xl font-black uppercase italic">{m.label}</span>
						<span class="block text-sm text-white/90">{m.pitch}</span>
						<span class="block rounded-xl bg-black/15 px-3 py-2 text-sm font-semibold">{m.how}</span
						>
					</span>
					<span class="flex items-center justify-end gap-1 text-sm font-bold">
						Jouer <ChevronRight
							class="size-4 transition group-hover:translate-x-1"
							aria-hidden="true"
						/>
					</span>
				</button>
			{/each}
		</form>
		<p class="text-center text-sm text-muted-foreground">
			Tu peux changer de mode à tout moment avec la pastille en haut de l'écran.
		</p>
	</div>
</div>
