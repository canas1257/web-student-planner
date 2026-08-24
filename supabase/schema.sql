-- RuangBelajar: satu dokumen planner per akun Supabase Auth.
-- Aman dijalankan ulang di Supabase SQL Editor.

create table if not exists public.student_planners (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.student_planners enable row level security;

drop policy if exists "Users can read their own planner" on public.student_planners;
drop policy if exists "Users can create their own planner" on public.student_planners;
drop policy if exists "Users can update their own planner" on public.student_planners;
drop policy if exists "Users can delete their own planner" on public.student_planners;

create policy "Users can read their own planner"
on public.student_planners for select to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own planner"
on public.student_planners for insert to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own planner"
on public.student_planners for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own planner"
on public.student_planners for delete to authenticated
using (auth.uid() = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.student_planners to authenticated;
revoke all on table public.student_planners from anon;

create or replace function public.set_student_planner_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists student_planners_set_updated_at on public.student_planners;
create trigger student_planners_set_updated_at
before update on public.student_planners
for each row execute function public.set_student_planner_updated_at();

select pg_notify('pgrst', 'reload schema');
