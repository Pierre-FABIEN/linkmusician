# Guide des démarches

> Lot P3-15a, livré le 10/11/2026. Décision D42, conception
> [09-demarches.md](../conception/09-demarches.md). Les documents
> préremplis (bulletin de partage, programme des œuvres) arrivent avec
> P3-15b.

LinkMusician explique les démarches de la musique **au moment où elles se
posent** : une phrase et un lien dans l'écran concerné, et une fiche claire
dans `/demarches`. Lire une fiche ne rapporte rien (09 §1.6).

## Comment c'est fait

- **Catalogue** : `src/lib/demarches/catalog.ts` (adresse, moment, titre
  court, résumé, fiche pour les mineur·es). Ajouter une fiche : un fichier
  et une entrée.
- **Contenu** : un fichier Markdown par fiche dans
  `src/lib/demarches/fiches/`. Il commence par un en-tête :

  ```
  ---
  verifie: 2026-11-10
  relue: non
  sources:
    - INPI, « e-Soleau » | https://www.inpi.fr/…
  ---
  ```

  Puis les conventions du centre d'aide ([docs/aide](../aide/README.md)) :
  `# Titre`, `_Accroche_`, `> **En bref**` (trois points au plus), encarts
  `💡 Astuce`, `⚠️ Important`, `🔜 Bientôt`. Ordre conseillé : en bref, les
  étapes numérotées, ce que ça coûte, le détail, à qui s'adresser.

- **Rendu** : `src/lib/server/demarches/render.ts` lit l'en-tête et passe
  le corps au moteur de l'aide (`renderHelp`). La page affiche la date de
  vérification, les sources, et l'avertissement « information générale »
  (plus « pas encore relue » tant que `relue: non`).
- **Pages** : `/demarches` (page-menu par moment, D50) et
  `/demarches/[fiche]`. Publiques, indexées (sitemap), fil d'Ariane (D52).
  Entrée « Les démarches » dans le menu de `/espace`.
- **Tests** (`src/lib/server/demarches/render.test.ts`) : chaque fiche du
  catalogue existe, a un « en bref » d'un à trois points, au moins une
  source, toutes sur un domaine officiel (`OFFICIAL_HOSTS`, https), une
  date de vérification de **moins d'un an**, et des liens internes qui
  existent. Un fichier hors catalogue fait échouer le test.

## Les fiches du lancement

| Fiche                                    | Moment           | Déclencheur dans l'app                    |
| ---------------------------------------- | ---------------- | ----------------------------------------- |
| `proteger-un-morceau`                    | Créer un morceau | Morceau composé                           |
| `ecrire-a-plusieurs`                     | Créer un morceau | Morceau composé, 2 crédits confirmés ou + |
| `premiere-demo` (déclaration des œuvres) | Publier          | Étape « Première démo publique »          |
| `premier-concert` (programme des œuvres) | Jouer en concert | Étape « Premier concert »                 |
| `etre-paye-pour-jouer`                   | Jouer en concert | Premier concert ; annonce de session      |
| `jouer-gratuitement`                     | Jouer en concert | Aucun (liée depuis les autres fiches)     |
| `association-du-groupe`                  | Le groupe        | Groupe formé                              |
| `mineurs-sur-scene` (mineur·es, parents) | Jouer en concert | Un·e membre actif·ve du groupe mineur·e   |

## Les déclencheurs (09 §3)

Règles pures dans `src/lib/demarches/triggers.ts`, testées
(`triggers.test.ts`), même mécanique que les conseils de P2-17 :

- **une seule démarche par écran**, la première du catalogue dont la
  condition tient et qui n'est pas masquée. Groupe : mineur·es d'abord,
  puis l'étape la plus avancée (concert, démo), l'association en dernier ;
- **« J'ai compris »** (`POST /api/demarches/vu`, identifiant vérifié dans
  le catalogue) l'ajoute à `persons.tipsDismissed` avec le préfixe
  `demarche:` : aucune migration, et l'export et l'anonymisation RGPD le
  couvrent déjà (`conseils_masques`) ;
- écrans : fiche du morceau (équipe seulement), page de gestion du groupe
  (membres actifs, pas un groupe dissous), annonce (toute personne qui la
  voit) ;
- la fiche des mineur·es s'annonce **sans dire qui** est mineur·e
  (`bandDemarcheContext` ne compte que les membres actifs, comptes
  supprimés exclus ; test d'intégration).

Écarts avec 09 §3, à revoir si besoin : il n'existe pas d'annonce
« concert » (pas de déclencheur « mineur·e sur une annonce de concert »),
et une annonce n'a pas de champ « rémunérée » : toute annonce de session
déclenche « Être payé·e pour jouer ».

## Fiabilité du contenu

Les fiches ont été écrites le 10/11/2026 d'après les sources officielles
citées dans leur en-tête. Ce qui n'a pas pu être confirmé est écrit
**« à vérifier »** dans le texte : droit d'entrée de la Sacem, règles de
répartition avec un éditeur, plafonds de la pratique amateur en cadre
lucratif, règles pour un·e mineur·e non payé·e, coûts de l'association.

**Avant l'ouverture (P3-10)** : chaque fiche est relue par quelqu'un du
métier (structure d'accompagnement des musiques actuelles en Occitanie,
juriste du spectacle), puis passe à `relue: oui`. Ensuite : relecture au
moins une fois par an (le test échoue au-delà) et à chaque changement de
règle connu.
