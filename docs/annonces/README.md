# Annonces

Module LinkMusician (lot P2-02, conception 02 §8 « quêtes émises »). Pages
`/annonces`, `/annonces/nouvelle` et `/annonces/[id]`, réservées aux
membres.

## Règles

- **Types** : jam, recrutement, session ou remplacement.
- **Aucune XP à la publication** : la quête rapporte quand elle est
  remplie (candidature acceptée, P2-03 ; collaboration confirmée, P2-06).
- **Zone** : la commune de l'auteur (`actor_locations`), lue à la volée ;
  rayon de diffusion de 10 à 100 km. Une annonce est visible des
  personnes situées dans ce rayon. Ville obligatoire pour publier.
- **Conditions** (facultatives) : instrument et niveau déclaré minimal,
  genre, palier musicien. **Jamais l'XP.** Affichées sur l'annonce,
  vérifiées à la candidature (`unmetConditions`, P2-03).
- **Quota d'annonces actives** selon la confiance (TL0 : 1, TL1 : 3,
  TL2 : 5, TL3 : 10).
- **Durée** : 7, 14 ou 30 jours, et au plus le lendemain de la date de
  l'événement. Expiration par la tâche quotidienne
  `/api/jobs/opportunities` (Vercel Cron, 3 h 45) ; les listes filtrent
  aussi les annonces échues à la volée.
- **Visibilité** : jamais l'annonce d'un auteur masqué, suspendu, ou
  séparé de moi par un blocage.
- **Clôture** par l'auteur ; **retrait** par la modération (signalement
  `OPPORTUNITY`, action « Retirer l'annonce » dans `/moderation`).
- **RGPD** : annonces dans l'export, supprimées à l'anonymisation.

## Candidatures (P2-03)

- **Postuler** avec un message (10 à 1 000 caractères), une fois par
  annonce, sur une annonce active qui n'est pas la sienne et dont l'auteur
  est visible (ni bloqué, ni masqué, ni suspendu).
- **Conditions vérifiées** à ce moment-là (`unmetConditions`) : un
  sous-genre déclaré compte pour son genre parent ; le palier vient des
  événements (`getMusicianTier`). Si une condition manque, la page dit
  laquelle et renvoie au profil musical.
- **L'auteur** voit les candidatures sur son annonce (les ouvrir les marque
  « vues ») : présélectionner, accepter, refuser. Pastille du nombre de
  candidatures à trancher sur « Mes annonces ».
- **Accepter ouvre une conversation liée à l'annonce** (créée, ou
  réutilisée si les deux personnes en ont déjà une), avec la candidature
  en premier message. La première réponse de l'auteur rend l'échange
  réciproque : **+30 XP pour chacun** (« Échange abouti sur une annonce »,
  plafond 5 par jour). Places toutes prises : l'annonce passe « Complète ».
- **Le candidat** suit ses candidatures sur `/annonces` (« Mes
  candidatures ») et peut retirer une candidature non tranchée.
- **RGPD** : candidatures envoyées dans l'export, supprimées à
  l'anonymisation (celles reçues partent avec les annonces).
- La proposition de **collaboration** après une acceptation arrive avec
  P2-06.

## Recrutement d'un groupe (P3-03)

- **Au nom d'un groupe** : une personne qui gère le groupe (OWNER ou
  ADMIN) choisit « Publier au nom de » sur `/annonces/nouvelle` (ou suit
  « Publier une annonce de recrutement » depuis `/groupes/[handle]`). Le
  groupe est l'émetteur (`issuerActorId`), la personne est notée
  (`postedById`). Un groupe ne publie **que des recrutements**.
- **Zone** : la ville du groupe (fiche du groupe), obligatoire.
- **Quota** : selon la confiance de la personne qui publie, compté sur les
  annonces actives du groupe (un groupe reste au palier 0).
- **Gestion partagée** : toute la gestion du groupe voit l'annonce dans
  « Mes annonces », la clôture, reçoit la notification de candidature et
  tranche (`managesIssuer`). Un membre du groupe ne postule pas à son
  propre groupe.
- **Accepter** ouvre la conversation entre la candidate et la personne qui
  accepte (+30 XP chacun à la réciprocité, comme P2-03) **et** fait entrer
  la candidate dans le groupe, dans la même transaction
  (`joinFromRecruitment`) : adhésion avec l'instrument recherché comme
  rôle, XP d'adhésion, formation du groupe si c'est le 2ᵉ membre. Une
  invitation ou une demande en attente devient l'adhésion.
- **Page publique du groupe** : « Le groupe recrute » liste ses
  recrutements ouverts.
- **Modération** : un signalement ou un retrait vise la personne qui a
  publié (sa confiance), pas le groupe.
- **RGPD** : les annonces publiées pour un groupe figurent dans l'export
  (`au_nom_du_groupe`) ; à l'anonymisation, elles restent au groupe et
  `postedById` est oublié.

## Code et tests

- Règles pures (formulaire, cycle de vie, éligibilité) :
  `src/lib/opportunities/rules.ts`.
- Service : `src/lib/server/opportunities/service.ts`.
- Candidatures : `src/lib/opportunities/applications.ts` (pur) et
  `src/lib/server/opportunities/applications.ts`.
- Recrutement d'un groupe : intégration
  `PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/opportunities`.
- E2E : `e2e/linkmusician/annonces.spec.ts`,
  `e2e/linkmusician/candidatures.spec.ts`,
  `e2e/linkmusician/recrutement.spec.ts`.

## Plateaux (P5-05a)

- **Publier** : `/plateaux/nouveau` (ou « Publier un plateau ici » depuis
  `/lieux/[id]`, « Publier un plateau » sur `/annonces` et `/profil`).
  Réservé au métier **Organisateur·rice** (`PROMOTER`), majeur·e (D5),
  ville indiquée. Annonce `GIG_SLOT` : un **lieu validé** de l'annuaire
  (D26), une date et une heure (heure de Paris, un an à l'avance au plus),
  le nombre de groupes à l'affiche (1 à 10). Le formulaire général refuse
  ce type (`createOpportunity`). Aucune XP à la publication.
- **Conditions** (facultatives sauf la zone) : **rang minimal du groupe**
  (`minBandTier`, de « Répète » à « Tournée »), genre, zone (10 à 100 km
  autour de l'organisateur·rice). Le rang est la dernière étape au moins
  corroborée du groupe (`bandTierOf`), **jamais l'XP**. Règle pure
  `unmetGigConditions` (`#lib/opportunities/gigSlot`) ; un groupe sans
  ville est hors zone.
- **Candidater au nom d'un groupe** : une personne majeure qui gère le
  groupe (OWNER ou ADMIN) choisit le groupe sur la page du plateau
  (`applyAsBand`). Le groupe est le candidat (`applicantActorId`), la
  personne est notée (`sentById`). **Un groupe hors conditions ne peut pas
  candidater** : la page dit pourquoi, le serveur revérifie. On ne
  candidate pas à titre personnel (`applyTo` refuse), ni avant 18 ans
  (Q31).
- **Accepter** ouvre la conversation entre l'organisateur·rice et la
  personne qui a envoyé la candidature (premier message : « au nom de
  <groupe> »). Le rang prouvé du groupe s'affiche sur la candidature.
- **Fermeture** : les candidatures ferment au début du plateau
  (`expiresAt = startsAt`).
- **Démarche** en contexte : « Un plateau, c'est une date » (premier
  concert, être payé·e pour jouer).
- **RGPD** : les candidatures envoyées pour un groupe figurent dans
  l'export (`candidatures_au_nom_d_un_groupe`) ; à l'anonymisation, elles
  restent au groupe et `sentById` est oublié.
- **Au nom d'une organisation** (P5-05b) : « Publier au nom de » une
  association ou un collectif que l'on gère ; l'organisation est
  l'émettrice, la personne est notée (`postedById`), toute la gestion est
  prévenue des candidatures et les tranche. Voir
  [docs/scene](../scene/README.md#organisations-dorganisateurrices-p5-05b).
- **Plus tard** : la date tenue et confirmée par les groupes (`gig.held`,
  P5-06) rapporte l'XP et fait le rang.

## Annonces qualifiées (ONB-13b, #27, D63)

- **Conditions** (toutes facultatives, `null` = non précisé) sur
  `opportunities` : `pay` (rémunéré, défrayé, au chapeau, bénévole,
  échange, à discuter) et fourchette `payMinEuros`/`payMaxEuros` (seulement
  pour rémunéré ou défrayé ; contrainte SQL `opportunities_pay_range_check`),
  `commitment` (ponctuel, régulier), `presence` (sur place, à distance),
  `formation` et `repertoire` (enums du groupe, D64).
- **Par type** (`normalizeQualification`, `#lib/opportunities/qualification`) :
  engagement pour une annonce de musicien·nes, présence quand un métier du son
  est visé, formation et répertoire pour un plateau, rémunération partout.
  Un champ qui ne s'applique pas n'est jamais gardé.
- **Bloquant seulement si le profil dit le contraire** : « régulier » écarte
  `MusicCommitment = OCCASIONAL` ; « à distance » exige `CraftMobility`
  `REMOTE`, « sur place » `ON_SITE` ou `OWN_PLACE` ; formation et répertoire
  face à `band_profiles` (`formationMatch`, `repertoireMatch` ; un groupe
  « les deux » convient à des reprises). Profil muet : « non précisé »
  (`unknownConditions`, `unknownGigConditions`), jamais exclu. La
  rémunération est informative. Genres et ambition restent des affinités.
  Jamais l'XP.
- **Revérifié sous verrou** : `applyTo` et `applyAsBand` verrouillent
  l'annonce (`FOR UPDATE`), la relisent, revérifient statut, doublon et
  conditions dans la transaction de la candidature.
- **Affichage** : « Ce qui est recherché » sur l'annonce, rémunération sur
  la carte de la liste, « Non précisé : … » pour la personne ou le groupe qui
  regarde. Export RGPD des annonces avec leurs conditions.
- **Tests** : `qualification.test.ts` (scénarios #29 n° 1 à 4 en règles
  pures), `gigSlots.integration.test.ts` (scénarios 1, 3 et 4 en base, clôture
  revérifiée), E2E `annonces-qualifiees.spec.ts`.
- **Migration** : `20261117142644_opportunity_qualification` (ajout seul).
