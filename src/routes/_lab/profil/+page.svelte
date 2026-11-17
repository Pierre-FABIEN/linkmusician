<script lang="ts">
	// LINKMUSICIAN: maquette du profil public @handle (P1-02 → P1-11).
	import * as Card from '#shadcn/card';
	import * as Avatar from '#shadcn/avatar';
	import { Badge } from '#shadcn/badge';
	import { Button } from '#shadcn/button';
	import { MessageCircle, Music, Flag, Handshake, Mic2, CalendarCheck } from 'lucide-svelte';
	import LevelBadge from '#lib/components/linkmusician/progress/LevelBadge.svelte';
	import TierBadge from '#lib/components/linkmusician/progress/TierBadge.svelte';
	import InstrumentSkill from '#lib/components/linkmusician/progress/InstrumentSkill.svelte';
	import DistanceTag from '#lib/components/linkmusician/progress/DistanceTag.svelte';
	import { distanceBand } from '#lib/geo/distance';
	import { lea } from '../data';

	const signals = [
		{ icon: Handshake, text: '3 collaborations confirmées avec 2 personnes' },
		{ icon: Mic2, text: '1 concert corroboré' },
		{ icon: MessageCircle, text: 'Répond généralement sous 48 h' }
	];
</script>

<div class="grid gap-6 lg:grid-cols-3">
	<div class="space-y-6 lg:col-span-2">
		<Card.Root class="overflow-hidden pt-0">
			<div
				class="h-32 bg-[radial-gradient(circle_at_20%_30%,var(--color-fuchsia-400),transparent_50%),radial-gradient(circle_at_80%_60%,var(--color-violet-600),transparent_55%)] bg-violet-900"
			></div>
			<Card.Content class="-mt-12 space-y-4">
				<div class="flex flex-wrap items-end gap-4">
					<Avatar.Root class="size-24 border-4 border-background shadow-xl">
						<Avatar.Fallback class="bg-violet-100 text-3xl font-bold text-violet-800"
							>{lea.initials}</Avatar.Fallback
						>
					</Avatar.Root>
					<div class="min-w-0 flex-1">
						<h1 class="text-3xl font-black tracking-tight">{lea.displayName}</h1>
						<p class="text-muted-foreground">@{lea.handle}</p>
					</div>
					<LevelBadge level={lea.level} size="sm" />
				</div>
				<div class="flex flex-wrap items-center gap-2">
					<TierBadge {...lea.tier} />
					<Badge variant="secondary">{lea.pro}</Badge>
					<DistanceTag band={distanceBand(6500)} commune={lea.commune} />
					<Badge variant="outline">joue depuis {new Date().getFullYear() - lea.since} ans</Badge>
				</div>
				<p class="leading-relaxed">{lea.bio}</p>
				<div class="flex flex-wrap gap-2">
					<Button class="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
						><MessageCircle class="mr-1 size-4" /> Écrire à Léa</Button
					>
					<Button variant="outline"><Flag class="mr-1 size-4" /> Signaler</Button>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header><Card.Title>Instruments</Card.Title></Card.Header>
			<Card.Content class="space-y-3">
				{#each lea.instruments as i (i.name)}<InstrumentSkill {...i} />{/each}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header
				><Card.Title class="flex items-center gap-2"><Music class="size-5" /> Démos</Card.Title
				></Card.Header
			>
			<Card.Content class="grid gap-3 sm:grid-cols-2">
				{#each ['Groove du mardi (live)', 'Reprise — Lost & Found'] as title (title)}
					<div class="space-y-2 rounded-xl border p-3">
						<div class="aspect-video rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-950"></div>
						<p class="text-sm font-medium">{title}</p>
					</div>
				{/each}
			</Card.Content>
		</Card.Root>
	</div>

	<div class="space-y-6">
		<Card.Root>
			<Card.Header>
				<Card.Title>Ce que d'autres confirment</Card.Title>
				<Card.Description>La réputation : des faits, pas un score.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-3 text-sm">
				{#each signals as s (s.text)}
					<p class="flex items-start gap-2">
						<s.icon class="mt-0.5 size-4 shrink-0 text-emerald-600" />
						{s.text}
					</p>
				{/each}
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header><Card.Title>Genres</Card.Title></Card.Header>
			<Card.Content class="flex flex-wrap gap-2">
				{#each lea.genres as g (g)}<Badge variant="secondary">{g}</Badge>{/each}
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header
				><Card.Title class="flex items-center gap-2"
					><CalendarCheck class="size-5" /> Cherche</Card.Title
				></Card.Header
			>
			<Card.Content class="flex flex-wrap gap-2">
				{#each lea.lookingFor as l (l)}<Badge variant="outline">{l}</Badge>{/each}
			</Card.Content>
		</Card.Root>
	</div>
</div>
