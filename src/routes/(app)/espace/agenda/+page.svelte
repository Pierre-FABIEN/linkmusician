<script lang="ts">
	// LINKMUSICIAN: agenda (P3-12), voir +page.server.ts.
	import SEO from '#lib/components/SEO.svelte';
	import SubPageHeader from '#lib/components/linkmusician/SubPageHeader.svelte';
	import { CalendarDays, Guitar, Handshake } from 'lucide-svelte';

	let { data } = $props();
	const day = new Intl.DateTimeFormat('fr-FR', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		timeZone: 'Europe/Paris'
	});
	const hour = new Intl.DateTimeFormat('fr-FR', {
		hour: '2-digit',
		minute: '2-digit',
		timeZone: 'Europe/Paris'
	});
</script>

<SEO title="Agenda" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-3xl space-y-6">
		<SubPageHeader title="Agenda" intro="Tes jams et tes collaborations à venir." />
		{#if data.items.length === 0}
			<div class="space-y-2 rounded-2xl border bg-card p-6 text-center">
				<CalendarDays class="mx-auto size-6 text-primary" aria-hidden="true" />
				<p class="font-semibold">Rien de prévu pour l’instant.</p>
				<p class="text-sm text-muted-foreground">
					Dis « Je viens » à une jam, ou propose une collaboration dans une conversation.
				</p>
				<a href="/jam/agenda" class="inline-block pt-1 font-semibold underline"
					>Voir les jams à venir</a
				>
			</div>
		{:else}
			<ol class="space-y-2" aria-label="À venir">
				{#each data.items as it (it.href + it.at)}
					{@const Icon = it.kind === 'JAM' ? Guitar : Handshake}
					<li>
						<a
							href={it.href}
							class="flex min-h-16 items-center gap-3 rounded-2xl border bg-card p-4 hover:border-primary"
						>
							<Icon class="size-5 shrink-0 text-primary" aria-hidden="true" />
							<span class="min-w-0 flex-1">
								<span class="block font-semibold">{it.title}</span>
								<span class="block text-sm text-muted-foreground capitalize"
									>{day.format(new Date(it.at))}{it.kind === 'JAM'
										? ` · ${hour.format(new Date(it.at))}`
										: ''}{it.where ? ` · ${it.where}` : ''}</span
								>
							</span>
							<span class="shrink-0 text-sm font-semibold text-primary">{it.role}</span>
						</a>
					</li>
				{/each}
			</ol>
		{/if}
	</div>
</div>
