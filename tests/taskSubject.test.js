import { describe, expect, it } from 'vitest'
import { resolveTaskSubject } from '../src/taskSubject'

describe('resolveTaskSubject', () => {
  it('menggunakan mata pelajaran yang dipilih dari daftar', () => {
    expect(resolveTaskSubject('Matematika', 'Informatika')).toBe('Matematika')
  })

  it('menggunakan dan merapikan mata pelajaran buatan siswa ketika memilih Lainnya', () => {
    expect(resolveTaskSubject('Lainnya', '  Informatika  ')).toBe('Informatika')
  })

  it('menolak mata pelajaran Lainnya yang belum diisi', () => {
    expect(resolveTaskSubject('Lainnya', '   ')).toBe('')
  })
})
