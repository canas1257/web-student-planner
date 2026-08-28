import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const worker = readFileSync(new URL('../public/firebase-messaging-sw.js', import.meta.url), 'utf8')

describe('service worker RuangBelajar', () => {
  it('menyediakan cache aplikasi dan fallback navigasi', () => {
    expect(worker).toContain("addEventListener('install'")
    expect(worker).toContain("addEventListener('fetch'")
    expect(worker).toContain('caches.open')
  })

  it('menampilkan push notification dan membuka halaman yang dituju', () => {
    expect(worker).toContain("addEventListener('push'")
    expect(worker).toContain('showNotification')
    expect(worker).toContain("addEventListener('notificationclick'")
    expect(worker).toContain('clients.openWindow')
  })
})
