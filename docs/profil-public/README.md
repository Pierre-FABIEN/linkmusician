# Profil public et tableau de bord

Module LinkMusician (lot P1-11, décisions D1 et D19, maquettes P1-02
`/_lab/profil` et `/_lab/tableau-de-bord`).

## Écrans

| Écran             | Route       | Qui           | Montre                                                                                                                                |
| ----------------- | ----------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Profil public     | `/@handle`  | tout le monde | identité, métiers, statut déclaré, commune, instruments, médias publiés, genres, recherche, liens, palier, succès, pastille de niveau |
| Tableau de bord   | `/espace`   | la personne   | niveau, barre d'XP, palier, 3 objectifs, confiance, 20 derniers gains avec leur raison, tous les succès (débloqués ou non)            |
| Masquer le profil | `/reglages` | la personne   | case « Masquer mon profil public » (`Actor.hidden`)                                                                                   |

## Règles

- **Ce qui est public (D1)** : palier, succès, faits confirmés par d'autres
  (collaborations, groupes, concerts, recommandations), et le niveau de
  compte en petite pastille. **Jamais** l'XP, la barre d'XP, le registre,
  la confiance, la date de naissance ni un point de localisation.
  `getPublicProfile` (`src/lib/server/actors/publicProfile.ts`) ne lit que
  ces champs.
- **Visibilité (D19)** : un acteur anonymisé, masqué ou suspendu n'existe
  pas publiquement. Un seul filtre, `publicActorWhere`
  (`src/lib/server/actors/visibility.ts`), sert au profil, aux pages de
  médias et au sitemap. Réponse : 404, sans dire pourquoi. La personne
  elle-même reçoit aussi la 404 quand son profil est masqué ; son tableau
  de bord l'indique.
- **Indexation** : seuls les profils de personnes **majeures** sont
  indexés (`isIndexable`, `src/lib/actors/visibility.ts`) : `noindex`
  sinon, et absents du sitemap. Une date de naissance inconnue vaut refus.
- **Adresse unique** : `/@Lea` redirige (301) vers `/@lea`.
- **Groupes (P3-02)** : `/@handle` sert aussi la page publique d'un groupe
  (`getPublicBand`, composant `BandProfile.svelte`, voir
  [groupes](../groupes/README.md)). Le profil d'une personne cite ses
  groupes actuels (`bandsOfPerson`). Le sitemap (`indexableProfiles`)
  ajoute les groupes formés et non dissous.
- **Morceaux (P3-11)** : carte « Morceaux » (`publicWorksOf`) avec les
  morceaux composés que l'acteur porte et, pour une personne, ceux où son
  crédit est confirmé. Jamais une idée, ni la maquette d'une idée
  (`notIdeaDemo`, voir [morceaux](../morceaux/README.md)).
- **SEO** : titre « Nom (@handle) », description tirée de la bio,
  données structurées `Person` (ou `MusicGroup` pour une structure) avec
  la commune, les instruments et genres (`knowsAbout`) et les liens
  (`sameAs`).
- **Palier** : calculé à la lecture depuis les événements de domaine
  (`getMusicianTier`, résumé pur `core/summary.ts`), pas depuis l'XP. Il
  n'est pas encore projeté dans `ActorProgress.tier`.
- **Objectifs** : `nextObjectives` (noyau pur). Un objectif dont l'écran
  n'existe pas encore (annonces, groupes) s'affiche « Bientôt », sans lien.
- **Fiches des métiers (ONB-12b, D61)** : une carte par métier, construite
  par `publicTrackSheets` (`src/lib/server/actors/trackSheets.ts`, mise en
  forme pure `#lib/actors/trackSheet`). Trois blocs réglés par la personne
  (spécialités et intentions, précisions, conditions) : un·e visiteur·se
  reçoit les blocs publics, un membre inscrit aussi ceux des membres, la
  personne tout. Un bloc invisible ne quitte pas le serveur, même dans
  `__data.json`. « Cherche » (`lookingFor`, copie D58) suit le bloc des
  intentions musicien·ne. Toujours marqué « Déclaré par la personne ».
- **Signaler** : le profil d'un·e autre se signale depuis `/@handle`
  (personne connectée, P1-12).
- **RGPD** : `hidden` figure dans l'export (`profil_public_masque`) ; un
  compte anonymisé est aussi masqué.

## Tests

Pur : `core/summary.test.ts` (résumé et palier), `src/lib/actors/display.test.ts`
(initiales, indexation des mineurs). E2E
`e2e/linkmusician/profil-public.spec.ts` : gain d'une démo visible au
tableau de bord (raison, montant, objectif retiré), profil public sans XP
avec JSON-LD `Person`, redirection des majuscules, masquage depuis
`/reglages` puis 404 du profil et de ses médias, handle inconnu en 404,
contrôle axe du tableau de bord et du profil. Fiches des métiers :
`src/lib/actors/trackSheet.test.ts`, `trackSettings.integration.test.ts`
et `e2e/linkmusician/profil-metiers.spec.ts` (visiteur, membre, personne,
réglage d'un métier non détenu refusé).
