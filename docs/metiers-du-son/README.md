# Métiers du son (phase 4)

L'ingé son (P4-02), la productrice ou le producteur (P4-04), puis le
studio (P4-03). Conception : [08 §5 à §7](../conception/08-carrieres-par-role.md#5-ingé-son--sound_engineer--phase-4),
barème en [02 §2.2](../conception/02-progression.md#22-barème-première-version-à-calibrer).

## Barème et rangs (P4-01)

- **Noyau pur** : `src/lib/server/progression/core/crafts.ts`
  (prestations et piste créditée), `bareme.ts` (`services`,
  `releaseCreditVerified`), `rules/collaborationCompleted.ts`,
  `rules/releaseCreditVerified.ts`, `tiers.ts` (`craftTier`,
  `studioTier`).
- Une collaboration porte la prestation de chaque pro (`services`) :
  l'ingé son gagne sur la piste `SOUND_ENGINEER`, la productrice sur
  `PRODUCER`, les musicien·nes sur `MUSICIAN`. Aucun service n'émet
  encore `services` : c'est P4-06 qui reliera les collaborations aux
  morceaux et aux prestations.
- Personas : `personas-son.test.ts`.

## Profil d'ingé son (P4-02a)

- **Modèle** : `SoundEngineerProfile` (spécialités `SoundSpecialty`,
  mobilité `CraftMobility`, matériel en texte libre) et `CraftReference`
  (travaux en écoute, par métier, 6 au plus, liens https).
- **Règles pures** : `src/lib/crafts/sound.ts` ; schéma
  `src/lib/schema/crafts/soundProfileSchema.ts`.
- **Données** : `src/lib/prisma/crafts/soundProfile.ts`, seul point
  d'écriture (hors anonymisation).
- **Écran** : `/profil/son`, réservé à qui a le métier (sinon, lien vers
  « Mes métiers ») ; lien depuis « Mon profil ».
- **Recherche** : `/decouvrir?metier=inge-son&specialite=mixage`. Un·e
  ingé son se trouve dès qu'une spécialité est cochée. Les cartes
  affichent « Ingé son · Mixage, Façade ».
- **Profil public** : carte « Ingé son » (`SoundEngineerCard`). Les
  travaux en écoute sont marqués « ajoutés par la personne, non
  vérifiés » ; les crédits confirmés viendront avec P4-07.
- **Ouverture** : `available: true` dans `src/lib/actors/tracks.ts` (le
  badge « bientôt » disparaît).
- **RGPD** : export (`profil_inge_son`, `travaux_en_ecoute`) ;
  l'anonymisation supprime le profil et les travaux.
- **Tests** : `sound.test.ts`, `soundProfile.integration.test.ts`, cas
  « par métier et spécialité » de `musicians.integration.test.ts`, e2e
  `e2e/linkmusician/inge-son.spec.ts`.

## Rang et objectifs (P4-02b)

- **Noyau pur** : `core/craftSummary.ts` (prestations par type, artistes
  distincts, sorties créditées, lus dans `collaboration.completed` et
  `release.credit_verified`) et `core/craftQuests.ts` (objectifs). Une
  prestation ne compte plus comme collaboration de musicien·ne
  (`musicianSummary`).
- **Lecture** : `src/lib/server/progression/crafts.ts`
  (`getSoundEngineerTier`, `getSoundEngineerProgress`).
- **Objectifs** (08 §5) : spécialités, ville, un travail en écoute, puis
  la première prestation de chaque spécialité cochée (prise de son,
  mixage, mastering, date sonorisée) et trois artistes différents. Les
  prestations s'affichent sans lien tant qu'elles ne se confirment pas
  dans l'app (P4-06). « Répondre à une annonce cherche ingé son » viendra
  avec P4-05.
- **Affichage** : rang sur la carte « Ingé son » du profil public ;
  section « Ingé son » de `/espace/objectifs`, avant celle de musicien·ne
  si c'est le métier principal.

## Producteur·rice (P4-04)

- **Modèle** : `ProducerProfile` (spécialités `ProducerSpecialty` :
  production, arrangement, beatmaking ; mobilité ; logiciels ; tarifs
  indicatifs, une phrase) et `ProducerGenre` (styles produits, 5 au plus,
  genres du référentiel). Les productions en écoute sont des
  `CraftReference` de la piste `PRODUCER`.
- **Commun aux métiers du son** : `src/lib/crafts/common.ts` (mobilité,
  travaux en écoute), `src/lib/prisma/crafts/references.ts`,
  `CraftReferencesFields.svelte`.
- **Écran** : `/profil/production`, même logique que `/profil/son`.
- **Recherche** : `?metier=producteur&specialite=beatmaking`. Les styles
  produits comptent dans le filtre « Style », avec ou sans métier.
- **Profil public** : carte « Producteur·rice » (`ProducerCard`), rang,
  tarifs marqués « indicatifs ».
- **Rang et objectifs** (08 §7) : `getProducerProgress`,
  `nextProducerObjectives`. Spécialités, ville, une production en écoute,
  la première production (ou le premier arrangement), trois artistes, une
  production sortie et vérifiée. « Parcourir la vitrine » viendra avec
  P4-08.
- **RGPD** : export (`profil_producteur`) ; l'anonymisation supprime le
  profil, ses styles et les productions en écoute.
- **Tests** : `producer.test.ts`, `producerProfile.integration.test.ts`,
  cas producteur·rice de `musicians.integration.test.ts` et
  `craftQuests.test.ts`, e2e `e2e/linkmusician/producteur.spec.ts`.

## Annonces par métier (P4-05)

- **Modèle** : `Opportunity.targetTrack` (vide : musicien·nes, comme
  avant), `targetSpecialty`, `workId` (morceau géré par l'émetteur).
- **Règles pures** : `checkTarget` et `unmetConditions` dans
  `src/lib/opportunities/rules.ts`. Un métier du son se cherche par une
  annonce de session ou de prestation ; instrument, niveau et palier
  musicien ne s'y appliquent pas, le genre si (styles produits compris).
- **Diffusion** : `listNearby` ne montre une annonce ciblée qu'aux
  personnes du métier, et de la spécialité si elle est précisée.
  `eligibilityFor` refuse la réponse aux autres.
- **Formulaire** : « Qui cherches-tu ? », spécialité, morceau concerné ;
  préremplissage par `?cible=&specialite=&morceau=`. Sur un morceau composé
  que l'on gère, « La suite du morceau » propose « Trouver un·e ingé son »
  et « Trouver un·e producteur·rice » (`craftAnnounceHref`).
- **RGPD** : métier, spécialité et morceau des annonces dans l'export.
- **Tests** : `rules.test.ts`, `targeted.integration.test.ts`, e2e
  `e2e/linkmusician/annonces-metier.spec.ts`.

## À venir

- **P4-06, P4-07** : sessions liées au morceau, crédits confirmés.
