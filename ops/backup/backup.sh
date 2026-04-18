#!/usr/bin/env bash
#
# Dimissio Postgres Backup
#
# Runs on the Hetzner host (not inside Docker). Dumps the Postgres container
# via `docker exec`, encrypts with GPG, uploads to Hetzner Storage Box via
# rclone. Sends Telegram alerts on success and failure.
#
# Install: see ops/backup/README.md

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# DATE is used in alerts and filenames; set early so the ERR trap can reference
# it even if .env loading fails.
DATE="$(date -u +%F)"
TIMESTAMP="$(date -u +%FT%H-%M-%SZ)"

# ---------------------------------------------------------------------------
# Alert helper. Defined before anything that can fail, so the ERR trap works
# even during env-loading. Telegram-Token/Chat-ID may not be set yet at that
# point — in that case curl fails silently and we still exit non-zero.
# ---------------------------------------------------------------------------
send_alert() {
  local emoji="$1"
  local text="$2"
  if [[ -n "${TELEGRAM_BOT_TOKEN:-}" && -n "${TELEGRAM_CHAT_ID:-}" ]]; then
    curl -sS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d chat_id="${TELEGRAM_CHAT_ID}" \
      -d text="${emoji} Backup ${DATE}: ${text}" >/dev/null || true
  fi
}

# Loud-fail: any unhandled error sends a red alert before exit.
trap 'send_alert "🔴" "script failed at line ${LINENO}"' ERR

# ---------------------------------------------------------------------------
# Load env
# ---------------------------------------------------------------------------
ENV_FILE="${SCRIPT_DIR}/.env"
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}" >&2
  send_alert "🔴" "missing .env at ${ENV_FILE}"
  exit 1
fi
# shellcheck disable=SC1090
set -a
source "${ENV_FILE}"
set +a

REQUIRED_VARS=(
  POSTGRES_CONTAINER
  POSTGRES_USER
  POSTGRES_DB
  GPG_RECIPIENT
  RCLONE_REMOTE
  TELEGRAM_BOT_TOKEN
  TELEGRAM_CHAT_ID
)
for var in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    send_alert "🔴" "missing required env var: ${var}"
    echo "Missing required env var: ${var}" >&2
    exit 1
  fi
done

# ---------------------------------------------------------------------------
# Workspace
# ---------------------------------------------------------------------------
TMPDIR="$(mktemp -d)"
trap 'rm -rf "${TMPDIR}"; send_alert "🔴" "script failed at line ${LINENO}"' ERR
trap 'rm -rf "${TMPDIR}"' EXIT

DUMP_FILE="${TMPDIR}/dimissio-${DATE}.dump.gpg"

# ---------------------------------------------------------------------------
# Dump + encrypt in one pipe. -Fc = custom format (compressed, selective
# pg_restore possible). No additional gzip needed.
# pipefail ensures the whole pipe fails if pg_dump or gpg fail.
# ---------------------------------------------------------------------------
docker exec "${POSTGRES_CONTAINER}" pg_dump \
    -U "${POSTGRES_USER}" \
    -Fc \
    "${POSTGRES_DB}" \
  | gpg --batch --yes --trust-model always \
        --encrypt --recipient "${GPG_RECIPIENT}" \
  > "${DUMP_FILE}"

# ---------------------------------------------------------------------------
# Sanity check — a < 10 KB dump is almost certainly broken (empty DB or
# pg_dump aborted before writing anything substantial).
# ---------------------------------------------------------------------------
DUMP_SIZE="$(stat -c%s "${DUMP_FILE}")"
if (( DUMP_SIZE < 10240 )); then
  send_alert "🔴" "dump too small (${DUMP_SIZE} bytes) — aborting upload"
  exit 1
fi

HUMAN_SIZE="$(numfmt --to=iec --suffix=B "${DUMP_SIZE}")"

# ---------------------------------------------------------------------------
# Upload
# ---------------------------------------------------------------------------
rclone copy "${DUMP_FILE}" "${RCLONE_REMOTE}/daily/"

# Monthly rollover: on the 1st, copy the same dump into monthly/ too.
if [[ "$(date -u +%d)" == "01" ]]; then
  rclone copy "${DUMP_FILE}" "${RCLONE_REMOTE}/monthly/"
fi

# ---------------------------------------------------------------------------
# Retention: 30 days of daily, 12 months of monthly.
# rclone delete --min-age deletes anything OLDER than the given age.
# ---------------------------------------------------------------------------
rclone delete --min-age 30d "${RCLONE_REMOTE}/daily/"
rclone delete --min-age 365d "${RCLONE_REMOTE}/monthly/"

# ---------------------------------------------------------------------------
# Success
# ---------------------------------------------------------------------------
send_alert "✅" "ok (${HUMAN_SIZE}) at ${TIMESTAMP}"
echo "Backup ${DATE} ok (${HUMAN_SIZE})"
exit 0
