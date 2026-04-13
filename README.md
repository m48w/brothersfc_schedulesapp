# Brothers FC Schedules App

A web application login module for Brothers FC that authenticates users with Supabase and shows different post-login screens based on role (`admin` or `player`).

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
- Profile lookup from `profiles` table (`id`, `full_name`, `role`).
- Logout support on both admin and player pages.
- Feature-oriented folder structure for scalability.

## Tech Stack

- React
- TypeScript
- React Router v7
- Supabase (`@supabase/supabase-js`)
- Vite

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
|   |   `-- supabase.ts
|   |-- pages
|   |   |-- AdminDashboardPage.tsx
|   |   |-- LoginPage.tsx
|   |   `-- PlayerWelcomePage.tsx
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

### 3) Create the `profiles` table

Run this SQL:

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin', 'player'))
);
```

### 4) Configure Row Level Security (RLS)

Run:

```sql
alter table public.profiles enable row level security;

create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);
```

### 5) Create users and profile rows

1. Create users in `Authentication` -> `Users` (email + password).
2. Insert matching rows in `public.profiles`:
   - `id` = `auth.users.id`
   - `full_name` = display name
   - `role` = `admin` or `player`

Example:

```sql
insert into public.profiles (id, full_name, role)
values
  ('00000000-0000-0000-0000-000000000001', 'Admin User', 'admin'),
  ('00000000-0000-0000-0000-000000000002', 'Koko', 'player');
```

## Run Locally

```bash
npm run dev
```

Then open the local URL shown in terminal (usually `http://localhost:5173`).
