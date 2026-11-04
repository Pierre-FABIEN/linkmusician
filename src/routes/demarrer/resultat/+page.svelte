<script lang="ts">
	// LINKMUSICIAN: onboarding, « premier résultat » (P1-10, maquette P1-02).
	import { Sprout, Share2 } from 'lucide-svelte';
	import * as Card from '#shadcn/card';
	import * as Avatar from '#shadcn/avatar';
	import { Badge } from '#shadcn/badge';
	import { Button } from '#shadcn/button';
	import DistanceTag from '#lib/components/linkmusician/progress/DistanceTag.svelte';
	import QuestCard from '#lib/components/linkmusician/progress/QuestCard.svelte';
	import XpBar from '#lib/components/linkmusician/progress/XpBar.svelte';
	import { INSTRUMENT_LEVELS } from '#lib/skills/levels';
	import SEO from '#lib/components/SEO.svelte';

	let { data } = $props();
	const initials = (name: string) =>
		name
			.split(/\s+/)
			.map((w) => w[0])
			.join('')
			.slice(0, 2)
			.toUpperCase();
	const levelLabel = (level: number) =>
		INSTRUMENT_LEVELS.find((l) => l.level === level)?.label ?? '';
</script>

<SEO title="Près de toi" noindex nofollow />

<div class="space-y-6">
	{#if data.nearby.length > 0}
		<div class="space-y-1">
			<h1 class="text-3xl font-black tracking-tight">
				{data.nearby.length} musicien{data.nearby.length > 1 ? 's' : ''} près de toi
			</h1>
			<p class="text-muted-foreground">
				Dans un rayon de {data.radius} km autour de {data.commune}.
			</p>
		</div>
	{/if}

	<div class="grid gap-6 lg:grid-cols-3">
		<div class="lg:col-span-2">
			{#if data.nearby.length > 0}
				<ul class="grid gap-3 sm:grid-cols-2">
					{#each data.nearby as n (n.handle)}
						<li>
							<Card.Root class="h-full">
								<Card.Content class="space-y-3">
									<div class="flex items-center gap-3">
										<Avatar.Root class="size-12">
											<Avatar.Fallback
												class="bg-gradient-to-br from-violet-100 to-fuchsia-100 font-bold text-violet-800"
												>{initials(n.displayName)}</Avatar.Fallback
											>
										</Avatar.Root>
										<div class="min-w-0">
											<p class="truncate font-semibold">{n.displayName}</p>
											<p class="truncate text-sm text-muted-foreground">
												{#if n.instrument}{n.instrument.name} · {levelLabel(n.instrument.level)} (déclaré){:else}@{n.handle}{/if}
											</p>
										</div>
									</div>
									<div class="flex flex-wrap items-center gap-1.5">
										<DistanceTag meters={n.meters} commune={n.commune} />
										{#each n.genres as g (g)}<Badge variant="secondary">{g}</Badge>{/each}
									</div>
								</Card.Content>
							</Card.Root>
						</li>
					{/each}
				</ul>
			{:else}
				<Card.Root>
					<Card.Content class="flex flex-col items-center gap-4 py-4 text-center">
						<span
							class="grid size-16 place-items-center rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700"
							><Sprout class="size-8" /></span
						>
						<h1 class="text-2xl font-black">
							Tu es parmi les premiers {data.commune ? `à ${data.commune}` : 'ici'}
						</h1>
						<p class="max-w-md text-muted-foreground">
							Personne d'autre dans un rayon de {data.radius} km pour l'instant. Invite des musiciens
							que tu connais : chaque inscription rend la plateforme utile pour tout le monde.
						</p>
						<div class="flex flex-wrap justify-center gap-2">
							<Button href="/profil" variant="outline">Élargir mon rayon</Button>
							<Button href="/" variant="outline"
								><Share2 class="mr-1 size-4" /> Inviter des musiciens</Button
							>
						</div>
					</Card.Content>
				</Card.Root>
			{/if}
		</div>

		<Card.Root
			class="h-fit border-fuchsia-200 bg-gradient-to-b from-fuchsia-50/60 to-transparent dark:from-fuchsia-950/20"
		>
			<Card.Header>
				<Card.Title>Ta progression commence</Card.Title>
				<Card.Description>Niveau {data.progress.level} · {data.progress.xp} XP</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-3">
				<XpBar
					level={data.progress.level}
					xp={data.progress.xp}
					xpIntoLevel={data.progress.xpIntoLevel}
					xpForNextLevel={data.progress.xpForNextLevel}
					compact
				/>
				{#each data.objectives as o (o.id)}<QuestCard
						label={o.label}
						href={o.href}
						xp={o.xp}
						progress={o.progress}
					/>{/each}
				<Button
					href="/espace"
					class="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
					>Aller à mon espace</Button
				>
			</Card.Content>
		</Card.Root>
	</div>
</div>
