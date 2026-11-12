<script lang="ts">
	/**
	 * LINKMUSICIAN: suggestions de musicien·nes (P2-18) : « Des musicien·nes
	 * pour toi » ou « Dans le même style ». Chaque carte dit pourquoi
	 * (« Rock en commun · batterie · niveau proche ») ; « Pas intéressé·e » la
	 * retire aussitôt, et le serveur ne la proposera plus.
	 */
	import * as Avatar from '#shadcn/avatar';
	import { MapPin, Sparkles, X } from 'lucide-svelte';
	import { initialsOf } from '#lib/actors/display';
	import { levelLabel, type InstrumentLevel } from '#lib/skills/levels';

	type Suggestion = {
		handle: string;
		displayName: string;
		commune: string | null;
		distance: string;
		inNetwork: boolean;
		reason: string;
		instruments: { name: string; level: number }[];
		genres: string[];
	};
	let {
		title,
		suggestions,
		emptyHint = null
	}: {
		title: string;
		suggestions: Suggestion[];
		/** Montré quand il n'y a rien (sinon la section disparaît). */
		emptyHint?: { text: string; href: string; label: string } | null;
	} = $props();

	let removed = $state<string[]>([]);
	const visible = $derived(suggestions.filter((s) => !removed.includes(s.handle)));
	const headingId = `suggestions-${Math.random().toString(36).slice(2, 8)}`;

	async function dismiss(handle: string) {
		removed = [...removed, handle];
		try {
			await fetch('/api/suggestions/dismiss', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ handle })
			});
		} catch {
			// Hors ligne : elle reviendra peut-être, sans gravité.
		}
	}
</script>

{#if visible.length > 0 || emptyHint}
	<section class="space-y-3" aria-labelledby={headingId}>
		<h2 id={headingId} class="flex items-center gap-2 text-lg font-bold">
			<Sparkles class="lm-tone-icon size-5" data-tone="rose" aria-hidden="true" />
			{title}
		</h2>
		{#if visible.length === 0 && emptyHint}
			<p class="lm-tile lm-tile--flow p-4 text-sm text-muted-foreground">
				{emptyHint.text}
				<a href={emptyHint.href} class="font-medium text-primary underline">{emptyHint.label}</a>
			</p>
		{:else}
			<ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label={title}>
				{#each visible as s (s.handle)}
					<li class="relative">
						<a
							href="/@{s.handle}"
							class="lm-tile lm-tile--flow flex h-full flex-col gap-2 p-4 pr-12 hover:shadow-md"
						>
							<span class="flex items-center gap-3">
								<Avatar.Root class="size-11">
									<Avatar.Fallback class="bg-primary/15 font-bold text-foreground"
										>{initialsOf(s.displayName)}</Avatar.Fallback
									>
								</Avatar.Root>
								<span class="min-w-0">
									<span class="block truncate font-bold">{s.displayName}</span>
									{#if s.inNetwork}
										<span class="block text-xs font-semibold text-primary">Dans ton réseau</span>
									{/if}
									<span class="flex items-center gap-1 text-xs text-muted-foreground">
										<MapPin class="size-3" aria-hidden="true" />
										{s.distance}{s.commune ? ` · ${s.commune}` : ''}
									</span>
								</span>
							</span>
							<span class="text-sm font-medium text-primary">{s.reason}</span>
							{#if s.instruments.length > 0}
								<span class="text-sm text-muted-foreground">
									{#each s.instruments as i, k (i.name)}{k > 0 ? ' · ' : ''}{i.name} ({levelLabel(
											i.level as InstrumentLevel
										).toLowerCase()}){/each}
								</span>
							{/if}
						</a>
						<button
							type="button"
							onclick={() => dismiss(s.handle)}
							class="absolute top-2 right-2 grid size-11 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
							aria-label="Pas intéressé·e par {s.displayName}"
						>
							<X class="size-4" aria-hidden="true" />
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
{/if}
