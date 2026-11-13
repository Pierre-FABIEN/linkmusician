-- DASH-02b : type additionnel ; aucune table ni donnée existante modifiée.
ALTER TYPE "OrgKind" ADD VALUE 'AGENCY';
-- Retour arrière : fermer les agences, les archiver, puis reconstruire l'enum
-- sans AGENCY. PostgreSQL ne permet pas de retirer directement une valeur.
