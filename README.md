# Attendance QR (React + Supabase)

Minimal Vite + React frontend that can generate per-student QR codes and scan them to record attendance into Supabase.

Setup

1. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` with your Supabase project values.
2. Create the required tables (run in Supabase SQL editor):

```sql
create table students (
  id text primary key,
  name text,
  department text
);

create table attendances (
  id bigserial primary key,
  student_id text references students(id),
  department text,
  scanned_at timestamptz default now()
);

-- Create profiles table to map auth users to roles
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  role text,
  student_id text,
  full_name text,
  department text
);
```

3. Install and run locally:

```bash
npm install
npm run dev
```

Usage

- Use the `Generate QR` panel to produce a QR containing `{ student_id, name, department }`.
- Use the `Scan QR` panel to scan and automatically record attendance into the `attendances` table.

Notes

- This is a minimal example. Secure your Supabase keys and add authentication/authorization for production.
- The scanner expects the QR payload to be JSON with at least `student_id` and `department`.
- Add an auth user in Supabase (Auth → Users), then insert a matching `profiles` row with `role` set to `admin` or `student` to enable role-based routing in the app.

Configuration

- You can set a default API page size using the `VITE_API_DEFAULT_LIMIT` environment variable (defaults to `50`). This caps list queries from the frontend to avoid large responses.
