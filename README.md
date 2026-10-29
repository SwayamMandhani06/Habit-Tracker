# 1% Better — Personal Discipline & Habit System

> *"You do not rise to the level of your goals. You fall to the level of your systems."* — James Clear

A high-craft, distraction-free personal discipline system and habit tracker Progressive Web App (PWA) built with **Next.js 15 (App Router)**, **React 19**, **TypeScript**, **Tailwind CSS v4**, **Framer Motion**, **Supabase (PostgreSQL with RLS)**, and **Recharts**.

Designed in an editorial paper-and-terminal aesthetic: monospace typography, hairline dividers, warm paper / deep obsidian palette, and a single muted sage green accent.

---

## Highlights & Features

### 1. Minimalist Homepage & Interaction Showcase
- **Editorial Hero**: ProductiveApp-inspired layout with interactive headline typography in *Instrument Serif* italic and 100% private tenant isolation badges.
- **3D iPhone Hero Console**: Realistic interactive mockup with Dynamic Island, 7-day completion rings, and live habit steppers with audio chime feedback.
- **5-Screen Streak Showcase**:
  - *An Amount Habit*: Water tracker with 8 interactive capacity glasses, intake trendline, and streak summary tiles.
  - *Minimal Style*: Category pills and high-density habit rows with 5-day (`Wed Thu Fri Sat Sun`) completion pill strips.
  - *Flip & Ring Clock*: Dedicated focus timer featuring split-card mechanical flip digits and circular ambient SVG progress rings.
  - *Calendar & Notes*: Monthly heatmaps paired with evening reflection journaling (`Note | Planned | Completed`).
  - *Habits Compared & Consistency*: Donut volume distribution, habit ranking velocities, 30-day consistency gauge, and day-of-week bar charts.

### 2. Multi-Tenant Security & Supabase Row Level Security (RLS)
- Full multi-user isolation powered by PostgreSQL RLS (`auth.uid() = user_id`) across all tables and security-invoker views (`daily_scores`, `habit_monthly_stats`).
- Seamless Supabase Authentication supporting Email/Password and OAuth with automatic token refresh in Next.js middleware.

### 3. Flexible Habit System
- **Checkbox & Multi-Step Checklist Habits**: Subitems auto-sync with the parent habit.
- **Rest-Day Skipping**: Mark habits as skipped on rest days without penalizing completion rates or breaking streaks.
- **Habit Notes**: Markdown-supported personal context attached to any habit.
- **Settings Manager**: Full CRUD with drag-and-drop reordering, archive, restore, and permanent delete actions.

### 4. Daily Check-in & Distraction-Free Flow
- **Fast 2-Minute Logging**: Habit completion status + wellbeing metrics (mood, energy, sleep hours, weight, screen time, and freeform notes).
- **Dual View Modes on `/today`**: Switch instantly between *Classic* view and the compact *Minimal 5-Day Strip* for rapid multi-day status tracking.
- **Built-In Focus Timer**: 15m to 90m customizable Pomodoro & meditation timer with audio cues and auto-completion.
- **Weekly Intentions**: Focus prompt pinned to the top of every week.

### 5. Analytics & Review
- **Dashboard**: Live completion gauge, weekly/monthly averages, current & best streaks, perfect days count, and daily rotating Stoic discipline quotes.
- **Monthly Grid**: Digitized paper habit tracker grid with sticky columns, weekend highlights, and completion score footers.
- **Heatmap Calendar**: Daily completion percentage shading with one-click full-day entry modals.
- **Monthly Review Journal**: End-of-month reflection workspace with automated wins, bottlenecks, and forward-looking intentions.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15.5 (App Router, Server Actions) |
| **Language** | TypeScript (Strict mode, zero `any` policy) |
| **Styling** | Tailwind CSS v4, Vanilla CSS design tokens |
| **Animations** | Framer Motion |
| **Database** | PostgreSQL on Supabase with Row Level Security |
| **Authentication** | `@supabase/ssr` with cookie session handling |
| **Data Visualization** | Recharts & SVG custom meters |
| **Drag and Drop** | `@dnd-kit/core` & `@dnd-kit/sortable` |
| **Validation** | Zod |
| **PWA** | Web Manifest, standalone display, responsive touch targets |

---

## Project Structure

```
habit-tracker/
├── actions/                   # Next.js Server Actions with strict Zod validation
│   ├── completion.actions.ts  # Habit & subitem toggles, skip actions
│   ├── entry.actions.ts       # Day entry & wellbeing metric auto-save
│   ├── habit.actions.ts       # Habit & subitem CRUD, reordering
│   ├── intention.actions.ts   # Weekly intention persistence
│   ├── quote.actions.ts       # Daily quote management
│   └── review.actions.ts      # Monthly review reflections
├── app/                       # Next.js App Router
│   ├── (app)/                 # Protected application routes (Sidebar & Bottom Bar)
│   │   ├── dashboard/         # Progress metrics, streaks, rotating quote
│   │   ├── today/             # Daily check-in (Classic & Minimal views)
│   │   ├── calendar/          # Heatmap calendar view
│   │   ├── grid/              # Digitized physical monthly grid
│   │   ├── insights/          # Deep statistical analysis & velocity charts
│   │   ├── review/            # Monthly review journal
│   │   └── settings/          # Habit manager, quotes, appearance
│   ├── api/                   # Server API routes (auth signout, day-entry, seed)
│   ├── auth/callback/         # Supabase OAuth redirect handler
│   ├── login/ & signup/       # Authentication pages
│   ├── globals.css            # Design tokens, themes, layered Tailwind v4
│   ├── layout.tsx             # Root layout & Google Fonts preconnect
│   └── manifest.ts            # PWA web manifest definition
├── components/                # Modular React Client & Server Components
│   ├── calendar/              # CalendarView, DayEntryModal
│   ├── dashboard/             # DashboardClient, streak cards, progress meters
│   ├── grid/                  # MonthlyGrid with sticky header & score footer
│   ├── homepage/              # HomePageClient, HeroPhoneMockup, StreakShowcase
│   ├── insights/              # InsightsClient with Recharts visualizations
│   ├── nav/                   # Sidebar, BottomTabBar, ThemeToggle
│   ├── review/                # MonthlyReviewClient
│   ├── settings/              # HabitManager, QuotesManager, Appearance
│   └── today/                 # TodayClient, HabitRow, FocusTimerModal, WeeklyIntention
├── lib/                       # Core utilities & database access
│   ├── auth/                  # Session verification & auth helpers
│   ├── db/                    # User-scoped database query layer
│   ├── supabase/              # Browser & SSR Supabase clients, schema types
│   ├── audio.ts               # Synthesized audio chime via Web Audio API
│   ├── date.ts                # Timezone-safe UTC date calculation helpers
│   └── nav.ts                 # Shared navigation constants
├── public/                    # PWA icons, screenshots, and static assets
├── supabase/                  # Database schema & migrations
│   └── migrations/            # SQL migrations 001 through 009 + 999 maintenance
└── middleware.ts              # Route protection & Supabase session refresh
```

---

## Getting Started

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/your-username/habit-tracker.git
cd habit-tracker
npm install
```

### 2. Configure Environment Variables

Create `.env.local` using the provided template:

```bash
cp .env.local.example .env.local
```

Fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
APP_TIMEZONE=Asia/Kolkata
```

> **Note:** Set `APP_TIMEZONE` to your local IANA timezone (e.g. `America/New_York`, `Europe/London`, `Asia/Kolkata`). This ensures server-rendered dates match your local calendar regardless of server UTC time.

### 3. Run Database Migrations

In your Supabase project's **SQL Editor**, execute the migration files located in `supabase/migrations/`:
- `001_initial_schema.sql` through `009_fix_views_rls_and_skips.sql`
- Or run `999_ensure_all_columns_and_reload_cache.sql` to apply all schema updates and reload PostgREST in one step.

### 4. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the homepage or log in.

---

## Production Deployment

### Vercel Deployment
1. Connect your repository to [Vercel](https://vercel.com).
2. In Project Settings → **Environment Variables**, add the variables from `.env.local`.
3. In Supabase Dashboard → **Authentication** → **URL Configuration**:
   - Set **Site URL** to your production domain: `https://your-app.vercel.app`
   - Add `https://your-app.vercel.app/auth/callback` to **Redirect URLs**.
4. Deploy.

### Progressive Web App (PWA)
Open the deployed URL on mobile Safari (iOS) or Chrome (Android) and choose **"Add to Home Screen"** for standalone app mode.

---

## License

MIT License. Designed and built with discipline for long-term consistency.
