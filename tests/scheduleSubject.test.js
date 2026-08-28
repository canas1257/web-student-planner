import { describe, expect, it } from 'vitest'
import { resolveScheduleSubject } from '../src/scheduleSubject'

describe('resolveScheduleSubject', () => {
  it('menggunakan pelajaran yang dipilih dari daftar kalender', () => {
    expect(resolveScheduleSubject('Fisika', 'Robotika')).toBe('Fisika')
  })

  it('menggunakan dan merapikan pelajaran manual ketika memilih Lainnya', () => {
    expect(resolveScheduleSubject('Lainnya', '  Robotika  ')).toBe('Robotika')
  })

  it('menolak pilihan Lainnya yang belum diberi nama', () => {
    expect(resolveScheduleSubject('Lainnya', '   ')).toBe('')
  })
})
