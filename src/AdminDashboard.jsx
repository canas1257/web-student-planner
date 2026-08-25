import { useEffect, useMemo, useState } from 'react'
import {
  Activity, Check, CheckCircle2, Clock3, GraduationCap, LoaderCircle,
  LogOut, Moon, Palette, RefreshCw, Search, ShieldCheck, Sun, Trash2,
  UserCheck, UserRound, UserX, UsersRound, XCircle,
} from 'lucide-react'
import { filterStudents, getAdminStats } from './adminMonitoring'
import { supabase } from './supabase'
import './admin.css'

const statusCopy = {
  all: 'Semua murid',
  unreviewed: 'Belum ditinjau',
  approved: 'Murid terverifikasi',
  blocked: 'Diblokir',
}

const activityLabel = (value) => {
  if (!value) return 'Belum pernah'
  const date = new Date(value)
  const day = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short' }).format(date)
  const time = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }).format(date)
  return `${day}, ${time} WIB`
}

const isToday = (value) => {
  if (!value) return false
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' })
  return formatter.format(new Date(value)) === formatter.format(new Date())
}

function AdminTheme({ theme = 'light', setTheme = () => {} }) {
  return <div className="admin-theme">
    {[['light', Sun], ['dark', Moon], ['purple', Palette]].map(([id, Icon]) => <button key={id} className={theme === id ? 'active' : ''} onClick={() => setTheme(id)} aria-label={`Tema ${id}`}><Icon/></button>)}
  </div>
}

export function AdminView({
  students = [], filteredStudents = [], stats = {}, filter = 'all', query = '',
  onFilter = () => {}, onQuery = () => {}, onStatus = () => {}, onDelete = () => {},
  onRefresh = () => {}, onLogout = () => {}, loading = false, actionId = '', error = '',
  adminEmail = '', theme = 'light', setTheme = () => {},
}) {
  const cards = [
    ['Total murid', stats.total || 0, UsersRound, 'violet'],
    ['Login hari ini', stats.loggedInToday || 0, UserCheck, 'blue'],
    ['Belajar hari ini', stats.studiedToday || 0, Activity, 'green'],
    ['Belum ditinjau', stats.unreviewed || 0, ShieldCheck, 'amber'],
    ['Diblokir', stats.blocked || 0, UserX, 'red'],
  ]
  return <div className="admin-app">
    <aside className="admin-sidebar">
      <div className="admin-brand"><span><GraduationCap/></span><div>Ruang<b>Belajar</b><small>ADMIN CONSOLE</small></div></div>
      <nav><button className="active"><UsersRound/>Monitoring murid</button></nav>
      <div className="admin-security"><ShieldCheck/><strong>Data minimum</strong><p>Admin hanya melihat identitas dan status aktivitas, bukan isi tugas pribadi.</p></div>
      <div className="admin-account"><span>{(adminEmail || 'A').slice(0, 1).toUpperCase()}</span><div><strong>Administrator</strong><small>{adminEmail}</small></div></div>
    </aside>

    <main className="admin-main">
      <header className="admin-header">
        <div><span className="admin-kicker">PANEL GURU</span><h1>Aktivitas murid</h1><p>Pantau siapa yang sudah login dan belajar hari ini.</p></div>
        <div className="admin-header-actions"><AdminTheme theme={theme} setTheme={setTheme}/><button className="admin-icon-btn" onClick={onRefresh} title="Muat ulang"><RefreshCw/></button><button className="admin-logout" onClick={onLogout}><LogOut/>Keluar</button></div>
      </header>

      <section className="admin-content">
        <div className="admin-stat-grid">{cards.map(([label, value, Icon, tone]) => <article key={label} className={`admin-stat ${tone}`}><span><Icon/></span><div><strong>{value}</strong><small>{label}</small></div></article>)}</div>

        <section className="admin-panel">
          <div className="admin-panel-head"><div><h2>Daftar murid</h2><p>{students.length} akun terdaftar · diperbarui dalam WIB</p></div><label className="admin-search"><Search/><input value={query} onChange={event => onQuery(event.target.value)} placeholder="Cari nama atau email..."/></label></div>
          <div className="admin-filters">{Object.entries(statusCopy).map(([id, label]) => <button key={id} className={filter === id ? 'active' : ''} onClick={() => onFilter(id)}>{label}<span>{id === 'all' ? students.length : students.filter(student => student.status === id).length}</span></button>)}</div>
          {error && <div className="admin-error"><XCircle/>{error}</div>}
          {loading ? <div className="admin-loading"><LoaderCircle/><p>Memuat aktivitas murid...</p></div> : <div className="admin-table-wrap"><table className="admin-table">
            <thead><tr><th>Murid</th><th>Status</th><th>Login terakhir</th><th>Belajar terakhir</th><th>Bergabung</th><th>Tindakan</th></tr></thead>
            <tbody>{filteredStudents.map(student => <tr key={student.user_id}>
              <td data-label="Murid"><div className="student-id"><span>{(student.display_name || student.email || '?').slice(0, 1).toUpperCase()}</span><div><strong>{student.display_name || 'Tanpa nama'}</strong><small>{student.email}</small></div></div></td>
              <td data-label="Status"><span className={`student-status ${student.status}`}>{student.status === 'approved' ? 'Terverifikasi' : student.status === 'blocked' ? 'Diblokir' : 'Belum ditinjau'}</span></td>
              <td data-label="Login"><div className={isToday(student.last_login_at) ? 'activity-today' : 'activity-muted'}><i/>{isToday(student.last_login_at) ? 'Hari ini' : activityLabel(student.last_login_at)}</div>{isToday(student.last_login_at) && <small className="activity-time">{activityLabel(student.last_login_at)}</small>}</td>
              <td data-label="Belajar"><div className={isToday(student.last_study_at) ? 'activity-today study' : 'activity-muted'}><i/>{isToday(student.last_study_at) ? 'Sudah belajar' : activityLabel(student.last_study_at)}</div>{isToday(student.last_study_at) && <small className="activity-time">{activityLabel(student.last_study_at)}</small>}</td>
              <td data-label="Bergabung">{activityLabel(student.created_at).replace(', ', ' · ')}</td>
              <td data-label="Tindakan"><div className="student-actions">
                {student.status !== 'approved' && <button disabled={actionId === student.user_id} className="approve" onClick={() => onStatus(student, 'approved')}><CheckCircle2/>Setujui</button>}
                {student.status !== 'blocked' && <button disabled={actionId === student.user_id} className="block" onClick={() => onStatus(student, 'blocked')}><UserX/>Blokir</button>}
                {student.status === 'blocked' && <button disabled={actionId === student.user_id} className="review" onClick={() => onStatus(student, 'unreviewed')}><RefreshCw/>Pulihkan</button>}
                <button disabled={actionId === student.user_id} className="remove" onClick={() => onDelete(student)} title="Hapus permanen"><Trash2/>Hapus</button>
              </div></td>
            </tr>)}</tbody>
          </table>{!filteredStudents.length && <div className="admin-empty"><UserRound/><h3>Tidak ada murid</h3><p>Belum ada akun yang cocok dengan filter ini.</p></div>}</div>}
        </section>
      </section>
    </main>
  </div>
}

export default function AdminDashboard({ user, theme, setTheme }) {
  const [students, setStudents] = useState([])
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    const { data, error: loadError } = await supabase.rpc('admin_list_students')
    setLoading(false)
    if (loadError) { setError('Data murid belum dapat dimuat. Pastikan schema admin sudah dipasang.'); return }
    setStudents(data || [])
  }
  useEffect(() => { load() }, [])

  const stats = useMemo(() => getAdminStats(students), [students])
  const filteredStudents = useMemo(() => filterStudents(students, { status: filter, query }), [students, filter, query])
  const changeStatus = async (student, status) => {
    setActionId(student.user_id)
    const { error: actionError } = await supabase.rpc('admin_set_student_status', { target_user_id: student.user_id, new_status: status })
    setActionId('')
    if (actionError) { setError('Perubahan status gagal. Coba muat ulang halaman.'); return }
    setStudents(current => current.map(item => item.user_id === student.user_id ? { ...item, status } : item))
  }
  const deleteStudent = async (student) => {
    if (!window.confirm(`Hapus permanen akun ${student.display_name} (${student.email}) beserta seluruh data plannernya? Tindakan ini tidak dapat dibatalkan.`)) return
    setActionId(student.user_id)
    const { data, error: actionError } = await supabase.rpc('admin_delete_student', { target_user_id: student.user_id })
    setActionId('')
    if (actionError || !data) { setError('Akun gagal dihapus. Silakan coba kembali.'); return }
    setStudents(current => current.filter(item => item.user_id !== student.user_id))
  }

  return <AdminView students={students} filteredStudents={filteredStudents} stats={stats} filter={filter} query={query} onFilter={setFilter} onQuery={setQuery} onStatus={changeStatus} onDelete={deleteStudent} onRefresh={load} onLogout={() => supabase.auth.signOut()} loading={loading} actionId={actionId} error={error} adminEmail={user.email} theme={theme} setTheme={setTheme}/>
}
