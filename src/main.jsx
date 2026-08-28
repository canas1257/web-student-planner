import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { initializeNotificationInteractions } from './notificationService'
import { registerAppServiceWorker } from './pwa'
import './styles.css'

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    registerAppServiceWorker(navigator.serviceWorker, window.location.href, import.meta.env.BASE_URL)
      .catch((error) => console.warn('Service worker belum dapat didaftarkan:', error))
  })
}

initializeNotificationInteractions()
  .catch((error) => console.warn('Interaksi notifikasi native belum siap:', error))

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>,
)
