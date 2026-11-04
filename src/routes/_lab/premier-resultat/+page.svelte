<script lang="ts">
	// LINKMUSICIAN: maquette du « premier résultat » de l'onboarding (P1-02 → P1-10).
	import * as Card from '#shadcn/card';
	import * as Avatar from '#shadcn/avatar';
	import { Badge } from '#shadcn/badge';
	import { Button } from '#shadcn/button';
	import TierBadge from '#lib/components/linkmusician/progress/TierBadge.svelte';
	import DistanceTag from '#lib/components/linkmusician/progress/DistanceTag.svelte';
	import QuestCard from '#lib/components/linkmusician/progress/QuestCard.svelte';
	import XpBar from '#lib/components/linkmusician/progress/XpBar.svelte';
	import { nearby } from '../data';
</script>

<div class="space-y-6">
	<div class="space-y-1">
		<h1 class="text-3xl font-black tracking-tight">5 musiciens et 1 jam près de toi</h1>
		<p class="text-muted-foreground">
			Autour de Toulouse, pour « rejoindre un groupe », en funk et néo-soul.
		</p>
	</div>

	<div class="grid gap-6 lg:grid-cols-3">
		<div class="grid gap-3 sm:grid-cols-2 lg:col-span-2">
			{#each nearby as n (n.name)}
				<Card.Root class="transition hover:-translate-y-0.5 hover:shadow-lg">
					<Card.Content class="space-y-3">
						<div class="flex items-center gap-3">
							<Avatar.Root class="size-12">
								<Avatar.Fallback
									class="bg-gradient-to-br from-violet-100 to-fuchsia-100 font-bold text-violet-800"
									>{n.initials}</Avatar.Fallback
								>
							</Avatar.Root>
							<div class="min-w-0">
								<p class="truncate font-semibold">{n.name}</p>
								<p class="truncate text-sm text-muted-foreground">{n.role}</p>
							</div>
						</div>
						<div class="flex flex-wrap items-center gap-1.5">
							<DistanceTag meters={n.meters} commune={n.commune} />
							{#each n.genres as g (g)}<Badge variant="secondary">{g}</Badge>{/each}
						</div>
						{#if n.tier}<TierBadge {...n.tier} />{/if}
					</Card.Content>
				</Card.Root>
			{/each}
		</div>

		<Card.Root
			class="h-fit border-fuchsia-200 bg-gradient-to-b from-fuchsia-50/60 to-transparent dark:from-fuchsia-950/20"
		>
			<Card.Header>
				<Card.Title>Ta progression commence</Card.Title>
				<Card.Description>Niveau 1 · 0 XP</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-3">
				<XpBar level={1} xp={0} xpIntoLevel={0} xpForNextLevel={100} compact />
				<QuestCard label="Écris ta présentation" href="#" xp={150} />
				<QuestCard label="Publie ta première démo" href="#" xp={100} />
				<QuestCard label="Réponds à une annonce" href="#" xp={30} />
				<Button href="/_lab/tableau-de-bord" variant="outline" class="w-full"
					>Aller à mon espace</Button
				>
			</Card.Content>
		</Card.Root>
	</div>
</div>
