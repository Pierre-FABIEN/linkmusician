<script lang="ts">
	// LINKMUSICIAN: carnet de contacts (P3-16b), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import SEO from '#lib/components/SEO.svelte';
	import MessagesTabs from '#lib/components/linkmusician/MessagesTabs.svelte';
	import { MAX_GROUP_NAME } from '#lib/contacts/rules';
	import { BookUser, MessageCircle, MessagesSquare, UsersRound } from 'lucide-svelte';

	let { data, form } = $props();

	$effect(() => {
		if (form?.message) toast.success(form.message);
	});

	const writeHref = (c: { conversationId: string | null; handle: string }) =>
		c.conversationId ? `/messages/${c.conversationId}` : `/messages/nouveau?a=${c.handle}`;
	/** Groupe dont la gestion est ouverte. */
	let managing = $state<string | null>(null);
	let newGroup = $state('');
</script>

<SEO title="Contacts" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-7xl space-y-6 lg:space-y-8">
		<h1 class="lm-title">Messages</h1>
		<MessagesTabs current="contacts" />

		{#if form?.error}
			<p role="alert" class="lm-alert p-3 text-sm">
				{form.error}
			</p>
		{/if}

		{#if data.contacts.length === 0}
			<div class="lm-tile lm-tile--flow space-y-2 p-6 text-center">
				<BookUser class="mx-auto size-6 text-primary" aria-hidden="true" />
				<p class="font-semibold">Ton carnet est encore vide.</p>
				<p class="text-sm text-muted-foreground">
					Va à une jam, même sans connaître personne. Après, touche « Garder le contact » sur les
					gens avec qui tu as joué : tu les retrouveras ici, et tu pourras leur écrire sans échanger
					ton numéro.
				</p>
				<a href="/jam" class="inline-block pt-1 font-semibold underline">Trouver une jam</a>
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">
				Les gens avec qui tu as joué ou échangé. Écris-leur ici, sans échanger ton numéro.
			</p>
		{/if}

		<section class="space-y-3" aria-labelledby="groups-title">
			<h2 id="groups-title" class="flex items-center gap-2 text-xl font-bold">
				<UsersRound class="size-5" aria-hidden="true" /> Mes groupes de contacts
			</h2>
			<p class="text-sm text-muted-foreground">
				Rassemble des contacts autour d’un projet : « Projet funk », « Remplaçant·es batterie ».
				Puis ouvre une discussion avec tout le groupe : chacun·e reçoit une invitation et choisit de
				la rejoindre.
			</p>
			{#if data.groups.length > 0}
				<ul class="grid gap-3 md:grid-cols-2" aria-label="Groupes de contacts">
					{#each data.groups as g (g.id)}
						<li class="lm-tile lm-tile--flow space-y-2 p-4">
							<div class="flex items-start justify-between gap-2">
								<span>
									<span class="font-semibold">{g.name}</span>
									<span class="block text-sm text-muted-foreground">
										{g.members.length === 0
											? 'Personne pour l’instant : ajoute des contacts depuis ton carnet.'
											: g.members.map((m) => m.displayName).join(', ')}
									</span>
								</span>
								<button
									type="button"
									class="min-h-11 shrink-0 px-2 text-sm underline"
									aria-expanded={managing === g.id}
									onclick={() => (managing = managing === g.id ? null : g.id)}
									>Gérer<span class="sr-only"> {g.name}</span></button
								>
							</div>
							{#if g.members.length > 0}
								<form method="POST" action="?/openDiscussion" use:enhance>
									<input type="hidden" name="groupId" value={g.id} />
									<button class="lm-btn gap-2"
										><MessagesSquare class="size-4" aria-hidden="true" />Ouvrir une discussion<span
											class="sr-only"
										>
											avec {g.name}</span
										></button
									>
								</form>
							{/if}
							{#if managing === g.id}
								<div class="space-y-3 border-t pt-3 text-sm">
									<form
										method="POST"
										action="?/renameGroup"
										class="flex flex-wrap items-end gap-2"
										use:enhance
									>
										<input type="hidden" name="groupId" value={g.id} />
										<label class="block grow space-y-1 font-medium">
											Nom du groupe
											<input
												name="name"
												required
												maxlength={MAX_GROUP_NAME}
												value={g.name}
												class="lm-field w-full"
											/>
										</label>
										<button class="lm-btn" data-variant="ghost">Renommer</button>
									</form>
									{#if g.members.length > 0}
										<ul class="flex flex-wrap gap-2" aria-label="Membres de {g.name}">
											{#each g.members as m (m.id)}
												<li>
													<form method="POST" action="?/removeFromGroup" use:enhance>
														<input type="hidden" name="groupId" value={g.id} />
														<input type="hidden" name="contactId" value={m.id} />
														<button class="lm-btn" data-variant="ghost"
															>Retirer {m.displayName}</button
														>
													</form>
												</li>
											{/each}
										</ul>
									{/if}
									<form method="POST" action="?/deleteGroup" use:enhance>
										<input type="hidden" name="groupId" value={g.id} />
										<button class="min-h-11 text-destructive underline"
											>Supprimer le groupe {g.name}</button
										>
									</form>
								</div>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
			<form
				method="POST"
				action="?/createGroup"
				class="flex flex-wrap items-end gap-2"
				use:enhance={() =>
					async ({ result, update }) => {
						await update({ reset: false });
						if (result.type === 'success') newGroup = '';
					}}
			>
				<label class="block grow space-y-1 text-sm font-medium">
					Nouveau groupe
					<input
						name="name"
						required
						maxlength={MAX_GROUP_NAME}
						bind:value={newGroup}
						placeholder="Projet funk"
						class="lm-field w-full"
					/>
				</label>
				<button class="lm-btn">Créer</button>
			</form>
		</section>

		{#if data.contacts.length > 0}
			<section class="space-y-3" aria-labelledby="carnet-title">
				<h2 id="carnet-title" class="flex items-center gap-2 text-xl font-bold">
					<BookUser class="size-5" aria-hidden="true" /> Mon carnet ({data.contacts.length})
				</h2>
				<ul class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Mon carnet">
					{#each data.contacts as c (c.id)}
						<li class="lm-tile lm-tile--flow space-y-3 p-4">
							<div class="flex flex-wrap items-start justify-between gap-2">
								<span class="min-w-0">
									<a href="/@{c.handle}" class="font-semibold underline">{c.displayName}</a>
									{#if c.instruments.length > 0}
										<span class="text-sm text-muted-foreground"> · {c.instruments.join(', ')}</span>
									{/if}
									<span class="block text-sm">{c.howWeMet}</span>
									{#if c.bands.length > 0 || c.works > 0}
										<span class="block text-sm text-muted-foreground">
											{#if c.bands.length > 0}Ensemble dans {c.bands
													.map((b) => b.name)
													.join(', ')}{/if}{#if c.bands.length > 0 && c.works > 0}
												·
											{/if}{#if c.works > 0}{c.works === 1
													? 'un morceau ensemble'
													: `${c.works} morceaux ensemble`}{/if}
										</span>
									{/if}
									{#if c.groups.length > 0}
										<span class="block text-sm text-muted-foreground"
											>Dans {c.groups.map((g) => g.name).join(', ')}</span
										>
									{/if}
								</span>
								<a href={writeHref(c)} class="lm-btn shrink-0 gap-2"
									><MessageCircle class="size-4" aria-hidden="true" />Écrire<span class="sr-only">
										à {c.displayName}</span
									></a
								>
							</div>
							{#if data.groups.length > 0}
								<form
									method="POST"
									action="?/addToGroup"
									class="flex flex-wrap items-end gap-2 text-sm"
									use:enhance
								>
									<input type="hidden" name="handle" value={c.handle} />
									<label class="block space-y-1 font-medium">
										Ajouter {c.displayName} à
										<select name="groupId" class="lm-field block">
											{#each data.groups as g (g.id)}
												<option value={g.id}>{g.name}</option>
											{/each}
										</select>
									</label>
									<button class="lm-btn" data-variant="ghost">Ajouter</button>
								</form>
							{/if}
							{#if c.inCarnet}
								<form method="POST" action="?/leaveCarnet" use:enhance>
									<input type="hidden" name="handle" value={c.handle} />
									<button class="min-h-11 text-sm text-muted-foreground underline"
										>Retirer {c.displayName} de mon carnet</button
									>
								</form>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	</div>
</div>
