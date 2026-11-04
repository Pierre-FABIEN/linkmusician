<script lang="ts">
	// LINKMUSICIAN: maquette du tableau de bord de progression (P1-02 → P1-11).
	import * as Card from '#shadcn/card';
	import * as Avatar from '#shadcn/avatar';
	import { Badge } from '#shadcn/badge';
	import { Separator } from '#shadcn/separator';
	import { Sparkles, ShieldCheck } from 'lucide-svelte';
	import XpBar from '#lib/components/linkmusician/progress/XpBar.svelte';
	import LevelBadge from '#lib/components/linkmusician/progress/LevelBadge.svelte';
	import TierBadge from '#lib/components/linkmusician/progress/TierBadge.svelte';
	import QuestCard from '#lib/components/linkmusician/progress/QuestCard.svelte';
	import AchievementBadge from '#lib/components/linkmusician/progress/AchievementBadge.svelte';
	import { achievements, gains, lea, quests } from '../data';
</script>

<div class="space-y-6">
	<!-- En-tête : identité et progression -->
	<Card.Root class="overflow-hidden pt-0">
		<div class="h-24 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500"></div>
		<Card.Content class="-mt-10 space-y-5">
			<div class="flex flex-wrap items-end gap-4">
				<Avatar.Root class="size-20 border-4 border-background shadow-lg">
					<Avatar.Fallback class="bg-violet-100 text-2xl font-bold text-violet-800"
						>{lea.initials}</Avatar.Fallback
					>
				</Avatar.Root>
				<div class="min-w-0 flex-1">
					<h1 class="text-2xl font-black tracking-tight">
						Salut {lea.displayName.split(' ')[0]} !
					</h1>
					<p class="text-sm text-muted-foreground">@{lea.handle} · Musicienne · {lea.commune}</p>
				</div>
				<TierBadge {...lea.tier} />
			</div>
			<div class="flex items-center gap-4">
				<LevelBadge level={lea.level} />
				<div class="flex-1">
					<XpBar
						level={lea.level}
						xp={lea.xp}
						xpIntoLevel={lea.xpIntoLevel}
						xpForNextLevel={lea.xpForNextLevel}
					/>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Quêtes -->
		<Card.Root class="lg:col-span-2">
			<Card.Header>
				<Card.Title class="flex items-center gap-2"
					><Sparkles class="size-5 text-fuchsia-500" /> Tes prochains objectifs</Card.Title
				>
				<Card.Description>Les trois étapes atteignables maintenant.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-3">
				{#each quests as q (q.label)}<QuestCard {...q} />{/each}
			</Card.Content>
		</Card.Root>

		<!-- Confiance -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2"
					><ShieldCheck class="size-5 text-emerald-600" /> Confiance</Card.Title
				>
				<Card.Description>Grandit avec les échanges réels, jamais avec l'XP.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-3 text-sm">
				<p class="text-xl font-bold">Confirmée</p>
				<ul class="space-y-1 text-muted-foreground">
					<li>✅ 60 premiers messages par jour</li>
					<li>✅ Corroborer les étapes des groupes</li>
					<li>⬜ Pilier : 5 collaborateurs différents (2/5)</li>
				</ul>
			</Card.Content>
		</Card.Root>

		<!-- Gains récents -->
		<Card.Root class="lg:col-span-2">
			<Card.Header>
				<Card.Title>Derniers gains</Card.Title>
				<Card.Description>Chaque point a une raison.</Card.Description>
			</Card.Header>
			<Card.Content>
				<ul>
					{#each gains as g, i (i)}
						{#if i > 0}<Separator />{/if}
						<li class="flex items-center justify-between py-2.5 text-sm">
							<span>{g.reason}</span>
							<span class="flex items-center gap-3">
								<span class="text-muted-foreground">{g.date}</span>
								<Badge class="bg-fuchsia-100 font-semibold text-fuchsia-800 hover:bg-fuchsia-100"
									>+{g.xp} XP</Badge
								>
							</span>
						</li>
					{/each}
				</ul>
			</Card.Content>
		</Card.Root>

		<!-- Succès -->
		<Card.Root>
			<Card.Header><Card.Title>Succès</Card.Title></Card.Header>
			<Card.Content class="space-y-3">
				{#each achievements.slice(2) as a (a.name)}<AchievementBadge {...a} />{/each}
			</Card.Content>
		</Card.Root>
	</div>
</div>
