<script lang="ts">
	import MessagesTabs from '#lib/components/linkmusician/MessagesTabs.svelte';
	// LINKMUSICIAN: messagerie (P2-04), voir +page.server.ts.
	import TipCard from '#lib/components/linkmusician/TipCard.svelte';
	import SEO from '#lib/components/SEO.svelte';
	import * as Avatar from '#shadcn/avatar';
	import { MessageCircle } from 'lucide-svelte';
	import { initialsOf } from '#lib/actors/display';

	let { data } = $props();
	const dateFormat = new Intl.DateTimeFormat('fr-FR', {
		day: 'numeric',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit'
	});
	type Item = (typeof data.conversations)[number];
	const status = (c: Item) =>
		c.otherState === 'REQUEST'
			? 'En attente de sa réponse'
			: c.otherState === 'DECLINED'
				? 'Demande non acceptée'
				: null;
</script>

<SEO title="Messages" noindex nofollow />

{#snippet row(c: Item, label: string | null)}
	<li>
		<a
			href="/messages/{c.id}"
			class="flex min-h-16 items-center gap-3 rounded-2xl border bg-card p-3 transition hover:border-primary"
		>
			<Avatar.Root class="size-11">
				<Avatar.Fallback class="bg-violet-100 font-bold text-violet-800"
					>{initialsOf(c.displayName)}</Avatar.Fallback
				>
			</Avatar.Root>
			<span class="min-w-0 flex-1">
				<span class="flex items-baseline justify-between gap-2">
					<span class="truncate font-semibold">{c.displayName}</span>
					<span class="shrink-0 text-xs text-muted-foreground"
						>{dateFormat.format(new Date(c.lastMessageAt))}</span
					>
				</span>
				<span class="block truncate text-sm text-muted-foreground">
					{label ? `${label} · ` : ''}{c.lastIsMine ? 'Toi : ' : ''}{c.preview}
				</span>
			</span>
			{#if c.unread > 0}
				<span
					class="grid min-w-6 place-items-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground"
					aria-label="{c.unread} non lu{c.unread > 1 ? 's' : ''}">{c.unread}</span
				>
			{/if}
		</a>
	</li>
{/snippet}

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-7xl space-y-6 lg:space-y-8">
		<h1 class="text-3xl font-black tracking-tight sm:text-4xl">Messages</h1>
		<MessagesTabs current="conversations" />

		<TipCard tip={data.tip} />

		<div class="grid items-start gap-6 xl:grid-cols-2">
			{#if data.requests.length > 0}
				<section class="space-y-2" aria-labelledby="requests-title">
					<h2 id="requests-title" class="font-semibold">
						Demandes reçues ({data.requests.length})
					</h2>
					<ul class="space-y-2">
						{#each data.requests as c (c.id)}{@render row(c, 'Premier message')}{/each}
					</ul>
				</section>
			{/if}

			<section class="space-y-2" aria-labelledby="conversations-title">
				<h2 id="conversations-title" class="font-semibold">Conversations</h2>
				{#if data.conversations.length === 0}
					<div class="space-y-2 rounded-2xl border bg-card p-6 text-center">
						<MessageCircle class="mx-auto size-6 text-primary" aria-hidden="true" />
						<p class="font-semibold">Pas encore de conversation.</p>
						<p class="text-sm text-muted-foreground">
							Trouve quelqu'un avec qui jouer et écris-lui depuis son profil.
						</p>
						<a href="/decouvrir" class="inline-block pt-1 font-semibold underline">Découvrir</a>
					</div>
				{:else}
					<ul class="space-y-2">
						{#each data.conversations as c (c.id)}{@render row(c, status(c))}{/each}
					</ul>
				{/if}
			</section>
		</div>
	</div>
</div>
