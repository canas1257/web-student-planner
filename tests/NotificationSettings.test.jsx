import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { NotificationSettingsView } from '../src/NotificationSettings'

const preferences = {
  task_deadline_enabled: true,
  schedule_enabled: true,
  daily_target_enabled: true,
  announcement_enabled: true,
  timezone: 'Asia/Jakarta',
}

describe('NotificationSettingsView', () => {
  it('menampilkan seluruh jenis notifikasi dan waktu pengingat', () => {
    const html = renderToStaticMarkup(<NotificationSettingsView
      preferences={preferences}
      onToggle={() => {}}
      onEnable={() => {}}
      onSave={() => {}}
      deviceStatus="idle"
      install={{ canInstall: true, installed: false, install: () => {} }}
    />)
    expect(html).toContain('Notifikasi belajar')
    expect(html).toContain('H-1 dan 1 jam sebelum tenggat')
    expect(html).toContain('15 menit sebelum mulai')
    expect(html).toContain('Pukul 19:00 WIB')
    expect(html).toContain('Pengumuman admin')
    expect(html).toContain('Pasang aplikasi')
  })

  it('menjelaskan jika schema notifikasi belum tersedia', () => {
    const html = renderToStaticMarkup(<NotificationSettingsView
      preferences={preferences}
      onToggle={() => {}}
      onEnable={() => {}}
      onSave={() => {}}
      deviceStatus="setup-missing"
      install={{ canInstall: false, installed: false, install: () => {} }}
    />)
    expect(html).toContain('Schema notifikasi belum dipasang')
  })
})
