# ICpEP Attendance QR

## Technologies and features

### Frontend: React.js

- `src/App.jsx` checks the Supabase session and routes signed-in users to the admin or student portal based on their email.
- `src/components/Login.jsx` provides email/password login, student sign-up, confirmation-email resend, and Google/Facebook sign-in.
- `src/components/AdminView.jsx` switches between the admin pages. `src/pages/Dashboard.jsx` displays the dashboard, member QR generator, and sample attendance and event information.
- `src/components/QRGenerator.jsx` lets admins enter member details, save them to Supabase, and preview the generated QR code.
- `src/components/StudentView.jsx` requests and displays a QR token for the signed-in student.
- `src/components/QRScanner.jsx` scans QR codes and records attendance.
- `src/pages/Members.jsx` loads and displays student and faculty records. The Attendance and Events pages are basic views; Reports is still under development.
- Vite runs the frontend development server and builds the React app.

### Backend: Node.js and Express.js

- `server.js` runs the API on Node.js using Express.
- `POST /api/student/qr` creates a signed, expiring QR token; `POST /api/attendance/scan` validates a token; and `GET /api/health` checks that the backend is running.
- The student portal requests a QR token from the backend, and the scanner sends token-based scans for verification.

### Database and authentication: Supabase

- Supabase Auth manages account sign-in and sign-up. The app uses the current session to show the appropriate portal.
- Supabase provides the PostgreSQL database for member and attendance records. The app reads and writes tables such as `students`, `faculty`, and `attendances`.

## Supabase Auth setup

Create the administrator in Supabase Dashboard under **Authentication > Users**:

- Email: `AdminSide1@gmail.com`
- Set a password and confirm the user email.

The app routes that account to the admin dashboard. Student accounts must use an
email ending in `.student@ua.edu.ph` and are routed to the student QR portal.

For student confirmation emails, open Supabase **Authentication > Providers > Email**
and ensure **Confirm email** is enabled. Add `http://127.0.0.1:5173/**` and
`http://localhost:5173/**` under **Authentication > URL Configuration > Redirect URLs**.
The development SMTP service may limit delivery; configure custom SMTP for reliable
email delivery.
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

create table faculty (
  id text primary key,
  name text not null,
  department text
);

create table attendances (
  id bigserial primary key,
  student_id text references students(id),
  department text,
  scanned_at timestamptz default now(),
  event_name text not null default 'General Assembly',
  status text not null default 'Present'
    check (status in ('Present', 'Late', 'Absent'))
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

For an existing `attendances` table, add the fields used by the Attendance page:

```sql
alter table attendances
  add column if not exists event_name text not null default 'General Assembly',
  add column if not exists status text not null default 'Present';
```

Allow authenticated users to view and manage attendance records when Row Level Security is enabled:

```sql
alter table attendances enable row level security;

create policy "authenticated users can read attendance"
  on attendances for select to authenticated using (true);

create policy "authenticated users can add attendance"
  on attendances for insert to authenticated with check (true);

create policy "authenticated users can update attendance"
  on attendances for update to authenticated using (true) with check (true);

create policy "authenticated users can delete attendance"
  on attendances for delete to authenticated using (true);
```

Allow signed-in admins to read and save members when Row Level Security is enabled:

```sql
alter table students enable row level security;
alter table faculty enable row level security;

create policy "authenticated users can read students"
  on students for select to authenticated using (true);

create policy "authenticated users can add students"
  on students for insert to authenticated with check (true);

create policy "authenticated users can update students"
  on students for update to authenticated using (true) with check (true);

create policy "authenticated users can read faculty"
  on faculty for select to authenticated using (true);

create policy "authenticated users can add faculty"
  on faculty for insert to authenticated with check (true);

create policy "authenticated users can update faculty"
  on faculty for update to authenticated using (true) with check (true);
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
