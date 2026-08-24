-- Jalankan file ini satu kali di Supabase SQL Editor.
-- Table menyimpan satu dokumen planner untuk setiap akun pengguna.

create table if not exists public.student_planners (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.student_planners enable row level security;

create policy "Users can read their own planner"
on public.student_planners for select
using (auth.uid() = user_id);

create policy "Users can create their own planner"
on public.student_planners for insert
with check (auth.uid() = user_id);

create policy "Users can update their own planner"
on public.student_planners for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own planner"
on public.student_planners for delete
using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker
set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists student_planners_set_updated_at on public.student_planners;
create trigger student_planners_set_updated_at
before update on public.student_planners
for each row execute function public.set_updated_at();
