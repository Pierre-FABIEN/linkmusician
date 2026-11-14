<script lang="ts">
	import SEO from '#lib/components/SEO.svelte';
	import MetroPageHeader from '#lib/components/linkmusician/metro/MetroPageHeader.svelte';
	import ActivityTimeline from '#lib/components/linkmusician/activity/ActivityTimeline.svelte';
	import { AGENT_KIND_INFO, REPRESENTATION_STATUS_LABELS } from '#lib/representation/rules';
	let { data } = $props();
</script>

<SEO title="Historique de l’accompagnement" noindex nofollow />
<div class="mx-auto max-w-3xl space-y-6 px-4 pt-6 pb-24">
	<MetroPageHeader
		title={data.history.artistName}
		kicker="Historique de l’accompagnement"
		intro={`${data.history.agentName} · ${AGENT_KIND_INFO[data.history.kind].label}`}
	/>
	<p>{REPRESENTATION_STATUS_LABELS[data.history.status]}</p>
	<ActivityTimeline
		entries={data.history.activity}
		title="Actes conservés"
		id="mandate-activity-title"
	/>
</div>
