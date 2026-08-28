import { describe, expect, it, vi } from 'vitest'
import { getServiceWorkerUrl, registerAppServiceWorker } from '../src/pwa'

describe('PWA service worker registration', () => {
  it('menggunakan scope root pada custom domain', () => {
    expect(getServiceWorkerUrl('https://belajarteratur.web.id/', './'))
      .toBe('https://belajarteratur.web.id/firebase-messaging-sw.js')
  })

  it('mempertahankan project path pada GitHub Pages', () => {
    expect(getServiceWorkerUrl('https://canas1257.github.io/web-student-planner/', './'))
      .toBe('https://canas1257.github.io/web-student-planner/firebase-messaging-sw.js')
  })

  it('mendaftarkan worker dengan scope yang sesuai', async () => {
    const register = vi.fn().mockResolvedValue({ scope: 'ok' })
    const result = await registerAppServiceWorker({ register }, 'https://belajarteratur.web.id/', './')
    expect(register).toHaveBeenCalledWith('https://belajarteratur.web.id/firebase-messaging-sw.js', { scope: 'https://belajarteratur.web.id/' })
    expect(result).toEqual({ scope: 'ok' })
  })
})
