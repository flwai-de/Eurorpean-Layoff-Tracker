# CLAUDE.md — European Layoff Tracker

## Projekt

Europäischer Layoff-Tracker. Trackt Massenentlassungen in ganz Europa, branchenübergreifend, zweisprachig (DE/EN). Semi-automatische Datenpipeline (RSS → Claude Haiku → Admin-Verifizierung → Website + Newsletter + Social Media).

## Stack

- Next.js 15 (App Router, TypeScript, Tailwind CSS)
- PostgreSQL 16 (via Drizzle ORM)
- BullMQ + Redis 7 (Job-Queue)
- NextAuth.js v5 (GitHub OAuth, nur für Admins)
- Recharts (Charts)
- Resend (Newsletter)
- next-intl (i18n: DE/EN)
- Deployed auf Hetzner via Coolify (Docker Compose)

## Befehle

```bash
# Development
npm run dev              # Next.js Dev-Server auf Port 3000
npm run db:push          # Drizzle Schema zur DB pushen
npm run db:studio        # Drizzle Studio (DB-GUI) auf Port 4983
npm run db:generate      # Migration generieren
npm run db:migrate       # Migrations ausführen
npm run db:seed          # Seed-Daten einfügen
npm run workers          # BullMQ Worker starten (separater Prozess)

# Build & Deploy
npm run build            # Production Build
npm run start            # Production Server

# Linting
npm run lint             # ESLint
npm run typecheck        # TypeScript Type-Check
```

## Projektstruktur

```
src/app/[locale]/*       → Öffentliche Seiten (DE/EN)
src/app/admin/*          → Admin-Dashboard (Auth-geschützt)
src/app/api/public/*     → Öffentliche API (nur verified Daten!)
src/app/api/admin/*      → Admin API (Auth-geschützt)
src/lib/db/schema.ts     → Drizzle Schema (alle 11 Tabellen)
src/lib/queue/           → BullMQ Queue-Definitionen
src/actions/             → Server Actions (Admin-Mutationen)
src/components/          → React-Komponenten
src/workers/             → BullMQ Worker-Prozesse
```

## Kritische Regeln

1. **Öffentliche Endpunkte: nur `WHERE status = 'verified'`**. Niemals unverified Daten nach außen.
2. **`layoffs.country`** = Land der Entlassung, NICHT HQ-Land.
3. **Server Components als Default**. Client Components nur bei Interaktivität.
4. **Alle UI-Texte über `t()` (next-intl)**. Keine hardcodierten Strings in öffentlichen Seiten.
5. **Zod-Validierung auf jedem Input**. Server Actions und API-Endpunkte.
6. **Keine neuen npm-Pakete ohne Rückfrage.**
7. **Keine Änderungen am DB-Schema ohne Rückfrage.**
8. **Kein Refactoring fremder Module.** Nur das bauen was beauftragt ist.

## DB-Schema (Kurzreferenz)

- `companies` — Firmen (slug, name, industry_slug, country_hq)
- `industries` — Branchenliste mit Hierarchie (slug als PK)
- `layoffs` — Layoff-Events (company_id FK, date, affected_count, country, status)
- `submissions` — Community-Tipps (pending → processed/rejected)
- `admins` — Admin-Accounts (email, role: admin/editor)
- `rss_feeds` — RSS-Quellen (url, language, is_active)
- `rss_articles` — Gefundene Artikel (url UNIQUE, is_relevant, layoff_id FK)
- `social_posts` — Social-Media-Posts (layoff_id + platform UNIQUE)
- `newsletter_subscribers` — E-Mail-Liste (Double Opt-In!)
- `newsletter_issues` — Versendete Newsletter-Ausgaben
- `layoff_views` — Anonymer View-Counter pro Tag (PK: layoff_id + viewed_at)

## Environment Variables

```
DATABASE_URL=postgresql://user:pass@localhost:5432/layofftracker
REDIS_URL=redis://localhost:6379
NEXTAUTH_SECRET=<random-string>
NEXTAUTH_URL=https://yourdomain.eu
GITHUB_CLIENT_ID=<github-oauth-app-id>
GITHUB_CLIENT_SECRET=<github-oauth-app-secret>
ANTHROPIC_API_KEY=<api-key>
RESEND_API_KEY=<api-key>
X_API_KEY=<twitter-api-key>
X_API_SECRET=<twitter-api-secret>
X_ACCESS_TOKEN=<twitter-access-token>
X_ACCESS_SECRET=<twitter-access-secret>
LINKEDIN_CLIENT_ID=<linkedin-app-id>
LINKEDIN_CLIENT_SECRET=<linkedin-app-secret>
LINKEDIN_ACCESS_TOKEN=<linkedin-access-token>
REDDIT_CLIENT_ID=<reddit-app-id>
REDDIT_CLIENT_SECRET=<reddit-app-secret>
REDDIT_USERNAME=<reddit-bot-username>
REDDIT_PASSWORD=<reddit-bot-password>
NEXT_PUBLIC_UMAMI_URL=https://analytics.yourdomain.eu
NEXT_PUBLIC_UMAMI_ID=<umami-site-id>
NEXT_PUBLIC_SITE_URL=https://yourdomain.eu
```

## Coding-Stil

- TypeScript strict, kein `any`
- Dateien: kebab-case, Komponenten: PascalCase
- Server Actions return `{ success: boolean, error?: string, data?: T }`
- DB-Types über Drizzle `$inferSelect` / `$inferInsert`
- Conventional Commits (feat:, fix:, chore:)
