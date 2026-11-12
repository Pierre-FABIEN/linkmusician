<script lang="ts">
	// LINKMUSICIAN: noter une idée de morceau (P3-11), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import SEO from '#lib/components/SEO.svelte';
	import RolePicker from '#lib/components/linkmusician/works/RolePicker.svelte';
	import { MAX_WORK_TITLE } from '#lib/works/rules';

	let { data, form } = $props();
	let sending = $state(false);
</script>

<SEO title="Nouvelle idée de morceau" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-4xl space-y-6">
		<div class="space-y-2">
			<a href="/morceaux" class="text-sm text-muted-foreground underline">← Mes morceaux</a>
			<h1 class="lm-title">Nouvelle idée</h1>
			<p class="text-sm text-muted-foreground">
				Elle ne se voit que de ton équipe tant qu’elle n’est pas composée.
			</p>
		</div>

		{#if form?.error}
			<p role="alert" class="lm-alert p-3 text-sm">
				{form.error}
			</p>
		{/if}

		<form
			method="POST"
			class="space-y-6"
			use:enhance={() => {
				sending = true;
				return async ({ update }) => {
					await update();
					sending = false;
				};
			}}
		>
			<label class="block space-y-1">
				<span class="text-sm font-medium">Titre (même provisoire)</span>
				<input
					name="title"
					required
					maxlength={MAX_WORK_TITLE}
					value={form?.values?.title ?? ''}
					placeholder="Sans titre n° 3"
					class="lm-field block min-h-11 w-full"
				/>
			</label>

			{#if data.bands.length > 0}
				<label class="block space-y-1">
					<span class="text-sm font-medium">Ce morceau est</span>
					<select
						name="band"
						class="lm-field block min-h-11 w-full"
						value={form?.values?.band ?? data.defaultBand}
					>
						<option value="">À moi</option>
						{#each data.bands as b (b.handle)}
							<option value={b.handle}>Au groupe {b.name}</option>
						{/each}
					</select>
				</label>
			{/if}

			<RolePicker families={data.families} legend="Ton rôle sur ce morceau" id="mine" />

			<button disabled={sending} class="lm-btn disabled:opacity-60">
				{sending ? 'Un instant…' : 'Noter l’idée'}
			</button>
		</form>
	</div>
</div>
