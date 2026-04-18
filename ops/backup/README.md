# Dimissio Backup Runbook

Daily encrypted `pg_dump` of the production Postgres container, uploaded to a
Hetzner Storage Box. Monthly restore drill. Telegram alerts on every run.

**Audience:** the founder, on the Hetzner host. Claude Code does not run any
of these commands — this is manual ops work.

**Artefacts (in this directory):**

- `backup.sh` — runs nightly via cron on the host.
- `restore-drill.sh` — runs manually, once a month.
- `.env.example` — template for the host-side `.env`.

**Architecture:**

- Scripts live on the host at `/opt/dimissio-backup/`, not inside Docker.
- Scripts reach into the Postgres container via `docker exec`.
- Encryption: GPG, 4096-bit RSA. Public key on the host, private key ONLY in
  1Password. Host never holds the private key — restores pull it on demand.
- Storage: Hetzner Storage Box via rclone (SFTP).
- Retention: 30 daily + 12 monthly, enforced by `rclone delete --min-age`.
- Alerts: Telegram `curl` directly, no Node dependency.

---

## Section 1 — Prerequisites (one-time)

### 1.1 Order the Storage Box

1. Hetzner **Robot** (not Cloud Console): <https://robot.hetzner.com/storage>
2. Order a **BX11** (1 TB, ~€3.80/month). Plenty of headroom for a 30-day +
   12-month retention of a small database.
3. Choose SFTP + SSH as enabled protocols.
4. Note the main username, password, and hostname (e.g. `u123456.your-storagebox.de`).
5. Create a sub-account for the backup job (Robot → Storage Box → Subaccounts):
   - Restrict home directory to `/dimissio-backups/`.
   - Enable SFTP only. Disable SSH, Samba, WebDAV.
   - Generate a separate password. This is the credential used by rclone.

### 1.2 Generate the GPG keypair (on the founder's laptop, NOT the host)

```bash
gpg --full-generate-key
```

Answer the prompts exactly:

- Type: **(1) RSA and RSA**
- Length: **4096**
- Valid for: **0** (never expires). Non-negotiable — an expiring key means the
  backup silently fails on expiry day.
- Real name: **Dimissio Backup**
- Email: **backup@dimissio.eu** (no mailbox needed, just a label)
- Passphrase: strong, stored in 1Password under "Dimissio Backup GPG".

Export and store:

```bash
# Private key — goes into 1Password, NEVER on the host.
gpg --export-secret-keys --armor backup@dimissio.eu > dimissio-backup-private.asc

# Public key — will be imported onto the host in step 1.3.
gpg --export --armor backup@dimissio.eu > dimissio-backup-public.asc
```

Upload `dimissio-backup-private.asc` to 1Password as a secure attachment on the
"Dimissio Backup GPG" item. Delete the local file after.

### 1.3 Prepare the Hetzner host

SSH in as root:

```bash
ssh root@178.104.136.232
apt update && apt install -y rclone gnupg
```

Upload and import the public key:

```bash
# From laptop
scp dimissio-backup-public.asc root@178.104.136.232:/tmp/

# On host
gpg --import /tmp/dimissio-backup-public.asc
gpg --edit-key backup@dimissio.eu
# Interactive prompt:
#   > trust
#   > 5
#   > y
#   > quit
rm /tmp/dimissio-backup-public.asc
```

Verify:

```bash
gpg --list-keys backup@dimissio.eu
```

### 1.4 Configure rclone (on host)

```bash
rclone config
```

Interactive flow:

- `n` — new remote
- Name: `hetzner`
- Storage type: `sftp`
- Host: the Storage Box hostname from step 1.1 (e.g. `u123456.your-storagebox.de`)
- User: the sub-account username
- Port: `23`
- Password: `y` — paste sub-account password (rclone encrypts it in the config)
- Leave other fields at defaults, answer `y` to confirm.

Create the target directories and verify read/write:

```bash
rclone mkdir hetzner:dimissio-backups/daily
rclone mkdir hetzner:dimissio-backups/monthly
rclone ls hetzner:dimissio-backups/
# Expected: empty output, exit code 0
```

---

## Section 2 — Installation (one-time)

### 2.1 Copy scripts to the host

From the repo root on the founder's laptop:

```bash
scp ops/backup/backup.sh \
    ops/backup/restore-drill.sh \
    ops/backup/.env.example \
    root@178.104.136.232:/opt/dimissio-backup/
```

If `/opt/dimissio-backup/` does not exist yet, create it first:

```bash
ssh root@178.104.136.232 'mkdir -p /opt/dimissio-backup'
```

On the host:

```bash
chmod +x /opt/dimissio-backup/backup.sh
chmod +x /opt/dimissio-backup/restore-drill.sh
```

### 2.2 Create and secure `.env`

```bash
cp /opt/dimissio-backup/.env.example /opt/dimissio-backup/.env
vim /opt/dimissio-backup/.env
```

Fill every value. Get the Postgres container name with:

```bash
docker ps --format '{{.Names}}' | grep postgres
```

Lock the file down:

```bash
chmod 600 /opt/dimissio-backup/.env
chown root:root /opt/dimissio-backup/.env
```

### 2.3 Dry run (manually, BEFORE scheduling cron)

```bash
bash /opt/dimissio-backup/backup.sh
```

**Expected outcome in under 60 seconds:**

- Telegram chat receives a green ✅ message with the dump size.
- `rclone ls hetzner:dimissio-backups/daily/` lists today's file.
- Script exit code is `0`.

If any of these fail, fix the cause before continuing. Do not install cron
until the dry run passes end-to-end.

### 2.4 Install cron

```bash
crontab -e
```

Add:

```
5 2 * * * /opt/dimissio-backup/backup.sh >> /var/log/dimissio-backup.log 2>&1
```

Notes:

- `02:05 UTC`, not `02:00` — avoids the common-hour contention spike on shared
  outbound infra.
- stdout+stderr go to `/var/log/dimissio-backup.log` as a secondary audit
  trail (Telegram is primary).

Rotate the log to prevent unbounded growth:

```bash
cat >/etc/logrotate.d/dimissio-backup <<'EOF'
/var/log/dimissio-backup.log {
  weekly
  rotate 8
  compress
  missingok
  notifempty
}
EOF
```

---

## Section 3 — Restore drill (monthly)

Do this on the **1st of every month**. If a drill fails, the backup is
effectively worthless — treat a failed drill as a P0 incident.

### 3.1 Preferred: run on a local Dev machine

Keeps the GPG private key completely off production. Requires:

- `docker` and a local Postgres 16 container running
- `gnupg`, `rclone` (rclone configured with the `hetzner` remote locally)
- The scripts and a local `.env` pointing to the local Postgres container
- Private key imported into the local keyring (import from 1Password each time,
  delete after the drill)

Then simply:

```bash
bash restore-drill.sh                # yesterday's dump
bash restore-drill.sh 2026-04-15     # specific day
```

### 3.2 Fallback: run on the Hetzner host

Only if the local setup is not available:

```bash
# 1. Temporarily import the private key onto the host
scp dimissio-backup-private.asc root@178.104.136.232:/tmp/
ssh root@178.104.136.232
gpg --import /tmp/dimissio-backup-private.asc

# 2. Run the drill
bash /opt/dimissio-backup/restore-drill.sh

# 3. IMMEDIATELY remove the private key and the import file
gpg --delete-secret-keys backup@dimissio.eu
shred -u /tmp/dimissio-backup-private.asc
```

**Never leave the private key on the host between drills.** The whole encryption
threat model collapses if both the ciphertext and the key sit on the same box.

### 3.3 What a successful drill looks like

```
→ Restore drill for 2026-04-17
→ Downloading dimissio-2026-04-17.dump.gpg
→ Decrypting
→ (Re)creating dimissio_restore_test
→ Running pg_restore
→ Spot-check row counts
          table          | count
-------------------------+-------
 layoffs                 |   201
 companies               |   180
 newsletter_subscribers  |    47
 rss_articles            |  4210
 admins                  |     1
→ Dropping dimissio_restore_test
✅ Restore drill OK for 2026-04-17
```

Red flags:

- `layoffs`, `companies`, or `rss_articles` reporting `0`.
- Row counts materially lower than what `/admin` shows for live prod.
- `pg_restore` emitting `ERROR:` lines (warnings about owners/privileges with
  `--no-owner --no-privileges` are fine).
- Script aborting before the `Dropping` step.

Any red flag → treat as P0, investigate before the next nightly backup runs.

---

## Section 4 — Disaster Recovery (short form)

Consult the project-root DR plan for the full sequence. Backup-specific notes:

- **First action after provisioning a replacement host:** run `restore-drill.sh`
  against the most recent daily dump (or the newest monthly dump if daily is
  compromised). Everything else — DNS, TLS, app deploy — waits until data is
  recovered and verified.
- The Storage Box is independent of the application host, so losing the
  Hetzner CX23 does not lose the backups.
- If the Storage Box itself is lost, the 12-month monthly retention buys time
  to provision a replacement, but daily dumps to the new remote must resume
  the same day.

---

## What is explicitly NOT covered here

- Point-in-time recovery via WAL streaming
- Off-site replica on a second cloud provider
- Automated restore verification (the monthly drill is deliberately manual)
- Backup-freshness check surfaced in the app `/api/health` endpoint

These are candidates for a future iteration. The goal of this runbook is that
a working, tested backup exists at all.
