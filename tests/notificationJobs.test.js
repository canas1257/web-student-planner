import { describe, expect, it } from 'vitest'
import { buildNotificationJobs } from '../src/notificationJobs'

const preferences = {
  task_deadline_enabled: true,
  schedule_enabled: true,
  daily_target_enabled: true,
  announcement_enabled: true,
}

const profile = { dailyTarget: 2 }

describe('buildNotificationJobs', () => {
  it('menjadwalkan tugas H-1 dan satu jam sebelum tenggat WIB', () => {
    const jobs = buildNotificationJobs({
      tasks: [{ id: 't1', title: 'Latihan aljabar', subject: 'Matematika', due: '2026-08-28', done: false }],
      schedules: [], profile,
    }, preferences, new Date('2026-08-25T00:00:00Z'))

    const taskJobs = jobs.filter((job) => job.kind === 'task_deadline')
    expect(taskJobs.map((job) => job.scheduled_for)).toEqual([
      '2026-08-27T16:59:00.000Z',
      '2026-08-28T15:59:00.000Z',
    ])
    expect(taskJobs[0].body).toContain('Latihan aljabar')
  })

  it('menjadwalkan pelajaran berulang 15 menit sebelum mulai', () => {
    const jobs = buildNotificationJobs({
      tasks: [],
      schedules: [{ id: 's1', title: 'Robotika', date: '2026-08-26', time: '08:00', endTime: '09:00', repeat: 'Mingguan' }],
      profile,
    }, preferences, new Date('2026-08-25T00:00:00Z'))

    const scheduleJobs = jobs.filter((job) => job.kind === 'schedule_reminder')
    expect(scheduleJobs[0]).toMatchObject({
      source_key: 'schedule:s1:2026-08-26',
      scheduled_for: '2026-08-26T00:45:00.000Z',
    })
    expect(scheduleJobs.length).toBeGreaterThan(1)
  })

  it('membuat pengingat target pukul 19:00 WIB selama tujuh hari', () => {
    const jobs = buildNotificationJobs({ tasks: [], schedules: [], profile }, preferences, new Date('2026-08-25T00:00:00Z'))
    const targetJobs = jobs.filter((job) => job.kind === 'daily_target')
    expect(targetJobs).toHaveLength(7)
    expect(targetJobs[0].scheduled_for).toBe('2026-08-25T12:00:00.000Z')
    expect(targetJobs[0].body).toContain('2 jam')
  })

  it('membatalkan target hari ini ketika target belajar sudah tercapai', () => {
    const jobs = buildNotificationJobs({
      tasks: [], schedules: [], profile, studyByDate: { '2026-08-25': 120 },
    }, preferences, new Date('2026-08-25T00:00:00Z'))
    const targetJobs = jobs.filter((job) => job.kind === 'daily_target')
    expect(targetJobs).toHaveLength(7)
    expect(targetJobs[0].source_key).toBe('target:2026-08-26')
  })

  it('membuat satu pengingat untuk tugas yang sudah terlambat', () => {
    const now = new Date('2026-08-29T00:00:00Z')
    const jobs = buildNotificationJobs({
      tasks: [{ id: 'late', title: 'Laporan praktikum', subject: 'Kimia', due: '2026-08-28', done: false }],
      schedules: [], profile,
    }, { ...preferences, daily_target_enabled: false }, now)
    expect(jobs).toEqual([expect.objectContaining({
      kind: 'task_overdue',
      source_key: 'task:late:overdue',
      scheduled_for: '2026-08-29T00:01:00.000Z',
    })])
  })

  it('menghormati preferensi yang dimatikan', () => {
    const jobs = buildNotificationJobs({
      tasks: [{ id: 't1', title: 'Tugas', subject: 'Fisika', due: '2026-08-28', done: false }],
      schedules: [], profile,
    }, { ...preferences, task_deadline_enabled: false, daily_target_enabled: false }, new Date('2026-08-25T00:00:00Z'))
    expect(jobs).toEqual([])
  })
})
