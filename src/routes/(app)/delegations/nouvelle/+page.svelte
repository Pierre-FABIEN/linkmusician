<script lang="ts">
	import { enhance } from '$app/forms';
	import SEO from '#lib/components/SEO.svelte';
	import MetroPageHeader from '#lib/components/linkmusician/metro/MetroPageHeader.svelte';
	let { data, form } = $props();
</script>

<SEO title="Confier un accompagnement" noindex nofollow />
<div class="mx-auto max-w-3xl space-y-6 px-4 pt-6 pb-24">
	<MetroPageHeader
		title="Confier un accompagnement"
		intro="Le collaborateur et l’artiste doivent donner leur accord avant tout accès."
	/>
	{#if form?.error}<p role="alert" class="lm-alert p-3">{form.error}</p>{/if}
	{#if data.mandates.length && data.agencies.length}
		<form method="POST" use:enhance class="space-y-4">
			<label class="block"
				>Accompagnement<select name="representationId" required class="lm-field block w-full"
					>{#each data.mandates as m (m.id)}<option value={m.id} selected={m.id === data.selected}
							>{m.artist.displayName} · {m.kind === 'MANAGER' ? 'Manager' : 'Booker'}</option
						>{/each}</select
				></label
			>
			<label class="block"
				>Agence<select name="agencyId" required class="lm-field block w-full"
					>{#each data.agencies as a (a.id)}<option value={a.id}>{a.name}</option>{/each}</select
				></label
			>
			<label class="block"
				>Collaborateur<input
					name="delegate"
					required
					placeholder="@nom"
					class="lm-field block w-full"
				/></label
			>
			<label class="block"
				>Fin exclue (facultatif)<input
					name="expiresOn"
					type="date"
					class="lm-field block w-full"
				/></label
			>
			<p>
				Les deux personnes doivent participer activement à cette agence. Les dates, territoires et
				activités du mandat parent s’appliquent toujours. Une fin plus proche peut être fixée.
			</p>
			<p>
				Le collaborateur pourra consulter les conditions de l’accompagnement, sans accès aux
				messages, projets privés ni crédits.
			</p>
			<label class="flex items-center gap-3"
				><input type="checkbox" name="allowEnd" value="1" />Autoriser aussi à mettre fin à cet
				accompagnement</label
			>
			<p class="text-sm text-muted-foreground">
				Aucun pouvoir de signature, de candidature pour autrui ni de sous-délégation supplémentaire
				n’est accordé.
			</p>
			<button class="lm-btn">Soumettre l’affectation</button>
		</form>
	{:else}<p>Il te faut un accompagnement confirmé et une participation active à une agence.</p>{/if}
</div>
