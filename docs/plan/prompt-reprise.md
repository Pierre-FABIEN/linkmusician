# Prompt de reprise — après ARCH-MET-01 (#55)

L'audit documentaire est terminé ; aucune refactorisation ou tâche autonome
n'est livrée par ce lot. Les recommandations doivent être validées avant leurs
changements de code et leurs issues séparées.

```markdown
Reprends LinkMusician dans /home/utilisateur/linkmusician après ARCH-MET-01.
Travaille directement sur main, sans push ; commence par git status, les
commits locaux et git ls-remote origin refs/heads/main, puis fetch si nécessaire.

État vérifié le 15/11/2026 :

- Base de l'audit : b0dadf2e96087a26383c1805347be4c2eb815f83, arbre propre.
- origin/main confirmé à cette même base : DASH-05m (5c7f706) et la préparation
  b0dadf2 sont publiés. Le commit ARCH-MET-01 qui suit est local à sa livraison ;
  examiner git log pour son identifiant et revérifier sa publication.
- Migration m appliquée dev/E2E lors du lot précédent, pas rejouée par l'audit.
  Publication GitHub et migrations dev/E2E ne prouvent aucun déploiement de production.

Lis CLAUDE.md, CONTRIBUTING.md, docs/plan/README.md, fin-du-projet.md,
a-trancher.md et docs/conception/17-audit-capacites-services.md. Relis #55,
#36 et #51–#54, les issues de correction éventuellement créées depuis,
et #30/#35/#50 ; consulter les critères actuels, pas seulement leur titre.

Avant de coder, vérifier que l'utilisateur a validé les recommandations de
l'audit et le lot choisi. Le seul audit n'autorise aucune refonte. Après
validation, créer les issues distinctes des corrections/extractions concernées
et suivre le plan ; aucun code ne doit être présenté comme déjà livré.

Priorités proposées :

1. ARCH-MET-02a : caractériser puis corriger les chemins de verrous en cause
   (work/acteurs/band, émissions successives), avec tests déterministes et même tx.
2. ARCH-MET-02b : gestion Work relue et révocation, maquette/rôle libre selon
   ce contrat. ARCH-MET-03 n'extrait que les helpers utiles, façade inchangée.
3. DASH-06a/#51 : premier incrément SELF/HOME sur Work existant, transitions
   TODO/IN_PROGRESS/DONE, responsabilité et actes répétables ; sans métier du
   son, collaboration artificielle, studio public ou nouveau Project générique.
4. #52 : ajout à son crédit existant, rôle unique, acte propre et consentement
   de tiers jamais déduit de confirmedAt. Puis #53 : cohérence des faits de
   production/journey et suggestions, preuve déclarée ; #54 : parcours complet.
5. ARCH-MET-02c (proposition concurrente) est indépendant de SELF ; ne pas
   transformer toutes les extractions facultatives en prérequis universels.

Préserver collaboration: puis work: avant toute écriture de participant ou
collaboration et tout verrou moteur ; relire après attente/suppression du Work.
Le tri des acteurs par événement ne garantit pas l'ordre de toute une transaction.
Respecter band:, org: et studio: selon les circuits actuels. Garder WorkCreditAct,
CollaborationAppreciationAct, périodes, rollbacks, lecteurs privés, export complet,
anonymisation et cascades ; pas de reconstruction historique depuis états,
updatedAt, notifications ou événements moteur. Pas de nouvel effet du journal.

Conserver les référentiels tracks/roles/specializations/catalog, les permissions
contextuelles, consentements, confidentialité, blocages, profils masqués,
mineur·es et quotas. Progression core pure, registre XP en ajout seul ; XP jamais
preuve, permission ou critère de tri. Pas de registre métier→droits redondant.

Ne pas ouvrir Label/Éditeur/Communication ni créer WorkPitch ou options de booking
pour solder #35. #30/#35 et les modules futurs restent ouverts. ONB-12c/#26,
ONB-13b/#27 et recette #28 gardent leurs critères distincts ; pas des dépendances
inventées à SELF. Une étape MEMBER/EXTERNAL ou des versions approuvées restent
d'autres sous-lots de #36, pas une fonction livrée par #51.

Appliquer les scripts de vérification du dépôt pour le code réellement modifié ;
jamais check pendant les E2E. Pour un simple complément documentaire : liens,
références, Markdown et diff, sans migration/seed/recette produit sans motif.
Finir le lot autorisé, mettre à jour docs et issues avec les limites et preuves,
commit local en français avec son ID sur main, sans push ; état local/publié explicite.
```
