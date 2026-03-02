# Presell

Turn any bad website into your next client. Generate AI-powered website redesigns and share them as hosted preview links to pitch potential clients.

## Setup

### 1. Install dependencies

```bash
npm install
npx playwright install chromium
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the schema in `supabase/schema.sql` via the SQL Editor
3. Copy your project URL, anon key, and service role key

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in your values:

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key
- `ANTHROPIC_API_KEY` — Anthropic API key
- `NEXT_PUBLIC_BASE_URL` — Your app URL (e.g. `http://localhost:3000`)

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How it works

1. Enter a client's website URL along with your name and email
2. Presell scrapes the site using Playwright (content, images, structure)
3. Claude AI generates a modern redesign as clean HTML/Tailwind CSS
4. A shareable preview page is created at `/preview/[slug]`
5. The preview shows before/after views with your contact info
6. Copy the link and send it to the client

## Pages

- `/` — Homepage with the generation form
- `/preview/[slug]` — Public shareable preview page (what clients see)
- `/dashboard` — List of all generated previews

## Tech Stack

- Next.js 14 (App Router)
- Supabase (Postgres)
- Playwright (scraping)
- Anthropic Claude API (redesign generation)
- Tailwind CSS
- TypeScript
