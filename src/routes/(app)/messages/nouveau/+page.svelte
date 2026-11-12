<script lang="ts">
	// LINKMUSICIAN: premier message (P2-04), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import SEO from '#lib/components/SEO.svelte';
	import { MAX_MESSAGE_LENGTH } from '#lib/messaging/rules';

	let { data, form } = $props();
	let sending = $state(false);
</script>

<SEO title="Écrire à {data.recipient.displayName}" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-4xl space-y-5">
		<h1 class="lm-title">Écrire à {data.recipient.displayName}</h1>
		<p class="text-sm text-muted-foreground">
			C'est une demande : un seul message, jusqu'à ce que {data.recipient.displayName} l'accepte. Présente-toi
			et dis ce que tu as envie de jouer.
		</p>
		{#if form?.error}
			<p
				role="alert"
				class="rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm"
			>
				{form.error}
			</p>
		{/if}
		<form
			method="POST"
			class="space-y-4"
			use:enhance={() => {
				sending = true;
				return async ({ update }) => {
					await update({ reset: false });
					sending = false;
				};
			}}
		>
			<label class="block space-y-1 font-medium">
				Ton message
				<textarea
					name="body"
					rows="5"
					required
					maxlength={MAX_MESSAGE_LENGTH}
					value={form?.body ?? ''}
					placeholder="Salut ! Je joue de la batterie à côté de chez toi, ça te dit une jam ?"
					class="lm-field w-full"
				></textarea>
			</label>
			<button type="submit" disabled={sending} class="lm-btn disabled:opacity-50"
				>Envoyer la demande</button
			>
		</form>
	</div>
</div>
