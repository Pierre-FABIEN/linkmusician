<script lang="ts">
	/**
	 * LINKMUSICIAN: menu compte affiché à la place du tiroir panier
	 * (`cart/Cart.svelte`) quand la boutique est en veille.
	 *
	 * Il reprend les actions du bloc compte du panier (paramètres, accès admin,
	 * déconnexion), sans rien de la boutique.
	 */
	import * as DropdownMenu from '#shadcn/dropdown-menu';
	import { buttonVariants } from '#shadcn/button';
	import { enhance } from '$app/forms';
	import { CircleUser } from 'lucide-svelte';

	type AccountUser = {
		email: string;
		name?: string | null;
		username?: string | null;
		role: string;
	};

	let { user }: { user: AccountUser | null } = $props();

	let signOutForm = $state<HTMLFormElement | null>(null);
	let displayName = $derived(user ? (user.name ?? user.username ?? user.email) : '');
</script>

{#if user}
	<DropdownMenu.Root>
		<DropdownMenu.Trigger
			class={buttonVariants({ variant: 'ghost', size: 'icon' })}
			aria-label="Ouvrir le menu du compte"
		>
			<CircleUser class="size-7" />
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end" class="w-56">
			<DropdownMenu.Label class="truncate">{displayName}</DropdownMenu.Label>
			<DropdownMenu.Separator />
			<DropdownMenu.Item>
				{#snippet child({ props })}
					<a href="/espace" {...props}>Mon espace</a>
				{/snippet}
			</DropdownMenu.Item>
			<DropdownMenu.Item>
				{#snippet child({ props })}
					<a href="/auth/settings" {...props}>Mes paramètres</a>
				{/snippet}
			</DropdownMenu.Item>
			<!-- ADMIN-PLUGIN ▼ lien vers le back-office, visible aux seuls administrateurs. -->
			{#if user.role === 'ADMIN'}
				<DropdownMenu.Item>
					{#snippet child({ props })}
						<a href="/admin" {...props}>Administration</a>
					{/snippet}
				</DropdownMenu.Item>
			{/if}
			<!-- ADMIN-PLUGIN ▲ -->
			<DropdownMenu.Separator />
			<DropdownMenu.Item onSelect={() => signOutForm?.requestSubmit()}>
				Se déconnecter
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Root>

	<!-- Même action que le panier (`/auth?/signout`) : formulaire POST, pour la protection CSRF. -->
	<form bind:this={signOutForm} method="POST" action="/auth?/signout" use:enhance hidden></form>
{:else}
	<!-- Icône seule : la barre de navigation est dimensionnée pour l'icône panier. -->
	<a
		href="/auth/login"
		class={buttonVariants({ variant: 'ghost', size: 'icon' })}
		aria-label="Se connecter"
		title="Se connecter"
	>
		<CircleUser class="size-7" />
	</a>
{/if}
