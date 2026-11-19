<script lang="ts">
	// LINKMUSICIAN: un diagramme (DIAGRAM-03), voir DiagramDetail.
	import DiagramDetail from '#lib/components/diagram/DiagramDetail.svelte';

	let { data } = $props();
</script>

{#key data.diagram.id}
	<DiagramDetail {data} />
{/key}
