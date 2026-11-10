<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		class: className = '',
		size,
		children
	}: {
		class?: string;
		size?: 'md' | 'wide' | 'band' | 'big';
		children: Snippet;
	} = $props();
</script>

<div class="lm-jam-shadow-frame {className}" data-size={size}>
	{@render children()}
</div>
