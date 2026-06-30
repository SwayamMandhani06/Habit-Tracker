# "1% Better" — Personal Habit & Discipline Tracker

A premium, single-user habit tracking PWA built with Next.js (App Router) + TypeScript, Tailwind CSS, Framer Motion, Recharts, and Supabase. Designed for daily use on phone and laptop; deployed on Vercel.

---

## User Review Required

> [!IMPORTANT]
> **Supabase Project**: You need a Supabase project created before Stage 1. Please have your `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` ready. The PIN auth system uses a custom httpOnly cookie (not Supabase Auth) — Supabase is used only as the Postgres database via the service role key on server-side routes/actions only.

> [!IMPORTANT]
> **Environment Variables needed on Vercel** (and in your local `.env.local`):
> ```
> NEXT_PUBLIC_SUPABASE_URL=...
> NEXT_PUBLIC_SUPABASE_ANON_KEY=...
> SUPABASE_SERVICE_ROLE_KEY=...
> APP_PIN=2206
> SESSION_SECRET=<random 32+ char string you generate>
> ```
> `APP_PIN` and `SUPABASE_SERVICE_ROLE_KEY` are **never** exposed to client-side code.

> [!WARNING]
> **Drag-and-drop reordering** in Manage Habits uses `@dnd-kit` (the modern, accessible successor to `react-beautiful-dnd`). This is a dependency addition.

---

## Open Questions

> [!NOTE]
> No genuine ambiguities found — the spec is thorough. All design decisions below follow the spec exactly. I'll proceed immediately upon your approval.

---

## Architecture Overview

```
app/
├── (auth)/
│   └── pin/                   # PIN lock screen (public route)
├── (app)/                     # Protected layout — checks session cookie
│   ├── layout.tsx             # Nav shell: sidebar (desktop) + bottom bar (mobile)
│   ├── page.tsx               # Dashboard
│   ├── today/page.tsx         # Daily check-in
│   ├── calendar/page.tsx      # Calendar view
│   ├── grid/page.tsx          # Monthly grid
│   ├── insights/page.tsx      # Insights (tabs)
│   ├── review/page.tsx        # Monthly review
│   └── settings/page.tsx      # Settings (habits, quotes, theme, logout)
├── api/
│   ├── auth/pin/route.ts      # POST: verify PIN → set httpOnly cookie
│   ├── auth/logout/route.ts   # POST: clear session cookie
│   └── seed/route.ts          # POST: seed default habits (called once on first run)
lib/
├── supabase/
│   ├── server.ts              # createServerClient() using service role key
│   └── types.ts               # Generated DB types (supabase gen types)
├── auth/
│   └── session.ts             # verifySession(), setSession(), clearSession()
├── db/
│   ├── habits.ts              # All habit CRUD queries
│   ├── entries.ts             # day_entries CRUD
│   ├── completions.ts         # completion toggling
│   ├── stats.ts               # All calculation functions
│   └── quotes.ts              # Quotes CRUD
actions/
│   ├── habit.actions.ts       # Server Actions for habit management
│   ├── entry.actions.ts       # Server Actions for day entries
│   ├── completion.actions.ts  # Server Actions for toggling completions
│   ├── review.actions.ts      # Server Actions for monthly reviews
│   └── quote.actions.ts       # Server Actions for quotes
components/
├── ui/                        # Primitives (Button, Input, Card, Skeleton, etc.)
├── habits/                    # HabitRow, ChecklistExpander, HabitManager, etc.
├── stats/                     # StatCard, ProgressBar, StreakCounter, etc.
├── calendar/                  # CalendarGrid, DayCell, DayEntryModal
├── grid/                      # MonthlyGrid component
├── charts/                    # RechartsWrapper components
├── nav/                       # Sidebar, BottomTabBar
├── pin/                       # PinPad, PinDot
└── providers/                 # ThemeProvider, ToastProvider
```

---

## Proposed Changes

### Stage 1 — Project Setup, Schema, Auth

#### [NEW] Project initialization
- `npx create-next-app@latest` with TypeScript, Tailwind, App Router, no src dir
- Install additional deps: `framer-motion`, `recharts`, `@supabase/supabase-js`, `@supabase/ssr`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `lucide-react`, `zod`, `iron-session` (or `jose`) for secure cookie signing, `clsx`, `tailwind-merge`

#### [NEW] Supabase Schema (`supabase/migrations/001_initial.sql`)
Full SQL for all 7 tables + DB views for efficient stat calculations:
```sql
-- habits, habit_subitems, day_entries, 
-- day_habit_completions, day_subitem_completions, 
-- month_reviews, quotes
-- + views: daily_scores, habit_monthly_stats
```

#### [NEW] Seed Script (`supabase/seed.sql`)
13 default habits + sub-items + default quotes (seeded via API route, guarded by session)

#### [NEW] PIN Auth System
- `app/api/auth/pin/route.ts`: Receives PIN from client, compares against `process.env.APP_PIN` (never sent to client), sets signed httpOnly cookie (`iron-session` or `jose` JWT) with 30-day expiry
- `lib/auth/session.ts`: `verifySession(request)` reads and validates the cookie — used by every server action and route handler
- `middleware.ts`: Checks session cookie on every `/(app)/` route, redirects to `/pin` if invalid

#### [NEW] PIN UI (`app/(auth)/pin/`)
- Phone-style numeric keypad UI (3×3 grid + 0)
- 4 dot indicators that fill on digit entry
- Shake animation on wrong PIN
- Spring animation on correct PIN before redirect

---

### Stage 2 — Habit Engine + Today Page

#### [NEW] Supabase DB layer (`lib/db/`)
- `habits.ts`: getActiveHabits, getHabitWithSubitems, createHabit, updateHabit, reorderHabits, archiveHabit, addSubitem, updateSubitem, removeSubitem, reorderSubitems
- `entries.ts`: getOrCreateDayEntry, updateDayEntry, getDayEntry
- `completions.ts`: toggleHabitCompletion, toggleSubitemCompletion, getDayCompletions
- All use the service-role Supabase client — **never** called from client components directly

#### [NEW] Server Actions (`actions/`)
All Server Actions call `verifySession()` first. Inputs validated with Zod.

#### [NEW] Today Page (`app/(app)/today/page.tsx`)
- Server Component fetches today's entry + all active habits + completions
- Passes to `<TodayClient>` Client Component for interactivity
- Optimistic UI: toggling a checkbox updates local state instantly, fires Server Action in background
- Checklist habits expand with Framer Motion accordion
- Parent habit auto-completes visually when all sub-items are checked
- Mood/Energy: custom 1–5 signal-bar selectors (no emoji)
- Sleep, Weight, Screen time: clean numeric inputs with units label
- Daily notes: auto-resize textarea
- Live Daily Score / Completion % updates as user checks habits

#### [NEW] Manage Habits Page (`app/(app)/settings/` → Habits tab)
- List of all non-archived habits with drag handles (dnd-kit sortable)
- Add habit button → inline form
- Per-habit: rename (inline edit), toggle type (checkbox ↔ checklist), archive button
- Checklist expansion: add/rename/remove/reorder sub-items
- Archive confirmation dialog (with warning about no deletion)

---

### Stage 3 — Dashboard, Calendar, Monthly Grid

#### [NEW] Dashboard (`app/(app)/page.tsx`)
- Stats computed server-side via efficient DB queries/views
- `<StatCard>` components with count-up animations (Framer Motion + requestAnimationFrame)
- Progress bars ease in with spring on mount
- Today's quote (deterministic: `SELECT * FROM quotes WHERE is_active=true ORDER BY created_at OFFSET (days_since_epoch % count) LIMIT 1`)
- Quick nav cards to all other pages

#### [NEW] Calendar View (`app/(app)/calendar/page.tsx`)
- Month grid, each cell shaded by completion % (CSS `opacity` on accent color)
- Click → `<DayEntryModal>` (same fields as Today page, works for any past date)
- Month/year navigation

#### [NEW] Monthly Grid (`app/(app)/grid/page.tsx`)
- Habits as rows, days as columns (scrollable horizontally on mobile)
- Sticky first column (habit names), sticky last column (monthly %)
- Score row at bottom
- Cells are toggleable checkboxes — click fires Server Action

---

### Stage 4 — Insights, Monthly Review, Settings, Polish, PWA

#### [NEW] Insights Page (`app/(app)/insights/page.tsx`)
- Tab UI: Perfect Days | Missed Days | Best Stretches | Worst Stretches | Trends
- Recharts: line chart for daily %, bar chart for weekly averages, heatmap-style calendar
- All charts use the muted accent palette

#### [NEW] Monthly Review (`app/(app)/review/page.tsx`)
- Auto-populated read-only stats for selected month
- Free-text fields for lessons, achievements, goals, reflection
- "Goals Next Month" from last review shown as "Goals This Month" banner

#### [NEW] Settings Page (`app/(app)/settings/page.tsx`)
- Tabs: Habits | Quotes | Appearance | Account
- Theme toggle (dark/light, persisted to localStorage + CSS class on `<html>`)
- Manage quotes: list + add/remove
- Logout button → calls `/api/auth/logout`, clears cookie, redirects to `/pin`

#### [NEW] Global Polish
- Framer Motion `<AnimatePresence>` page transitions (fade + slide)
- Perfect Day celebration: subtle full-screen flash + confetti-like particle burst (canvas or CSS, muted color palette)
- Skeleton loading states for all data-fetching components
- Responsive nav: `<Sidebar>` hidden on mobile, `<BottomTabBar>` hidden on desktop

#### [NEW] PWA Config
- `app/manifest.ts` → `manifest.json` (name, short_name, icons, theme_color, display: standalone, background_color)
- `public/icons/` — generated icon set (192px, 512px, maskable)
- `next.config.ts` — cache headers for static assets
- Service worker via `next-pwa` or manual `public/sw.js`

---

## Design System Tokens (Tailwind config)

```ts
// tailwind.config.ts
colors: {
  // True black / near-black
  surface: { DEFAULT: '#0a0a0a', 1: '#111111', 2: '#1a1a1a', 3: '#242424' },
  // Off-white
  ink: { DEFAULT: '#f5f5f3', muted: '#a0a09a', subtle: '#5a5a56' },
  // Hairline borders
  border: { DEFAULT: 'rgba(255,255,255,0.08)', strong: 'rgba(255,255,255,0.15)' },
  // Muted accent — Slate Blue
  accent: { DEFAULT: '#6b7fa3', muted: '#4a5a7a', subtle: '#2a3a5a', glow: 'rgba(107,127,163,0.15)' },
  // Secondary accent — Graphite Green (used for streaks/perfect days)
  sage: { DEFAULT: '#7a9a84', muted: '#5a7a64', subtle: '#3a5a44' },
}
// Light mode inverses handled via CSS variables
```

---

## Database Views (for efficient stat computation)

```sql
-- daily_scores view: for each (day_entry_id, date), computes:
--   total_active_habits, completed_habits, completion_pct, is_perfect_day

-- habit_monthly_stats view: for each (habit_id, year, month), computes:
--   days_active, days_completed, consistency_pct
```

---

## Verification Plan

### After Stage 1
- [ ] `npm run dev` starts without errors
- [ ] Visiting `/` redirects to `/pin`
- [ ] Entering wrong PIN shows shake animation, no cookie set
- [ ] Entering `2206` sets httpOnly cookie, redirects to dashboard
- [ ] Direct navigation to `/today` without cookie redirects to `/pin`

### After Stage 2
- [ ] Habits CRUD works in Settings → Manage Habits
- [ ] Drag-and-drop reorder persists to DB
- [ ] Today page shows all active habits
- [ ] Toggling checklist sub-items auto-completes parent when all done
- [ ] Mood/Energy selectors work and save
- [ ] Optimistic UI updates are instant

### After Stage 3
- [ ] Dashboard shows accurate stats
- [ ] Calendar cells are correctly shaded
- [ ] DayEntryModal saves past-date entries
- [ ] Monthly Grid cells toggle and update score row

### After Stage 4
- [ ] PWA installable from Chrome on Android/iOS
- [ ] All pages have smooth route transitions
- [ ] 100% completion triggers celebration animation
- [ ] Light/dark theme toggle persists
- [ ] Lighthouse PWA score ≥ 90

---

## Build Order (Stages)

| Stage | Scope | Estimated Files |
|-------|-------|----------------|
| 1 | Setup, schema, PIN auth, middleware | ~20 |
| 2 | Habit engine, Today page, Manage Habits | ~30 |
| 3 | Dashboard, Calendar, Monthly Grid | ~25 |
| 4 | Insights, Review, Settings, PWA, polish | ~20 |
