import { describe, expect, it } from 'vitest'
import { filterStudents, getAdminStats, resolveAccountAccess, resolveAccountAccessResult } from '../src/adminMonitoring'

const today = new Date('2026-08-25T12:00:00+07:00')

const users = [
  { status: 'approved', last_login_at: '2026-08-25T01:00:00Z', last_study_at: '2026-08-25T02:00:00Z' },
  { status: 'unreviewed', last_login_at: '2026-08-24T02:00:00Z', last_study_at: null },
  { status: 'blocked', last_login_at: '2026-08-25T03:00:00Z', last_study_at: '2026-08-24T02:00:00Z' },
]

describe('getAdminStats', () => {
  it('menghitung murid login dan belajar pada hari lokal yang sama', () => {
    expect(getAdminStats(users, today)).toEqual({
      total: 3,
      loggedInToday: 2,
      studiedToday: 1,
      unreviewed: 1,
      blocked: 1,
    })
  })
})

describe('filterStudents', () => {
  it('memfilter berdasarkan status serta pencarian nama atau email', () => {
    const students = [
      { display_name: 'Alya Putri', email: 'alya@gmail.com', status: 'approved' },
      { display_name: 'Budi Santoso', email: 'budi@gmail.com', status: 'unreviewed' },
      { display_name: 'Akun Random', email: 'random@gmail.com', status: 'blocked' },
    ]

    expect(filterStudents(students, { status: 'approved', query: 'ALYA' })).toEqual([students[0]])
    expect(filterStudents(students, { status: 'all', query: 'budi@gmail' })).toEqual([students[1]])
  })
})

describe('resolveAccountAccess', () => {
  it('membedakan admin dan murid yang diblokir dari respons RPC', () => {
    expect(resolveAccountAccess([{ is_admin: true, access_status: 'unreviewed' }])).toEqual({ role: 'admin', status: 'unreviewed' })
    expect(resolveAccountAccess([{ is_admin: false, access_status: 'blocked' }])).toEqual({ role: 'student', status: 'blocked' })
  })

  it('menolak akses ketika pemeriksaan server gagal atau tidak mengembalikan akun', () => {
    expect(resolveAccountAccessResult(null, { message: 'network error' })).toEqual({ role: 'error', status: 'unknown' })
    expect(resolveAccountAccessResult([], null)).toEqual({ role: 'error', status: 'unknown' })
    expect(resolveAccountAccessResult([{ is_admin: false, access_status: 'approved' }], null)).toEqual({ role: 'student', status: 'approved' })
  })
})
