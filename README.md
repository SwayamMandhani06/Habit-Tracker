# 1% Better — Personal Habit Tracker

> Getting 1% better every day.

A premium, single-user habit tracker PWA built with Next.js 16, TypeScript, Tailwind CSS, Framer Motion, Supabase, and Recharts. Designed for daily use on both mobile and desktop.

## Features

- **PIN lock screen** — secure, phone-style 4-digit keypad (PIN stored server-side only)
- **Today check-in** — tap to complete habits, auto-save wellbeing data (mood, energy, sleep, weight, screen time, notes)
- **Checklist habits** — expandable sub-items that auto-sync parent habit completion
- **Monthly Grid** — digitized paper habit tracker grid with sticky columns
- **Calendar view** — heat-map shading by completion, click any day to edit
- **Dashboard** — animated stats (streak, perfect days, weekly/monthly avg)
- **Insights** — line + bar charts, perfect/missed days, best/worst performance runs
- **Monthly Review** — reflection journal with auto-calculated stats, goals carry-forward
- **Settings** — habit CRUD with drag-and-drop reorder, quotes manager, theme toggle
- **PWA** — installable, standalone, dark/light theme

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS + Vanilla CSS tokens |
| Animation | Framer Motion |
| Database | Supabase (Postgres) |
| Auth | iron-session (httpOnly cookie, PIN) |
| Charts | Recharts |
| DnD | @dnd-kit |
| Validation | Zod |
| Deployment | Vercel |

## Setup

### 1. Clone and Install

```bash
git clone <your-repo>
cd habit-tracker
npm install
```

### 2. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In the SQL Editor, run the migration file: `supabase/migrations/001_initial_schema.sql`

### 3. Configure Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
APP_PIN=2206
SESSION_SECRET=your-very-long-random-secret-at-least-32-characters
```

- **`NEXT_PUBLIC_SUPABASE_URL`** — from Supabase Dashboard → Settings → API
- **`SUPABASE_SERVICE_ROLE_KEY`** — from Supabase Dashboard → Settings → API (service_role)
- **`APP_PIN`** — your 4-digit PIN (default: 2206, change this!)
- **`SESSION_SECRET`** — generate with `openssl rand -base64 32`

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to the PIN screen.

### 5. Seed Initial Data

After entering your PIN and logging in, run the seed endpoint once to populate the default 13 habits and 15 motivational quotes:

```bash
curl -X POST http://localhost:3000/api/seed \
  -H "Cookie: hbt_session=<your-session-cookie>"
```

Or simply visit the app, log in, then open your browser's DevTools console and run:

```javascript
fetch('/api/seed', { method: 'POST' }).then(r => r.json()).then(console.log)
```

### 6. PWA Icons

Place these files in `public/icons/`:
- `icon-192.png` — 192×192px
- `icon-512.png` — 512×512px
- `icon-maskable.png` — 512×512px with safe zone padding
- `apple-touch-icon.png` — 180×180px

Generate them at [maskable.app](https://maskable.app) or [realfavicongenerator.net](https://realfavicongenerator.net).

## Deploy to Vercel

1. Push your repo to GitHub
2. Import into Vercel
3. Add all environment variables from `.env.local` in Vercel's Environment Variables settings
4. Deploy

> **Security**: Never commit `.env.local` to git. The `APP_PIN` and `SESSION_SECRET` must only exist as server-side environment variables.

## Project Structure

```
habit-tracker/
├── app/
│   ├── (app)/           # Protected app routes
│   │   ├── page.tsx     # Dashboard
│   │   ├── today/       # Daily check-in
│   │   ├── calendar/    # Calendar heat-map
│   │   ├── grid/        # Monthly grid
│   │   ├── insights/    # Analytics charts
│   │   ├── review/      # Monthly review journal
│   │   └── settings/    # Habit/quote management
│   ├── (auth)/pin/      # PIN lock screen
│   ├── api/             # Server-only API routes
│   └── globals.css      # Design system tokens
├── components/          # All React components
├── lib/
│   ├── auth/            # Session management
│   ├── db/              # Supabase query functions
│   └── supabase/        # Client + type definitions
├── actions/             # Next.js Server Actions
├── supabase/migrations/ # SQL schema
└── proxy.ts             # Auth guard (Next.js 16)
```

## Philosophy

> *"You don't rise to the level of your goals, you fall to the level of your systems."*

This app is a system. Use it every day.
