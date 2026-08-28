import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const config = readFileSync(new URL('../capacitor.config.ts', import.meta.url), 'utf8')

describe('Capacitor Android config', () => {
  it('menggunakan identitas Android permanen dan bundle produksi lokal', () => {
    expect(config).toContain("appId: 'id.web.belajarteratur'")
    expect(config).toContain("appName: 'RuangBelajar'")
    expect(config).toContain("webDir: 'dist'")
  })

  it('menampilkan notifikasi foreground Android', () => {
    expect(config).toContain("presentationOptions: ['badge', 'sound', 'alert']")
  })
})
