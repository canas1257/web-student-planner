import { registerAppServiceWorker } from './pwa'
import { buildNotificationJobs } from './notificationJobs'

export const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
  task_deadline_enabled: true,
  schedule_enabled: true,
  daily_target_enabled: true,
  announcement_enabled: true,
  timezone: 'Asia/Jakarta',
})

const notificationPages = new Set(['dashboard', 'tasks', 'calendar', 'profile'])
const PUSH_TOKEN_STORAGE_KEY = 'ruangbelajar-push-token'

export function getNotificationPage(url) {
  try {
    const page = new URL(url, 'https://belajarteratur.web.id/').searchParams.get('page')
    return notificationPages.has(page) ? page : null
  } catch { return null }
}

export async function initializeNotificationInteractions() {
  const { Capacitor } = await import('@capacitor/core')
  if (!Capacitor.isNativePlatform()) return null
  const { PushNotifications } = await import('@capacitor/push-notifications')
  return PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
    const page = getNotificationPage(notification?.data?.url)
    if (!page) return
    const current = new URL(window.location.href)
    current.searchParams.set('page', page)
    window.history.replaceState({}, '', current)
    window.dispatchEvent(new CustomEvent('ruangbelajar:navigate', { detail: { page } }))
  })
}

export async function revokePushToken({ supabase, storage = globalThis.localStorage, unregister }) {
  const token = storage?.getItem(PUSH_TOKEN_STORAGE_KEY)
  let error = null
  if (token) ({ error } = await supabase.rpc('remove_my_push_subscription', { device_token: token }))
  try {
    await unregister()
  } finally {
    storage?.removeItem(PUSH_TOKEN_STORAGE_KEY)
  }
  return { error }
}

export async function registerWebPush({
  isMessagingSupported,
  notificationApi = globalThis.Notification,
  serviceWorker = globalThis.navigator?.serviceWorker,
  messaging,
  getToken,
  saveToken,
  vapidKey,
  currentUrl,
  baseUrl,
  deviceLabel = globalThis.navigator?.userAgent || 'Web browser',
}) {
  if (!notificationApi || !serviceWorker || !(await isMessagingSupported())) return { status: 'unsupported' }
  const permission = notificationApi.permission === 'granted'
    ? 'granted'
    : await notificationApi.requestPermission()
  if (permission !== 'granted') return { status: 'denied' }

  const registration = await registerAppServiceWorker(serviceWorker, currentUrl, baseUrl)
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration })
  if (!token) return { status: 'token-missing' }
  const saved = await saveToken(token, 'web', deviceLabel)
  if (saved?.error) throw saved.error
  return { status: 'enabled', token, platform: 'web' }
}

export async function registerNativePush({ pushNotifications, saveToken, deviceLabel = 'Android' }) {
  await pushNotifications.createChannel({
    id: 'ruangbelajar-reminders',
    name: 'Pengingat belajar',
    description: 'Deadline tugas, jadwal, target harian, dan pengumuman RuangBelajar',
    importance: 5,
    visibility: 1,
    vibration: true,
  })
  let permission = await pushNotifications.checkPermissions()
  if (permission.receive === 'prompt') permission = await pushNotifications.requestPermissions()
  if (permission.receive !== 'granted') return { status: 'denied' }

  return new Promise((resolve, reject) => {
    let settled = false
    let timeout
    const handles = []
    const finish = async (handler) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      await Promise.all(handles.map((handle) => handle.remove()))
      handler()
    }
    ;(async () => {
      try {
        handles.push(await pushNotifications.addListener('registration', async ({ value }) => {
          try {
            const saved = await saveToken(value, 'android', deviceLabel)
            if (saved?.error) throw saved.error
            await finish(() => resolve({ status: 'enabled', token: value, platform: 'android' }))
          } catch (error) { await finish(() => reject(error)) }
        }))
        handles.push(await pushNotifications.addListener('registrationError', async (error) => {
          await finish(() => reject(new Error(error?.error || 'Pendaftaran FCM Android gagal')))
        }))
        timeout = setTimeout(() => finish(() => reject(new Error('Pendaftaran notifikasi Android melewati batas waktu'))), 30_000)
        await pushNotifications.register()
      } catch (error) { await finish(() => reject(error)) }
    })()
  })
}

export async function enablePushNotifications(supabase) {
  const saveToken = (deviceToken, devicePlatform, deviceLabel) => supabase.rpc('save_my_push_subscription', {
    device_token: deviceToken,
    device_platform: devicePlatform,
    device_label: deviceLabel,
  })

  const { Capacitor } = await import('@capacitor/core')
  let result
  if (Capacitor.isNativePlatform()) {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    result = await registerNativePush({ pushNotifications: PushNotifications, saveToken })
  } else {
    const firebase = await import('./firebase')
    if (!firebase.firebaseMessagingConfigured) return { status: 'setup-missing' }
    const messaging = await firebase.getFirebaseMessagingClient()
    if (!messaging) return { status: 'unsupported' }
    result = await registerWebPush({
      isMessagingSupported: firebase.isSupported,
      messaging,
      getToken: firebase.getToken,
      saveToken,
      vapidKey: firebase.firebaseVapidKey,
      currentUrl: window.location.href,
      baseUrl: import.meta.env.BASE_URL,
    })
  }
  if (result.status === 'enabled') {
    try { globalThis.localStorage?.setItem(PUSH_TOKEN_STORAGE_KEY, result.token) } catch { /* storage is optional */ }
  }
  return result
}

export async function disablePushNotificationsForLogout(supabase) {
  const { Capacitor } = await import('@capacitor/core')
  let unregister
  if (Capacitor.isNativePlatform()) {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    unregister = () => PushNotifications.unregister()
  } else {
    unregister = async () => {
      const firebase = await import('./firebase')
      const messaging = await firebase.getFirebaseMessagingClient()
      if (messaging) await firebase.deleteToken(messaging)
    }
  }
  return revokePushToken({ supabase, unregister })
}

export async function loadNotificationPreferences(supabase) {
  const { data, error } = await supabase.rpc('get_my_notification_preferences')
  if (error) return { data: DEFAULT_NOTIFICATION_PREFERENCES, error }
  return { data: { ...DEFAULT_NOTIFICATION_PREFERENCES, ...(Array.isArray(data) ? data[0] : data) }, error: null }
}

export async function saveNotificationPreferences(supabase, preferences) {
  return supabase.rpc('update_my_notification_preferences', {
    task_deadline: preferences.task_deadline_enabled,
    schedule_reminder: preferences.schedule_enabled,
    daily_target: preferences.daily_target_enabled,
    announcements: preferences.announcement_enabled,
  })
}

export async function syncNotificationJobs(supabase, plannerData, preferences) {
  const jobs = buildNotificationJobs(plannerData, preferences)
  return supabase.rpc('sync_my_notification_jobs', { jobs })
}
