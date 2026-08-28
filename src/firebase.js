import { getApps, initializeApp } from 'firebase/app'
import { deleteToken, getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging'
import { createFirebaseConfig, hasFirebaseMessagingConfig } from './firebaseConfig'

const env = import.meta.env
let messagingPromise

export const firebaseMessagingConfigured = hasFirebaseMessagingConfig(env)
export const firebaseVapidKey = env.VITE_FIREBASE_VAPID_KEY || ''

export async function getFirebaseMessagingClient() {
  if (!firebaseMessagingConfigured) return null
  if (!messagingPromise) {
    messagingPromise = isSupported().then((supported) => {
      if (!supported) return null
      const app = getApps()[0] || initializeApp(createFirebaseConfig(env))
      return getMessaging(app)
    })
  }
  return messagingPromise
}

export { deleteToken, getToken, isSupported, onMessage }
