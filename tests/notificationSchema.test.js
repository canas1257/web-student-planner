import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const sql = readFileSync(new URL('../supabase/notifications.sql', import.meta.url), 'utf8')

describe('Supabase notification schema', () => {
  it('mengisolasi token, preferensi, dan pekerjaan notifikasi dengan RLS', () => {
    expect(sql).toContain('alter table public.push_subscriptions enable row level security')
    expect(sql).toContain('alter table public.notification_preferences enable row level security')
    expect(sql).toContain('alter table public.notification_jobs enable row level security')
    expect(sql).toContain('user_id = auth.uid()')
  })

  it('membatasi RPC sinkronisasi ke akun aktif dan payload yang wajar', () => {
    expect(sql).toContain('create or replace function public.sync_my_notification_jobs')
    expect(sql).toContain('public.is_current_user_allowed()')
    expect(sql).toContain('jsonb_array_length(jobs) > 200')
    expect(sql).toContain("set search_path = public, pg_temp")
  })

  it('hanya mengizinkan admin membuat pengumuman', () => {
    expect(sql).toContain('create or replace function public.admin_create_announcement')
    expect(sql).toContain('if not public.is_admin()')
    expect(sql).toContain("revoke all on function public.admin_create_announcement")
  })

  it('mengklaim job secara atomik hanya untuk service role', () => {
    expect(sql).toContain('create or replace function public.claim_notification_jobs')
    expect(sql).toContain('skip locked')
    expect(sql).toContain("request.jwt.claim.role")
    expect(sql).toContain("join public.user_directory d on d.user_id = j.user_id and d.status <> 'blocked'")
    expect(sql).toContain('grant execute on function public.claim_notification_jobs(integer) to service_role')
  })

  it('tidak memberikan akses tabel token kepada authenticated secara langsung', () => {
    expect(sql).toContain('revoke all on public.push_subscriptions from public, anon, authenticated')
    expect(sql).not.toContain('grant select on public.push_subscriptions to authenticated')
  })
})
