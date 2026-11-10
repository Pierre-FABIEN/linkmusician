<script lang="ts">
	/**
	 * LINKMUSICIAN: démarche au bon moment (P3-15a, conception 09 §3) : une
	 * phrase et le lien vers la fiche, une à la fois, masquable (« J'ai
	 * compris », mémorisé comme les conseils P2-17).
	 */
	import { FileText } from 'lucide-svelte';

	let {
		nudge
	}: {
		nudge: { id: string; text: string; links: { href: string; label: string }[] } | null;
	} = $props();
	let hidden = $state(false);

	async function dismiss() {
		if (!nudge) return;
		hidden = true;
		try {
			await fetch('/api/guide/tips', {
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
	<aside
		class="flex items-start gap-3 rounded-2xl border border-sky-300 bg-sky-50 p-4 text-sm dark:border-sky-800 dark:bg-sky-950/40"
		aria-label="Démarche"
		data-testid="demarche"
	>
		<FileText class="mt-0.5 size-5 shrink-0 text-sky-700 dark:text-sky-400" aria-hidden="true" />
		<div class="min-w-0 flex-1 space-y-2">
			<p>{nudge.text}</p>
			<div class="flex flex-wrap items-center gap-x-4 gap-y-1">
				{#each nudge.links as link (link.href)}
					<a
						href={link.href}
						class="inline-flex min-h-11 items-center font-medium text-primary underline"
						>{link.label}</a
					>
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
