<script lang="ts">
	// LINKMUSICIAN: choisir son ambition (P3-12), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import SEO from '#lib/components/SEO.svelte';
	import MetroPageHeader from '#lib/components/linkmusician/metro/MetroPageHeader.svelte';

	let { data, form } = $props();
	$effect(() => {
		if (form?.message) toast.success(form.message);
		if (form?.error) toast.error(form.error);
	});
</script>

<SEO title="Mon ambition" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-3xl space-y-6">
		<MetroPageHeader
			kicker="Collab"
			title="Mon ambition"
			intro="Qu’est-ce que tu vises ? On met en avant les objectifs qui t’en rapprochent. Tu peux en changer quand tu veux : il n’y a jamais d’échec, et rien n’est retiré."
		/>
		<form method="POST" use:enhance class="space-y-4">
			<fieldset class="space-y-2">
				<legend class="sr-only">Ton ambition</legend>
				{#each data.choices as a (a.value)}
					<label
						class="lm-tile lm-tile--flow flex min-h-16 cursor-pointer items-start gap-3 p-4 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
					>
						<input
							type="radio"
							name="ambition"
							value={a.value}
							checked={data.ambition === a.value}
							class="mt-1 size-4"
						/>
						<span>
							<span class="block font-semibold">{a.label}</span>
							<span class="block text-sm text-muted-foreground">{a.pitch}</span>
						</span>
					</label>
				{/each}
			</fieldset>
			<div class="flex flex-wrap gap-2">
				<button class="lm-btn">Enregistrer</button>
				{#if data.ambition}
					<button name="ambition" value="" class="lm-btn" data-variant="ghost"
						>Je ne sais pas encore</button
					>
				{/if}
			</div>
		</form>
	</div>
</div>
