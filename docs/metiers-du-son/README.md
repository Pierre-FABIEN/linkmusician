# Métiers du son (phase 4)

L'ingé son, puis la productrice ou le producteur (P4-04) et le studio
(P4-03). Conception : [08 §5 à §7](../conception/08-carrieres-par-role.md#5-ingé-son--sound_engineer--phase-4),
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

## À venir

- **P4-02b** : quêtes de l'ingé son (08 §5) et rang affiché sur le
  profil et dans l'espace.
- **P4-05** : annonces ciblées sur un métier et une spécialité.
- **P4-06, P4-07** : sessions liées au morceau, crédits confirmés.
