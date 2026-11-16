# Prompt de reprise — après ARCH-MET-02b, proposition concurrente

```markdown
Reprends LinkMusician dans /home/utilisateur/linkmusician. Une session = un lot.
Travaille directement sur main, sans push. Commence par git status, git log
et git ls-remote origin refs/heads/main ; fetch si nécessaire, en préservant
les commits et toutes les modifications présents.

État vérifié le 16/11/2026 : main propre, HEAD et origin/main à
cba0234caa3681e3ae26931de65ca28e48253e0e, confirmé par ls-remote.
ARCH-MET-02a (8cdf0b5) et ARCH-MET-02b (cba0234), ainsi que la préparation
5e9d6b3, sont publiés. #55/#56/#57 sont closes. Les récits « livré localement »
dans le suivi décrivent leur livraison initiale ; les issues distinguent la
publication ultérieure. Aucun déploiement de production établi.
Ce prompt est une préparation documentaire, pas une réalisation de 02c.

Recette 02b : 1 368 unitaires, 461 tests ciblés dans 44 fichiers, 3 intégrations
médias séparées et 6 E2E sans reprise réussis ; types sans erreur/avertissement,
lint ciblé conforme et réserves globales .shot-* préexistantes consignées.
Les 36 cas de gestion et les 11 barrières 02a passent. Aucune migration 02b.

Lis CLAUDE.md, CONTRIBUTING.md, docs/plan/README.md (§4 et recettes 02a/02b),
docs/plan/fin-du-projet.md (fiche 02c et dépendances), docs/plan/a-trancher.md,
docs/conception/17-audit-capacites-services.md (R1/R2 corrigés, R3/R4 distincts),
et les documentations collaborations/messages concernées.
Revérifie les publications et critères actuels au démarrage ; ne rejoue pas
les anciennes recettes sans lien avec les chemins modifiés.

Réalise uniquement ARCH-MET-02c : une proposition effective par conversation
et jour. Ce lot est indépendant de SELF.
Relis #55/#56/#57 et recherche une issue 02c existante ; crée une issue
distincte avant le code si elle manque, sans doublon, puis note-la dans le plan.

Commence par caractériser R3 avant correction, avec de vraies transactions
PostgreSQL sur e2e et des barrières déterministes : proposeCollaboration fait
actuellement son count avant la transaction de création. Deux requêtes peuvent
passer ensemble, puis créer deux collaborations et deux notifications. Conserve
le test rouge et sa preuve, puis fais-le passer avec la correction.

Défaut produit : conserver la règle existante, sans l’élargir silencieusement.

- Clé commune : conversationId + happenedOn normalisé au jour UTC stocké ;
  pas le jour courant, ni une clé par proposant ou par type de prestation.
- PROPOSED, ACCEPTED et COMPLETED bloquent une autre proposition pour cette
  conversation/date ; CANCELLED permet une nouvelle ligne après annulation.
- Le doublon est refusé avec CollaborationError et le comportement existant ;
  ne retourne pas un ancien objet susceptible d’exposer des données nouvelles.
- Une nouvelle proposition ne réactive ni n’efface l’ancienne : actes humains,
  auteurs et consentements restent attachés à leurs lignes respectives.
  Consigne ce contrat dans la conception. Si un point réellement ouvert reste
  nécessaire, applique un défaut prudent et note-le dans a-trancher.md.

Correction minimale dans collaborations/service.ts et ses tests : prendre une
clé de proposition partagée, relire le count dans le tx, puis créer collaboration,
participants et notification dans ce même TransactionClient. Examiner tous les
chemins de création ; aucun count hors transaction ne suffit à l’unicité.
Analyser annulation/nouvelle création et l’ordre des clés avec collaboration:,
work: et band:. N’ajouter un verrou à l’annulation que si nécessaire, sans
inverser ses clés existantes. Aucun verrou SQL durant un appel réseau.
L’idempotence XP d’un événement ne déduplique pas deux collaborations distinctes.
Préserver les signatures publiques, erreurs, consentements, actes humains,
lectures privées, mineur·es/blocages/quotas et gardes des ressources liées.
Aucun ancien acte reconstitué ni collaboration.completed artificiel.

Critères de fin à prouver :

1. Deux créations simultanées donnent une seule collaboration effective, une
   seule notification et un refus contrôlé, jamais une erreur SQL brute.
2. Même protection si chacun des deux participants propose, ou si les types
   diffèrent ; deux dates ou conversations distinctes restent indépendantes.
3. PROPOSED/ACCEPTED/COMPLETED refusent le doublon ; annulation puis nouvelle
   proposition suit le contrat, y compris la course annulation/création.
4. Un échec de notification ou d’écriture annule collaboration et participants ;
   le nouvel essai réussit sans ligne, validation ni notification orpheline.
5. Une finalisation ultérieure de la proposition conservée ne double aucun
   événement, crédit, acte humain ou gain du fait de la course initiale.
   Tester l’ordonnancement avec barrières ; un simple Promise.all ne suffit pas.
   Ajouter ou adapter un E2E de propositions selon le parcours réellement touché.

Contrat à préserver : collaboration → work avant toute écriture de participant ;
work → band avant acteurs, union triée transactionnelle des acteurs des
émissions successives, périodes historiques et candidats présentateurs figés
puis traités conditionnellement. Les mutations Work relisent existence et
gestion sous work/band ; OWNER/ADMIN actifs d’un BAND vivant seulement,
ou personne porteuse. Ni MEMBER ni crédit ni métier ni mandat ne gèrent.
La création préalloue un identifiant Work privé pour suivre work → band.
La préparation oEmbed est hors verrous SQL ; média neuf, publication et
association sont atomiques et se compensent par rollback SQL, sans DELETE
de média existant ou partagé. Ne pas réintroduire une transaction imbriquée.

Recette : scénarios à barrières du lot et non-régressions justifiées,
11 barrières 02a et gestion 02b si leurs chemins sont touchés ; check,
unitaires, lint et E2E concernés sans reprise. Jamais check pendant E2E.
Les scripts .shot-metro.mjs/.shot-tmp.mjs gardent leurs écarts préexistants :
les consigner, sans nettoyage opportuniste, et vérifier lint ciblé séparément.
Les tests SQL qualifiés doivent définir DATABASE_URL avec le même schéma e2e
que leur client Prisma, sans exposer ses secrets.

Aucune migration imposée : préférer la stratégie minimale démontrée suffisante.
Si une contrainte devient nécessaire, auditer les doublons existants avant
migration, sans les supprimer automatiquement ; présenter la stratégie avant
exécution, db:migrate --create-only, db:nettoyer-migration, relecture puis
db:deploy et db:deploy:e2e, jamais prisma migrate directement. Retour applicatif cohérent conservant les données,
avec documentation du risque réintroduit. R4, extraction ARCH-MET-03 et
SELF #51–#54 restent distincts. #36 et #30/#35/#50 restent les références ;
le modèle exact de #51 doit être validé avant son code.
Aucun SELF/HOME, WorkPitch, Project générique ou métier futur dans 02c.

Termine le lot : conception, docs de domaine, tableau, preuves, issue,
prompt suivant et commit local en français avec ARCH-MET-02c, sans push.
Distingue résultats locaux, publication GitHub et production ; signale tout
critère restant au lieu de le présenter comme livré.
```
