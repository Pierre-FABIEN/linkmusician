# Prompt de reprise — ARCH-MET-02b, gestion Work et révocation concurrente

```markdown
Reprends LinkMusician dans /home/utilisateur/linkmusician et réalise le lot
ARCH-MET-02b : sécuriser les mutations de gestion des morceaux contre une
révocation concurrente, selon le plan des issues.

Travaille directement sur main, sans push. Commence par git status, git log
et git ls-remote origin refs/heads/main ; fetch si nécessaire, en préservant
toutes les modifications présentes. Une session = un lot.

État vérifié le 16/11/2026 : ARCH-MET-02a, commit 8cdf0b585bd4c79f7ea4598dfe98c03ebab17568,
est maintenant publié sur origin/main. #55 et #56 sont closes ; la mention
« livraison locale » dans leurs historiques doit être distinguée de cet état
publié, à revérifier au démarrage. Aucun déploiement de production établi.
Recette 02a : 1 368 unitaires, suite PostgreSQL 409 tests dont 11 scénarios à
barrières, 5 E2E sans reprise, check 0 erreur/0 avertissement. Lint ciblé vert ;
échecs globaux préexistants des scripts .shot-* documentés dans le plan.

Lis CLAUDE.md, CONTRIBUTING.md, docs/plan/README.md (recette de fin),
docs/plan/fin-du-projet.md (fiche ARCH-MET-02b), docs/plan/a-trancher.md,
docs/conception/17-audit-capacites-services.md (R2 et réception R1),
docs/morceaux/README.md et les règles de groupes/structures concernées.
Relis les critères actuels de #55/#56 et recherche une éventuelle issue
ARCH-MET-02b existante. Crée son issue distincte avant le code si elle manque,
sans doublon, puis note son numéro dans le plan. #36, #51–#54 et #30/#35/#50
restent les références du chantier suivant, sans élargir ce lot à SELF.

Objectif et périmètre :

1. Caractériser R2 sur la base actuelle avec de vraies transactions PostgreSQL
   et des barrières déterministes. Une mutation qui attend pendant qu'une
   révocation est validée doit ensuite relire les droits et être refusée.
   Distinguer cette situation d'une mutation déjà autorisée et sérialisée avant
   la révocation ; définir le point de décision plutôt que promettre une
   annulation rétroactive de toute transaction concurrente.
2. Inventorier les mutations Work soumises à gestion et les listes qui les
   proposent. Harmoniser décision de gestion et prédicat de liste, sans
   confondre gestion, équipe et visibilité publique. Une personne gère son
   morceau ; pour un groupe vivant, seuls OWNER/ADMIN actifs gèrent.
   MEMBER, crédit, métier ou mandat ne donnent aucun droit de gestion.
3. Couvrir explicitement createWork pour un groupe, setDemo (média existant
   et nouveau lien), removeOpenRole, ainsi que les autres mutations de gestion
   identifiées. Relire l'existence du morceau et du porteur après attente.
   Conserver le DELETE conditionnel d'un rôle libre : aucun rôle crédité ni
   rôle d'un autre morceau ne doit être supprimé par cette commande.
4. Pour setDemo, examiner addExternalMedia et ses effets avant de choisir
   l'orchestration. Préparer le réseau hors de la transaction critique quand
   possible, puis revérifier les droits et le média avant l'association.
   Définir et tester la compensation en cas de révocation, suppression ou
   échec ; ne jamais supprimer un média existant ou déjà utilisé par autrui.
   Ne pas conserver de verrou SQL pendant un appel réseau sans analyse
   explicite de sa durée et des effets à compenser.

Fichiers à examiner : src/lib/server/works/service.ts,
src/lib/server/organizations/access.ts, src/lib/server/bands/service.ts,
les routes morceaux et les tests de ces domaines. Un helper works/access.ts
est possible si nécessaire ; conserver les exports publics de works/service.ts
et utiliser le db/TransactionClient fourni par l'appelant. ARCH-MET-03 reste
une extraction distincte, pas une réécriture générale dans ce lot.

Contrat de concurrence à préserver :

- collaboration: puis work: avant toute écriture de participant/collaboration ;
- pour un morceau existant partageant les clés, work: puis band: avant les
  acteurs du moteur ; décider explicitement le protocole de création du morceau ;
- coordonner les mutations avec la même clé band: que les changements
  d'adhésion/rôle, puis relire la gestion sous cette protection ;
- conserver l'union triée de tous les acteurs avant les événements successifs,
  les périodes historiques et les candidats présentateurs figés puis traités
  conditionnellement. Un tri isolé par événement ne suffit pas ;
- aucun tx imbriqué indépendant ni cache de permission. Préserver rollback,
  relecture après suppression de Work et absence d'événement/crédit orphelin.

Recette attendue :

- tests à barrières révocation/rétrogradation contre mutations Work et création
  pour groupe ; mutation refusée après révocation validée pendant l'attente ;
- courses maquette/suppression, rôle libre/attribution et compensation média,
  avec rollback des effets SQL et absence de suppression indue de média ;
- accès direct service et POST forgé : refus d'un MEMBER, crédité ou tiers ;
  listes cohérentes avec les droits, projections public/équipe sans fuite privée ;
- rejouer les 11 barrières 02a et les intégrations pertinentes works, bands,
  collaborations, milestones et progression ; étendre seulement si justifié ;
- npm run check, npm run lint, npm run test:unit -- --run et E2E des parcours
  touchés. Jamais check pendant E2E. Ne pas corriger opportunément les scripts
  .shot-metro.mjs/.shot-tmp.mjs ; consigner les échecs globaux préexistants et
  vérifier séparément Prettier/ESLint sur les fichiers du lot.

Préserver WorkCreditAct, CollaborationAppreciationAct, consentements explicites,
lectures privées, export complet, anonymisation et cascades. Aucun acte ancien
reconstitué depuis états, updatedAt, notifications ou événements. Catalogues,
tracks, rôles et spécialités existants ; blocages, mineur·es et quotas conservés.
Core pur ; XP append-only, jamais preuve, permission ou critère de tri.
org:/studio: gardent leurs circuits propres.

Aucune migration attendue ; si elle devient nécessaire, justifier le changement
et suivre les scripts db:* du dépôt, avec revue du SQL. Retour par revert
applicatif cohérent conservant les données, en documentant le retour du risque R2.
ARCH-MET-02c (proposition concurrente) et R4 restent distincts. Aucun SELF/HOME,
WorkPitch, Project générique, métier futur ou faux collaboration.completed
à introduire dans ce lot. Le modèle exact de #51 reste à valider avant son code.

Termine le lot : mettre à jour conception, documentation de domaine, tableau
et preuves de recette, ainsi que l'issue concernée. Créer un commit local en
français avec ARCH-MET-02b, sans push. Distinguer résultats locaux, publication
GitHub et déploiement de production. Actualiser ce prompt pour la suite réelle
et signaler tout critère restant plutôt que le présenter comme livré.
```
