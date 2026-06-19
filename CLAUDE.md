# CLAUDE.md — PitchKit

## What is this?

PitchKit is an AI-powered website redesign tool for freelancers and agencies. Users input a prospect's website URL (or Google Maps link), and the app generates a professional redesign they can share via a hosted preview link for cold outreach.

## Tech Stack

- **Framework:** Next.js 14 (App Router), React 18, TypeScript
- **Database/Auth/Storage:** Supabase (PostgreSQL + Auth + Storage buckets)
- **AI:** Anthropic Claude API (`claude-sonnet-4-6`)
- **Payments:** Stripe (credit packs)
- **Web Scraping:** Playwright (headless Chrome)
- **Styling:** Tailwind CSS (dark theme, no component library)
- **Images:** Pexels API for stock photos
- **Business Data:** Google Places API for Maps links
- **Notifications:** Discord webhooks for ops alerts
- **Deployment:** Railway.app via Docker (Node 20-slim + Playwright deps)

## Project Structure

```
app/                  # Next.js App Router pages and API routes
  api/                # All backend endpoints (~20 routes)
  preview/[slug]/     # Public preview pages (dynamic)
  dashboard/          # User's preview list
  create/             # Main generation flow
  admin/              # Admin analytics
  auth/               # OAuth callback
components/           # Shared React components
lib/                  # Service integrations and utilities
  anthropic.ts        # All Claude API calls (analyze, generate, revise, email)
  scraper.ts          # Playwright website scraping
  supabase/           # Client and server Supabase instances
  stripe.ts           # Stripe client
  rate-limit.ts       # Per-IP rate limiting via DB
  analytics.ts        # Event tracking
  discord.ts          # Webhook notifications
  pexels.ts           # Stock image search
  google-places.ts    # Google Maps/Places integration
  image-utils.ts      # Image rehosting to Supabase Storage
types/index.ts        # All TypeScript interfaces
supabase/             # SQL migrations and schema
content/              # Blog posts (Markdown with frontmatter)
```

## Core Flow

1. User inputs URL or Google Maps link at `/create`
2. `POST /api/analyze` — Playwright scrapes site → Claude analyzes → generates 3 design styles + image suggestions
3. User picks a style
4. `POST /api/generate` — Claude generates full HTML → saved to DB → cold email generated → credit deducted
5. Preview hosted at `/preview/[slug]` for 30 days
6. User can revise designs, edit text, swap images, and track visitor analytics

## Database Tables

- **previews** — Generated redesigns with HTML, styles, metadata, cold email (slug is 8-char nanoid)
- **user_credits** — Credit balance per user (with Stripe customer ID)
- **credit_transactions** — Ledger of all credit changes (idempotent via reference_id)
- **preview_views** — Visitor analytics (hash-based unique visitors, duration via heartbeat)
- **analytics_events** — Product analytics (signups, generations, etc.)
- **rate_limits** — Per-IP operation rate limiting

## Critical Patterns

### Credit System
- Credits deducted via Supabase RPC `deduct_credits()` — atomic with balance check
- **Always deduct AFTER successful DB save**, never before
- Stripe webhook uses session ID as `reference_id` for idempotency
- Credit packs: 5/$9, 15/$19, 50/$49

### Revision System
- 5 free revisions per preview (`revision_limit` default)
- Unlock 5 more for 1 credit via `/api/preview/[slug]/unlock-revisions`
- Track via `revision_count` vs `revision_limit` on previews table

### Rate Limiting
- Stored in Supabase `rate_limits` table (persists across serverless instances)
- Limits: analyze 15/10min, generate 10/10min, revise 30/10min, heartbeat 10/1min
- Keyed by IP + operation type

### Fire-and-Forget
- Analytics tracking, Discord notifications, and email generation run async and don't block the response
- Pattern: `Promise.resolve().then(() => ...).catch(() => {})`

### Image Handling
- Scraped images are rehosted to Supabase Storage (`preview-images` bucket)
- MD5 hash of source URL used as filename (dedup)
- Pexels images searched by AI-generated queries, grouped as hero/secondary/atmosphere

## Important Gotchas

### Playwright + Docker
- Docker image must include system libraries (libnss3, libatk, etc.) for headless Chrome
- Cloudflare bot detection: scraper detects challenge pages and waits extra 7s
- Scrape timeout: 30s page load + 3s render settling

### Environment Variables
- `NEXT_PUBLIC_*` vars are **build-time only** — must be set before `next build`
- `SUPABASE_SERVICE_ROLE_KEY` is server-only, never exposed to client
- Stripe webhook secret must match the endpoint configured in Stripe dashboard

### Stripe Webhooks
- Must use **raw request body** for signature validation (not parsed JSON)
- Idempotency via checking existing `credit_transactions` with same `reference_id`

### Google Maps URLs
- Multiple formats: `maps.app.goo.gl`, `goo.gl/maps`, `google.com/maps/place/`
- Short URLs require following redirects to extract place information
- Google Places API requires API key + billing enabled

### Supabase RLS
- `user_credits`, `credit_transactions`, `preview_views` have RLS policies
- `analytics_events`, `rate_limits` have NO RLS (service role access only)
- Always use service role client for admin operations

### Preview HTML
- Redesign HTML is stored as complete HTML documents in the DB
- Three variations stored per preview (variation_a/b/c_html)
- The selected variation gets copied to `redesign_html`
- Text editing and revisions modify HTML directly

## Commands

```bash
npm run dev     # Dev server on localhost:3000
npm run build   # Production build
npm start       # Production server on port 8080
npm run lint    # ESLint
```

## Auth

- Supabase Auth with Google OAuth + email/password
- Middleware (`middleware.ts`) refreshes session on all routes
- `getUser()` from `lib/auth.ts` for server-side auth checks
- Admin access gated by `ADMIN_EMAILS` env var (comma-separated)

## Conventions

- Slugs: 8-char nanoid for previews
- `dev_` prefix for developer/owner fields (dev_name, dev_email, dev_message)
- All API types defined in `types/index.ts`
- Error handling: try/catch → Discord notification + user-friendly message
- All timestamps in UTC
- No global state library — React hooks only
- Dark theme: bg `#0a0a0a`, surface `#111111`, accent `#f59e0b` (amber/gold)

## Lessons Learned

<!-- Add lessons as they come up during development -->
<!-- Format: ### [Date] Lesson Title -->
<!-- Brief description of what happened and what to do differently -->
