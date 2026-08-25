const dayKey = (value, timeZone = 'Asia/Jakarta') => {
  if (!value) return null
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}

export function filterStudents(users, { status = 'all', query = '' } = {}) {
  const needle = query.trim().toLocaleLowerCase('id-ID')
  return users.filter(user => {
    const statusMatch = status === 'all' || user.status === status
    const haystack = `${user.display_name || ''} ${user.email || ''}`.toLocaleLowerCase('id-ID')
    return statusMatch && (!needle || haystack.includes(needle))
  })
}

export function resolveAccountAccess(rows) {
  const access = Array.isArray(rows) ? rows[0] : rows
  return {
    role: access?.is_admin ? 'admin' : 'student',
    status: access?.access_status || 'unreviewed',
  }
}

export function getAdminStats(users, now = new Date(), timeZone = 'Asia/Jakarta') {
  const today = dayKey(now, timeZone)
  return {
    total: users.length,
    loggedInToday: users.filter(user => dayKey(user.last_login_at, timeZone) === today).length,
    studiedToday: users.filter(user => dayKey(user.last_study_at, timeZone) === today).length,
    unreviewed: users.filter(user => user.status === 'unreviewed').length,
    blocked: users.filter(user => user.status === 'blocked').length,
  }
}
