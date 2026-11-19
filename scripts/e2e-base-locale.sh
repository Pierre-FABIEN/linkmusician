#!/usr/bin/env bash
# LINKMUSICIAN : base PostgreSQL LOCALE pour les tests E2E (`E2E_DB=local`).
#
# À lancer une fois, sur chaque machine (PC fixe, portable) :
#   sudo bash scripts/e2e-base-locale.sh
#
# Installe PostgreSQL 18 et PostGIS 3 (les versions de Neon : 18.x, 3.6), crée
# le rôle `melokiva` (non superutilisateur) et la base `melokiva_e2e` dont il
# est propriétaire, PostGIS posé dans `public` comme sur Neon. Le service
# démarre avec WSL (systemd). Rejouable sans effet de bord.
#
# Réglages de vitesse **réservés aux tests** (cluster local, aucune donnée
# réelle) : pas de fsync ni d'écriture synchrone, plus de connexions pour les
# parts en parallèle. Ne jamais copier ces réglages vers une vraie base.
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
	echo "À lancer avec sudo : sudo bash scripts/e2e-base-locale.sh" >&2
	exit 1
fi

PG=18
ROLE=melokiva
DB=melokiva_e2e

apt-get update -qq
apt-get install -y -qq "postgresql-$PG" "postgresql-$PG-postgis-3"
systemctl enable --now postgresql

as_pg() { runuser -u postgres -- psql -v ON_ERROR_STOP=1 -qtA "$@"; }

if [ "$(as_pg -c "SELECT 1 FROM pg_roles WHERE rolname = '$ROLE'")" != "1" ]; then
	as_pg -c "CREATE ROLE $ROLE LOGIN PASSWORD '$ROLE'"
fi
if [ "$(as_pg -c "SELECT 1 FROM pg_database WHERE datname = '$DB'")" != "1" ]; then
	as_pg -c "CREATE DATABASE $DB OWNER $ROLE"
fi
# PostGIS n'est pas une extension « de confiance » : posée ici par le
# superutilisateur, dans `public` (la migration P0-04 ne fait alors rien).
as_pg -d "$DB" -c "CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public"

as_pg -c "ALTER SYSTEM SET fsync = off"
as_pg -c "ALTER SYSTEM SET synchronous_commit = off"
as_pg -c "ALTER SYSTEM SET full_page_writes = off"
as_pg -c "ALTER SYSTEM SET max_connections = 400"
as_pg -c "ALTER SYSTEM SET shared_buffers = '1GB'"
systemctl restart postgresql

echo
echo "Base E2E locale prête : postgresql://$ROLE:$ROLE@localhost:5432/$DB"
echo "  $(as_pg -c 'SHOW server_version'), PostGIS $(as_pg -d "$DB" -c "SELECT extversion FROM pg_extension WHERE extname = 'postgis'")"
echo "Lancer : npm run test:e2e:local  (ou npm run test:e2e:local:parallele)"
