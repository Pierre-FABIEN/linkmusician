<script lang="ts">
	/**
	 * LINKMUSICIAN: demande de vérification d'une organisation (P3-09, P5-02),
	 * pour sa gestion : SIRET (contrôlé dans la base Sirene) et lien officiel,
	 * puis contrôle à la main par l'équipe. Posée sur le groupe et le studio ;
	 * le lieu et l'organisateur suivront.
	 */
	import { enhance } from '$app/forms';
	import { BadgeCheck } from 'lucide-svelte';

	type Status = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED';
	let {
		verification,
		noun,
		title,
		closed = false,
		error = null
	}: {
		verification: {
			verifiedAt: Date | string | null;
			last: { status: Status; reason: string | null } | null;
		};
		/** « Le groupe », « Le studio » : sujet des phrases. */
		noun: string;
		/** Titre de la section (« Groupe vérifié »). */
		title: string;
		/** Organisation dissoute : plus de demande possible. */
		closed?: boolean;
		error?: string | null;
	} = $props();

	const last = $derived(verification.last);
</script>

<section class="space-y-3" aria-labelledby="verify-title">
	<h2 id="verify-title" class="flex items-center gap-2 text-xl font-bold">
		<BadgeCheck class="size-5" aria-hidden="true" />
		{title}
	</h2>
	{#if verification.verifiedAt}
		<p class="text-sm">{noun} est vérifié : le badge s’affiche sur sa page publique.</p>
	{:else if last?.status === 'PENDING'}
		<p class="text-sm" role="status">
			La demande est en cours d’examen par l’équipe. Le badge apparaîtra dès qu’elle sera acceptée.
		</p>
	{:else if !closed}
		<p class="text-sm text-muted-foreground">
			{noun} est déclaré (association, entreprise) ? Donnez son SIRET et son site ou réseau officiel :
			le SIRET est contrôlé dans la base des entreprises, puis l’équipe vérifie à la main. Le badge «
			vérifié » rassure les lieux et les organisateurs, et permet de valider des concerts. Ça ne rapporte
			pas de points.
		</p>
		{#if last?.status === 'REJECTED' || last?.status === 'REVOKED'}
			<p class="rounded-md border border-destructive/50 p-3 text-sm">
				{last.status === 'REVOKED'
					? 'Vérification retirée'
					: 'Dernière demande refusée'}{last.reason ? ` : ${last.reason}` : '.'}
			</p>
		{/if}
		{#if error}
			<p role="alert" class="lm-alert p-3 text-sm">
				{error}
			</p>
		{/if}
		<form
			method="POST"
			action="?/requestVerification"
			class="grid gap-3 sm:grid-cols-2"
			use:enhance={() =>
				async ({ update }) =>
					update({ reset: false })}
		>
			<label class="block space-y-1 text-sm font-medium">
				SIRET
				<input
					name="siret"
					required
					inputmode="numeric"
					autocomplete="off"
					placeholder="123 456 789 00012"
					class="lm-field w-full"
				/>
			</label>
			<label class="block space-y-1 text-sm font-medium">
				Site ou réseau officiel
				<input
					name="officialUrl"
					type="url"
					required
					placeholder="https://www.instagram.com/…"
					class="lm-field w-full"
				/>
			</label>
			<button class="lm-btn sm:w-fit">Demander la vérification</button>
		</form>
	{/if}
</section>
