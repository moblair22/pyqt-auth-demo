-- Run after deploying the send-daily-todos Edge Function.
-- This script expects two Supabase Vault secrets:
--   gcc_daily_email_function_url = https://<project-ref>.supabase.co/functions/v1/send-daily-todos
--   gcc_daily_email_cron_secret  = the same value as the Edge Function CRON_SECRET
-- Do not commit the secret values to GitHub.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove an older copy of the job if this setup is run again.
do $$
declare
  existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname = 'goal-command-center-daily-email' limit 1;
  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;
end $$;

select cron.schedule(
  'goal-command-center-daily-email',
  '*/15 * * * *',
  $job$
  select net.http_post(
    url := (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'gcc_daily_email_function_url'
      limit 1
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'gcc_daily_email_cron_secret'
        limit 1
      )
    ),
    body := '{"mode":"scheduled"}'::jsonb,
    timeout_milliseconds := 10000
  );
  $job$
);
