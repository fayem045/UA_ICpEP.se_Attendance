# ICpEP Attendance QR

Attendance management app for the ICpEP.UA Chapter. Admins can manage members and events, record attendance by scanner or manually, and export reports. Students can sign in with a university account, complete their profile, and display a time-limited attendance QR.

## Features

- Supabase email/password sign-in, student sign-up, and confirmation email resend.
- Admin dashboard with live counts, weekly activity, upcoming events, recent attendance, and member QR generator.
- Member directory with search and student/faculty filters.
- Event create, edit, and delete flows.
- Event-based QR scanning, manual attendance status updates, duplicate protection, and refreshable roster.
- Attendance reports with date/event filters, status and department summaries, and CSV export.
- Student profile completion and signed QR codes that expire after 12 hours.
- Google and Facebook sign-in are intentionally deferred until provider credentials are configured in Supabase.

## Run locally

1. Copy `.env.example` to `.env`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the Supabase project's API settings. Keep the Supabase service-role key out of this file and the browser app.
3. Put `JWT_SECRET` in an untracked `.env.local` file, using a random secret with at least 32 characters. The backend uses this only to sign and validate student QR tokens.
4. Set `VITE_ADMIN_EMAILS` to a comma-separated list of additional admin emails. `adminside1@gmail.com` is already included in the app.
5. Install dependencies with `npm install`.
6. Start the backend in one terminal with `npm run backend`.
7. Start the frontend in another terminal with `npm run dev`.

The frontend defaults to `http://localhost:4000` for the backend API. Change `VITE_API_BASE_URL` if you run the backend on another address. `npm run build` creates the production frontend bundle.

## Supabase setup

Use the configured project database with tables for `students`, `faculty`, `attendances`, `profiles`, and `events`. The app's policies should restrict roster, event, and attendance management to admins. Student users can read and update only their own student profile. Do not replace these policies with broad `using (true)` policies.

Create admin users in Supabase Authentication and assign their profile role as `admin`. Add their email to `VITE_ADMIN_EMAILS` when it is not the built-in admin email. Student accounts must use an address ending in `.student@ua.edu.ph`; the app creates a student profile when the account is registered.

In Supabase Auth, enable email confirmation and add the local frontend URLs to the redirect allowlist, including `http://localhost:5173/**` and `http://127.0.0.1:5173/**` (and the corresponding port 5174 URLs if using that port). Configure Google or Facebook providers later, after creating their OAuth application credentials.

## QR scanning

Camera scanning needs browser camera permission and works on `localhost` or an HTTPS site. Student QR tokens are signed by the backend, expire after 12 hours, and can be scanned into an event. Admin-generated roster QRs are static JSON codes for in-person roster use.
