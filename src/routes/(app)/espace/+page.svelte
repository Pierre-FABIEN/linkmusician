<script lang="ts">
	// LINKMUSICIAN: tableau de bord de progression (P1-11), d'après la maquette
	// validée `/_lab/tableau-de-bord`. Les valeurs viennent toutes du serveur.
	import SEO from '#lib/components/SEO.svelte';
	import * as Card from '#shadcn/card';
	import * as Avatar from '#shadcn/avatar';
	import { Badge } from '#shadcn/badge';
	import { Separator } from '#shadcn/separator';
	import { Sparkles, ShieldCheck, EyeOff } from 'lucide-svelte';
	import XpBar from '#lib/components/linkmusician/progress/XpBar.svelte';
	import LevelBadge from '#lib/components/linkmusician/progress/LevelBadge.svelte';
	import TierBadge from '#lib/components/linkmusician/progress/TierBadge.svelte';
	import QuestCard from '#lib/components/linkmusician/progress/QuestCard.svelte';
	import AchievementBadge from '#lib/components/linkmusician/progress/AchievementBadge.svelte';
	import { TRACKS } from '#lib/actors/tracks';
	import { initialsOf } from '#lib/actors/display';
	import NextStep from '#lib/components/linkmusician/NextStep.svelte';

	let { data } = $props();
	const d = $derived(data.dashboard);
	const primary = $derived(data.person.tracks.find((t) => t.isPrimary) ?? data.person.tracks[0]);
	const subtitle = $derived(
		[`@${data.person.handle}`, primary ? TRACKS[primary.track].label : null, data.commune]
			.filter(Boolean)
			.join(' · ')
	);
	const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
	const firstName = $derived(data.person.displayName.split(' ')[0]);
</script>

<SEO title="Mon espace" noindex nofollow />

<div class="min-h-screen w-screen px-4 pt-6 pb-24">
	<div class="mx-auto max-w-5xl space-y-6">
		{#if d.objectives[0]}
			{@const o = d.objectives[0]}
			<NextStep
				index={Math.min(d.questProgress.done + 1, d.questProgress.total)}
				total={d.questProgress.total}
				title={o.label}
				text={o.xp
					? `Une étape réelle de ta carrière : environ ${o.xp} XP à la clé.`
					: 'Une étape réelle de ta carrière, à franchir avec d’autres.'}
				href={o.href ?? '/annonces'}
				cta={o.href ? 'J’y vais' : 'Bientôt disponible'}
			/>
		{/if}

		<!-- En-tête : identité et progression -->
		<Card.Root class="overflow-hidden pt-0">
			<div class="h-24 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500"></div>
			<Card.Content class="-mt-10 space-y-5">
				<div class="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
					<Avatar.Root class="size-20 border-4 border-background shadow-lg">
						<Avatar.Fallback class="bg-violet-100 text-2xl font-bold text-violet-800"
							>{initialsOf(data.person.displayName)}</Avatar.Fallback
						>
					</Avatar.Root>
					<div class="min-w-0 flex-1">
						<h1 class="text-2xl font-black tracking-tight">Salut {firstName} !</h1>
						<p class="text-sm text-muted-foreground">{subtitle}</p>
					</div>
					{#if d.tier}<TierBadge {...d.tier} />{/if}
				</div>
				<div class="flex items-center gap-4">
					<LevelBadge level={d.level} />
					<div class="flex-1">
						<XpBar
							level={d.level}
							xp={d.xp}
							xpIntoLevel={d.xpIntoLevel}
							xpForNextLevel={d.xpForNextLevel}
						/>
					</div>
				</div>
				<div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
					{#if data.hidden}
						<span class="flex items-center gap-1 text-muted-foreground"
							><EyeOff class="size-4" aria-hidden="true" /> Profil public masqué</span
						>
					{:else}
						<a href="/@{data.person.handle}" class="underline">Voir mon profil public</a>
					{/if}
					<a href="/profil" class="underline">Mon profil</a>
					<a href="/profil/musical" class="underline">Mon profil musical</a>
					<a href="/profil/medias" class="underline">Mes médias</a>
					<a href="/reglages" class="underline">Réglages</a>
				</div>
			</Card.Content>
		</Card.Root>

		{#if data.toConfirm.length > 0}
			<section
				class="space-y-2 rounded-2xl border-2 border-primary/40 bg-card p-4"
				aria-labelledby="to-confirm-title"
			>
				<h2 id="to-confirm-title" class="font-semibold">À confirmer</h2>
				<ul class="space-y-2" aria-label="Collaborations à confirmer">
					{#each data.toConfirm as k (k.id)}
						<li>
							<a
								href="/messages/{k.conversationId}"
								class="flex min-h-11 items-center justify-between gap-3 rounded-xl border p-3 text-sm hover:border-primary"
							>
								<span class="truncate">{k.title} · avec {k.with}</span>
								<span class="shrink-0 font-semibold text-primary">Confirmer →</span>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<div class="grid gap-6 lg:grid-cols-3">
			<!-- Objectifs -->
			<Card.Root class="lg:col-span-2">
				<Card.Header>
					<Card.Title
						><h2 class="flex items-center gap-2">
							<Sparkles class="size-5 text-fuchsia-500" aria-hidden="true" /> Tes prochains objectifs
						</h2></Card.Title
					>
					<Card.Description>Les trois étapes atteignables maintenant.</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-3">
					{#each d.objectives as q (q.id)}<QuestCard {...q} />{:else}
						<p class="text-sm text-muted-foreground">Tu as tout débloqué pour l'instant. Bravo !</p>
					{/each}
				</Card.Content>
			</Card.Root>

			<!-- Confiance -->
			<Card.Root>
				<Card.Header>
					<Card.Title
						><h2 class="flex items-center gap-2">
							<ShieldCheck class="size-5 text-emerald-600" aria-hidden="true" /> Confiance
						</h2></Card.Title
					>
					<Card.Description>Grandit avec les échanges réels, jamais avec l'XP.</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-3 text-sm">
					<p class="text-xl font-bold">{d.trust.name}</p>
					<p class="text-muted-foreground">
						Jusqu'à {d.trust.dailyFirstMessages} premiers messages par jour.
					</p>
					{#if d.trust.nextName}
						<p class="font-medium">Pour passer {d.trust.nextName}</p>
						<ul class="space-y-1 text-muted-foreground">
							{#each d.trust.requirements as r (r.label)}
								<li>
									<span aria-hidden="true">{r.met ? '✅' : '⬜'}</span>
									{r.label}<span class="sr-only">{r.met ? ' : fait' : ' : à faire'}</span>
								</li>
							{/each}
						</ul>
					{/if}
					<a href="/reglages" class="block underline">Détail et limites</a>
				</Card.Content>
			</Card.Root>

			<!-- Derniers gains -->
			<Card.Root class="lg:col-span-2">
				<Card.Header>
					<Card.Title><h2>Derniers gains</h2></Card.Title>
					<Card.Description>Chaque point a une raison. Visible par toi seul·e.</Card.Description>
				</Card.Header>
				<Card.Content>
					{#if d.history.length === 0}
						<p class="text-sm text-muted-foreground">
							Aucun gain pour l'instant : ton premier objectif ci-dessus t'en rapportera.
						</p>
					{:else}
						<ul aria-label="Historique des gains">
							{#each d.history as g, i (g.id)}
								{#if i > 0}<Separator />{/if}
								<li class="flex items-center justify-between gap-3 py-2.5 text-sm">
									<span>{g.reason}</span>
									<span class="flex shrink-0 items-center gap-3">
										<time
											class="text-muted-foreground"
											datetime={new Date(g.createdAt).toISOString()}
											>{dateFormat.format(new Date(g.createdAt))}</time
										>
										<Badge
											class="font-semibold {g.amount >= 0
												? 'bg-fuchsia-100 text-fuchsia-800 hover:bg-fuchsia-100'
												: 'bg-muted text-foreground hover:bg-muted'}"
											>{g.amount >= 0 ? '+' : '−'}{Math.abs(g.amount)} XP</Badge
										>
									</span>
								</li>
							{/each}
						</ul>
					{/if}
				</Card.Content>
			</Card.Root>

			<!-- Succès -->
			<Card.Root>
				<Card.Header><Card.Title><h2>Succès</h2></Card.Title></Card.Header>
				<Card.Content class="space-y-3">
					{#each d.achievements as a (a.id)}<AchievementBadge {...a} />{/each}
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</div>
