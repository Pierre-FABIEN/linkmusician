# Prompt de reprise — ARCH-MET-01 (#55)

Prochaine tâche après DASH-05m : audit des capacités et services métier, puis
plan de modularisation progressif. À copier dans une nouvelle session ; ce
fichier prépare l'audit et ne signifie pas qu'il est réalisé.

```markdown
Reprends LinkMusician dans /home/utilisateur/linkmusician et réalise
ARCH-MET-01 (#55) : l'audit architectural des capacités et services métier,
avant les extensions de projets/tâches de DASH-06 (#36, puis #51–#54).

État de départ vérifié le 15/11/2026 :

- Travail sur main ; arbre propre après DASH-05m, commit local 5c7f706.
- Dernier distant vérifié : origin/main à
  cd7f1557fc18853f7694a59ee31e462e6c65b135 ; DASH-05a à DASH-05l publiés.
- DASH-05m reste local, sans push : registre WorkCreditAct pour les nouveaux
  actes humains des crédits manuels, périodes indépendantes des lignes
  supprimables, lecture personnelle minimale, export/anonymisation RGPD.
- Migration additive 20261115154332_work_credit_acts appliquée en développement
  et sur e2e ; client régénéré. Aucune reconstruction d'acte ancien.
- Une attribution de gestion ne vaut pas consentement. Les crédits automatiques
  ne créent ni attribution manuelle ni nouveau consentement personnel.
- Finalisation de collaboration liée : collaboration: puis work: avant toute
  écriture de participant/collaboration et tout verrou du moteur ; relecture
  après attente, notamment si le morceau a été supprimé.
- Validation DASH-05m : 1 368 unitaires, 74 intégrations distinctes, 4 E2E sans
  reprise ; types sans erreur/avertissement. Lint global bloqué par les scripts
  .shot-metro.mjs et .shot-tmp.mjs préexistants ; ciblé sans erreur.
- Issues #30/#35 consolidées jusqu'à m mais toujours ouvertes ; #36/#52/#55
  précisent les interactions avec le journal. Un commit documentaire de reprise
  peut suivre 5c7f706 : examiner tous les commits locaux et revérifier le distant.

Commence par vérifier l'état réel du dépôt, les commits locaux et origin/main.
Ne confonds ni commit local, publication GitHub, migration appliquée en
développement/e2e, ni déploiement applicatif en production.

Lis CLAUDE.md, CONTRIBUTING.md, docs/plan/README.md,
docs/plan/fin-du-projet.md, docs/plan/a-trancher.md, les conceptions 03,
06, 08 et 10 à 16, et les documents des domaines concernés. Relis les issues
#55, #30, #35, #36, #37, #41–#54 et les dépendances ONB pertinentes ; consulte
leurs critères réels avant de conclure qu'une fonction ou dépendance existe.

Le lot livre un audit documentaire et un plan exploitable, sans refonte ni
fonctionnalité produit. Les changements de code éventuels doivent faire l'objet
de lots/issues séparés après validation de l'audit, comme demandé par #55.
Ne commence pas DASH-06, une vitrine WorkPitch, des options de booking ou
l'activation d'un métier futur dans cette session.

1. Cartographie l'existant à partir du code : métiers/pistes, profils,
   spécialités, offres/besoins, visibilité, structures, mandats, projets,
   crédits, collaborations, opportunités, tâches réellement disponibles,
   notifications, recherche et progression. Suis les routes, appels et tests.
   Distingue disponible, partiel et futur ; ne prends pas la conception cible
   ou un libellé de menu pour une implémentation.
2. Produis une matrice métier × capacité × service partagé × règle spécifique
   couvrant les six métiers ouverts et les trois prévus, sans les activer.
   Distingue métier déclaré, compétence, offre, capacité, permission réelle,
   responsabilité de tâche, crédit, consentement et preuve indépendante.
3. Étaye les doublons, responsabilités croisées, couplages et cycles d'import
   réels avec chemins et exemples. Mesure la complexité utile ; le nombre de
   lignes seul ne justifie pas une extraction. Identifie fonctions métier,
   accès aux données, politiques d'accès, orchestrations et effets secondaires.
4. Définis les frontières et contrats utiles en conservant le monolithe
   modulaire SvelteKit, les façades publiques et les référentiels existants.
   Ne propose un registre typé de capacités que si l'inventaire prouve son
   intérêt ; évite deuxième source de vérité et framework de plugins prématuré.
5. Audite transactions, idempotence, événements et ordres des verrous work:,
   collaboration:, band:, org: et acteurs du moteur. Inclue les registres
   WorkCreditAct et CollaborationAppreciationAct, leurs droits de lecture,
   périodes, rollbacks, export/anonymisation et cascades. Distingue garanties
   démontrées, risques préexistants et points à tester ; ne promets pas une
   sérialisation générale sur la base d'un seul verrou.
6. Vérifie par scénarios documentés : compte multirôle sans duplication ;
   Thomas musicien prenant personnellement l'enregistrement sans métier
   SOUND_ENGINEER ni collaboration artificielle ; étape confiée à un membre
   autorisé ; tiers refusé ; organisateur/booker/manager réutilisant les mêmes
   briques ; métier futur théorique sans activation. Sépare état actuel et
   solution proposée. Documente au moins un comparatif avant/après concret.
7. Propose des petits lots ordonnés par bénéfice/risque : fichiers, contrats,
   dépendances, migration éventuelle, invariants, critères de fin, tests de
   non-régression et retour arrière pour chacun. Explique l'impact sur #30,
   #36/#37, #41–#50 et #51–#54, avec une première étape réalisable de DASH-06.
   Les nouveaux actes de tâches/rôles doivent être cadrés avec leurs mutations,
   sans être déguisés en attribution initiale ou consentement de tiers.

Préserve toutes les règles : permissions contextuelles et consentement,
confidentialité, blocages, profils masqués, mineur·es, quotas, progression pure,
registre XP en ajout seul ; aucune XP comme preuve, droit ou critère de tri.
Aucune notification, réputation ou progression ajoutée par un journal.
Aucune reconstruction historique depuis états, updatedAt ou notifications.

Livrables : document d'audit dans docs/conception/ (numéro disponible à vérifier),
matrice et scénarios, plan de lots dans docs/plan/fin-du-projet.md, état et
preuves dans docs/plan/README.md, liens de navigation et prompt suivant à jour.
Ne modifie aide/démo que si l'audit corrige réellement une description erronée ;
ne présente aucun scénario proposé comme jouable.

Pour ce lot documentaire, vérifie les références au code, les liens et le
formatage Markdown ; n'exécute pas de migrations, seed, tests ou E2E sans
modification ou doute concret qui le justifie. Si une vérification de code
s'impose, applique les scripts du dépôt ; jamais check pendant les E2E.

Actualise les issues concernées avec les acquis, limites et dépendances réels,
sans fermer #30/#35 ni les modules futurs. Ne marque pas des refactorisations
proposées comme livrées. Termine l'audit jusqu'à ses livrables vérifiables,
puis un commit local en français avec ARCH-MET-01, directement sur main,
sans push. Distingue clairement ce qui est local de ce qui est publié.
Ne t'arrête pas à proposer de réaliser l'audit : exécute le lot documentaire.
```
