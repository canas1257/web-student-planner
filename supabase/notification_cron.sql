-- Run only after notifications.sql and the send-notifications Edge Function are deployed.
-- Required Vault secret names (values are configured separately; never commit them):
--   notification_sender_url   = https://<project-ref>.supabase.co/functions/v1/send-notifications
--   notification_cron_secret  = the same random value as Edge secret NOTIFICATION_CRON_SECRET

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

do $$
begin
  if not exists (
    select 1 from vault.decrypted_secrets where name = 'notification_sender_url'
  ) or not exists (
    select 1 from vault.decrypted_secrets where name = 'notification_cron_secret'
  ) then
    raise exception 'Configure notification_sender_url and notification_cron_secret in Supabase Vault first';
  end if;
end;
$$;

do $$
declare
  existing_job bigint;
begin
  select jobid into existing_job
  from cron.job
  where jobname = 'process-ruangbelajar-notifications';

  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;
end;
$$;

select cron.schedule(
  'process-ruangbelajar-notifications',
  '* * * * *',
  $schedule$
    select net.http_post(
      url := (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'notification_sender_url'
        limit 1
      ),
      headers := jsonb_build_object(
        'content-type', 'application/json',
        'x-cron-secret', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'notification_cron_secret'
          limit 1
        )
      ),
      body := jsonb_build_object('source', 'supabase-cron'),
      timeout_milliseconds := 50000
    );
  $schedule$
);
