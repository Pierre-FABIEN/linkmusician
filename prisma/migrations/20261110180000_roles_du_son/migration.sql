-- P4-07 : rôles du son sur un morceau (prise de son, mixage, mastering,
-- production). Ajout de valeurs seulement : rien à migrer.
-- Retour arrière : PostgreSQL ne retire pas une valeur d'enum ; il faudrait
-- recréer le type après avoir supprimé les rôles concernés.
ALTER TYPE "WorkRoleKind" ADD VALUE 'RECORDING';
ALTER TYPE "WorkRoleKind" ADD VALUE 'MIXING';
ALTER TYPE "WorkRoleKind" ADD VALUE 'MASTERING';
ALTER TYPE "WorkRoleKind" ADD VALUE 'PRODUCTION';
