import { describe, expect, it } from 'vitest'
import { createFirebaseConfig, hasFirebaseMessagingConfig } from '../src/firebaseConfig'

const env = {
  VITE_FIREBASE_API_KEY: 'public-api-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'ruangbelajar.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'ruangbelajar',
  VITE_FIREBASE_STORAGE_BUCKET: 'ruangbelajar.firebasestorage.app',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '12345',
  VITE_FIREBASE_APP_ID: '1:12345:web:abc',
  VITE_FIREBASE_VAPID_KEY: 'public-vapid-key',
}

describe('Firebase messaging configuration', () => {
  it('membentuk konfigurasi publik Firebase dari environment', () => {
    expect(createFirebaseConfig(env)).toEqual({
      apiKey: 'public-api-key',
      authDomain: 'ruangbelajar.firebaseapp.com',
      projectId: 'ruangbelajar',
      storageBucket: 'ruangbelajar.firebasestorage.app',
      messagingSenderId: '12345',
      appId: '1:12345:web:abc',
    })
  })

  it('hanya mengaktifkan messaging jika semua konfigurasi dan VAPID tersedia', () => {
    expect(hasFirebaseMessagingConfig(env)).toBe(true)
    expect(hasFirebaseMessagingConfig({ ...env, VITE_FIREBASE_VAPID_KEY: '' })).toBe(false)
  })
})
