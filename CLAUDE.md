# CLAUDE.md — Dimissio (v2)

> **Für Claude Code im Codespace.** Diese Datei ist die Single-Source-of-Truth für Code-Standards, Struktur, und kritische Regeln beim Arbeiten am Repo.
> **Letztes Update:** Post-Review (reflektiert Production-Stand, nicht Greenfield-Plan)

---

## Projekt

**Dimissio** (dimissio.eu) — zweisprachiger (DE/EN) europäischer Layoff-Tracker. Semi-automatische Pipeline: RSS → Gemini-Flash-Lite (liberaler Prefilter) → Claude Haiku (strenger Gatekeeper + Extraktion) → Admin-Verifizierung → Website + Newsletter + Social Media.

**Prod-Status:** 9 Module gescaffoldet, ~201 Layoffs live, Pipeline aktiv (10 Feeds).

---

## Stack

- Next.js 15 (App Router, TypeScript strict, Tailwind CSS v4)
- PostgreSQL 16 via Drizzle ORM (0.38+)
- BullMQ + Redis 7 (**Single-Container mit Next.js**, nicht separater Prozess in Prod)
- NextAuth v5 Beta (GitHub OAuth, JWT)
- Recharts, Resend, next-intl, Zod + React Hook Form
- Anthropic SDK — Modell: `claude-haiku-4-5-20251001` (Layoff-Extraktion)
- Google Gemini SDK — Modell: `gemini-2.5-flash-lite` (Prefilter-Classification)
- Deployed: Coolify auf Hetzner CX23, Cloudflare DNS/CDN

---

## Befehle

```bash
# Development (lokal im Codespace)
npm run dev              # Next.js Dev auf Port 3000
npm run db:push          # Drizzle Schema → DB (dev)
npm run db:studio        # Drizzle Studio (Port 4983)
npm run db:generate      # Migration generieren
npm run db:migrate       # Migrations ausführen
npm run db:seed          # Seed-Daten einfügen
npm run workers          # BullMQ Worker standalone (nur lokal; in Prod via start.sh)

# Qualitätscheck (PFLICHT vor jedem Push)
npm run typecheck        # TypeScript
npm run lint             # ESLint
npm run build            # Production Build
# → npm run dev + manueller Smoke-Test im Browser

# Production
npm run start            # Production Server (nicht manuell genutzt, läuft via start.sh)
```

---

## Projektstruktur

```
├── scripts/
│   └── start.sh                 # Prod-Startup: App + Worker in einem Container
├── drizzle/                     # Drizzle Migrations (generiert)
├── Dockerfile                   # Multi-stage, Single-Container
├── docker-compose.yml           # Lokale Dev-Dependencies (Postgres, Redis, Umami)
├── drizzle.config.ts
├── src/
│   ├── app/
│   │   ├── [locale]/            # Public DE/EN
│   │   ├── admin/               # Admin (Auth-geschützt via Layout + auth())
│   │   ├── api/
│   │   │   ├── public/          # Public API (Rate-Limit)
│   │   │   ├── admin/           # ⚠ KEIN Middleware-Schutz — jede Route braucht eigenen auth()-Check!
│   │   │   ├── auth/[...nextauth]/
│   │   │   └── health/          # Health-Check für UptimeRobot
│   │   └── ...
│   ├── actions/                 # Server Actions (Domain-gruppiert)
│   ├── components/              # UI (Server + Client explizit)
│   ├── lib/
│   │   ├── db/                  # schema.ts, index.ts, seed.ts
│   │   ├── queue/               # BullMQ Queues + Cron
│   │   ├── queries/             # Wiederverwendbare DB-Queries (z.B. admin-dashboard.ts)
│   │   ├── api/                 # Anthropic Client
│   │   ├── i18n/                # next-intl config, messages/
│   │   ├── social/              # X/LinkedIn/Reddit Adapter
│   │   ├── utils/               # logger, rate-limit, slug, cache
│   │   └── telegram.ts          # Alert-Helper
│   └── workers/                 # BullMQ Worker (rss-fetch, ai-extract, social-post, newsletter-send, maintenance)
└── public/
```

---

## 🚨 Kritische Regeln (brechen = Prod-Incident)

### Sicherheit
1. **Öffentliche Endpoints: immer `WHERE status = 'verified'`.** Keine unverified/rejected Daten nach außen.
2. **`/api/admin/*` hat KEINEN Middleware-Schutz.** Jede Route MUSS `const session = await auth(); if (!session?.user) return unauthorized();` als erste Zeile haben. Keine Ausnahme.
3. **Keine Secrets in Git.** `.env` niemals committen. `.env.example` mit Platzhaltern pflegen.
4. **Zod-Validierung auf JEDEM Input** (Server Action, API-Route). Kein unvalidierter Input.

### Daten-Integrität
5. **`layoffs.country` = Land der Entlassung, NICHT HQ-Land.**
6. **Country-Codes: ISO-3166 Alpha-2** (zwei Großbuchstaben). CHECK-Constraint in DB.
7. **Newsletter-Versand nur an `status='active'`** Subscriber.
8. **Double-Opt-In ist Pflicht.** Kein Subscriber wird `active` ohne `confirmed_at`.
9. **Social-Posts nur für `status='verified'`** Layoffs.
10. **Layoffs werden NIE gelöscht.** Falsche Einträge → `status='rejected'`.

### Code-Qualität
11. **Server Components als Default.** Client Components nur mit explizitem Interaktivitätsbedarf.
12. **UI-Texte NUR via `t('key')` (next-intl)** auf öffentlichen Seiten. Admin darf EN hardcoden.
13. **Keine neuen npm-Pakete ohne Rückfrage.**
14. **Keine Schema-Änderungen ohne Rückfrage.**
15. **Kein Refactoring fremder Module** ohne expliziten Auftrag.
16. **Kein `any`.** Typ unklar → Interface definieren.

---

## DB-Schema (Kurzreferenz)

Vollständig: `src/lib/db/schema.ts` — 11 Tabellen:

| Tabelle | Kurzbeschreibung | Kritische Felder |
|---|---|---|
| `companies` | Firmen-Stammdaten | `slug` UNIQUE, `industry_slug` FK |
| `industries` | 21 Branchen, 2-stufige Hierarchie | `slug` PK, `parent_slug` self-ref |
| `layoffs` | Kerntabelle, Events | `status`, `country`, `date`, `company_id` |
| `submissions` | Community-Tipps | `status` pending→processed/rejected |
| `admins` | Auth-Accounts | `email` UNIQUE, `role` admin/editor |
| `rss_feeds` | Feed-Quellen | `url` UNIQUE, `is_active` |
| `rss_articles` | Gefundene Artikel | `url` UNIQUE, `is_relevant`, `layoff_id` |
| `social_posts` | Post-Tracking | UNIQUE(layoff_id, platform) |
| `newsletter_subscribers` | E-Mail-Liste | Double-Opt-In, `confirmation_token` |
| `newsletter_issues` | Versand-Historie | `layoff_ids` UUID[] |
| `layoff_views` | Anonymer Day-Counter | Composite PK (layoff_id, viewed_at) |

---

## Environment Variables

`.env.example` pflegen. In Coolify auf **App-Resource direkt** setzen (nicht Shared Variables), als **Runtime** markiert.

```
# Datenbank + Queue
DATABASE_URL=postgresql://postgres:<pw>@<host>:5432/postgres
REDIS_URL=redis://<host>:6379

# Auth
NEXTAUTH_SECRET=<random-32b>
NEXTAUTH_URL=https://dimissio.eu
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# AI
ANTHROPIC_API_KEY=

# Mail
RESEND_API_KEY=
RESEND_FROM="Dimissio <kontakt@dimissio.eu>"

# Social (optional, MVP: manuell)
X_API_KEY= X_API_SECRET= X_ACCESS_TOKEN= X_ACCESS_SECRET=
LINKEDIN_CLIENT_ID= LINKEDIN_CLIENT_SECRET= LINKEDIN_ACCESS_TOKEN=
REDDIT_CLIENT_ID= REDDIT_CLIENT_SECRET= REDDIT_USERNAME= REDDIT_PASSWORD=

# Telegram Alerts
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Analytics + Public Vars
NEXT_PUBLIC_UMAMI_URL=https://analytics.dimissio.eu
NEXT_PUBLIC_UMAMI_ID=
NEXT_PUBLIC_SITE_URL=https://dimissio.eu
```

**Build-time vs Runtime:** `NEXT_PUBLIC_*` müssen als Build-Args gesetzt sein. API-Keys etc. nur Runtime.

---

## Coding-Stil

### TypeScript
- `strict: true`, kein `any`, kein `as any`
- Drizzle-Types via `$inferSelect` / `$inferInsert`
- Zod-Schemas für externe Inputs, daraus `z.infer<>` ableiten

### File-Conventions
- Dateien: `kebab-case.tsx`
- Komponenten: `PascalCase`
- Funktionen/Vars: `camelCase`
- DB: `snake_case`
- API-Routen: `/api/public/some-resource`

### Patterns
- **Server Actions** (`src/actions/`) geben immer `{ success: boolean, error?: string, data?: T }` zurück
- **API Routes** geben `{ data }` bei Success und `{ error }` + 4xx-Status bei Fehler
- **Error Handling:** try/catch in Actions + Routes, Errors via `logger.error()`, keine swallowed Errors
- **Logging:** `src/lib/utils/logger.ts` (pino). Kein `console.log` in Production Code.
- **Lazy Init** für externe Clients (Resend, Anthropic, DB): Proxy/Getter-Pattern, um Build-Crashes bei fehlenden Env-Vars zu vermeiden

### Server Components vs. Client
- `'use client'` ist eine **bewusste Entscheidung** mit Begründung
- Erlaubte Gründe: `useState`, `useEffect`, `onClick`, Recharts, Formulare mit React Hook Form
- Nicht-Gründe: "könnte interaktiv werden", "bin mir nicht sicher"

---

## Pre-Push-Checklist (NICHT überspringen)

Vor jedem `git push`:

```bash
npm run typecheck   # 0 Errors
npm run lint        # 0 Errors, Warnings akzeptabel
npm run build       # baut durch
npm run dev         # → Browser → Happy Path des geänderten Features testen
```

**Pre-Commit-Hook** (Husky + lint-staged) erzwingt typecheck + lint automatisch bei `git commit`.

**CI** (GitHub Actions) läuft bei jedem Push → bei Fehler: Deploy wird NICHT getriggert.

---

## Git-Workflow

- `main` = Production. Jeder Push triggert Coolify-Deploy.
- Feature-Branches: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`
- PRs auch im Solo-Betrieb: kurzer Self-Review, dann Merge
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- Rollback bei Prod-Problem: `git revert <sha> && git push` → auto-deploy des Reverts

---

## Testing (Minimum)

- **Vitest** für Unit/Integration-Tests
- **Playwright** für E2E-Smoke-Tests (min. 5):
  1. `/` lädt, zeigt Layoffs
  2. Admin-Login funktioniert
  3. Newsletter subscribe + confirm Flow
  4. Layoff verify + social-post erzeugt
  5. Public API `/api/public/layoffs` liefert `data: Array`
- Tests laufen in CI bei jedem Push

---

## Troubleshooting — häufige Stolpersteine

| Problem | Ursache / Lösung |
|---|---|
| Docker Build OOM | Swap auf Hetzner CX23 aktiv halten (4 GB) |
| Build crasht bei top-level Client-Init (Resend/Anthropic/DB) | Lazy Init via Proxy / Getter-Funktion |
| Container-Name wechselt bei Deploy | Immer dynamisch: `docker ps \| grep dimissio` |
| Admin-Route gibt Daten ohne Auth zurück | `/api/admin/*` hat KEIN Middleware-Schutz → expliziter `auth()`-Check in Route |
| RSS-Feed Redirect-Fehler | URL auf `http://` statt `https://` setzen |
| `session.user.email` undefined | `verifiedBy` muss nullable sein (NextAuth JWT Strategy) |
| BullMQ Worker läuft nicht in Prod | Läuft im gleichen Container via `scripts/start.sh` — Log-Output prüfen |

---

## Was NICHT ändern ohne Rückfrage

1. DB-Schema (Migrationen sind nicht trivial rückgängig)
2. Auth-Flow (NextAuth Konfig, GitHub OAuth)
3. Queue-Konfiguration (Concurrency, Retries, Rate-Limits)
4. Claude-Haiku-Prompt (System-Prompt in `ai-extract.ts`)
5. Deployment-Architektur (Dockerfile, start.sh)
6. Externe Integrations-Secrets / Keys

---

## Bei Unklarheiten

- **Bug oder Feature-Lücke:** Gründer im Chat anfragen, Root Cause analysieren, dann `.md`-Prompt.
- **Package fehlt:** Nicht installieren, sondern fragen.
- **Env-Var fehlt:** App crashen lassen beim Start (besser als stille Fehlkonfiguration).

Keep it simple. Ship incremental. No "just in case" abstractions.
