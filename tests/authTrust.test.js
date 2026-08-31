import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const authSource = readFileSync(new URL('../src/Auth.jsx', import.meta.url), 'utf8')
const indexSource = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

describe('transparansi halaman autentikasi', () => {
  it('menampilkan halaman informasi publik sebelum meminta kredensial', () => {
    expect(appSource).toContain("import PublicLanding from './PublicLanding'")
    expect(appSource).toContain("new URLSearchParams(window.location.search).has('auth')")
    expect(appSource).toContain('<PublicLanding')
  })

  it('memberi konteks keamanan dan atribut password-manager yang tepat', () => {
    expect(authSource).toContain('Autentikasi akun diproses oleh Supabase')
    expect(authSource).toContain('autoComplete="email"')
    expect(authSource).toContain("autoComplete={mode === 'login' ? 'current-password' : 'new-password'}")
    expect(authSource).toContain('autoComplete="new-password"')
  })

  it('menyatakan URL resmi sebagai canonical', () => {
    expect(indexSource).toContain('<link rel="canonical" href="https://belajarteratur.web.id/" />')
  })
})
