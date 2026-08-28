import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../supabase/functions/send-notifications/index.ts', import.meta.url), 'utf8')

describe('send-notifications Edge Function', () => {
  it('menggunakan OAuth dan FCM HTTP v1', () => {
    expect(source).toContain('https://oauth2.googleapis.com/token')
    expect(source).toContain('https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send')
    expect(source).toContain('https://www.googleapis.com/auth/firebase.messaging')
  })

  it('mengklaim job atomik sebelum mengirim', () => {
    expect(source).toContain("supabase.rpc('claim_notification_jobs'")
    expect(source).toContain("status: 'sent'")
    expect(source).toContain("status: 'pending'")
    expect(source).toContain(".eq('claim_id', job.claim_id)")
    expect(source).toContain(".eq('attempts', job.attempts)")
  })

  it('membatasi batch, timeout FCM, dan memeriksa hasil finalisasi database', () => {
    expect(source).toContain("batch_size: 10")
    expect(source).toContain('AbortSignal.timeout(10_000)')
    expect(source).toContain('assertJobUpdated')
  })

  it('menonaktifkan token FCM invalid', () => {
    expect(source).toContain('UNREGISTERED')
    expect(source).toContain('SENDER_ID_MISMATCH')
    expect(source).toContain("enabled: false")
  })

  it('menggunakan payload data-only untuk web agar notifikasi tidak ganda', () => {
    expect(source).toContain("subscription.platform === 'web'")
    expect(source).toContain("message.webpush = { headers: { Urgency: 'high' } }")
    expect(source).not.toContain('notification: { title: job.title, body: job.body },')
  })

  it('menolak pemanggil tanpa secret scheduler', () => {
    expect(source).toContain("request.headers.get('x-cron-secret')")
    expect(source).toContain("Deno.env.get('NOTIFICATION_CRON_SECRET')")
    expect(source).toContain("status: 401")
  })
})
