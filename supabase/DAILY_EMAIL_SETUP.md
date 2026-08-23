# Daily To-Do Email

Goal Command Center can send one printable email each day containing every unfinished task and bill due that day. Users can optionally include scheduled habits.

## What is already implemented

- `daily_email_preferences` table with per-user RLS.
- `daily_email_log` delivery history table.
- `send-daily-todos` Edge Function.
- Notifications UI in the web app.
- Printable email/checklist HTML.
- Test-email action from the app.
- User-selected email, local send time, and time zone.
- Optional habits and optional empty-list emails.
- Duplicate-send protection using the daily delivery log and Resend idempotency keys.

## Required Edge Function secrets

Set these in Supabase Edge Function secrets. Never commit their values to GitHub.

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` — for example `Goal Command Center <todos@yourdomain.com>`
- `CRON_SECRET` — a long random string used only by the scheduler
- `APP_URL` — optional; defaults to the current Goal Command Center GitHub Pages URL

Supabase provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the Edge Function environment.

## Database + function deployment

Apply:

- `migrations/20260823_daily_todo_email.sql`

Deploy:

- `functions/send-daily-todos/index.ts`

The project config sets `verify_jwt = false` for this function because the function performs its own authorization:

- browser test requests must include a valid signed-in user token;
- scheduled requests must include the private `x-cron-secret` header.

## Resend

Create/choose a verified sending domain in Resend, then set `RESEND_FROM_EMAIL` to an address on that domain. A Resend API key is used only by the server-side Edge Function and must never be placed in the browser app or public repository.

## Scheduler

Run `daily_email_cron.sql` after creating these Supabase Vault secrets:

- `gcc_daily_email_function_url` — the full URL of `send-daily-todos`
- `gcc_daily_email_cron_secret` — the same value used for the Edge Function `CRON_SECRET`

The cron job runs every 15 minutes. Each user's preferred local send time and IANA time zone determine whether that user is due for a message during that run.

## Email behavior

Scheduled delivery includes unfinished items whose `date` exactly matches the user's current local date:

- normal tasks
- bill occurrences, including weekly/monthly recurring bills
- scheduled unfinished habits only when the user enables that option

Completed items are excluded. By default no email is sent on an empty day, unless the user enables **Send an empty list**.

The email is intentionally formatted as a paper checklist with empty checkboxes. The recipient can use the email client's Print command (Ctrl/Cmd + P) to print it directly.
