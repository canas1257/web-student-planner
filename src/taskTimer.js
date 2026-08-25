export function startTask(task, now = Date.now()) {
  if (task.timerState === 'running') return task
  return {
    ...task,
    timerState: 'running',
    activeSince: now,
    elapsedSeconds: task.elapsedSeconds || 0,
  }
}

export function getElapsedSeconds(task, now = Date.now()) {
  const saved = task.elapsedSeconds || 0
  if (task.timerState !== 'running' || !task.activeSince) return saved
  return saved + Math.max(0, Math.floor((now - task.activeSince) / 1000))
}

export function pauseTask(task, now = Date.now()) {
  if (task.timerState !== 'running') return task
  return {
    ...task,
    timerState: 'paused',
    activeSince: null,
    elapsedSeconds: getElapsedSeconds(task, now),
  }
}

export function resumeTask(task, now = Date.now()) {
  if (task.timerState !== 'paused') return task
  return startTask(task, now)
}

export function finishTask(task, now = Date.now()) {
  return {
    ...task,
    done: true,
    timerState: 'completed',
    activeSince: null,
    elapsedSeconds: getElapsedSeconds(task, now),
    completedAt: now,
  }
}
