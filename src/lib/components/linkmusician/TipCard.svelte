<script lang="ts">
	/**
	 * LINKMUSICIAN: conseil en contexte (P2-17) : un seul par écran, masquable
	 * (« J'ai compris »). Le conseil disparaît aussitôt ; le serveur retient
	 * qu'il ne doit plus revenir.
	 */
	import { Lightbulb } from 'lucide-svelte';

	let {
		tip
	}: { tip: { id: string; text: string; link?: { href: string; label: string } } | null } =
		$props();
	let hidden = $state(false);

	async function dismiss() {
		if (!tip) return;
		hidden = true;
		try {
			await fetch('/api/guide/tips', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ id: tip.id })
			});
		} catch {
			// Hors ligne : il reviendra à la prochaine visite, sans gravité.
		}
	}
</script>

{#if tip && !hidden}
	<aside
		class="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950/40"
		aria-label="Conseil"
	>
		<Lightbulb class="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden="true" />
		<div class="min-w-0 flex-1 space-y-2">
			<p>{tip.text}</p>
			<div class="flex flex-wrap items-center gap-x-4 gap-y-1">
				{#if tip.link}
					<a href={tip.link.href} class="font-medium text-primary underline">{tip.link.label}</a>
				{/if}
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
