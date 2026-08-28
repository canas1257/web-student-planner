import { useEffect, useMemo, useState } from 'react'
import { BellRing, CalendarClock, CheckCircle2, Download, Megaphone, Smartphone, Target, TimerReset } from 'lucide-react'

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  enablePushNotifications,
  loadNotificationPreferences,
  saveNotificationPreferences,
  syncNotificationJobs,
} from './notificationService'
import { isAppStandalone } from './pwa'

const options = [
  ['task_deadline_enabled', 'Deadline tugas', 'H-1 dan 1 jam sebelum tenggat', TimerReset],
  ['schedule_enabled', 'Jadwal pelajaran', '15 menit sebelum mulai', CalendarClock],
  ['daily_target_enabled', 'Target belajar harian', 'Pukul 19:00 WIB', Target],
  ['announcement_enabled', 'Pengumuman admin', 'Dikirim segera setelah diterbitkan', Megaphone],
]

export function usePwaInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState(null)
  const [installed, setInstalled] = useState(() => Boolean(globalThis.Capacitor?.isNativePlatform?.()) || isAppStandalone())
  useEffect(() => {
    const beforeInstall = (event) => { event.preventDefault(); setPromptEvent(event) }
    const appInstalled = () => { setInstalled(true); setPromptEvent(null) }
    window.addEventListener('beforeinstallprompt', beforeInstall)
    window.addEventListener('appinstalled', appInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall)
      window.removeEventListener('appinstalled', appInstalled)
    }
  }, [])
  const install = async () => {
    if (!promptEvent) return false
    await promptEvent.prompt()
    const choice = await promptEvent.userChoice
    if (choice.outcome === 'accepted') setPromptEvent(null)
    return choice.outcome === 'accepted'
  }
  return { canInstall: Boolean(promptEvent), installed, install }
}

function isSetupMissing(error) {
  return /PGRST202|schema cache|could not find.*function/i.test(`${error?.code || ''} ${error?.message || ''}`)
}

export function useNotificationSettings(supabase, plannerData, notify) {
  const [preferences, setPreferences] = useState(DEFAULT_NOTIFICATION_PREFERENCES)
  const [deviceStatus, setDeviceStatus] = useState('loading')
  const [schemaReady, setSchemaReady] = useState(false)
  const install = usePwaInstallPrompt()

  useEffect(() => {
    let active = true
    loadNotificationPreferences(supabase).then(({ data, error }) => {
      if (!active) return
      setPreferences(data)
      if (error) {
        setDeviceStatus(isSetupMissing(error) ? 'setup-missing' : 'error')
        return
      }
      setSchemaReady(true)
      const permission = globalThis.Notification?.permission
      setDeviceStatus(permission === 'granted' || Capacitor.isNativePlatform() ? 'ready' : 'idle')
    })
    return () => { active = false }
  }, [supabase])

  useEffect(() => {
    if (!schemaReady || !plannerData) return undefined
    const timer = setTimeout(() => {
      syncNotificationJobs(supabase, plannerData, preferences).then(({ error }) => {
        if (error && !isSetupMissing(error)) console.warn('Sinkronisasi pengingat gagal:', error.message)
      })
    }, 1200)
    return () => clearTimeout(timer)
  }, [supabase, plannerData, preferences, schemaReady])

  const toggle = (key) => setPreferences((current) => ({ ...current, [key]: !current[key] }))
  const save = async () => {
    if (!schemaReady) { setDeviceStatus('setup-missing'); return }
    setDeviceStatus('saving')
    const { error } = await saveNotificationPreferences(supabase, preferences)
    if (error) { setDeviceStatus(isSetupMissing(error) ? 'setup-missing' : 'error'); return }
    await syncNotificationJobs(supabase, plannerData, preferences)
    setDeviceStatus(globalThis.Notification?.permission === 'granted' || Capacitor.isNativePlatform() ? 'ready' : 'idle')
    notify?.('Pengaturan notifikasi disimpan')
  }
  const enable = async () => {
    if (!schemaReady) { setDeviceStatus('setup-missing'); return }
    setDeviceStatus('enabling')
    try {
      const result = await enablePushNotifications(supabase)
      setDeviceStatus(result.status === 'enabled' ? 'enabled' : result.status)
      if (result.status === 'enabled') {
        await syncNotificationJobs(supabase, plannerData, preferences)
        notify?.('Notifikasi perangkat berhasil diaktifkan')
      }
    } catch (error) {
      setDeviceStatus(isSetupMissing(error) ? 'setup-missing' : 'error')
    }
  }

  return useMemo(() => ({ preferences, onToggle: toggle, onSave: save, onEnable: enable, deviceStatus, install }), [preferences, deviceStatus, install])
}

const statusCopy = {
  idle: ['Aktifkan notifikasi', 'Izinkan perangkat ini menerima pengingat.'],
  ready: ['Aktifkan perangkat ini', 'Preferensi tersimpan; aktifkan push pada perangkat ini.'],
  enabling: ['Mengaktifkan…', 'Tunggu sebentar.'],
  enabled: ['Notifikasi aktif', 'Perangkat ini siap menerima pengingat.'],
  denied: ['Izin notifikasi ditolak', 'Aktifkan kembali melalui pengaturan browser atau aplikasi.'],
  unsupported: ['Perangkat belum mendukung', 'Gunakan Chrome/Edge terbaru atau APK Android.'],
  'token-missing': ['Token belum tersedia', 'Coba muat ulang lalu aktifkan kembali.'],
  'setup-missing': ['Schema notifikasi belum dipasang', 'Jalankan supabase/notifications.sql sebelum mengaktifkan push.'],
  saving: ['Menyimpan…', 'Preferensi sedang diperbarui.'],
  loading: ['Memuat pengaturan…', 'Tunggu sebentar.'],
  error: ['Notifikasi belum dapat diaktifkan', 'Periksa koneksi lalu coba kembali.'],
}

export function NotificationSettingsView({ preferences, onToggle, onEnable, onSave, deviceStatus, install }) {
  const [buttonLabel, note] = statusCopy[deviceStatus] || statusCopy.idle
  const active = deviceStatus === 'enabled'
  return <section className="panel notification-settings">
    <div className="notification-heading">
      <span className="notification-icon"><BellRing/></span>
      <div><small>PENGINGAT CERDAS</small><h3>Notifikasi belajar</h3><p>Atur pengingat tugas, jadwal, target harian, dan pengumuman.</p></div>
    </div>

    <div className="notification-device">
      <div><Smartphone/><span><b>{active ? 'Perangkat terhubung' : 'Hubungkan perangkat'}</b><small>{note}</small></span></div>
      <button type="button" className={active ? 'notification-enabled' : ''} onClick={onEnable} disabled={['loading','enabling','saving'].includes(deviceStatus)}>
        {active && <CheckCircle2/>}{buttonLabel}
      </button>
    </div>

    <div className="notification-options">
      {options.map(([key, title, detail, Icon]) => <label key={key}>
        <span className="notification-option-icon"><Icon/></span>
        <span><b>{title}</b><small>{detail}</small></span>
        <input type="checkbox" checked={Boolean(preferences[key])} onChange={() => onToggle(key)}/>
        <i aria-hidden="true"/>
      </label>)}
    </div>

    <div className="notification-actions">
      <button type="button" className="primary-btn" onClick={onSave} disabled={['loading','saving'].includes(deviceStatus)}>Simpan pengingat</button>
      {!install.installed && <button type="button" className="install-app-btn" onClick={install.install} disabled={!install.canInstall}><Download/>Pasang aplikasi</button>}
      {install.installed && <span className="installed-note"><CheckCircle2/>Aplikasi sudah terpasang</span>}
    </div>
  </section>
}

export default function NotificationSettings(props) {
  return <NotificationSettingsView {...props}/>
}
