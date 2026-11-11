<script lang="ts">
	// LINKMUSICIAN: « Mes organisations » (P5-05b), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import SEO from '#lib/components/SEO.svelte';
	import { BadgeCheck } from 'lucide-svelte';
	import { ROLE_LABELS } from '#lib/bands/rules';
	import { MAX_PROMOTER_ORG_NAME } from '#lib/organizations/promoter';

	let { data, form } = $props();
	let sending = $state(false);

	$effect(() => {
		if (form?.answered) toast.success(form.answered);
	});
</script>

<SEO title="Mes organisations" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-3xl space-y-8">
		<div class="space-y-2">
			<h1 class="lm-title">Mes organisations</h1>
			<p class="text-sm text-muted-foreground">
				Ton association, ton collectif ou ton festival, géré à plusieurs. Elle publie des plateaux
				en son nom ; vérifiée, elle pourra confirmer les concerts qu’elle organise.
			</p>
		</div>

		{#if data.invites.length > 0}
			<section class="space-y-3" aria-labelledby="invites">
				<h2 id="invites" class="text-xl font-bold">Invitations</h2>
				{#if form?.inviteError}
					<p role="alert" class="rounded-md border border-destructive p-3 text-sm text-destructive">
						{form.inviteError}
					</p>
				{/if}
				<ul class="space-y-2">
					{#each data.invites as invite (invite.membershipId)}
						<li class="space-y-3 rounded-xl border p-3">
							<p>
								{invite.invitedBy ?? 'Quelqu’un'} t’invite à gérer <strong>{invite.name}</strong>.
							</p>
							<form method="POST" action="?/answer" use:enhance class="flex flex-wrap gap-2">
								<input type="hidden" name="membershipId" value={invite.membershipId} />
								<button name="accept" value="1" class="lm-btn">Accepter</button>
								<button name="accept" value="0" class="lm-btn" data-variant="ghost">Décliner</button
								>
							</form>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if data.orgs.length > 0}
			<ul class="space-y-2" aria-label="Organisations que je gère">
				{#each data.orgs as org (org.handle)}
					<li>
						<a
							href="/organisations/{org.handle}"
							class="flex min-h-14 items-center justify-between gap-3 rounded-xl border p-3 hover:bg-muted"
						>
							<span class="inline-flex items-center gap-1 font-semibold"
								>{org.name}{#if org.verified}<BadgeCheck
										class="size-4 text-primary"
										aria-label="vérifiée"
									/>{/if}</span
							>
							<span class="text-sm text-muted-foreground">
								{org.gaps.length > 0 ? 'Fiche à compléter' : (org.commune ?? '')} · {ROLE_LABELS[
									org.role
								]}
							</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}

		{#if data.venues.length > 0}
			<!-- Lieux que je gère (P5-03b). -->
			<section class="space-y-2" aria-labelledby="my-venues">
				<h2 id="my-venues" class="text-xl font-bold">Mes lieux</h2>
				<ul class="space-y-2">
					{#each data.venues as venue (venue.venueId)}
						<li>
							<a
								href="/lieux/{venue.venueId}/gerer"
								class="flex min-h-14 items-center justify-between gap-3 rounded-xl border p-3 hover:bg-muted"
							>
								<span class="font-semibold">{venue.name}</span>
								<span class="text-sm text-muted-foreground"
									>{venue.published ? 'Fiche publiée' : 'Fiche à compléter'} · {ROLE_LABELS[
										venue.role
									]}</span
								>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if data.canOpen}
			<section class="space-y-3" aria-labelledby="new-org">
				<h2 id="new-org" class="text-xl font-bold">
					{data.orgs.length > 0 ? 'Créer une autre organisation' : 'Créer ton organisation'}
				</h2>
				{#if form?.error}
					<p role="alert" class="rounded-md border border-destructive p-3 text-sm text-destructive">
						{form.error}
					</p>
				{/if}
				<form
					method="POST"
					action="?/create"
					class="flex flex-col gap-3 sm:flex-row sm:items-end"
					use:enhance={() => {
						sending = true;
						return async ({ update }) => {
							await update();
							sending = false;
						};
					}}
				>
					<label class="block flex-1 space-y-1 font-medium">
						Nom de l’organisation
						<input
							name="name"
							required
							autocomplete="off"
							maxlength={MAX_PROMOTER_ORG_NAME}
							value={form?.name ?? ''}
							placeholder="Asso Bruit Rose"
							class="lm-field w-full"
						/>
					</label>
					<button disabled={sending} class="lm-btn disabled:opacity-60">Créer</button>
				</form>
				<p class="text-sm text-muted-foreground">
					Tu en seras la personne responsable, et tu pourras inviter d’autres organisateur·rices à
					la gérer avec toi.
				</p>
			</section>
		{:else}
			<section class="space-y-3 rounded-xl border p-4">
				<h2 class="font-semibold">Une organisation se gère avec le métier d’organisateur·rice</h2>
				<p class="text-sm text-muted-foreground">
					Ajoute le métier « Organisateur·rice » (réservé aux personnes majeures) pour créer la
					fiche de ton association ou de ton collectif.
				</p>
				<a href="/reglages/metiers" class="lm-btn" data-variant="ghost">Mes métiers →</a>
			</section>
		{/if}
	</div>
</div>
