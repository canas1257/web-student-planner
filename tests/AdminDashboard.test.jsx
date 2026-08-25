import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AdminView } from '../src/AdminDashboard'

const students = [{
  user_id: 'student-1',
  display_name: 'Alya Putri',
  email: 'alya@gmail.com',
  status: 'approved',
  last_login_at: '2026-08-25T01:00:00Z',
  last_study_at: '2026-08-25T02:00:00Z',
  created_at: '2026-08-20T02:00:00Z',
}]

describe('AdminView', () => {
  it('menampilkan ringkasan aktivitas dan identitas murid tanpa isi planner', () => {
    const html = renderToStaticMarkup(
      <AdminView
        students={students}
        filteredStudents={students}
        stats={{ total: 1, loggedInToday: 1, studiedToday: 1, unreviewed: 0, blocked: 0 }}
        filter="all"
        query=""
        onFilter={() => {}}
        onQuery={() => {}}
        onStatus={() => {}}
        onDelete={() => {}}
        loading={false}
      />,
    )

    expect(html).toContain('Alya Putri')
    expect(html).toContain('alya@gmail.com')
    expect(html).toContain('Login hari ini')
    expect(html).toContain('Belajar hari ini')
    expect(html).not.toContain('student_planners')
  })

  it('menyediakan filter dan tindakan verifikasi, blokir, serta hapus', () => {
    const reviewStudents = [students[0], { ...students[0], user_id: 'student-2', display_name: 'Budi', email: 'budi@gmail.com', status: 'unreviewed' }]
    const html = renderToStaticMarkup(
      <AdminView
        students={reviewStudents}
        filteredStudents={reviewStudents}
        stats={{ total: 2, loggedInToday: 2, studiedToday: 2, unreviewed: 1, blocked: 0 }}
        filter="all"
        query=""
        onFilter={() => {}}
        onQuery={() => {}}
        onStatus={() => {}}
        onDelete={() => {}}
        loading={false}
      />,
    )

    expect(html).toContain('Semua murid')
    expect(html).toContain('Belum ditinjau')
    expect(html).toContain('Setujui')
    expect(html).toContain('Blokir')
    expect(html).toContain('Hapus')
  })
})
