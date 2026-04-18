#!/usr/bin/env bash
#
# Dimissio Restore Drill
#
# Downloads an encrypted backup from the Storage Box, decrypts it, restores
# into a disposable `dimissio_restore_test` database inside the Postgres
# container, runs row-count spot checks, then drops the test DB.
#
# Usage:
#   bash restore-drill.sh              # defaults to yesterday (UTC)
#   bash restore-drill.sh 2026-04-15   # specific daily dump
#
# Requires: the GPG private key must be available in the calling user's
# keyring. This is intentionally manual — do NOT leave the private key on
# the production host. See ops/backup/README.md §3.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ---------------------------------------------------------------------------
# Load env
# ---------------------------------------------------------------------------
ENV_FILE="${SCRIPT_DIR}/.env"
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}" >&2
  exit 1
fi
# shellcheck disable=SC1090
set -a
source "${ENV_FILE}"
set +a

REQUIRED_VARS=(
  POSTGRES_CONTAINER
  POSTGRES_USER
  RCLONE_REMOTE
)
for var in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "Missing required env var: ${var}" >&2
    exit 1
  fi
done

# ---------------------------------------------------------------------------
# Date argument
# ---------------------------------------------------------------------------
DATE="${1:-$(date -u -d 'yesterday' +%F)}"
if [[ ! "${DATE}" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  echo "Invalid date '${DATE}'. Expected YYYY-MM-DD." >&2
  exit 1
fi

DUMP_NAME="dimissio-${DATE}.dump.gpg"
TEST_DB="dimissio_restore_test"

TMPDIR="$(mktemp -d)"
trap 'rm -rf "${TMPDIR}"' EXIT

echo "→ Restore drill for ${DATE}"

# ---------------------------------------------------------------------------
# Download
# ---------------------------------------------------------------------------
echo "→ Downloading ${DUMP_NAME}"
rclone copy "${RCLONE_REMOTE}/daily/${DUMP_NAME}" "${TMPDIR}/"
if [[ ! -f "${TMPDIR}/${DUMP_NAME}" ]]; then
  echo "Download failed: ${DUMP_NAME} not found on remote" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Decrypt
# ---------------------------------------------------------------------------
echo "→ Decrypting"
gpg --batch --yes --decrypt \
    --output "${TMPDIR}/restore.dump" \
    "${TMPDIR}/${DUMP_NAME}"

# ---------------------------------------------------------------------------
# Fresh test DB
# ---------------------------------------------------------------------------
echo "→ (Re)creating ${TEST_DB}"
docker exec "${POSTGRES_CONTAINER}" dropdb --if-exists -U "${POSTGRES_USER}" "${TEST_DB}"
docker exec "${POSTGRES_CONTAINER}" createdb -U "${POSTGRES_USER}" "${TEST_DB}"

# ---------------------------------------------------------------------------
# Restore
# ---------------------------------------------------------------------------
echo "→ Running pg_restore"
docker exec -i "${POSTGRES_CONTAINER}" pg_restore \
    -U "${POSTGRES_USER}" \
    -d "${TEST_DB}" \
    --no-owner --no-privileges \
  < "${TMPDIR}/restore.dump"

# ---------------------------------------------------------------------------
# Spot-check row counts. A 0 on layoffs/companies/rss_articles is a red flag;
# a 0 on admins can be legitimate. We print, we don't auto-fail — the drill
# is a human sanity check by design.
# ---------------------------------------------------------------------------
echo "→ Spot-check row counts"
docker exec -i "${POSTGRES_CONTAINER}" psql \
    -U "${POSTGRES_USER}" \
    -d "${TEST_DB}" \
    -v ON_ERROR_STOP=1 <<'SQL'
SELECT 'layoffs'                AS table, COUNT(*) FROM layoffs
UNION ALL SELECT 'companies',              COUNT(*) FROM companies
UNION ALL SELECT 'newsletter_subscribers', COUNT(*) FROM newsletter_subscribers
UNION ALL SELECT 'rss_articles',           COUNT(*) FROM rss_articles
UNION ALL SELECT 'admins',                 COUNT(*) FROM admins;
SQL

# ---------------------------------------------------------------------------
# Drop test DB
# ---------------------------------------------------------------------------
echo "→ Dropping ${TEST_DB}"
docker exec "${POSTGRES_CONTAINER}" dropdb -U "${POSTGRES_USER}" "${TEST_DB}"

echo "✅ Restore drill OK for ${DATE}"
