import { describe, expect, it } from 'vitest'
import { finishTask, getElapsedSeconds, pauseTask, resumeTask, startTask } from '../src/taskTimer'

const task = { id: '1', title: 'Belajar matematika', done: false }

describe('task timer', () => {
  it('memulai timer tugas dari nol', () => {
    const started = startTask(task, 1_000)

    expect(started.timerState).toBe('running')
    expect(started.activeSince).toBe(1_000)
    expect(started.elapsedSeconds).toBe(0)
  })

  it('menjeda timer dan menyimpan durasi yang telah berjalan', () => {
    const running = { ...task, timerState: 'running', activeSince: 1_000, elapsedSeconds: 5 }
    const paused = pauseTask(running, 11_000)

    expect(paused.timerState).toBe('paused')
    expect(paused.activeSince).toBeNull()
    expect(paused.elapsedSeconds).toBe(15)
  })

  it('menghitung tampilan waktu aktif tanpa mengubah data tersimpan', () => {
    const running = { ...task, timerState: 'running', activeSince: 5_000, elapsedSeconds: 20 }

    expect(getElapsedSeconds(running, 15_000)).toBe(30)
    expect(running.elapsedSeconds).toBe(20)
  })

  it('menyelesaikan tugas dan membekukan durasi akhir', () => {
    const running = { ...task, timerState: 'running', activeSince: 10_000, elapsedSeconds: 30 }
    const finished = finishTask(running, 25_000)

    expect(finished.done).toBe(true)
    expect(finished.timerState).toBe('completed')
    expect(finished.activeSince).toBeNull()
    expect(finished.elapsedSeconds).toBe(45)
  })

  it('melanjutkan tugas yang dijeda tanpa menghapus durasi sebelumnya', () => {
    const paused = { ...task, timerState: 'paused', activeSince: null, elapsedSeconds: 75 }
    const resumed = resumeTask(paused, 50_000)

    expect(resumed.timerState).toBe('running')
    expect(resumed.activeSince).toBe(50_000)
    expect(resumed.elapsedSeconds).toBe(75)
  })
})
