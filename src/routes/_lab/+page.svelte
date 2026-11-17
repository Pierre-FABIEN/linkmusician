<script lang="ts">
	// LINKMUSICIAN: galerie des composants de progression (P1-02).
	import * as Card from '#shadcn/card';
	import XpBar from '#lib/components/linkmusician/progress/XpBar.svelte';
	import LevelBadge from '#lib/components/linkmusician/progress/LevelBadge.svelte';
	import TierBadge from '#lib/components/linkmusician/progress/TierBadge.svelte';
	import QuestCard from '#lib/components/linkmusician/progress/QuestCard.svelte';
	import AchievementBadge from '#lib/components/linkmusician/progress/AchievementBadge.svelte';
	import InstrumentSkill from '#lib/components/linkmusician/progress/InstrumentSkill.svelte';
	import DistanceTag from '#lib/components/linkmusician/progress/DistanceTag.svelte';
	import { distanceBand } from '#lib/geo/distance';
	import { INSTRUMENT_LEVELS } from '#lib/skills/levels';
	import { achievements, lea, quests } from './data';

	const tiers = [
		{ id: 'FIRST_STEPS', label: 'Premiers pas' },
		{ id: 'NETWORKED', label: 'En réseau' },
		{ id: 'COLLABORATOR', label: 'Collaborateur·rice' },
		{ id: 'STAGE', label: 'Musicien·ne de scène' },
		{ id: 'LOCAL_PILLAR', label: 'Pilier local' },
		{ id: 'REFERENCE', label: 'Référence' }
	];
</script>

<div class="space-y-6">
	<h1 class="text-3xl font-black tracking-tight">Composants de progression</h1>

	<div class="grid gap-6 md:grid-cols-2">
		<Card.Root>
			<Card.Header><Card.Title>LevelBadge · XpBar</Card.Title></Card.Header>
			<Card.Content class="space-y-5">
				<div class="flex items-end gap-4">
					<LevelBadge level={2} size="sm" />
					<LevelBadge level={6} />
					<LevelBadge level={23} size="lg" />
				</div>
				<XpBar
					level={lea.level}
					xp={lea.xp}
					xpIntoLevel={lea.xpIntoLevel}
					xpForNextLevel={lea.xpForNextLevel}
				/>
				<XpBar level={1} xp={40} xpIntoLevel={40} xpForNextLevel={100} />
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>TierBadge</Card.Title>
				<Card.Description
					>Un palier = des conditions remplies, jamais un seuil d'XP.</Card.Description
				>
			</Card.Header>
			<Card.Content class="flex flex-wrap gap-2">
				{#each tiers as t (t.id)}<TierBadge id={t.id} label={t.label} />{/each}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header><Card.Title>QuestCard</Card.Title></Card.Header>
			<Card.Content class="space-y-3">
				{#each quests as q (q.label)}<QuestCard {...q} />{/each}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header><Card.Title>AchievementBadge</Card.Title></Card.Header>
			<Card.Content class="grid gap-3 sm:grid-cols-2">
				{#each achievements.slice(1, 5) as a (a.name)}<AchievementBadge {...a} />{/each}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>InstrumentSkill</Card.Title>
				<Card.Description>Toujours « déclaré » (D11).</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-3">
				{#each lea.instruments as i (i.name)}<InstrumentSkill {...i} />{/each}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>DistanceTag · échelle D11</Card.Title>
				<Card.Description>Distances par tranches, jamais en mètres.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="flex flex-wrap gap-2">
					<DistanceTag band={distanceBand(2400)} commune="Toulouse" />
					<DistanceTag band={distanceBand(18000)} commune="Muret" />
					<DistanceTag band={distanceBand(240000)} />
				</div>
				<ol class="space-y-1.5 text-sm">
					{#each INSTRUMENT_LEVELS as l (l.level)}
						<li>
							<span class="font-semibold">{l.level} · {l.label}</span> —
							<span class="text-muted-foreground">je peux {l.descriptor}</span>
						</li>
					{/each}
				</ol>
			</Card.Content>
		</Card.Root>
	</div>
</div>
