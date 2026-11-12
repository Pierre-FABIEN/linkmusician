import type { Page } from '@playwright/test';
import { db, requireUser } from './db';
import { waitForAppReady, waitForPath } from './flows';

/**
 * LINKMUSICIAN: récapitulatif de l'onboarding (ONB-12a) : le termine, puis
 * attend le premier résultat.
 */
export async function finishRecap(page: Page) {
	await waitForPath(page, '/demarrer/recapitulatif');
	await waitForAppReady(page);
	await page.getByRole('button', { name: 'Terminer mon inscription' }).click();
	await waitForPath(page, '/demarrer/resultat');
}

/**
 * LINKMUSICIAN: raccourci pour les specs qui ne testent pas l'onboarding
 * (P1-10) : choisit le métier musicien, puis marque l'onboarding terminé en
 * base. Le parcours complet est couvert par `onboarding.spec.ts`.
 */
export async function skipOnboarding(page: Page, email: string) {
	await page.goto('/qui-es-tu');
	await waitForAppReady(page);
	await page.getByLabel('Musicien·ne').check();
	await page.getByRole('button', { name: 'Continuer' }).click();
	await waitForPath(page, '/demarrer/instruments');
	const user = await requireUser(email);
	await db.person.update({ where: { userId: user.id }, data: { onboardedAt: new Date() } });
}

/**
 * LINKMUSICIAN: musicien·ne fictif (P2-01), créé directement en base, déjà
 * passé par l'onboarding, avec une commune (point inséré dans le schéma
 * `e2e`, comme le ferait `setActorLocation`). Handle unique par appel.
 */
export async function createMusician(spec: {
	name: string;
	commune: { code: string; nom: string; dep: string; lat: number; lng: number };
	instrument?: [slug: string, level: number];
	genre?: string;
	/** Date de naissance (adulte par défaut). */
	birthDate?: string;
}) {
	const suffix = Math.random().toString(36).slice(2, 8);
	const handle = `${spec.name.toLowerCase().replace(/[^a-z]/g, '')}-${suffix}`;
	const user = await db.user.create({
		data: { email: `${handle}${E2E_MUSICIAN_DOMAIN}`, referralCode: `E2E${suffix}`.toUpperCase() }
	});
	const instrument = spec.instrument
		? await db.instrument.findUniqueOrThrow({ where: { slug: spec.instrument[0] } })
		: null;
	const genre = spec.genre
		? await db.genre.findUniqueOrThrow({ where: { slug: spec.genre } })
		: null;
	const displayName = `${spec.name} ${suffix}`;
	const actor = await db.actor.create({
		data: {
			kind: 'PERSON',
			handle,
			displayName,
			person: {
				create: {
					userId: user.id,
					// Adulte : une date inconnue vaut mineur·e pour la messagerie (D5).
					birthDate: new Date(`${spec.birthDate ?? '1995-06-15'}T00:00:00Z`),
					termsAcceptedAt: new Date(),
					onboardedAt: new Date(),
					instruments: instrument
						? {
								create: {
									instrumentId: instrument.id,
									declaredLevel: spec.instrument![1],
									isPrimary: true
								}
							}
						: undefined
				}
			},
			genres: genre ? { create: { genreId: genre.id } } : undefined
		}
	});
	const { code, nom, dep, lat, lng } = spec.commune;
	await db.$executeRawUnsafe(
		`INSERT INTO "e2e"."actor_locations" ("actorId", "communeCode", "communeName", "departmentCode", "point", "updatedAt")
		 VALUES ($1, $2, $3, $4, public.ST_SetSRID(public.ST_MakePoint($5, $6), 4326)::public.geography, now())`,
		actor.id,
		code,
		nom,
		dep,
		lng,
		lat
	);
	return { handle, displayName, actorId: actor.id, userId: user.id };
}

/** Domaine des comptes créés par `createMusician`. */
export const E2E_MUSICIAN_DOMAIN = '@e2e.linkmusician.test';

/**
 * Supprime des musicien·nes fictifs (et leurs conversations), pour qu'ils
 * ne polluent pas les recherches des specs suivants. À appeler dans un
 * `finally`. Sans argument : tous ceux du domaine e2e.
 */
export async function deleteMusicians(list?: { actorId: string; userId: string }[]) {
	const where = list
		? { id: { in: list.map((m) => m.actorId) } }
		: { person: { user: { email: { endsWith: E2E_MUSICIAN_DOMAIN } } } };
	const actors = await db.actor.findMany({
		where,
		select: { id: true, person: { select: { userId: true } } }
	});
	const actorIds = actors.map((a) => a.id);
	const userIds = actors.flatMap((a) => (a.person ? [a.person.userId] : []));
	await db.conversation.deleteMany({
		where: { participants: { some: { actorId: { in: actorIds } } } }
	});
	await db.actor.deleteMany({ where: { id: { in: actorIds } } });
	await db.user.deleteMany({ where: { id: { in: userIds } } });
}

/** LINKMUSICIAN: choisit sa ville par l'écran `/profil/ville` (communes e2e sans réseau). */
export async function setCity(page: Page, search = 'toulou') {
	await page.goto('/profil/ville');
	await waitForAppReady(page);
	await page.getByLabel('Ta commune').pressSequentially(search, { delay: 50 });
	await page.getByRole('listbox').getByRole('option').first().getByRole('button').click();
	await page.getByRole('button', { name: 'Enregistrer' }).click();
	await page.getByText('Ta ville est enregistrée').first().waitFor();
}

/** LINKMUSICIAN: annonce d'un·e musicien·ne fictif (P2-02), directement en base. */
export async function createOpportunity(
	issuerActorId: string,
	spec: { title: string; expiresInDays?: number; kind?: 'JAM' | 'RECRUIT_MEMBER' | 'SESSION_WORK' }
) {
	return db.opportunity.create({
		data: {
			issuerActorId,
			kind: spec.kind ?? 'JAM',
			title: spec.title,
			description: 'Annonce de test : on cherche quelqu’un pour jouer ensemble.',
			radiusKm: 25,
			expiresAt: new Date(Date.now() + (spec.expiresInDays ?? 14) * 24 * 3600 * 1000)
		}
	});
}

/** LINKMUSICIAN: « Je suis dispo » d'un·e musicien·ne fictif (P2-13), en base. */
export async function createAvailability(actorId: string, hoursLeft = 4, note?: string) {
	const now = Date.now();
	return db.availability.create({
		data: {
			actorId,
			slot: 'TONIGHT',
			startsAt: new Date(now - 3600 * 1000),
			endsAt: new Date(now + hoursLeft * 3600 * 1000),
			note: note ?? null
		}
	});
}

/**
 * LINKMUSICIAN: carte de réputation posée en base (P2-08), comme le ferait le
 * job. Le score sert au tri ; il ne doit jamais apparaître dans une réponse.
 */
export async function setReputation(
	actorId: string,
	card: { confirmedCollabs: number; distinctCounterparts: number; responseBucket?: string },
	internalScore: number
) {
	const data = {
		confirmedCollabs: card.confirmedCollabs,
		distinctCounterparts: card.distinctCounterparts,
		corroboratedGigs: 0,
		verifiedReleases: 0,
		bands: 0,
		distinctEndorsers: 0,
		endorsementsByKind: [],
		responseBucket: card.responseBucket ?? null,
		internalScore,
		computedAt: new Date()
	};
	return db.reputationSnapshot.upsert({
		where: { actorId },
		create: { actorId, ...data },
		update: data
	});
}

/**
 * LINKMUSICIAN: amène une personne au palier Pilier local (P4-13b) en posant
 * en base les faits que lit `musicianSummary` : 10 collaborations avec 5
 * personnes et 10 premiers concerts corroborés, dans 10 groupes. Des
 * identifiants fictifs suffisent : le palier ne lit que les événements.
 */
export async function makeLocalPillar(actorId: string) {
	const tag = Math.random().toString(36).slice(2, 8);
	const rows = [
		...Array.from({ length: 10 }, (_, i) => ({
			type: 'collaboration.completed',
			payload: {
				collaborationId: `e2e-${tag}-c${i}`,
				participantIds: [actorId, `e2e-${tag}-p${i % 5}`]
			},
			actorIds: [actorId]
		})),
		...Array.from({ length: 10 }, (_, i) => ({
			type: 'milestone.attested',
			payload: {
				bandId: `e2e-${tag}-b${i}`,
				milestone: 'FIRST_GIG',
				from: null,
				to: 'CORROBORATED',
				memberIds: [actorId]
			},
			actorIds: [actorId]
		}))
	];
	// Déjà « traités » : le moteur ne les rejoue pas (aucune XP).
	await db.domainEvent.createMany({
		data: rows.map((r) => ({ ...r, processedAt: new Date() }))
	});
}
