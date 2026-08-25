import { describe, expect, it } from 'vitest'
import { createNewPlannerData } from '../src/plannerData'

describe('createNewPlannerData', () => {
  it('membuat akun baru tanpa tugas dan jadwal contoh', () => {
    const data = createNewPlannerData({ email: 'siswa@example.com', user_metadata: { full_name: 'Siswa Baru' } })

    expect(data.tasks).toEqual([])
    expect(data.schedules).toEqual([])
    expect(data.studyMinutes).toBe(0)
    expect(data.streak).toBe(0)
  })
})
