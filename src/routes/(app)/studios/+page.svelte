<script lang="ts">
	// LINKMUSICIAN: « Mes studios » (P4-03a), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import SEO from '#lib/components/SEO.svelte';
	import { ROLE_LABELS } from '#lib/bands/rules';
	import { MAX_STUDIO_NAME } from '#lib/studios/rules';

	let { data, form } = $props();
	let sending = $state(false);

	$effect(() => {
		if (form?.answered) toast.success(form.answered);
	});
</script>

<SEO title="Mes studios" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-3xl space-y-8">
		<div class="space-y-2">
			<h1 class="lm-title">Mes studios</h1>
			<p class="text-sm text-muted-foreground">
				La fiche de ton studio : salles, matériel, tarifs, horaires. Une fois publiée, tout le monde
				la trouve et ton studio est <strong>Ouvert</strong>.
			</p>
		</div>

		{#if data.invites.length > 0}
			<!-- Invitations à gérer un studio (P4-03b). -->
			<section class="space-y-3" aria-labelledby="invites">
				<h2 id="invites" class="text-xl font-bold">Invitations</h2>
				{#if form?.inviteError}
					<p role="alert" class="lm-alert p-3 text-sm">
						{form.inviteError}
					</p>
				{/if}
				<ul class="space-y-2">
					{#each data.invites as invite (invite.membershipId)}
						<li class="lm-tile lm-tile--flow space-y-3 p-3">
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

		{#if data.studios.length > 0}
			<ul class="space-y-2">
				{#each data.studios as studio (studio.handle)}
					<li>
						<a
							href="/studios/{studio.handle}"
							class="lm-tile lm-tile--flow flex min-h-14 items-center justify-between gap-3 p-3"
						>
							<span class="font-semibold">{studio.name}</span>
							<span class="text-sm text-muted-foreground">
								{studio.published ? 'Publiée' : 'Brouillon'} · {ROLE_LABELS[studio.role]}
							</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}

		{#if data.canOpen}
			<section class="space-y-3" aria-labelledby="new-studio">
				<h2 id="new-studio" class="text-xl font-bold">
					{data.studios.length > 0 ? 'Ouvrir une autre fiche' : 'Ouvrir la fiche de ton studio'}
				</h2>
				{#if form?.error}
					<p role="alert" class="lm-alert p-3 text-sm">
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
						Nom du studio
						<input
							name="name"
							required
							autocomplete="off"
							maxlength={MAX_STUDIO_NAME}
							value={form?.name ?? ''}
							placeholder="Studio du Canal"
							class="lm-field w-full"
						/>
					</label>
					<button disabled={sending} class="lm-btn disabled:opacity-60">Créer la fiche</button>
				</form>
				<p class="text-sm text-muted-foreground">
					Tu en seras la personne responsable. Rien n’est visible avant que tu publies la fiche.
				</p>
			</section>
		{:else}
			<section class="lm-tile lm-tile--flow space-y-3 p-4">
				<h2 class="font-semibold">Un studio se gère avec un métier du son</h2>
				<p class="text-sm text-muted-foreground">
					Ajoute le métier d’ingé son ou de producteur·rice pour ouvrir la fiche de ton studio.
				</p>
				<a href="/reglages/metiers" class="lm-btn" data-variant="ghost">Mes métiers →</a>
			</section>
		{/if}
	</div>
</div>
