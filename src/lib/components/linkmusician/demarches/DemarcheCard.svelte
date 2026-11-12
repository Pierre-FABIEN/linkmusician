<script lang="ts">
	/**
	 * LINKMUSICIAN: démarche en contexte (P3-15a, conception 09 §3) : une phrase
	 * et un lien vers la fiche, une seule par écran, masquable (« J'ai
	 * compris »). Elle disparaît aussitôt ; le serveur retient qu'elle ne doit
	 * plus revenir.
	 */
	import { FileDown, Scale } from 'lucide-svelte';
	import type { DemarcheNudge } from '#lib/demarches/triggers';

	let { nudge }: { nudge: DemarcheNudge | null } = $props();
	let hidden = $state(false);

	async function dismiss() {
		if (!nudge) return;
		hidden = true;
		try {
			await fetch('/api/demarches/vu', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ id: nudge.id })
			});
		} catch {
			// Hors ligne : elle reviendra à la prochaine visite, sans gravité.
		}
	}
</script>

{#if nudge && !hidden}
	<aside class="lm-note flex items-start gap-3 p-4 text-sm" data-tone="blue" aria-label="Démarche">
		<Scale class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
		<div class="min-w-0 flex-1 space-y-2">
			<p>{nudge.text}</p>
			<div class="flex flex-wrap items-center gap-x-4 gap-y-1">
				{#each nudge.links as link (link.href)}
					{#if link.download}
						<a
							href={link.href}
							download
							data-sveltekit-reload
							class="inline-flex min-h-11 items-center gap-1 font-semibold text-primary underline"
						>
							<FileDown class="size-4" aria-hidden="true" />{link.label}
						</a>
					{:else}
						<a
							href={link.href}
							class="inline-flex min-h-11 items-center font-medium text-primary underline"
							>{link.label}</a
						>
					{/if}
				{/each}
				<button
					type="button"
					onclick={dismiss}
					class="min-h-11 font-medium text-muted-foreground hover:text-foreground"
					>J’ai compris</button
				>
			</div>
		</div>
	</aside>
{/if}
