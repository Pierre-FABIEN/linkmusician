-- P3-17 (D47) : nombre d'analyses de l'assistant d'inscription, au plus 3
-- par compte. Ni le texte ni la réponse du modèle ne sont conservés.
ALTER TABLE "persons" ADD COLUMN     "assistantRuns" INTEGER NOT NULL DEFAULT 0;
