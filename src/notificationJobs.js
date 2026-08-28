const WIB_OFFSET = '+07:00'
const DAY_MS = 86_400_000

function wibDate(now) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now)
}

function addDateDays(date, amount) {
  const value = new Date(`${date}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() + amount)
  return value.toISOString().slice(0, 10)
}

function dateTimeWib(date, time) {
  return new Date(`${date}T${time}:00${WIB_OFFSET}`)
}

function addIfFuture(jobs, job, now) {
  if (new Date(job.scheduled_for) > now) jobs.push(job)
}

function scheduleOccurrences(schedule, now, horizonDays = 35) {
  const today = wibDate(now)
  const horizon = addDateDays(today, horizonDays)
  const dates = []
  for (let date = schedule.date; date <= horizon;) {
    if (date >= today) dates.push(date)
    if (schedule.repeat === 'Tidak berulang') break
    if (schedule.repeat === 'Harian') date = addDateDays(date, 1)
    else if (schedule.repeat === 'Mingguan') date = addDateDays(date, 7)
    else if (schedule.repeat === 'Bulanan') {
      const next = new Date(`${date}T12:00:00Z`)
      next.setUTCMonth(next.getUTCMonth() + 1)
      date = next.toISOString().slice(0, 10)
    } else break
  }
  return dates
}

export function buildNotificationJobs(data, preferences, now = new Date()) {
  const jobs = []

  if (preferences.task_deadline_enabled) {
    for (const task of data.tasks || []) {
      if (task.done || !task.due) continue
      const deadline = dateTimeWib(task.due, '23:59')
      const common = {
        kind: 'task_deadline',
        title: `Pengingat tugas ${task.subject || ''}`.trim(),
        url: './?page=tasks',
      }
      if (deadline <= now) {
        jobs.push({
          kind: 'task_overdue',
          source_key: `task:${task.id}:overdue`,
          title: 'Tugas melewati tenggat',
          body: `“${task.title}” belum selesai. Yuk, tentukan waktu untuk menyelesaikannya.`,
          scheduled_for: new Date(now.getTime() + 60_000).toISOString(),
          url: './?page=tasks',
        })
        continue
      }
      addIfFuture(jobs, {
        ...common,
        source_key: `task:${task.id}:day`,
        body: `Besok adalah tenggat “${task.title}”. Yuk, siapkan dari sekarang.`,
        scheduled_for: new Date(deadline.getTime() - DAY_MS).toISOString(),
      }, now)
      addIfFuture(jobs, {
        ...common,
        source_key: `task:${task.id}:hour`,
        body: `Satu jam lagi menuju tenggat “${task.title}”.`,
        scheduled_for: new Date(deadline.getTime() - 3_600_000).toISOString(),
      }, now)
    }
  }

  if (preferences.schedule_enabled) {
    for (const schedule of data.schedules || []) {
      if (!schedule.date || !schedule.time) continue
      for (const occurrenceDate of scheduleOccurrences(schedule, now)) {
        const start = dateTimeWib(occurrenceDate, schedule.time)
        addIfFuture(jobs, {
          kind: 'schedule_reminder',
          source_key: `schedule:${schedule.id}:${occurrenceDate}`,
          title: 'Jadwal dimulai 15 menit lagi',
          body: `${schedule.title}${schedule.room ? ` • ${schedule.room}` : ''}`,
          scheduled_for: new Date(start.getTime() - 15 * 60_000).toISOString(),
          url: './?page=calendar',
        }, now)
      }
    }
  }

  if (preferences.daily_target_enabled) {
    let date = wibDate(now)
    let daysChecked = 0
    const targetHours = Math.max(1, Number(data.profile?.dailyTarget || 2))
    while (jobs.filter((job) => job.kind === 'daily_target').length < 7 && daysChecked < 400) {
      const scheduled = dateTimeWib(date, '19:00')
      const completedMinutes = Number(data.studyByDate?.[date] || 0)
      if (completedMinutes < targetHours * 60) {
        addIfFuture(jobs, {
          kind: 'daily_target',
          source_key: `target:${date}`,
          title: 'Waktunya belajar',
          body: `Target harianmu ${targetHours} jam. Sedikit progres hari ini tetap berarti!`,
          scheduled_for: scheduled.toISOString(),
          url: './?page=dashboard',
        }, now)
      }
      date = addDateDays(date, 1)
      daysChecked += 1
    }
  }

  return jobs
}
