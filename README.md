# Brothers FC Schedules App

A web application for Brothers FC that authenticates users with Supabase and provides role-based admin/player workflows for scheduling and attendance.

## Purpose

This project provides a clean, maintainable foundation for role-based access in the Brothers FC system. It demonstrates how to:

- authenticate users securely,
- map authenticated users to app-specific profile data,
- and control what users see after login based on role.

## Features

- Email/password login using Supabase Auth.
- Role-based access flow:
  - Admin users see: `Brothers FC Dashboard`
  - Player users see: `(Brothers FC) Welcome, [Player Name]`
- Profile lookup from `user` table (`id`, `full_name`, `role`, `player_id`, `is_active_player`).
- Logout support on both admin and player pages.
- Admin tabs for dashboard/schedule/attendance:
  - Dashboard: sporty realtime clock UI, next practice/match countdown, next event card, monthly player attendance rate
  - Schedule: compact create form with category master (`練習 / 試合 / イベント`) and monthly list
  - Attendance: monthly day-by-day player list with per-day participant totals and inline attendance saving
- Global Settings page for user preferences.
- Internationalization (i18n) support (English & Japanese) via `react-i18next`.
- Feature-oriented folder structure for scalability.

## Tech Stack

- React
- TypeScript
- React Router v7
- Supabase (`@supabase/supabase-js`)
- Vite
- i18next & react-i18next (Internationalization)

## Project Structure

```text
.
|-- src
|   |-- features
|   |   `-- auth
|   |       |-- api.ts
|   |       `-- components
|   |           `-- LoginForm.tsx
|   |-- lib
|   |   |-- i18n.ts
|   |   `-- supabase.ts
|   |-- pages
|   |   |-- AdminDashboardPage.tsx
|   |   |-- LoginPage.tsx
|   |   |-- PlayerWelcomePage.tsx
|   |   `-- SettingsPage.tsx
|   |-- router
|   |   `-- index.tsx
|   |-- styles
|   |   `-- global.css
|   |-- types
|   |   `-- auth.ts
|   |-- main.tsx
|   `-- vite-env.d.ts
|-- .env.example
|-- index.html
|-- package.json
|-- tsconfig.app.json
|-- tsconfig.json
|-- tsconfig.node.json
`-- vite.config.ts
```

## Frontend Setup

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

Create a `.env` file (or copy from `.env.example`) and add:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Backend Setup (Supabase)

### 1) Create a Supabase project

Create a project at [Supabase](https://supabase.com/) and get:

- Project URL
- Publishable/Anon key

### 2) Enable email authentication

In Supabase dashboard:

- Go to `Authentication` -> `Providers`
- Enable the `Email` provider

### 3) Create the app tables

Run the SQL in [src/sql/table/table.sql](/E:/My%20Execrise%20Project/brothersfc_schedulesapp/src/sql/table/table.sql:1).

Current schema includes:

- `public."user"` for admin/player profiles
- `public.location_master` for facilities
- `public.category_master` for schedule classifications:
  - `practice` / `練習`
  - `match` / `試合`
  - `event` / `イベント`
- `public.schedule` with `category_id`
- `public.attendance` for per-schedule player attendance

### 4) Configure Row Level Security (RLS)

RLS and policies are also included in [src/sql/table/table.sql](/E:/My%20Execrise%20Project/brothersfc_schedulesapp/src/sql/table/table.sql:1).

At minimum confirm:

```sql
alter table public."user" enable row level security;
alter table public.location_master enable row level security;
alter table public.category_master enable row level security;
alter table public.schedule enable row level security;
alter table public.attendance enable row level security;
```

### 5) Create users and profile rows

1. Create users in `Authentication` -> `Users` (email + password).
2. Insert matching rows in `public."user"`:
   - `id` = `auth.users.id`
   - `full_name` = display name
   - `role` = `admin` or `player`

Example:

```sql
insert into public."user" (id, full_name, role, player_id, is_active_player)
values
  ('00000000-0000-0000-0000-000000000001', 'Admin User', 'admin', null, false),
  ('00000000-0000-0000-0000-000000000002', 'Koko', 'player', 'BRO-001', true);
```

### 6) Seed master and sample data

Optional sample SQL is available in [src/sql/sample/sample.sql](/E:/My%20Execrise%20Project/brothersfc_schedulesapp/src/sql/sample/sample.sql:1).

If you are upgrading an existing Supabase project from the old `schedule.title` structure, check [src/sql/memo.txt](/E:/My%20Execrise%20Project/brothersfc_schedulesapp/src/sql/memo.txt:1) for the migration steps and required manual checks.

## Run Locally

```bash
npm run dev
```

Then open the local URL shown in terminal (usually `http://localhost:5173`).
