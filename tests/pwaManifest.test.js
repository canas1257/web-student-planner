import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const manifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'))
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

describe('PWA manifest RuangBelajar', () => {
  it('dapat dipasang dari domain custom maupun GitHub project path', () => {
    expect(manifest.name).toBe('RuangBelajar')
    expect(manifest.short_name).toBe('RuangBelajar')
    expect(manifest.start_url).toBe('./')
    expect(manifest.scope).toBe('./')
    expect(manifest.display).toBe('standalone')
  })

  it('menyediakan ikon biasa dan maskable', () => {
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: './icons/icon-192.png', sizes: '192x192' }),
      expect.objectContaining({ src: './icons/icon-512.png', sizes: '512x512' }),
      expect.objectContaining({ src: './icons/maskable-512.png', purpose: 'maskable' }),
    ]))
  })

  it('menghubungkan manifest dan ikon dari dokumen utama', () => {
    expect(html).toContain('rel="manifest" href="./manifest.webmanifest"')
    expect(html).toContain('rel="apple-touch-icon" href="./icons/apple-touch-icon.png"')
    expect(html).toContain('rel="icon" href="./icons/favicon-32.png"')
  })
})
