-- RuangBelajar notifications: preferences, device tokens, scheduled jobs, and announcements.
-- Run after schema.sql and admin_monitoring.sql.

create extension if not exists pgcrypto;

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  task_deadline_enabled boolean not null default true,
  schedule_enabled boolean not null default true,
  daily_target_enabled boolean not null default true,
  announcement_enabled boolean not null default true,
  timezone text not null default 'Asia/Jakarta' check (timezone = 'Asia/Jakarta'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique check (char_length(token) between 20 and 4096),
  platform text not null check (platform in ('web', 'android')),
  device_name text not null default '' check (char_length(device_name) <= 180),
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
on public.push_subscriptions(user_id) where enabled;

create table if not exists public.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('task_deadline', 'task_overdue', 'schedule_reminder', 'daily_target', 'announcement')),
  source_key text not null check (char_length(source_key) between 3 and 180),
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 500),
  url text not null default './' check (char_length(url) <= 300),
  scheduled_for timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'cancelled')),
  attempts integer not null default 0 check (attempts between 0 and 10),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, source_key)
);

create index if not exists notification_jobs_pending_idx
on public.notification_jobs(scheduled_for)
where status = 'pending';

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id),
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 500),
  url text not null default './' check (char_length(url) <= 300),
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

revoke all on public.notification_preferences from public, anon, authenticated;
revoke all on public.push_subscriptions from public, anon, authenticated;
revoke all on public.notification_jobs from public, anon, authenticated;
revoke all on public.announcements from public, anon, authenticated;

grant select on public.notification_preferences to authenticated;
grant select on public.notification_jobs to authenticated;
grant select on public.announcements to authenticated;

alter table public.notification_preferences enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_jobs enable row level security;
alter table public.announcements enable row level security;

drop policy if exists "Users read own notification preferences" on public.notification_preferences;
create policy "Users read own notification preferences"
on public.notification_preferences for select to authenticated
using (user_id = auth.uid() and public.is_current_user_allowed());

drop policy if exists "Users read own notification jobs" on public.notification_jobs;
create policy "Users read own notification jobs"
on public.notification_jobs for select to authenticated
using (user_id = auth.uid() and public.is_current_user_allowed());

drop policy if exists "Authenticated users read published announcements" on public.announcements;
create policy "Authenticated users read published announcements"
on public.announcements for select to authenticated
using (published_at <= now() and public.is_current_user_allowed());

-- No direct policies or grants are provided for push_subscriptions. Tokens are only handled by guarded RPCs.

create or replace function public.get_my_notification_preferences()
returns table (
  task_deadline_enabled boolean,
  schedule_enabled boolean,
  daily_target_enabled boolean,
  announcement_enabled boolean,
  timezone text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.is_current_user_allowed() then
    raise exception 'Account access denied';
  end if;

  insert into public.notification_preferences(user_id)
  values (auth.uid())
  on conflict (user_id) do nothing;

  return query
  select p.task_deadline_enabled, p.schedule_enabled, p.daily_target_enabled,
         p.announcement_enabled, p.timezone
  from public.notification_preferences p
  where p.user_id = auth.uid();
end;
$$;

create or replace function public.update_my_notification_preferences(
  task_deadline boolean,
  schedule_reminder boolean,
  daily_target boolean,
  announcements boolean
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.is_current_user_allowed() then
    raise exception 'Account access denied';
  end if;

  insert into public.notification_preferences(
    user_id, task_deadline_enabled, schedule_enabled, daily_target_enabled,
    announcement_enabled, updated_at
  ) values (
    auth.uid(), task_deadline, schedule_reminder, daily_target, announcements, now()
  )
  on conflict (user_id) do update
  set task_deadline_enabled = excluded.task_deadline_enabled,
      schedule_enabled = excluded.schedule_enabled,
      daily_target_enabled = excluded.daily_target_enabled,
      announcement_enabled = excluded.announcement_enabled,
      updated_at = now();
  return true;
end;
$$;

create or replace function public.save_my_push_subscription(
  device_token text,
  device_platform text,
  device_label text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  subscription_id uuid;
  token_owner uuid;
begin
  if auth.uid() is null or not public.is_current_user_allowed() then
    raise exception 'Account access denied';
  end if;
  if char_length(device_token) not between 20 and 4096 then
    raise exception 'Invalid push token';
  end if;
  if device_platform not in ('web', 'android') then
    raise exception 'Invalid device platform';
  end if;

  select p.user_id into token_owner
  from public.push_subscriptions p
  where p.token = device_token;
  if token_owner is not null and token_owner <> auth.uid() then
    raise exception 'Push token already belongs to another account';
  end if;

  insert into public.push_subscriptions(user_id, token, platform, device_name)
  values (auth.uid(), device_token, device_platform, left(coalesce(device_label, ''), 180))
  on conflict (token) do update
  set enabled = true,
      platform = excluded.platform,
      device_name = excluded.device_name,
      last_seen_at = now(),
      updated_at = now()
  returning id into subscription_id;
  return subscription_id;
end;
$$;

create or replace function public.remove_my_push_subscription(device_token text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  delete from public.push_subscriptions
  where user_id = auth.uid() and token = device_token;
  return found;
end;
$$;

create or replace function public.sync_my_notification_jobs(jobs jsonb)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  inserted_count integer := 0;
begin
  if auth.uid() is null or not public.is_current_user_allowed() then
    raise exception 'Account access denied';
  end if;
  if jsonb_typeof(jobs) <> 'array' then
    raise exception 'Jobs must be a JSON array';
  end if;
  if jsonb_array_length(jobs) > 200 then
    raise exception 'Too many notification jobs';
  end if;

  delete from public.notification_jobs
  where user_id = auth.uid()
    and status = 'pending'
    and kind <> 'announcement';

  insert into public.notification_jobs(
    user_id, kind, source_key, title, body, url, scheduled_for
  )
  select
    auth.uid(), item.kind, item.source_key, item.title, item.body,
    item.url, item.scheduled_for
  from jsonb_to_recordset(jobs) as item(
    kind text,
    source_key text,
    title text,
    body text,
    url text,
    scheduled_for timestamptz
  )
  where item.kind in ('task_deadline', 'task_overdue', 'schedule_reminder', 'daily_target')
    and char_length(item.source_key) between 3 and 180
    and char_length(item.title) between 1 and 120
    and char_length(item.body) between 1 and 500
    and item.url ~ '^\./\?page=(dashboard|tasks|calendar|profile)$'
    and item.scheduled_for between now() - interval '5 minutes' and now() + interval '400 days'
  on conflict (user_id, source_key) do update
  set title = excluded.title,
      body = excluded.body,
      url = excluded.url,
      scheduled_for = excluded.scheduled_for,
      updated_at = now()
  where notification_jobs.status = 'pending';

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create or replace function public.admin_create_announcement(
  announcement_title text,
  announcement_body text,
  announcement_url text default './?page=dashboard'
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  announcement_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;
  if char_length(trim(announcement_title)) not between 1 and 120
     or char_length(trim(announcement_body)) not between 1 and 500
     or announcement_url !~ '^\./\?page=(dashboard|tasks|calendar|profile)$' then
    raise exception 'Invalid announcement';
  end if;

  insert into public.announcements(created_by, title, body, url)
  values (auth.uid(), trim(announcement_title), trim(announcement_body), announcement_url)
  returning id into announcement_id;

  insert into public.notification_jobs(user_id, kind, source_key, title, body, url, scheduled_for)
  select d.user_id, 'announcement', 'announcement:' || announcement_id,
         trim(announcement_title), trim(announcement_body), announcement_url, now()
  from public.user_directory d
  where d.status <> 'blocked'
    and not exists (select 1 from public.admin_users a where a.user_id = d.user_id)
    and exists (
      select 1 from public.notification_preferences p
      where p.user_id = d.user_id and p.announcement_enabled
    )
  on conflict (user_id, source_key) do nothing;

  return announcement_id;
end;
$$;

create or replace function public.claim_notification_jobs(batch_size integer default 100)
returns setof public.notification_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'Service role required';
  end if;

  return query
  with candidates as (
    select j.id
    from public.notification_jobs j
    join public.user_directory d on d.user_id = j.user_id and d.status <> 'blocked'
    where (
      (j.status = 'pending' and j.scheduled_for <= now())
      or (j.status = 'sending' and j.updated_at < now() - interval '10 minutes')
    )
      and j.attempts < 5
    order by j.scheduled_for
    for update of j skip locked
    limit least(greatest(batch_size, 1), 200)
  )
  update public.notification_jobs j
  set status = 'sending', attempts = j.attempts + 1, updated_at = now()
  from candidates c
  where j.id = c.id
  returning j.*;
end;
$$;

revoke all on function public.get_my_notification_preferences() from public, anon;
revoke all on function public.update_my_notification_preferences(boolean, boolean, boolean, boolean) from public, anon;
revoke all on function public.save_my_push_subscription(text, text, text) from public, anon;
revoke all on function public.remove_my_push_subscription(text) from public, anon;
revoke all on function public.sync_my_notification_jobs(jsonb) from public, anon;
revoke all on function public.admin_create_announcement(text, text, text) from public, anon;
revoke all on function public.claim_notification_jobs(integer) from public, anon, authenticated;

grant execute on function public.get_my_notification_preferences() to authenticated;
grant execute on function public.update_my_notification_preferences(boolean, boolean, boolean, boolean) to authenticated;
grant execute on function public.save_my_push_subscription(text, text, text) to authenticated;
grant execute on function public.remove_my_push_subscription(text) to authenticated;
grant execute on function public.sync_my_notification_jobs(jsonb) to authenticated;
grant execute on function public.admin_create_announcement(text, text, text) to authenticated;
grant execute on function public.claim_notification_jobs(integer) to service_role;

-- Verification summary (expected: four tables with RLS enabled).
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('notification_preferences', 'push_subscriptions', 'notification_jobs', 'announcements')
order by tablename;
