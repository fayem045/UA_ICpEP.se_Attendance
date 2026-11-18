# ICpEP Attendance QR

Attendance management app for the ICpEP.UA Chapter. Admins can manage members and events, record attendance by scanner or manually, and export reports. Students can sign in with a university account, complete their profile, view chapter events, and display a permanent attendance QR.

## Features

- Supabase email/password sign-in, student sign-up, and confirmation email resend.
- Admin dashboard with live counts, weekly activity, upcoming events, recent attendance, and member QR generator.
- Student directory with search and admin edit/delete controls. Deleting a student also removes that student's attendance records.
- Event create, edit, and delete flows.
- Event-based QR scanning, manual attendance status updates, duplicate protection, and refreshable roster.
- Attendance reports with date/event filters, status and year-level summaries, and CSV export.
- Student dashboard with a chapter event schedule and signed, non-expiring attendance QR.
- Google and Facebook sign-in are intentionally deferred until provider credentials are configured in Supabase.

## Run locally

1. Copy `.env.example` to `.env`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the Supabase project's API settings. Keep the Supabase service-role key out of this file and the browser app.
3. Put `JWT_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` in an untracked `.env.local` file. Use a random `JWT_SECRET` with at least 32 characters. Set `SUPABASE_SERVICE_ROLE_KEY` to the secret key (`sb_secret_...`) or legacy `service_role` JWT from the same Supabase project as `VITE_SUPABASE_URL`—not its publishable/anon key. This key is required for admin member edits/deletions; never prefix it with `VITE_` or expose it to the browser.
4. Set `VITE_ADMIN_EMAILS` to a comma-separated list of additional admin emails. `adminside1@gmail.com` is already included in the app.
5. Install dependencies with `npm install`.
6. Start the backend in one terminal with `npm run backend`.
7. Start the frontend in another terminal with `npm run dev`.

The frontend defaults to `http://localhost:4000` for the backend API. Change `VITE_API_BASE_URL` if you run the backend on another address. For a deployed frontend, set `VITE_API_BASE_URL` to the backend's public URL and set `CORS_ORIGINS` in the backend environment to the frontend's exact origin (for example, `https://attendance.example.com`). Localhost origins are allowed for development. `npm run build` creates the production frontend bundle.

## Supabase setup

Use the configured project database with tables for `students`, `attendances`, `profiles`, and `events`. Apply the SQL migrations in `supabase/migrations` so the schema matches the app and authenticated students can read the event schedule; keep event creation, updates, and deletion restricted to admins. The app's policies should restrict roster and attendance management to admins. Student users can read and update only their own student profile. Do not replace existing management or profile policies with broad `using (true)` policies.

Create admin users in Supabase Authentication and assign their profile role as `admin`. Add their email to `VITE_ADMIN_EMAILS` when it is not the built-in admin email. Student accounts must use an address ending in `.student@ua.edu.ph`; the app creates a student profile when the account is registered.

In Supabase Auth, enable email confirmation and add the local frontend URLs to the redirect allowlist, including `http://localhost:5173/**` and `http://127.0.0.1:5173/**` (and the corresponding port 5174 URLs if using that port). Configure Google or Facebook providers later, after creating their OAuth application credentials.

## QR scanning

Camera scanning needs browser camera permission and works on `localhost` or an HTTPS site. Student QR tokens are signed by the backend, do not expire, and can be scanned into an event. Admin-generated roster QRs are static JSON codes for in-person roster use.
