# Prompt de reprise — après ARCH-MET-02a (#56)

```markdown
Reprends LinkMusician dans /home/utilisateur/linkmusician après ARCH-MET-02a.
Travaille directement sur main, sans push. Commence par git status, les commits
locaux, git ls-remote origin refs/heads/main ; fetch si nécessaire.

Base publiée de ce lot : b30edaa, audit ARCH-MET-01. L'utilisateur a demandé la
suite le 15/11/2026 ; recommandations reçues, issue distincte #56 créée.
Livraison locale ARCH-MET-02a terminée le 16/11/2026 : retrouver son SHA dans
git log et revérifier sa publication. Recette : 1 368 unitaires, suite PostgreSQL
409 tests dont 11 courses à barrières, 5 E2E sans reprise, check 0/0. Lint ciblé
vert ; lint global préexistant limité aux scripts .shot-*. Aucune migration
créée ni preuve de déploiement de production.

Lis CLAUDE.md, CONTRIBUTING.md, docs/plan/README.md (recette de fin),
fin-du-projet.md, a-trancher.md et conception/17-audit-capacites-services.md,
notamment la réception R1. Relis #55/#56, #36 et #51–#54, #30/#35/#50 et les
éventuelles nouvelles issues de correction ; utiliser leurs critères actuels.

ARCH-MET-02a caractérise R1 sur b30edaa : vraie erreur PostgreSQL 40P01 sous
barrières composition/adhésion. Correction ciblée : groupes avant moteur et
union des acteurs avant les émissions successives, dans le même tx. Ne pas
réduire cette union à chaque événement. Préserver les périodes historiques des
membres, les candidats présentateurs figés puis relus conditionnellement, et
l'union concert/tournée. collaboration: puis work: restent avant toute écriture
de participant/collaboration ; relecture après attente/suppression du morceau.
Ce lot ne garantit pas la concurrence de tous les circuits ni ne règle R2/R3/R4.

Suite recommandée : ARCH-MET-02b, gardes Work et révocation concurrente.
Créer/vérifier son issue distincte avant le code. Caractériser la révocation
pendant l'attente, puis harmoniser décision de gestion et prédicat de liste,
sans confondre équipe, gestion et visibilité. Contrôler setDemo, removeOpenRole
et création pour groupe. Décider les opérations partageant band/work selon le
contrat 02a ; aucun verrou SQL gardé pendant un appel réseau de média sans analyse
et compensation. MEMBER, crédit, métier ou mandat ne donnent pas de gestion.
ARCH-MET-03 extrait seulement les helpers nécessaires, façade works stable.
ARCH-MET-02c (proposition concurrente) est indépendant de SELF et reste distinct.

Ensuite seulement, #51 SELF/HOME sur Work existant, après validation de son
modèle exact ; puis #52 rôles existants/actes propres, #53 faits et preuves,
#54 parcours. Aucune étape autonome, version ou validation livrée par 02a.
Pas de faux collaboration.completed, consentement déduit de confirmedAt,
nouveau Project générique, Studio public HOME, WorkPitch ou métier bientôt activé.

Préserver WorkCreditAct, CollaborationAppreciationAct, périodes, rollback,
lectures privées, export complet, anonymisation et cascades. Ne reconstruire
aucun acte depuis les anciens états, updatedAt, notifications ou événements.
Catalogues/tracks/rôles/spécialités existants, permissions contextuelles,
blocages/mineur·es/quotas conservés ; core pur, XP append-only et jamais preuve,
permission ou tri. org:/studio: gardent leurs circuits propres.

Une session = un lot ; tests déterministes et recette adaptée. Jamais check
pendant E2E. Lint global préexistant réservé aux deux scripts .shot-* ; ne pas
les modifier par opportunisme. Mettre à jour docs et issues avec preuves et
limites, commit local en français avec l'ID, sur main, sans push. Publication
GitHub et migration dev/e2e ne prouvent aucun déploiement de production.
```
