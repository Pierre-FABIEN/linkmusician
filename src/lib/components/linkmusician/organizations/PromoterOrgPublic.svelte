<script lang="ts">
	// LINKMUSICIAN: page publique d'une organisation d'organisateur·rices
	// `/@handle` (P5-05b), même structure que celle d'un studio. Données :
	// `getPublicPromoterOrg`. Jamais d'adresse, ni de SIRET : la ville et la
	// mention « vérifiée » seulement.
	import { enhance } from '$app/forms';
	import SEO from '#lib/components/SEO.svelte';
	import StructuredData from '#lib/components/StructuredData.svelte';
	import * as Card from '#shadcn/card';
	import * as Avatar from '#shadcn/avatar';
	import { BadgeCheck, CalendarDays, MapPin } from 'lucide-svelte';
	import { initialsOf } from '#lib/actors/display';
	import { REPORT_REASONS, REPORT_REASON_LABELS, MAX_REPORT_DETAILS } from '#lib/moderation/rules';
	import { seoConfig } from '#lib/seo.config';
	import { PROMOTER_EVENT_KIND_INFO, capacityLabel } from '#lib/crafts/promoter';
	import type { PublicPromoterOrg } from '#lib/server/organizations/promoters';

	let {
		org,
		canReport,
		memberShell
	}: { org: Omit<PublicPromoterOrg, 'id'>; canReport: boolean; memberShell: boolean } = $props();

	const kinds = $derived(org.eventKinds.map((k) => PROMOTER_EVENT_KIND_INFO[k].label));
	const description = $derived(
		(
			org.bio?.trim() ||
			`${org.name}${org.commune ? `, à ${org.commune}` : ''} : ${kinds.join(', ').toLowerCase() || 'organisation de concerts'}.`
		).slice(0, 160)
	);
	const url = $derived(`${seoConfig.site.url}/@${org.handle}`);
	const capacity = $derived(capacityLabel(org.capacity));
	const structured = $derived({
		name: org.name,
		alternateName: `@${org.handle}`,
		url,
		description,
		...(org.commune
			? {
					address: { '@type': 'PostalAddress', addressLocality: org.commune, addressCountry: 'FR' }
				}
			: {})
	});
	const day = new Intl.DateTimeFormat('fr-FR', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		timeZone: 'Europe/Paris'
	});
</script>

<SEO title="{org.name} (@{org.handle})" {description} {url} />
<StructuredData type="Organization" data={structured} />

<div class="min-h-screen w-full px-4 {memberShell ? 'pt-6 pb-24' : 'py-24'}">
	<div class="mx-auto max-w-5xl space-y-6">
		{#if org.isManager}
			<p class="rounded-lg border bg-muted/40 p-3 text-sm">
				C’est la page publique de ton organisation, telle que les autres la voient.
				<a href="/organisations/{org.handle}" class="underline">Modifier la fiche</a>
			</p>
		{/if}

		<div class="grid gap-6 lg:grid-cols-3">
			<div class="space-y-6 lg:col-span-2">
				<Card.Root class="overflow-hidden pt-0">
					<div
						class="h-32 bg-slate-900 bg-[radial-gradient(circle_at_25%_35%,var(--color-orange-500),transparent_50%),radial-gradient(circle_at_80%_60%,var(--color-fuchsia-600),transparent_55%)]"
					></div>
					<Card.Content class="-mt-12 space-y-4">
						<div class="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:gap-4">
							<Avatar.Root class="size-24 border-4 border-background shadow-xl">
								<Avatar.Fallback class="bg-orange-100 text-3xl font-bold text-orange-900"
									>{initialsOf(org.name)}</Avatar.Fallback
								>
							</Avatar.Root>
							<div class="min-w-0 flex-1 space-y-2">
								<h1 class="flex items-center gap-2 text-3xl font-black tracking-tight">
									{org.name}
									{#if org.verified}
										<BadgeCheck class="size-6 shrink-0 text-sky-600" aria-hidden="true" />
										<span class="sr-only">(organisation vérifiée)</span>
									{/if}
								</h1>
								<p
									class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground"
								>
									<span>Organisateur·rices</span>
									{#if org.commune}
										<span class="inline-flex items-center gap-1"
											><MapPin class="size-4" aria-hidden="true" />{org.commune}</span
										>
									{/if}
									{#if capacity}<span>Jauge habituelle : {capacity}</span>{/if}
								</p>
							</div>
						</div>
						{#if org.bio}
							<p class="whitespace-pre-line">{org.bio}</p>
						{/if}
						{#if kinds.length > 0}
							<ul class="flex flex-wrap gap-2" aria-label="Ce que l’organisation organise">
								{#each kinds as kind (kind)}
									<li class="rounded-full border px-3 py-1 text-sm font-medium">{kind}</li>
								{/each}
							</ul>
						{/if}
						{#if org.genres.length > 0}
							<p class="text-sm">
								<span class="font-semibold">Programme :</span>
								{org.genres.join(', ')}
							</p>
						{/if}
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title
							><h2 class="flex items-center gap-2">
								<CalendarDays class="size-5" aria-hidden="true" />Plateaux ouverts aux groupes
							</h2></Card.Title
						>
					</Card.Header>
					<Card.Content>
						{#if org.gigSlots.length === 0}
							<p class="text-sm text-muted-foreground">Pas de plateau ouvert pour l’instant.</p>
						{:else}
							<ul class="divide-y">
								{#each org.gigSlots as g (g.id)}
									<li class="py-2 first:pt-0">
										<a href="/annonces/{g.id}" class="block min-h-11 hover:underline">
											<span class="font-semibold">{g.title}</span>
											<span class="block text-sm text-muted-foreground"
												>{g.startsAt ? day.format(new Date(g.startsAt)) : ''}{g.venue
													? ` · ${g.venue}`
													: ''}</span
											>
										</a>
									</li>
								{/each}
							</ul>
						{/if}
					</Card.Content>
				</Card.Root>
			</div>

			<div class="space-y-6">
				{#if org.managers.length > 0}
					<Card.Root>
						<Card.Header>
							<Card.Title><h2>Contact</h2></Card.Title>
						</Card.Header>
						<Card.Content class="space-y-3 text-sm">
							<p class="text-muted-foreground">Écris à une personne qui gère l’organisation.</p>
							<ul class="space-y-2">
								{#each org.managers as manager (manager.handle)}
									<li>
										<a
											href="/@{manager.handle}"
											class="flex min-h-11 items-center gap-2 rounded-lg hover:bg-muted"
										>
											<Avatar.Root class="size-9">
												<Avatar.Fallback>{initialsOf(manager.displayName)}</Avatar.Fallback>
											</Avatar.Root>
											<span class="font-medium">{manager.displayName}</span>
										</a>
									</li>
								{/each}
							</ul>
						</Card.Content>
					</Card.Root>
				{/if}

				{#if canReport && !org.isManager}
					<details class="rounded-lg border p-3 text-sm">
						<summary class="cursor-pointer text-muted-foreground"
							>Signaler cette organisation</summary
						>
						<form method="POST" action="?/report" use:enhance class="mt-3 space-y-3">
							<div class="space-y-1">
								<label for="reason" class="block font-medium">Motif</label>
								<select
									id="reason"
									name="reason"
									required
									class="w-full rounded-md border bg-background p-2"
								>
									<option value="">—</option>
									{#each REPORT_REASONS as r (r)}
										<option value={r}>{REPORT_REASON_LABELS[r]}</option>
									{/each}
								</select>
							</div>
							<div class="space-y-1">
								<label for="details" class="block font-medium">Précisions (facultatif)</label>
								<textarea
									id="details"
									name="details"
									rows="3"
									maxlength={MAX_REPORT_DETAILS}
									class="w-full rounded-md border bg-background p-2"
								></textarea>
							</div>
							<button type="submit" class="rounded-md border px-3 py-1.5"
								>Envoyer le signalement</button
							>
						</form>
					</details>
				{/if}
			</div>
		</div>
	</div>
</div>
