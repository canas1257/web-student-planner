-- RuangBelajar: dashboard admin dan monitoring aktivitas murid.
-- Jalankan satu kali di Supabase SQL Editor SEBELUM men-deploy UI admin.
-- Aman dijalankan ulang.

begin;

create table if not exists public.user_directory (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default 'Murid',
  status text not null default 'unreviewed'
    check (status in ('unreviewed', 'approved', 'blocked')),
  last_login_at timestamptz,
  last_study_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_user_id uuid not null,
  target_user_id uuid,
  target_email text,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.user_directory enable row level security;
alter table public.admin_users enable row level security;
alter table public.admin_audit_log enable row level security;

revoke all on public.user_directory from public, anon, authenticated;
revoke all on public.admin_users from public, anon, authenticated;
revoke all on public.admin_audit_log from public, anon, authenticated;

-- Masukkan akun lama ke direktori tanpa mengubah status jika sudah ada.
insert into public.user_directory (user_id, email, display_name, created_at)
select
  id,
  coalesce(email, ''),
  coalesce(nullif(raw_user_meta_data ->> 'full_name', ''), split_part(coalesce(email, 'Murid'), '@', 1)),
  created_at
from auth.users
on conflict (user_id) do update
set email = excluded.email,
    display_name = excluded.display_name,
    updated_at = now();

-- Otomatis mencatat akun baru.
create or replace function public.handle_new_ruangbelajar_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.user_directory (user_id, email, display_name, created_at)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(coalesce(new.email, 'Murid'), '@', 1)),
    coalesce(new.created_at, now())
  )
  on conflict (user_id) do update
  set email = excluded.email,
      display_name = excluded.display_name,
      updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_ruangbelajar on auth.users;
create trigger on_auth_user_created_ruangbelajar
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function public.handle_new_ruangbelajar_user();

-- Hanya mengungkapkan role akun yang sedang login.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

-- Digunakan RLS planner agar akun yang diblokir tidak dapat membaca/menulis data.
create or replace function public.is_current_user_allowed()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select status <> 'blocked' from public.user_directory where user_id = auth.uid()),
    false
  );
$$;

-- Dipanggil aplikasi setelah login. Mengembalikan role dan status akses.
create or replace function public.record_user_login()
returns table (is_admin boolean, access_status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text := coalesce(auth.jwt() ->> 'email', '');
  current_name text;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select coalesce(nullif(raw_user_meta_data ->> 'full_name', ''), split_part(current_email, '@', 1), 'Murid')
  into current_name
  from auth.users
  where id = current_user_id;

  insert into public.user_directory (user_id, email, display_name, last_login_at)
  values (current_user_id, current_email, coalesce(current_name, 'Murid'), now())
  on conflict (user_id) do update
  set email = excluded.email,
      display_name = excluded.display_name,
      last_login_at = now(),
      updated_at = now();

  return query
  select
    exists(select 1 from public.admin_users a where a.user_id = current_user_id),
    d.status
  from public.user_directory d
  where d.user_id = current_user_id;
end;
$$;

-- Pemeriksaan berkala tanpa mengubah waktu login terakhir.
create or replace function public.get_my_account_access()
returns table (is_admin boolean, access_status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  return query
  select
    exists(select 1 from public.admin_users a where a.user_id = auth.uid()),
    d.status
  from public.user_directory d
  where d.user_id = auth.uid();
end;
$$;

-- Dipanggil ketika murid menekan Mulai, Lanjutkan, atau Selesai.
create or replace function public.record_study_activity()
returns timestamptz
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  recorded_at timestamptz := now();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if not public.is_current_user_allowed() then
    raise exception 'Account blocked';
  end if;

  update public.user_directory
  set last_study_at = recorded_at, updated_at = recorded_at
  where user_id = current_user_id;
  return recorded_at;
end;
$$;

-- Daftar minimal untuk guru: identitas dan status aktivitas, tanpa isi planner.
create or replace function public.admin_list_students()
returns table (
  user_id uuid,
  email text,
  display_name text,
  status text,
  last_login_at timestamptz,
  last_study_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  return query
  select d.user_id, d.email, d.display_name, d.status,
         d.last_login_at, d.last_study_at, d.created_at
  from public.user_directory d
  where not exists (select 1 from public.admin_users a where a.user_id = d.user_id)
  order by d.created_at desc;
end;
$$;

create or replace function public.admin_set_student_status(target_user_id uuid, new_status text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_email text;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;
  if new_status not in ('unreviewed', 'approved', 'blocked') then
    raise exception 'Invalid status';
  end if;
  if exists(select 1 from public.admin_users where user_id = target_user_id) then
    raise exception 'Admin accounts cannot be changed here';
  end if;

  update public.user_directory
  set status = new_status, updated_at = now()
  where user_id = target_user_id
  returning email into target_email;

  if not found then return false; end if;

  insert into public.admin_audit_log (admin_user_id, target_user_id, target_email, action, details)
  values (auth.uid(), target_user_id, target_email, 'set_status', jsonb_build_object('status', new_status));
  return true;
end;
$$;

-- Menghapus akun Auth dan seluruh planner terkait melalui ON DELETE CASCADE.
create or replace function public.admin_delete_student(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  target_email text;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;
  if target_user_id = auth.uid() then
    raise exception 'Admin accounts cannot be deleted here';
  end if;

  select u.email into target_email
  from auth.users u
  where u.id = target_user_id
  for update;
  if not found then return false; end if;

  if exists(select 1 from public.admin_users where user_id = target_user_id) then
    raise exception 'Admin accounts cannot be deleted here';
  end if;

  insert into public.admin_audit_log (admin_user_id, target_user_id, target_email, action)
  values (auth.uid(), target_user_id, target_email, 'delete_user');

  delete from auth.users where id = target_user_id;
  return found;
end;
$$;

-- Terapkan blokir juga pada akses langsung ke tabel planner.
alter table public.student_planners enable row level security;

-- Jadikan policy di bawah sebagai satu-satunya policy planner yang otoritatif.
do $$
declare existing_policy record;
begin
  for existing_policy in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'student_planners'
  loop
    execute format('drop policy %I on public.student_planners', existing_policy.policyname);
  end loop;
end;
$$;

create policy "Users can read their own planner"
on public.student_planners for select to authenticated
using (auth.uid() = user_id and public.is_current_user_allowed());

create policy "Users can create their own planner"
on public.student_planners for insert to authenticated
with check (auth.uid() = user_id and public.is_current_user_allowed());

create policy "Users can update their own planner"
on public.student_planners for update to authenticated
using (auth.uid() = user_id and public.is_current_user_allowed())
with check (auth.uid() = user_id and public.is_current_user_allowed());

create policy "Users can delete their own planner"
on public.student_planners for delete to authenticated
using (auth.uid() = user_id and public.is_current_user_allowed());

-- Fungsi tidak boleh dijalankan anon. Tabel tetap tidak dapat dibaca langsung.
revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_current_user_allowed() from public, anon;
revoke all on function public.record_user_login() from public, anon;
revoke all on function public.get_my_account_access() from public, anon;
revoke all on function public.record_study_activity() from public, anon;
revoke all on function public.admin_list_students() from public, anon;
revoke all on function public.admin_set_student_status(uuid, text) from public, anon;
revoke all on function public.admin_delete_student(uuid) from public, anon;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_current_user_allowed() to authenticated;
grant execute on function public.record_user_login() to authenticated;
grant execute on function public.get_my_account_access() to authenticated;
grant execute on function public.record_study_activity() to authenticated;
grant execute on function public.admin_list_students() to authenticated;
grant execute on function public.admin_set_student_status(uuid, text) to authenticated;
grant execute on function public.admin_delete_student(uuid) to authenticated;

-- Trigger dipanggil internal oleh Auth, bukan sebagai RPC pengguna.
revoke all on function public.handle_new_ruangbelajar_user() from public, anon, authenticated;

commit;
select pg_notify('pgrst', 'reload schema');

-- SETELAH akun admin terdaftar, promosikan berdasarkan email (ganti nilainya):
-- insert into public.admin_users (user_id)
-- select id from auth.users where lower(email) = lower('admin@contoh.com')
-- on conflict (user_id) do nothing;

-- Verifikasi instalasi. Hasil harus menampilkan ketiga tabel berikut.
select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('user_directory', 'admin_users', 'admin_audit_log')
order by table_name;
