<script lang="ts">
	// LINKMUSICIAN: agenda Collab (P3-12, U0, #76), voir +page.server.ts. Les
	// collaborations prévues seulement : les jams sont dans Rencontre.
	import SEO from '#lib/components/SEO.svelte';
	import MetroPageHeader from '#lib/components/linkmusician/metro/MetroPageHeader.svelte';
	import { CalendarDays, Handshake } from 'lucide-svelte';

	let { data } = $props();
	const day = new Intl.DateTimeFormat('fr-FR', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		timeZone: 'Europe/Paris'
	});
</script>

<SEO title="Agenda" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-3xl space-y-6">
		<MetroPageHeader
			kicker="Collab"
			title="Agenda"
			intro="Tes collaborations prévues : sessions, répétitions, concerts."
		/>
		{#if data.items.length === 0}
			<div class="lm-tile lm-tile--flow space-y-2 p-6 text-center">
				<CalendarDays class="mx-auto size-6 text-primary" aria-hidden="true" />
				<p class="font-semibold">Rien de prévu pour l’instant.</p>
				<p class="text-sm text-muted-foreground">
					Une collaboration acceptée dans une conversation s’affiche ici à sa date.
				</p>
			</div>
		{:else}
			<ol class="space-y-2" aria-label="À venir">
				{#each data.items as it (it.href + it.at)}
					<li>
						<a href={it.href} class="lm-tile lm-tile--flow flex min-h-16 items-center gap-3 p-4">
							<Handshake class="size-5 shrink-0 text-primary" aria-hidden="true" />
							<span class="min-w-0 flex-1">
								<span class="block font-semibold wrap-break-word">{it.title}</span>
								<span class="block text-sm text-muted-foreground capitalize"
									>{day.format(new Date(it.at))}</span
								>
							</span>
							<span class="shrink-0 text-sm font-semibold text-primary">{it.role}</span>
						</a>
					</li>
				{/each}
			</ol>
		{/if}
		<p class="text-sm text-muted-foreground">
			Tes jams sont dans Rencontre :
			<a href="/jam/agenda" class="font-semibold underline">voir les jams à venir</a>.
		</p>
	</div>
</div>
