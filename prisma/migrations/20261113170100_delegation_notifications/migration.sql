-- Notification dédiée, indépendante des propositions d’accompagnement initiales.
ALTER TYPE "NotificationType" ADD VALUE 'DELEGATION_REQUEST';
-- Retour arrière : supprimer les notifications de ce type puis reconstruire
-- l’enum si nécessaire ; aucune notification existante n’est modifiée ici.
