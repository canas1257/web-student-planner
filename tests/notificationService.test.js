import { describe, expect, it, vi } from 'vitest'
import { getNotificationPage, registerWebPush, revokePushToken } from '../src/notificationService'

const config = { vapidKey: 'public-vapid', currentUrl: 'https://belajarteratur.web.id/', baseUrl: './' }

describe('registerWebPush', () => {
  it('berhenti dengan aman ketika browser tidak mendukung messaging', async () => {
    const result = await registerWebPush({ ...config, isMessagingSupported: async () => false })
    expect(result).toEqual({ status: 'unsupported' })
  })

  it('tidak membuat token ketika izin ditolak', async () => {
    const getToken = vi.fn()
    const result = await registerWebPush({
      ...config,
      isMessagingSupported: async () => true,
      notificationApi: { permission: 'default', requestPermission: async () => 'denied' },
      serviceWorker: { register: vi.fn() },
      getToken,
    })
    expect(result).toEqual({ status: 'denied' })
    expect(getToken).not.toHaveBeenCalled()
  })

  it('mendaftarkan service worker, token FCM, dan token milik pengguna', async () => {
    const registration = { scope: 'https://belajarteratur.web.id/' }
    const serviceWorker = { register: vi.fn().mockResolvedValue(registration) }
    const getToken = vi.fn().mockResolvedValue('fcm-token-with-enough-characters')
    const saveToken = vi.fn().mockResolvedValue({ error: null })

    const result = await registerWebPush({
      ...config,
      isMessagingSupported: async () => true,
      notificationApi: { permission: 'granted', requestPermission: vi.fn() },
      serviceWorker,
      messaging: { app: true },
      getToken,
      saveToken,
      deviceLabel: 'Chrome Android',
    })

    expect(serviceWorker.register).toHaveBeenCalled()
    expect(getToken).toHaveBeenCalledWith({ app: true }, { vapidKey: 'public-vapid', serviceWorkerRegistration: registration })
    expect(saveToken).toHaveBeenCalledWith('fcm-token-with-enough-characters', 'web', 'Chrome Android')
    expect(result).toEqual({ status: 'enabled', token: 'fcm-token-with-enough-characters', platform: 'web' })
  })
})

describe('getNotificationPage', () => {
  it('membaca halaman yang diizinkan dari tautan notifikasi', () => {
    expect(getNotificationPage('https://belajarteratur.web.id/?page=calendar')).toBe('calendar')
    expect(getNotificationPage('./?page=tasks')).toBe('tasks')
  })

  it('menolak halaman yang tidak dikenal', () => {
    expect(getNotificationPage('https://example.com/?page=admin')).toBeNull()
  })
})

describe('revokePushToken', () => {
  it('menghapus binding backend dan menonaktifkan token lokal saat logout', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null })
    const unregister = vi.fn().mockResolvedValue(undefined)
    const storage = {
      getItem: vi.fn().mockReturnValue('stored-device-token'),
      removeItem: vi.fn(),
    }

    const result = await revokePushToken({ supabase: { rpc }, storage, unregister })

    expect(rpc).toHaveBeenCalledWith('remove_my_push_subscription', { device_token: 'stored-device-token' })
    expect(unregister).toHaveBeenCalled()
    expect(storage.removeItem).toHaveBeenCalledWith('ruangbelajar-push-token')
    expect(result).toEqual({ error: null })
  })
})
