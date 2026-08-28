// @ts-nocheck — Supabase Edge Functions are type-checked by Deno, not the Vite tsconfig.
import { createClient } from 'npm:@supabase/supabase-js@2'

interface ServiceAccount {
  project_id: string
  client_email: string
  private_key: string
}

interface NotificationJob {
  id: string
  user_id: string
  kind: string
  title: string
  body: string
  url: string
  attempts: number
  claim_id: string
}

interface PushSubscription {
  id: string
  token: string
  platform: 'web' | 'android'
}

const jsonHeaders = { 'content-type': 'application/json; charset=utf-8' }
const encoder = new TextEncoder()
let oauthCache: { token: string; expiresAt: number } | null = null

function base64Url(value: Uint8Array | string) {
  const bytes = typeof value === 'string' ? encoder.encode(value) : value
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

async function importPrivateKey(pem: string) {
  const binary = atob(pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, ''))
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return crypto.subtle.importKey(
    'pkcs8', bytes, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'],
  )
}

async function createServiceAccountAssertion(serviceAccount: ServiceAccount) {
  const issuedAt = Math.floor(Date.now() / 1000)
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = base64Url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: issuedAt,
    exp: issuedAt + 3600,
  }))
  const unsigned = `${header}.${claim}`
  const key = await importPrivateKey(serviceAccount.private_key)
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(unsigned))
  return `${unsigned}.${base64Url(new Uint8Array(signature))}`
}

async function getGoogleAccessToken(serviceAccount: ServiceAccount) {
  if (oauthCache && oauthCache.expiresAt > Date.now() + 60_000) return oauthCache.token
  const assertion = await createServiceAccountAssertion(serviceAccount)
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })
  const payload = await response.json()
  if (!response.ok || !payload.access_token) throw new Error(`Google OAuth gagal (${response.status})`)
  oauthCache = {
    token: payload.access_token,
    expiresAt: Date.now() + Number(payload.expires_in || 3600) * 1000,
  }
  return oauthCache.token
}

function absoluteAppUrl(relativeUrl: string, appUrl: string) {
  return new URL(relativeUrl || './', appUrl.endsWith('/') ? appUrl : `${appUrl}/`).href
}

function firebaseErrorCode(payload: any) {
  return payload?.error?.details?.find((detail: any) => detail?.errorCode)?.errorCode
    || payload?.error?.status
    || ''
}

async function sendFcmMessage(
  serviceAccount: ServiceAccount,
  accessToken: string,
  subscription: PushSubscription,
  job: NotificationJob,
  appUrl: string,
) {
  const link = absoluteAppUrl(job.url, appUrl)
  const message: Record<string, unknown> = {
    token: subscription.token,
    data: {
      kind: job.kind,
      job_id: job.id,
      title: job.title,
      body: job.body,
      tag: job.id,
      url: link,
    },
  }
  if (subscription.platform === 'web') {
    message.webpush = { headers: { Urgency: 'high' } }
  } else {
    message.android = {
      priority: 'high',
      notification: {
        title: job.title,
        body: job.body,
        icon: 'ic_stat_ruangbelajar',
        color: '#7057E8',
        tag: job.id,
        channel_id: 'ruangbelajar-reminders',
      },
    }
  }
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
    {
      method: 'POST',
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ message }),
      signal: AbortSignal.timeout(10_000),
    },
  )
  const payload = await response.json().catch(() => ({}))
  return { ok: response.ok, status: response.status, code: firebaseErrorCode(payload) }
}

function assertJobUpdated(data: unknown, error: unknown, operation: string) {
  if (error) throw error
  if (!data) throw new Error(`Notification lease lost while ${operation}`)
}

async function updateClaimedJob(supabase: any, job: NotificationJob, values: Record<string, unknown>, operation: string) {
  const { data, error } = await supabase
    .from('notification_jobs')
    .update({ ...values, claim_id: null, updated_at: new Date().toISOString() })
    .eq('id', job.id)
    .eq('status', 'sending')
    .eq('claim_id', job.claim_id)
    .eq('attempts', job.attempts)
    .select('id')
    .maybeSingle()
  assertJobUpdated(data, error, operation)
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: jsonHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  const cronSecret = Deno.env.get('NOTIFICATION_CRON_SECRET') || ''
  const providedSecret = request.headers.get('x-cron-secret') || ''
  if (!cronSecret || providedSecret !== cronSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: jsonHeaders })
  }

  let stage = 'configuration'
  try {
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase backend environment belum lengkap')
    const serviceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT') || '') as ServiceAccount
    if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT belum lengkap')
    }
    const appUrl = Deno.env.get('APP_URL') || 'https://belajarteratur.web.id/'
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    stage = 'claim'
    const { data: jobs, error: claimError } = await supabase.rpc('claim_notification_jobs', { batch_size: 10 })
    if (claimError) {
      console.error('claim_notification_jobs failed:', claimError.code || 'unknown')
      return new Response(JSON.stringify({ error: 'Notification sender failed', stage, code: claimError.code || 'CLAIM_FAILED' }), { status: 500, headers: jsonHeaders })
    }
    if (!jobs?.length) return new Response(JSON.stringify({ claimed: 0, sent: 0, failed: 0 }), { headers: jsonHeaders })

    stage = 'oauth'
    const accessToken = await getGoogleAccessToken(serviceAccount)
    stage = 'delivery'
    let sent = 0
    let failed = 0

    for (const job of jobs as NotificationJob[]) {
      const { data: subscriptions, error: tokenError } = await supabase
        .from('push_subscriptions')
        .select('id, token, platform')
        .eq('user_id', job.user_id)
        .eq('enabled', true)
      if (tokenError) throw tokenError

      if (!subscriptions?.length) {
        if (job.attempts < 5) {
          await updateClaimedJob(supabase, job, {
            status: 'pending',
            scheduled_for: new Date(Date.now() + 3_600_000).toISOString(),
            last_error: 'Menunggu perangkat notifikasi aktif',
          }, 'rescheduling missing device')
        } else {
          failed += 1
          await updateClaimedJob(supabase, job, {
            status: 'failed', last_error: 'Tidak ada perangkat aktif',
          }, 'failing missing device')
        }
        continue
      }

      let delivered = 0
      let transientFailure = false
      const errors: string[] = []
      for (const subscription of subscriptions as PushSubscription[]) {
        const result = await sendFcmMessage(serviceAccount, accessToken, subscription, job, appUrl)
        if (result.ok) { delivered += 1; continue }
        errors.push(`${result.status}:${result.code || 'FCM_ERROR'}`)
        if (['UNREGISTERED', 'SENDER_ID_MISMATCH'].includes(result.code)) {
          const { error: disableError } = await supabase.from('push_subscriptions')
            .update({ enabled: false, updated_at: new Date().toISOString() })
            .eq('id', subscription.id)
          if (disableError) throw disableError
        } else if (result.status === 429 || result.status >= 500 || result.code === 'UNAVAILABLE') {
          transientFailure = true
        }
      }

      if (delivered > 0) {
        // Product policy: a job completes after at least one active device accepts it.
        // Failed device details remain recorded without exposing any token.
        sent += 1
        await updateClaimedJob(supabase, job, {
          status: 'sent',
          sent_at: new Date().toISOString(),
          last_error: errors.length ? `Partial delivery: ${errors.join(', ')}`.slice(0, 500) : null,
        }, 'completing delivery')
      } else if (transientFailure && job.attempts < 5) {
        const delaySeconds = Math.min(3600, 60 * (2 ** Math.max(0, job.attempts - 1)))
        await updateClaimedJob(supabase, job, {
          status: 'pending',
          scheduled_for: new Date(Date.now() + delaySeconds * 1000).toISOString(),
          last_error: errors.join(', ').slice(0, 500),
        }, 'rescheduling transient failure')
      } else {
        failed += 1
        await updateClaimedJob(supabase, job, {
          status: 'failed', last_error: errors.join(', ').slice(0, 500),
        }, 'failing delivery')
      }
    }

    return new Response(JSON.stringify({ claimed: jobs.length, sent, failed }), { headers: jsonHeaders })
  } catch (error) {
    console.error('send-notifications failed:', error instanceof Error ? error.message : 'unknown error')
    return new Response(JSON.stringify({ error: 'Notification sender failed', stage }), { status: 500, headers: jsonHeaders })
  }
})
