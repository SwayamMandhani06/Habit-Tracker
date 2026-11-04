# Project Inventory — 1% Better Habit Tracker

Comprehensive read-only discovery of the codebase architecture, migrations, schema expectations, auth flow, analytics, performance bottlenecks, and UI references.

---

## 1. Stack and Config

### Package Versions
| Package | Version in `package.json` | Resolved in `package-lock.json` |
| :--- | :--- | :--- |
| `next` | `^15.3.4` | `15.5.19` |
| `react` | `^19.1.0` | `19.2.4` |
| `react-dom` | `^19.1.0` | `19.2.4` |
| `@supabase/ssr` | `^0.12.4` | `0.12.4` |
| `@supabase/supabase-js` | `^2.108.2` | `2.111.0` |
| `framer-motion` | `^12.42.0` | `12.42.0` |
| `recharts` | `^2.15.3` | `2.15.4` |
| `next-themes` | **NOT INSTALLED** | **NOT_FOUND** |
| `vitest` | `^5.0.5` | `5.0.5` |
| `@playwright/test` | `^1.64.1` | `1.64.1` |

### Configuration Files
- **`next.config.mjs`** ([next.config.mjs:1-25](file:///d:/Projects/habit-tracker/next.config.mjs#L1-L25)):
  ```javascript
  // next.config.mjs
  /** @type {import('next').NextConfig} */
  const nextConfig = {
    devIndicators: false,
    // Headers for PWA static assets
    async headers() {
      return [
        {
          source: '/icons/(.*)',
          headers: [
            { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          ],
        },
        {
          source: '/manifest.webmanifest',
          headers: [
            { key: 'Content-Type', value: 'application/manifest+json' },
            { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          ],
        },
      ]
    },
  }

  export default nextConfig
  ```
- **`vercel.json`**: None (file does not exist).
- **`package.json` scripts** ([package.json:5-11](file:///d:/Projects/habit-tracker/package.json#L5-L11)):
  ```json
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run"
  }
  ```

### Auth & Middleware Configuration
- **Auth file**: [middleware.ts](file:///d:/Projects/habit-tracker/middleware.ts#L8) (Next.js 15 root).
- **Exports `middleware`**: Yes (`export async function middleware(request: NextRequest)`).
- **Matcher** ([middleware.ts:74-90](file:///d:/Projects/habit-tracker/middleware.ts#L74-L90)):
  ```typescript
  export const config = {
    matcher: [
      '/((?!_next/static|_next/image|favicon.ico|icons|screenshots|manifest.webmanifest|sw.js).*)',
    ],
  }
  ```

### Route List and Rendering Characteristics
| Route | Type | Dynamic Flag | Revalidate / Runtime / Region |
| :--- | :--- | :--- | :--- |
| `/` | Static (○) | None | None |
| `/login` | Static (○) | None | None |
| `/signup` | Static (○) | None | None |
| `/manifest.webmanifest` | Static (○) | None | None |
| `/dashboard` | Dynamic (ƒ) | `export const dynamic = 'force-dynamic'` ([app/(app)/dashboard/page.tsx:2](file:///d:/Projects/habit-tracker/app/(app)/dashboard/page.tsx#L2)) | None |
| `/today` | Dynamic (ƒ) | `export const dynamic = 'force-dynamic'` ([app/(app)/today/page.tsx:2](file:///d:/Projects/habit-tracker/app/(app)/today/page.tsx#L2)) | None |
| `/grid` | Dynamic (ƒ) | `export const dynamic = 'force-dynamic'` ([app/(app)/grid/page.tsx:2](file:///d:/Projects/habit-tracker/app/(app)/grid/page.tsx#L2)) | None |
| `/focus` | Dynamic (ƒ) | `export const dynamic = 'force-dynamic'` ([app/(app)/focus/page.tsx:2](file:///d:/Projects/habit-tracker/app/(app)/focus/page.tsx#L2)) | None |
| `/insights` | Dynamic (ƒ) | `export const dynamic = 'force-dynamic'` ([app/(app)/insights/page.tsx:2](file:///d:/Projects/habit-tracker/app/(app)/insights/page.tsx#L2)) | None |
| `/calendar` | Dynamic (ƒ) | `export const dynamic = 'force-dynamic'` ([app/(app)/calendar/page.tsx:2](file:///d:/Projects/habit-tracker/app/(app)/calendar/page.tsx#L2)) | None |
| `/review` | Dynamic (ƒ) | `export const dynamic = 'force-dynamic'` ([app/(app)/review/page.tsx:2](file:///d:/Projects/habit-tracker/app/(app)/review/page.tsx#L2)) | None |
| `/settings` | Dynamic (ƒ) | `export const dynamic = 'force-dynamic'` ([app/(app)/settings/page.tsx:2](file:///d:/Projects/habit-tracker/app/(app)/settings/page.tsx#L2)) | None |
| `/habits/[id]` | Dynamic (ƒ) | `export const dynamic = 'force-dynamic'` ([app/(app)/habits/[id]/page.tsx:2](file:///d:/Projects/habit-tracker/app/(app)/habits/[id]/page.tsx#L2)) | None |
| `/api/auth/signout` | Dynamic (ƒ) | None | None |
| `/api/day-entry` | Dynamic (ƒ) | None | None |
| `/api/seed` | Dynamic (ƒ) | None | None |
| `/auth/callback` | Dynamic (ƒ) | None | None |

---

## 2. Migrations

### Ordered Migration Files & Seed Data
| Filename | One-Line Purpose | Objects Created / Altered | Status |
| :--- | :--- | :--- | :--- |
| `001_initial_schema.sql` | Base schema for single-user habit tracker | Tables: `habits`, `habit_subitems`, `day_entries`, `day_habit_completions`, `day_subitem_completions`, `month_reviews`, `quotes`. Indexes: `idx_habits_sort_order`, `idx_habit_subitems_habit_id`, `idx_day_entries_date`, `idx_day_habit_completions_day_entry`, `idx_day_habit_completions_habit`, `idx_day_subitem_completions_day_entry`, `idx_month_reviews_year_month`. Function: `update_updated_at()`. Triggers: `day_entries_updated_at`, `month_reviews_updated_at`. Views: `daily_scores`, `habit_monthly_stats`. | applied: UNKNOWN |
| `002_habit_notes.sql` | Add notes column to habits table | Alters: `habits` (adds `notes text`). | applied: UNKNOWN |
| `003_multi_user_rls.sql` | Add `user_id` columns and RLS policies | Alters: adds `user_id` to all 7 tables. Enables RLS on all 7 tables. Creates 28 RLS policies (SELECT, INSERT, UPDATE, DELETE). Indexes: `idx_*_user_id` on all 7 tables. | applied: UNKNOWN |
| `004_data_migration_template.sql` | One-off template to backfill `user_id` | Anonymous DO block updating `user_id` where `user_id is null` with placeholder `'YOUR-USER-UUID-HERE'`. | applied: UNKNOWN |
| `005_fix_day_entries_unique_constraint.sql` | Fix day_entries uniqueness for multi-user | Alters: `day_entries` (drops single-column `date` unique constraint `day_entries_date_key`; adds compound unique constraint `day_entries_date_user_key (date, user_id)`). | applied: UNKNOWN |
| `006_month_reviews_reflection_fields.sql` | Add reflection fields to month_reviews | Alters: `month_reviews` (adds `what_went_well text`, `habit_needs_work text`, `one_thing_to_change text`). | applied: UNKNOWN |
| `007_curated_discipline_quotes.sql` | Seed curated discipline quotes | Inserts: 15 curated discipline quotes into `quotes`. | applied: UNKNOWN |
| `008_weekly_intentions_and_skip.sql` | Add weekly_intentions table and habit skip flag | Table: `weekly_intentions` (columns: `id`, `user_id`, `year`, `week_number`, `intention`, `created_at`, `updated_at`, unique `user_id, year, week_number`). RLS: 4 policies. Alters: `day_habit_completions` (adds `is_skipped boolean default false`). | applied: UNKNOWN |
| `009_fix_views_rls_and_skips.sql` | Hardens schema, views with `security_invoker = true`, adds indexes and constraints | Alters: drops old views, recreates `daily_scores` and `habit_monthly_stats` with `WITH (security_invoker = true)` respecting skips. Adds foreign keys, indexes (`idx_day_entries_user_date`, `idx_month_reviews_user_year_month`), and compound unique constraints on `month_reviews (user_id, year, month)` and `weekly_intentions (user_id, year, week_number)`. | applied: UNKNOWN |
| `010_amount_habits_and_styling.sql` | Support numeric amount habits, colors, and icons | Alters: `habits` (adds `target_value`, `unit`, `step_value`, `color`, `icon`). Check constraints: `habits_type_check` (checkbox, checklist, amount), `habits_amount_needs_target`. Alters: `day_habit_completions` (adds `amount numeric default 0`, `target_snapshot numeric`). | applied: UNKNOWN |
| `011_habit_day_notes.sql` | Create per-habit daily notes table | Table: `habit_day_notes` (columns: `id`, `user_id`, `habit_id`, `date`, `note`, `created_at`, `updated_at`, unique `habit_id, date`). RLS: enabled with 4 policies (`auth.uid() = user_id`, insert checks habit ownership). | applied: UNKNOWN |
| `012_focus_sessions.sql` | Focus timer sessions and atomic logging RPCs | Table: `focus_sessions` (columns: `id`, `user_id`, `habit_id`, `started_at`, `ended_at`, `duration_seconds`, `planned_seconds`, `mode`, `local_date`, `habit_minutes_applied`, `created_at`). Index: `focus_sessions_user_date`. RLS: 3 policies (SELECT, INSERT, DELETE; no UPDATE). Functions: `log_focus_session`, `delete_focus_session` (`security invoker`). | applied: UNKNOWN |
| `013_fix_completions_parent_rls.sql` | Harden completion RLS parent habit verification | Drops & recreates `day_habit_completions` and `day_subitem_completions` INSERT policies to require `exists (select 1 from habits where id = habit_id and user_id = auth.uid())`. | applied: UNKNOWN |
| `999_ensure_all_columns_and_reload_cache.sql` | Monolithic idempotent catch-all schema repair | Re-runs columns additions, unique constraints, index additions, RLS policy drops/creates, and view recreation for all tables. | applied: UNKNOWN |
| `supabase/seed.sql` | Default seed data | Inserts 13 top-level habits, 9 Morning subitems, 11 Night subitems, and 15 quotes. | applied: UNKNOWN |

### Other SQL Statements Instructed in History / Chat (Not in initial migrations)
1. **Drop old single-column constraint on `day_entries`** (from Step 339):
   `alter table day_entries drop constraint if exists day_entries_date_key; alter table day_entries add constraint day_entries_date_user_key unique (date, user_id);` (codified into migration 005). `applied: UNKNOWN`.
2. **Drop old single-column unique on `month_reviews`** (from Step 2278):
   `alter table month_reviews drop constraint if exists month_reviews_year_month_key; alter table month_reviews add constraint month_reviews_user_id_year_month_key unique (user_id, year, month);` (codified into migration 009/999). `applied: UNKNOWN`.
3. **Add `notes` to `habits` manual fix** (from Step 4519):
   `alter table if exists habits add column if not exists notes text; notify pgrst, 'reload schema';` (codified into migration 002). `applied: UNKNOWN`.
4. **Harden `day_habit_completions` RLS insert policy** (from Step 6904):
   `drop policy if exists "day_habit_completions: users can insert own" on day_habit_completions; create policy ...` (codified into migration 013). `applied: UNKNOWN`.

### Migration Hazards & Ordering Observations
- **Duplicates**: `009_fix_views_rls_and_skips.sql` and `999_ensure_all_columns_and_reload_cache.sql` duplicate almost the entire DDL of migrations 002, 003, 005, 006, and 008 (policies, views, and constraints).
- **Non-Idempotent Statements**: In `001_initial_schema.sql`, `create trigger day_entries_updated_at` previously lacked `drop trigger if exists` (fixed in step 6720). `007_curated_discipline_quotes.sql` performs raw `insert into quotes` without `on conflict do nothing`, causing duplicate quotes if executed repeatedly.
- **Dependency Ordering**: `001_initial_schema.sql` creates views `daily_scores` and `habit_monthly_stats` without `user_id`. `003_multi_user_rls.sql` adds `user_id` to tables, but does not update the views. The views fail multi-user isolation until `009` or `999` is run.

---

## 3. Data Model as the Code Expects It

### Tables & Columns
```text
Table: habits
  id: uuid (PK, default uuid_generate_v4())
  user_id: uuid (FK auth.users, nullable in 001, populated via auth.uid())
  name: text (not null)
  type: text (check in 'checkbox', 'checklist', 'amount')
  sort_order: integer (not null, default 0)
  is_archived: boolean (not null, default false)
  archived_at: timestamptz (nullable)
  notes: text (nullable)
  target_value: numeric (nullable, check > 0)
  unit: text (nullable, check length <= 16)
  step_value: numeric (not null, default 1, check > 0)
  color: text (not null, default 'sage', check in palette)
  icon: text (not null, default 'check')
  created_at: timestamptz (not null, default now())

Table: habit_subitems
  id: uuid (PK, default uuid_generate_v4())
  habit_id: uuid (FK habits.id on delete cascade, not null)
  user_id: uuid (FK auth.users, nullable)
  name: text (not null)
  sort_order: integer (not null, default 0)
  created_at: timestamptz (not null, default now())

Table: day_entries
  id: uuid (PK, default uuid_generate_v4())
  user_id: uuid (FK auth.users, default auth.uid())
  date: date (not null)
  mood: integer (check 1..5)
  energy: integer (check 1..5)
  sleep_hours: numeric(4,1)
  weight_kg: numeric(5,2)
  screen_time_minutes: integer
  notes: text
  created_at: timestamptz (not null, default now())
  updated_at: timestamptz (not null, default now())
  Unique: (date, user_id) [onConflict: 'date,user_id']

Table: day_habit_completions
  id: uuid (PK, default uuid_generate_v4())
  day_entry_id: uuid (FK day_entries.id on delete cascade, not null)
  habit_id: uuid (FK habits.id on delete cascade, not null)
  user_id: uuid (FK auth.users, default auth.uid())
  is_completed: boolean (not null, default false)
  is_skipped: boolean (not null, default false)
  amount: numeric (not null, default 0, check >= 0)
  target_snapshot: numeric (nullable)
  Unique: (day_entry_id, habit_id) [onConflict: 'day_entry_id,habit_id']

Table: day_subitem_completions
  id: uuid (PK, default uuid_generate_v4())
  day_entry_id: uuid (FK day_entries.id on delete cascade, not null)
  subitem_id: uuid (FK habit_subitems.id on delete cascade, not null)
  user_id: uuid (FK auth.users, default auth.uid())
  is_completed: boolean (not null, default false)
  Unique: (day_entry_id, subitem_id) [onConflict: 'day_entry_id,subitem_id']

Table: weekly_intentions
  id: uuid (PK, default uuid_generate_v4())
  user_id: uuid (FK auth.users, default auth.uid())
  year: integer (not null)
  week_number: integer (not null)
  intention: text (not null, default '')
  created_at: timestamptz (not null, default now())
  updated_at: timestamptz (not null, default now())
  Unique: (user_id, year, week_number) [onConflict: 'user_id,year,week_number']

Table: habit_day_notes
  id: uuid (PK, default gen_random_uuid())
  user_id: uuid (FK auth.users, default auth.uid())
  habit_id: uuid (FK habits.id on delete cascade, not null)
  date: date (not null)
  note: text (not null, check length 1..500)
  created_at: timestamptz (not null, default now())
  updated_at: timestamptz (not null, default now())
  Unique: (habit_id, date) [onConflict: 'habit_id,date']

Table: focus_sessions
  id: uuid (PK, client-provided)
  user_id: uuid (FK auth.users, default auth.uid())
  habit_id: uuid (FK habits.id on delete set null, nullable)
  started_at: timestamptz (not null)
  ended_at: timestamptz (not null, check ended_at > started_at)
  duration_seconds: integer (not null, check 60..43200)
  planned_seconds: integer (nullable, check > 0)
  mode: text (not null, check in 'countdown', 'pomodoro')
  local_date: date (not null)
  habit_minutes_applied: numeric (not null, default 0)
  created_at: timestamptz (not null, default now())

Table: month_reviews
  id: uuid (PK, default uuid_generate_v4())
  user_id: uuid (FK auth.users, default auth.uid())
  year: integer (not null)
  month: integer (not null)
  overall_completion_pct: numeric
  best_habit_id: uuid (FK habits.id on delete set null)
  worst_habit_id: uuid (FK habits.id on delete set null)
  avg_sleep_hours: numeric(4,1)
  avg_water_consistency: numeric
  workout_consistency_pct: numeric
  reading_consistency_pct: numeric
  deep_work_consistency_pct: numeric
  lessons_learned: text
  biggest_achievement: text
  goals_next_month: text
  final_reflection: text
  memorable_moments: text
  goals_this_month: text
  what_went_well: text
  habit_needs_work: text
  one_thing_to_change: text
  created_at: timestamptz (not null, default now())
  updated_at: timestamptz (not null, default now())
  Unique: (user_id, year, month) [onConflict: 'user_id,year,month']

Table: quotes
  id: uuid (PK, default uuid_generate_v4())
  user_id: uuid (FK auth.users, default auth.uid())
  text: text (not null)
  is_active: boolean (not null, default true)
  created_at: timestamptz (not null, default now())
```

### Full Definition of `daily_scores` View ([009_fix_views_rls_and_skips.sql:330-406](file:///d:/Projects/habit-tracker/supabase/migrations/009_fix_views_rls_and_skips.sql#L330-L406))
```sql
create or replace view daily_scores with (security_invoker = true) as
select
  de.id as day_entry_id,
  de.user_id,
  de.date,
  count(distinct case when coalesce(dhc.is_skipped, false) = false then h.id else null end) as total_active_habits,
  count(distinct case when dhc.is_skipped = true then h.id else null end) as skipped_habits,
  count(distinct case
    when coalesce(dhc.is_skipped, false) = false and (
      dhc.is_completed = true
      or (
        h.type = 'checklist'
        and (
          select count(*) from habit_subitems si
          where si.habit_id = h.id
            and si.created_at <= (de.date + interval '1 day')
        ) > 0
        and (
          select count(*) from habit_subitems si
          left join day_subitem_completions dsc
            on dsc.subitem_id = si.id and dsc.day_entry_id = de.id
          where si.habit_id = h.id
            and si.created_at <= (de.date + interval '1 day')
            and (dsc.is_completed is null or dsc.is_completed = false)
        ) = 0
      )
    ) then h.id
    else null
  end) as completed_habits,
  round(
    case
      when count(distinct case when coalesce(dhc.is_skipped, false) = false then h.id else null end) = 0 then 0
      else (
        count(distinct case
          when coalesce(dhc.is_skipped, false) = false and (
            dhc.is_completed = true
            or (
              h.type = 'checklist'
              and (
                select count(*) from habit_subitems si
                where si.habit_id = h.id
                  and si.created_at <= (de.date + interval '1 day')
              ) > 0
              and (
                select count(*) from habit_subitems si
                left join day_subitem_completions dsc
                  on dsc.subitem_id = si.id and dsc.day_entry_id = de.id
                where si.habit_id = h.id
                  and si.created_at <= (de.date + interval '1 day')
                  and (dsc.is_completed is null or dsc.is_completed = false)
              ) = 0
            )
          ) then h.id
          else null
        end)::numeric * 100.0 / count(distinct case when coalesce(dhc.is_skipped, false) = false then h.id else null end)
      )
    end, 2
  ) as completion_pct,
  de.mood,
  de.energy,
  de.sleep_hours
from day_entries de
join habits h
  on h.user_id = de.user_id
left join day_habit_completions dhc
  on dhc.day_entry_id = de.id and dhc.habit_id = h.id
where
  h.created_at::date <= de.date
  and (
    h.is_archived = false
    or (h.is_archived = true and h.archived_at::date > de.date)
  )
group by de.id, de.user_id, de.date, de.mood, de.energy, de.sleep_hours;
```

### Functions and RPCs
1. `update_updated_at()`: Trigger function updating `NEW.updated_at = now()`.
2. `log_focus_session(p_id, p_habit_id, p_started, p_ended, p_planned, p_mode, p_local_date)`: `SECURITY INVOKER` function in [012_focus_sessions.sql:54](file:///d:/Projects/habit-tracker/supabase/migrations/012_focus_sessions.sql#L54). Inserts `focus_sessions` row and atomically applies converted minutes to `day_habit_completions` amount.
3. `delete_focus_session(p_id)`: `SECURITY INVOKER` function in [012_focus_sessions.sql:203](file:///d:/Projects/habit-tracker/supabase/migrations/012_focus_sessions.sql#L203). Deletes `focus_sessions` row and deducts applied minutes from `day_habit_completions`.

### Table-to-Files Map
| Table | Files That Read It | Files That Write It |
| :--- | :--- | :--- |
| `habits` | `lib/db/habits.ts`, `lib/db/habit-detail.ts`, `lib/db/focus.ts`, `lib/db/insights.ts`, `lib/db/stats.ts`, `lib/db/seed.ts`, `actions/completion.actions.ts`, `actions/habit-note.actions.ts`, `actions/focus.actions.ts` | `actions/habit.actions.ts`, `lib/db/habits.ts`, `lib/db/seed.ts` |
| `habit_subitems` | `lib/db/habits.ts`, `lib/db/completions.ts`, `actions/completion.actions.ts`, `lib/db/seed.ts` | `actions/habit.actions.ts`, `lib/db/habits.ts`, `lib/db/seed.ts` |
| `day_entries` | `lib/db/entries.ts`, `lib/db/completions.ts`, `lib/db/insights.ts`, `lib/db/focus.ts` | `lib/db/entries.ts`, `actions/entry.actions.ts` |
| `day_habit_completions` | `lib/db/completions.ts`, `lib/db/habit-detail.ts`, `lib/db/habits.ts`, `actions/completion.actions.ts`, `actions/focus.actions.ts` | `lib/db/completions.ts`, `actions/completion.actions.ts`, `actions/focus.actions.ts` |
| `day_subitem_completions` | `lib/db/completions.ts`, `lib/db/habits.ts` | `lib/db/completions.ts`, `actions/completion.actions.ts` |
| `weekly_intentions` | `actions/intention.actions.ts` | `actions/intention.actions.ts` |
| `habit_day_notes` | `lib/db/habit-detail.ts` | `actions/habit-note.actions.ts` |
| `focus_sessions` | `lib/db/focus.ts` | `actions/focus.actions.ts` |
| `month_reviews` | `lib/db/insights.ts`, `lib/db/stats.ts`, `actions/review.actions.ts` | `actions/review.actions.ts`, `lib/db/habits.ts` |
| `quotes` | `lib/db/quotes.ts`, `lib/db/stats.ts`, `lib/db/seed.ts` | `lib/db/quotes.ts`, `actions/quote.actions.ts`, `lib/db/seed.ts` |
| `daily_scores` (view) | `lib/db/stats.ts`, `lib/db/insights.ts` | None (View) |
| `habit_monthly_stats` (view) | `lib/db/stats.ts`, `lib/db/insights.ts` | None (View) |

---

## 4. Auth and Sessions

### Verbatim Code Extracts

#### `middleware.ts` ([middleware.ts:1-90](file:///d:/Projects/habit-tracker/middleware.ts#L1-L90))
```typescript
// middleware.ts
// Supabase Auth session refresh + route protection.
// Uses @supabase/ssr to keep sessions alive and protect app routes.

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Always-public routes ─────────────────────────────────────────────────
  if (
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/screenshots') ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/sw.js'
  ) {
    return NextResponse.next()
  }

  // ── Supabase session refresh ──────────────────────────────────────────────
  let supabaseResponse = NextResponse.next({ request })

  // Synchronize Vercel edge geo timezone if client cookie not yet established
  const vercelTz = request.headers.get('x-vercel-ip-timezone')
  if (vercelTz && !request.cookies.get('x-user-timezone')) {
    request.cookies.set('x-user-timezone', vercelTz)
    supabaseResponse.cookies.set('x-user-timezone', vercelTz, {
      path: '/',
      maxAge: 31536000,
      sameSite: 'lax',
    })
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do not run any code between createServerClient and getUser()
  // that could cause the session to be stale.
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - /icons
     * - /screenshots
     * - /manifest.webmanifest
     * - / (public homepage)
     * - /login (auth page)
     * - /auth/* (auth callbacks)
     */
    '/((?!_next/static|_next/image|favicon.ico|icons|screenshots|manifest.webmanifest|sw.js).*)',
  ],
}
```

#### Supabase Client Factories
- **Browser Client** ([lib/supabase/client.ts:1-13](file:///d:/Projects/habit-tracker/lib/supabase/client.ts#L1-L13)):
  ```typescript
  import { createBrowserClient } from '@supabase/ssr'
  import type { Database } from './types'

  export function createClient() {
    return createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  ```
- **Server Client & Admin Client** ([lib/supabase/server.ts:16-69](file:///d:/Projects/habit-tracker/lib/supabase/server.ts#L16-L69)):
  ```typescript
  export const createServerClient = cache(async (): Promise<TypedSupabaseClient> => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !anonKey) {
      throw new Error('Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY)')
    }

    const cookieStore = await cookies()

    return createSSRServerClient<Database>(url, anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll is called from Server Components where cookies are read-only.
            // This is safe to ignore — the middleware handles session refresh.
          }
        },
      },
      global: {
        fetch: (input, init) =>
          fetch(input, { ...init, cache: 'no-store' }),
      },
    }) as unknown as TypedSupabaseClient
  })

  export function createAdminClient(): TypedSupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceKey) {
      throw new Error('Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)')
    }

    return createClient<Database>(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        fetch: (input, init) =>
          fetch(input, { ...init, cache: 'no-store' }),
      },
    })
  }
  ```

#### Auth Callback Route ([app/auth/callback/route.ts:39-86](file:///d:/Projects/habit-tracker/app/auth/callback/route.ts#L39-L86))
```typescript
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const rawRedirect = searchParams.get('next') ?? searchParams.get('redirect')
  const safeRedirectPath = sanitizeRedirectPath(rawRedirect, '/dashboard')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        try {
          await seedDefaultHabitsForUser(user.id)
        } catch (e) {
          console.warn('Auto-seed warning:', e)
        }
      }

      return NextResponse.redirect(new URL(safeRedirectPath, origin))
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth_callback_failed', origin))
}
```

#### Login & Signup Handler ([app/login/page.tsx:61-131](file:///d:/Projects/habit-tracker/app/login/page.tsx#L61-L131))
```typescript
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    const clientTz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (clientTz && isValidTimezone(clientTz)) {
      document.cookie = `x-user-timezone=${encodeURIComponent(clientTz)}; path=/; max-age=31536000; SameSite=Lax`
    }

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message.toLowerCase())
        setLoading(false)
        return
      }
      router.push('/dashboard')
      router.refresh()
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined,
          data: {
            full_name: name.trim() || undefined,
            timezone: clientTz && isValidTimezone(clientTz) ? clientTz : undefined,
          },
        },
      })
      if (error) {
        setError(error.message.toLowerCase())
        setLoading(false)
        return
      }

      if (data.user && !data.session) {
        await supabase.auth.signInWithPassword({ email, password })
      }

      if (data.user) {
        try {
          await fetch('/api/seed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
        } catch {}
      }

      router.push('/dashboard')
      router.refresh()
      setLoading(false)
    }
  }
```

#### `TimezoneSync` Component ([components/providers/TimezoneSync.tsx:1-60](file:///d:/Projects/habit-tracker/components/providers/TimezoneSync.tsx#L1-L60))
```typescript
'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isValidTimezone } from '@/lib/date'

interface TimezoneSyncProps {
  storedTimezone?: string | null
}

export function TimezoneSync({ storedTimezone }: TimezoneSyncProps) {
  const router = useRouter()
  const syncAttemptedRef = useRef(false)

  useEffect(() => {
    if (syncAttemptedRef.current) return
    syncAttemptedRef.current = true

    try {
      const clientTz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (!clientTz || !isValidTimezone(clientTz)) return

      const cookies = document.cookie.split('; ')
      const tzCookie = cookies.find((c) => c.startsWith('x-user-timezone='))
      const currentCookieVal = tzCookie ? decodeURIComponent(tzCookie.split('=')[1]) : null

      let cookieUpdated = false
      if (currentCookieVal !== clientTz) {
        document.cookie = `x-user-timezone=${encodeURIComponent(clientTz)}; path=/; max-age=31536000; SameSite=Lax`
        cookieUpdated = true
      }

      if (storedTimezone !== clientTz) {
        const supabase = createClient()
        supabase.auth.updateUser({ data: { timezone: clientTz } }).then(() => {
          if (cookieUpdated || storedTimezone) {
            router.refresh()
          }
        }).catch((err) => {
          console.warn('Failed to update user timezone metadata:', err)
        })
      } else if (cookieUpdated) {
        router.refresh()
      }
    } catch (e) {
      console.warn('TimezoneSync error:', e)
    }
  }, [storedTimezone, router])

  return null
}
```

#### Every Cookie Option Used Anywhere
- [middleware.ts:37-39](file:///d:/Projects/habit-tracker/middleware.ts#L37-L39): `{ path: '/', maxAge: 31536000, sameSite: 'lax' }`
- [app/layout.tsx:55](file:///d:/Projects/habit-tracker/app/layout.tsx#L55): `path=/; max-age=31536000; SameSite=Lax`
- [app/login/page.tsx:79](file:///d:/Projects/habit-tracker/app/login/page.tsx#L79): `path=/; max-age=31536000; SameSite=Lax`
- [components/providers/TimezoneSync.tsx:37](file:///d:/Projects/habit-tracker/components/providers/TimezoneSync.tsx#L37): `path=/; max-age=31536000; SameSite=Lax`

### Specific Questions Answered With Evidence
- **a) Does the middleware refresh the session with getClaims() or getUser() on every matched request?**  
  **No.** In [middleware.ts:12-26](file:///d:/Projects/habit-tracker/middleware.ts#L12-L26), requests to `/`, `/login`, `/signup`, `/auth`, and `/api/auth` return `NextResponse.next()` immediately without calling `getUser()`. It only calls `supabase.auth.getUser()` on matched protected paths ([middleware.ts:63](file:///d:/Projects/habit-tracker/middleware.ts#L63)).
- **b) Does it return the exact supabaseResponse it built, or copy that response's cookies onto every other response it returns (redirects included)?**  
  **No.** When `!user`, line 68 returns `NextResponse.redirect(loginUrl)` directly without copying `supabaseResponse.cookies`. Any cookies set by `setAll` or timezone sync are lost on redirect. For authenticated requests, it returns `supabaseResponse` (line 71).
- **c) Do the middleware and the server client both use getAll/setAll (no get/set/remove mix)?**  
  **Yes.** [middleware.ts:47-56](file:///d:/Projects/habit-tracker/middleware.ts#L47-L56) and [lib/supabase/server.ts:28-39](file:///d:/Projects/habit-tracker/lib/supabase/server.ts#L28-L39) both use `getAll()` and `setAll()`.
- **d) Which paths does the matcher skip? Is any page route skipped?**  
  Matcher config ([middleware.ts:88](file:///d:/Projects/habit-tracker/middleware.ts#L88)) skips static assets (`_next/static`, `_next/image`, `favicon.ico`, `icons`, `screenshots`, `manifest.webmanifest`, `sw.js`). In addition, the middleware function body ([middleware.ts:12-26](file:///d:/Projects/habit-tracker/middleware.ts#L12-L26)) manually skips page routes: `/`, `/login`, and `/signup`.
- **e) Does any code overwrite, delete or shorten Supabase auth cookies?**  
  **No.** No custom code manipulates `sb-*` auth cookies. Only `x-user-timezone` cookie is set.
- **f) Is there an onAuthStateChange listener, and what does it do on TOKEN_REFRESHED and SIGNED_OUT?**  
  **No.** There is **0** occurrences of `onAuthStateChange` across the entire codebase. No handler exists for `TOKEN_REFRESHED` or `SIGNED_OUT`.
- **g) How many auth calls (getUser, getClaims, getSession) does one page navigation make, per layer?**  
  - **Middleware layer**: 1 unmemoized `supabase.auth.getUser()` network call ([middleware.ts:63](file:///d:/Projects/habit-tracker/middleware.ts#L63)).
  - **Server Components layer**: 1 `supabase.auth.getUser()` network call in `lib/auth/session.ts:14` (memoized across layout, page, and db helpers via React `cache()`).
  - **Client layer**: 1 `supabase.auth.getUser()` call in `Sidebar.tsx:20` to fetch user email, plus `supabase.auth.updateUser()` in `TimezoneSync.tsx:44` if client timezone differs.
- **h) Where does "/" send a signed-in user, and what is the manifest start_url?**  
  - `/` sends signed-in users **nowhere**; it renders `HomePageClient` ([app/page.tsx:9-11](file:///d:/Projects/habit-tracker/app/page.tsx#L9-L11)) without checking auth or redirecting.
  - Manifest `start_url` is `'/'` ([app/manifest.ts:9](file:///d:/Projects/habit-tracker/app/manifest.ts#L9)).

---

## 5. Scoring and Analytics

### Metric Decision Points
| Metric | File & Line | Inputs | Rule Applied |
| :--- | :--- | :--- | :--- |
| **Active habits for date** | [lib/db/stats.ts:188-197](file:///d:/Projects/habit-tracker/lib/db/stats.ts#L188-L197) | `daily_scores.total_active_habits` or `db.from('habits').eq('is_archived', false)` | If `todayScore` exists in view, uses `total_active_habits` (skips excluded). If no score row, queries `habits` where `is_archived = false`. |
| **Active habits on Today** | [components/today/TodayClient.tsx:165](file:///d:/Projects/habit-tracker/components/today/TodayClient.tsx#L165) | `habits.filter((h) => !habitSkips[h.id])` | Active habits excluding habits skipped *today*. |
| **Completed habit** | [009_fix_views_rls_and_skips.sql:340-361](file:///d:/Projects/habit-tracker/supabase/migrations/009_fix_views_rls_and_skips.sql#L340-L361) | `dhc.is_completed`, subitems count | For checkbox: `dhc.is_completed = true`. For checklist: all subitems created prior to date must have `dsc.is_completed = true`. |
| **Daily %** | [009_fix_views_rls_and_skips.sql:362-391](file:///d:/Projects/habit-tracker/supabase/migrations/009_fix_views_rls_and_skips.sql#L362-L391) | `completed_habits`, `total_active_habits` | `round(completed_habits * 100.0 / total_active_habits, 2)` (or 0 if `total_active_habits = 0`). |
| **Perfect Day** | [lib/db/stats.ts:213](file:///d:/Projects/habit-tracker/lib/db/stats.ts#L213) | `allScores` from `daily_scores` | `completion_pct >= 100 && total_active_habits > 0 && completed_habits > 0`. |
| **Streaks** | [lib/stats/habit-math.ts:90-175](file:///d:/Projects/habit-tracker/lib/stats/habit-math.ts#L90-L175) | `records` Map, `createdDate`, `todayDate` | Consecutive non-broken days from today backward. Skips bridge streaks without breaking them. |
| **Weekly & Monthly Avg** | [lib/db/stats.ts:202-211](file:///d:/Projects/habit-tracker/lib/db/stats.ts#L202-L211) | `allScores` filtered by date | Arithmetic mean of `completion_pct` across all recorded score days in range. |

### Discrepancy: Today says 12 habits, Dashboard says 13
1. **Skip Filtering Discrepancy**:
   - In [components/today/TodayClient.tsx:165](file:///d:/Projects/habit-tracker/components/today/TodayClient.tsx#L165): `activeHabits = habits.filter((h) => !habitSkips[h.id])`. If 1 habit is skipped today, Today shows `12`.
   - In [lib/db/stats.ts:190-197](file:///d:/Projects/habit-tracker/lib/db/stats.ts#L190-L197): Before any check-in occurs today (`!todayScore`), Dashboard queries `db.from('habits').eq('is_archived', false)`, which returns `13`.
2. **UTC vs Local Date Boundary Discrepancy**:
   - In `daily_scores` view ([009_fix_views_rls_and_skips.sql:401](file:///d:/Projects/habit-tracker/supabase/migrations/009_fix_views_rls_and_skips.sql#L401)): `h.created_at::date <= de.date`. If a habit was created today in user local time, but its UTC timestamp reflects tomorrow's UTC date, the view excludes it from `daily_scores` until tomorrow UTC.

### Seed Habits and Subitems ([supabase/seed.sql](file:///d:/Projects/habit-tracker/supabase/seed.sql) & [lib/db/seed.ts:5-130](file:///d:/Projects/habit-tracker/lib/db/seed.ts#L5-L130))
- **Total Top-Level Habits**: **13** (Morning Routine, Gym/Workout, 10k Steps, Drink 4L Water, Healthy Diet & Creatine, Deep Work, Skill Building, Book Reading, Journaling, Mandir/Prayer, No Social Media/Reels, No Fap, Night Routine).
- **Morning Routine Sub-Items**: **9** (`'No phone after waking up'`, `'Make bed'`, `'Brush teeth'`, `'Wash face'`, `'Drink water'`, `'Morning sunlight'`, `'Stretch'`, `'Pray'`, `'Plan Top 3 Tasks'`).
- **Night Routine Sub-Items**: **11** (`'No phone before sleeping'`, `'Brush teeth'`, `'Skincare'`, `'Prepare clothes'`, `'Pack bag'`, `'Fill water bottle'`, `'Journal'`, `'Read'`, `'Pray'`, `'Set alarm'`, `'Sleep on time'`).

---

## 6. Feature Inventory

| Feature | Status | Primary File Paths | DB Requirements (Table / Column) |
| :--- | :--- | :--- | :--- |
| **Amount habits** | Exists | [lib/stats/rules.ts](file:///d:/Projects/habit-tracker/lib/stats/rules.ts), [components/habit/HabitCardView.tsx](file:///d:/Projects/habit-tracker/components/habit/HabitCardView.tsx), [actions/completion.actions.ts](file:///d:/Projects/habit-tracker/actions/completion.actions.ts) | `habits.target_value`, `unit`, `step_value`; `day_habit_completions.amount`, `target_snapshot` (Migration 010) |
| **Habit color & icon** | Exists | [lib/habit-theme.ts](file:///d:/Projects/habit-tracker/lib/habit-theme.ts), [components/settings/HabitManager.tsx](file:///d:/Projects/habit-tracker/components/settings/HabitManager.tsx) | `habits.color`, `habits.icon` (Migration 010) |
| **Habit detail page** | Exists | [app/(app)/habits/[id]/page.tsx](file:///d:/Projects/habit-tracker/app/(app)/habits/[id]/page.tsx), [components/habit-detail/HabitDetailClient.tsx](file:///d:/Projects/habit-tracker/components/habit-detail/HabitDetailClient.tsx), [lib/db/habit-detail.ts](file:///d:/Projects/habit-tracker/lib/db/habit-detail.ts) | Reads `habits`, `day_habit_completions`, `habit_day_notes` |
| **Per-habit day notes** | Exists | [actions/habit-note.actions.ts](file:///d:/Projects/habit-tracker/actions/habit-note.actions.ts), [components/habit-detail/HabitDetailClient.tsx](file:///d:/Projects/habit-tracker/components/habit-detail/HabitDetailClient.tsx) | Table `habit_day_notes` (Migration 011) |
| **Focus timer** | Exists | [app/(app)/focus/page.tsx](file:///d:/Projects/habit-tracker/app/(app)/focus/page.tsx), [components/focus/FocusTimerClient.tsx](file:///d:/Projects/habit-tracker/components/focus/FocusTimerClient.tsx), [actions/focus.actions.ts](file:///d:/Projects/habit-tracker/actions/focus.actions.ts) | Table `focus_sessions`, RPC `log_focus_session`, `delete_focus_session` (Migration 012) |
| **Weekly intention** | Exists | [actions/intention.actions.ts](file:///d:/Projects/habit-tracker/actions/intention.actions.ts), [components/today/WeeklyIntention.tsx](file:///d:/Projects/habit-tracker/components/today/WeeklyIntention.tsx) | Table `weekly_intentions` (Migration 008). Error text on failure: `'Failed to save intention'` ([WeeklyIntention.tsx:63](file:///d:/Projects/habit-tracker/components/today/WeeklyIntention.tsx#L63)) |
| **Skip / rest day** | Exists | [actions/completion.actions.ts:130](file:///d:/Projects/habit-tracker/actions/completion.actions.ts#L130), [components/today/TodayClient.tsx:327](file:///d:/Projects/habit-tracker/components/today/TodayClient.tsx#L327) | `day_habit_completions.is_skipped` (Migration 008) |
| **Theme sync** | Partial | [components/nav/ThemeToggle.tsx](file:///d:/Projects/habit-tracker/components/nav/ThemeToggle.tsx), [app/layout.tsx:28](file:///d:/Projects/habit-tracker/app/layout.tsx#L28) | Client-side only (`localStorage` + `<html>` attribute; no DB table/column) |
| **Quotes** | Exists | [lib/db/quotes.ts](file:///d:/Projects/habit-tracker/lib/db/quotes.ts), [components/settings/QuotesManager.tsx](file:///d:/Projects/habit-tracker/components/settings/QuotesManager.tsx) | Table `quotes` (Migration 001, 007) |
| **Monthly review** | Exists | [app/(app)/review/page.tsx](file:///d:/Projects/habit-tracker/app/(app)/review/page.tsx), [components/review/MonthlyReviewClient.tsx](file:///d:/Projects/habit-tracker/components/review/MonthlyReviewClient.tsx) | Table `month_reviews` (Migration 001, 006) |
| **Calendar day sheet** | Exists | [app/(app)/calendar/page.tsx](file:///d:/Projects/habit-tracker/app/(app)/calendar/page.tsx), [components/calendar/DayEntryModal.tsx](file:///d:/Projects/habit-tracker/components/calendar/DayEntryModal.tsx) | Uses `day_entries`, `day_habit_completions` |
| **5-day strip view** | Partial | [app/(app)/today/page.tsx:50-94](file:///d:/Projects/habit-tracker/app/(app)/today/page.tsx#L50-L94), [components/today/TodayClient.tsx](file:///d:/Projects/habit-tracker/components/today/TodayClient.tsx) | Implemented as a 7-day week strip (Mon-Sun); 5-day view does not exist. |
| **Data export** | Missing | None | None (no JSON/CSV export endpoint or UI exists) |
| **Account deletion** | Missing | [components/settings/SettingsClient.tsx:253](file:///d:/Projects/habit-tracker/components/settings/SettingsClient.tsx#L253) | None (Settings > Account only shows user email and sign-out button) |

---

## 7. Performance Map

### Query Profile by Route
| Route | Queries Executed (Tables / Views & Date Ranges) | Execution Mode | Reads Full History? | Supabase Network Calls Per Render | First-Load JS (Last Build) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/dashboard` | `daily_scores` (all rows, no limit), `quotes` (`is_active=true`), `month_reviews` (last month) | Sequential & Parallel | **YES** (`daily_scores` scans all history) | 3–4 calls | 251 kB |
| `/today` | `habits`, `habit_subitems`, `day_entries` (today & yesterday), `weekly_intentions` (current ISO week), `day_entries` (7-day week strip), `day_habit_completions` (today & yesterday), `day_subitem_completions` | Two sequential `Promise.all` blocks | No (date-scoped) | **10–12 calls** | 172 kB |
| `/grid` | `habits` (all active/archived), `day_entries` (month range), `day_habit_completions` (month range), `daily_scores` (month range) | Parallel (`Promise.all`) | No (month-scoped) | 4 calls | 162 kB |
| `/calendar` | `daily_scores` (all rows, no limit), `habits` (with subitems), `todayDate` | Parallel (`Promise.all`) | **YES** (`daily_scores` scans all history) | 3 calls | 160 kB |
| `/insights` | `habits`, `day_entries` (month), `daily_scores` (month), `daily_scores` (**all history**), `habit_monthly_stats` (this month & prior month) | Parallel (`Promise.all`) | **YES** (`daily_scores` scans all history) | 6 calls | 221 kB |
| `/review` | Inherits all 6 queries from `/insights` (including full-history `daily_scores`), plus `month_reviews` query | Sequential (`getInsightsData` then `month_reviews`) | **YES** | 7 calls | 152 kB |

### Streaming & Loading States
- **`loading.tsx`**: **0 files exist** across the entire project.
- **`<Suspense>` Boundaries**: **0 occurrences** across the entire codebase. Every page blocks server-side until all queries complete.

---

## 8. UI References

- **Habit Card**:
  - File: [components/habit/HabitCardView.tsx](file:///d:/Projects/habit-tracker/components/habit/HabitCardView.tsx)
  - Props: `variant` ('checkbox'|'checklist'|'amount'), `title`, `subtitle`, `icon`, `accentColor`, `completed`, `progressPct`, `currentAmount`, `targetAmount`, `unit`, `stepValue`, etc.
  - Layout classes: `relative overflow-hidden transition-all duration-150 rounded-2xl border` with custom inline styles for hover and press.
- **Today Header**:
  - File: [components/today/TodayClient.tsx:550-940](file:///d:/Projects/habit-tracker/components/today/TodayClient.tsx#L550-L940)
  - Contains week strip date selector, date navigation buttons, progress percentage banner, and category filter pills.
- **Homepage Nav**:
  - File: [components/homepage/HomePageClient.tsx:340-370](file:///d:/Projects/habit-tracker/components/homepage/HomePageClient.tsx#L340-L370)
  - Top navigation bar featuring logo `~/ 1% Better`, theme toggle switch, Log In link, and Start Free CTA button.
- **Dashboard Progress Card**:
  - File: [components/dashboard/DashboardClient.tsx:85-155](file:///d:/Projects/habit-tracker/components/dashboard/DashboardClient.tsx#L85-L155)
  - Card showing Today's completion %, streak status, cat companion pixel asset, and total habits done.
- **Bottom Bar**:
  - File: [components/nav/BottomTabBar.tsx](file:///d:/Projects/habit-tracker/components/nav/BottomTabBar.tsx)
  - Floating pill bar at `bottom: calc(12px + env(safe-area-inset-bottom, 0px))`. Slots: Dashboard, Today, Focus (raised center accent button), Calendar, More (bottom sheet drawer).
- **Sidebar Nav Order**:
  - File: [lib/nav.ts:21-30](file:///d:/Projects/habit-tracker/lib/nav.ts#L21-L30)
  - Order: `Dashboard`, `Today`, `Grid`, `Focus`, `Insights`, `Settings`, `Calendar`, `Review`.
- **`globals.css` Specifications**:
  - Light theme `--dot-color`: [app/globals.css:24](file:///d:/Projects/habit-tracker/app/globals.css#L24) (`rgba(28, 25, 20, 0.09)`) inside `:root`.
  - Dark theme `--dot-color`: [app/globals.css:87](file:///d:/Projects/habit-tracker/app/globals.css#L87) (`rgba(245, 242, 236, 0.20)`) inside `[data-theme="dark"]`.
  - Dark mode selector: `[data-theme="dark"]` ([app/globals.css:77](file:///d:/Projects/habit-tracker/app/globals.css#L77)).
  - `next-themes` configuration: **None** (custom `data-theme` attribute manipulated by [components/providers/ThemeProvider.tsx](file:///d:/Projects/habit-tracker/components/providers/ThemeProvider.tsx) and [app/layout.tsx:28-44](file:///d:/Projects/habit-tracker/app/layout.tsx#L28-L44)).
  - `100vh` occurrences: **0** across all stylesheets and components.
  - `100dvh` occurrences:
    - [app/globals.css:160](file:///d:/Projects/habit-tracker/app/globals.css#L160) (`body { min-height: 100dvh }`)
    - [app/globals.css:275](file:///d:/Projects/habit-tracker/app/globals.css#L275) (`.app-shell { min-height: 100dvh }`)
    - [app/globals.css:280](file:///d:/Projects/habit-tracker/app/globals.css#L280) (`.app-sidebar { height: 100dvh }`)
    - [app/globals.css:302](file:///d:/Projects/habit-tracker/app/globals.css#L302) (`.app-main { min-height: 100dvh }`)
    - [components/nav/Sidebar.tsx:41](file:///d:/Projects/habit-tracker/components/nav/Sidebar.tsx#L41) (`height: '100dvh'`)
    - [app/login/page.tsx:158, 181](file:///d:/Projects/habit-tracker/app/login/page.tsx#L158) (`minHeight: '100dvh'`)
  - `safe-area` insets:
    - [app/globals.css:303](file:///d:/Projects/habit-tracker/app/globals.css#L303): `padding-bottom: calc(96px + env(safe-area-inset-bottom, 0px))`
    - [app/globals.css:321](file:///d:/Projects/habit-tracker/app/globals.css#L321): `bottom: calc(12px + env(safe-area-inset-bottom, 0px))`
    - [components/focus/FocusTimerClient.tsx:485](file:///d:/Projects/habit-tracker/components/focus/FocusTimerClient.tsx#L485): `paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)'`
    - [components/ui/ResponsiveSheet.tsx:103](file:///d:/Projects/habit-tracker/components/ui/ResponsiveSheet.tsx#L103): `paddingBottom: 'env(safe-area-inset-bottom, 0px)'`

---

## 9. Housekeeping

### TODO / FIXME / HACK
- **0 occurrences** of `TODO`, `FIXME`, or `HACK` across the entire codebase.

### Silent / Generic Error Catch Blocks
- [actions/intention.actions.ts:27](file:///d:/Projects/habit-tracker/actions/intention.actions.ts#L27): Empty catch block swallows DB read errors and returns empty string.
- [actions/intention.actions.ts:57-59](file:///d:/Projects/habit-tracker/actions/intention.actions.ts#L57-L59): Catches upsert failure and returns generic string `'Failed to save intention'`.
- [components/today/WeeklyIntention.tsx:67](file:///d:/Projects/habit-tracker/components/today/WeeklyIntention.tsx#L67): Client catch block silently swallows errors and reverts value.
- [actions/focus.actions.ts:134](file:///d:/Projects/habit-tracker/actions/focus.actions.ts#L134): Fallback catch block silently catches session insertion error and returns `{ success: true }`.
- [lib/db/focus.ts:98](file:///d:/Projects/habit-tracker/lib/db/focus.ts#L98): Swallows error fetching focus sessions and resets counters to 0.
- [lib/db/habit-detail.ts:85](file:///d:/Projects/habit-tracker/lib/db/habit-detail.ts#L85): Swallows error fetching habit day notes and sets notes array to `[]`.
- [lib/db/quotes.ts:43, 91](file:///d:/Projects/habit-tracker/lib/db/quotes.ts#L43): Swallows DB errors and falls back silently.
- [lib/auth/session.ts:17, 29](file:///d:/Projects/habit-tracker/lib/auth/session.ts#L17): Swallows session retrieval errors and returns `null`.

### Unused Components
- **`components/homepage/Screenshot.tsx`**: Component defined but **never imported or used** anywhere in `app/` or `components/`.

### Service-Role Client Instantiations
- Defined at [lib/supabase/server.ts:51-69](file:///d:/Projects/habit-tracker/lib/supabase/server.ts#L51-L69) (`createAdminClient()`).
- Called in code: **0 calls**. No application route or action invokes `createAdminClient()`.

