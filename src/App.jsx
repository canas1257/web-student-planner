import { useEffect, useMemo, useRef, useState } from 'react'
import {
  LayoutDashboard, CheckSquare2, CalendarDays, UserRound, Plus, Search,
  Bell, Clock3, BookOpen, Target, Flame, ChevronLeft, ChevronRight,
  MoreHorizontal, X, Check, Trash2, Pencil, GraduationCap, Sparkles,
  Timer, Trophy, Mail, MapPin, Save, Menu, CircleAlert, Moon, Sun,
  Palette, LogOut, Cloud, LoaderCircle, Play, Pause, CircleCheckBig,
} from 'lucide-react'
import AuthScreen, { SetupRequired } from './Auth'
import { isSupabaseConfigured, supabase } from './supabase'
import { createNewPlannerData } from './plannerData'
import { finishTask, getElapsedSeconds, pauseTask, resumeTask, startTask } from './taskTimer'

const STORAGE = 'ruangbelajar-data-v2'
const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
const days = ['Min','Sen','Sel','Rab','Kam','Jum','Sab']
const subjectColors = {
  Matematika: '#7c5cff', Fisika: '#2f80ed', Kimia: '#00a884', Biologi: '#f2994a',
  'Bahasa Indonesia': '#e45b8d', Inggris: '#6c8a9d', Sejarah: '#d0743c', Lainnya: '#65758b',
}

const iso = (d) => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}
const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate() + n); return d }
const dateLabel = (value) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00`))
const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`

function usePlannerData(user) {
  const cacheKey = `${STORAGE}:${user.id}`
  const [data, setData] = useState(null)
  const [syncState, setSyncState] = useState('loading')
  const hydrated = useRef(false)

  useEffect(() => {
    let active = true
    hydrated.current = false
    const load = async () => {
      const { data: row, error } = await supabase.from('student_planners').select('data').eq('user_id', user.id).maybeSingle()
      if (!active) return
      if (error) {
        setSyncState('error')
        try { setData(JSON.parse(localStorage.getItem(cacheKey)) || createNewPlannerData(user)) } catch { setData(createNewPlannerData(user)) }
      } else {
        const initial = row?.data && Object.keys(row.data).length ? row.data : createNewPlannerData(user)
        setData(initial)
        localStorage.setItem(cacheKey, JSON.stringify(initial))
        if (!row) await supabase.from('student_planners').insert({ user_id: user.id, data: initial })
        setSyncState('synced')
      }
      hydrated.current = true
    }
    load()
    return () => { active = false }
  }, [user.id, cacheKey])

  useEffect(() => {
    if (!data || !hydrated.current) return
    localStorage.setItem(cacheKey, JSON.stringify(data))
    setSyncState('saving')
    const timer = setTimeout(async () => {
      const { error } = await supabase.from('student_planners').upsert({ user_id: user.id, data })
      setSyncState(error ? 'error' : 'synced')
    }, 650)
    return () => clearTimeout(timer)
  }, [data, user.id, cacheKey])
  return [data, setData, syncState]
}

const nav = [
  ['dashboard', 'Dashboard', LayoutDashboard], ['tasks', 'Tugas', CheckSquare2],
  ['calendar', 'Kalender', CalendarDays], ['profile', 'Profil', UserRound],
]

export default function App() {
  const [theme, setThemeState] = useState(() => localStorage.getItem('ruangbelajar-theme') || 'light')
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const setTheme = (value) => { setThemeState(value); localStorage.setItem('ruangbelajar-theme', value) }

  useEffect(() => { document.documentElement.dataset.theme = theme }, [theme])
  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthLoading(false) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); setAuthLoading(false) })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (!isSupabaseConfigured) return <SetupRequired theme={theme} setTheme={setTheme}/>
  if (authLoading) return <div className="app-loading"><LoaderCircle/><p>Menyiapkan planner...</p></div>
  if (!session) return <AuthScreen theme={theme} setTheme={setTheme}/>
  return <PlannerApp user={session.user} theme={theme} setTheme={setTheme}/>
}

function PlannerApp({ user, theme, setTheme }) {
  const [page, setPage] = useState('dashboard')
  const [data, setData, syncState] = usePlannerData(user)
  const [taskModal, setTaskModal] = useState(false)
  const [scheduleModal, setScheduleModal] = useState(false)
  const [focusedTaskId, setFocusedTaskId] = useState(null)
  const [mobileNav, setMobileNav] = useState(false)
  const [toast, setToast] = useState('')

  const notify = (message) => { setToast(message); setTimeout(() => setToast(''), 2400) }
  const openAdd = () => page === 'calendar' ? setScheduleModal(true) : setTaskModal(true)
  const pageTitle = nav.find(([id]) => id === page)?.[1]
  const focusedTask = data?.tasks.find(task => task.id === focusedTaskId)

  if (!data) return <div className="app-loading"><LoaderCircle/><p>Memuat jadwal pribadimu...</p></div>

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark"><GraduationCap size={22}/></div><span>Ruang<span>Belajar</span></span></div>
      <button className="mobile-close" onClick={() => setMobileNav(false)} aria-label="Tutup menu"><X/></button>
      <nav>{nav.map(([id,label,Icon]) => <button key={id} className={page === id ? 'active' : ''} onClick={() => {setPage(id);setMobileNav(false)}}><Icon size={19}/><span>{label}</span>{id === 'tasks' && <em>{data.tasks.filter(t => !t.done).length}</em>}</button>)}</nav>
      <div className="sidebar-card">
        <div className="tiny-orbit"><Sparkles size={17}/></div>
        <strong>Tetap konsisten!</strong>
        <p>Kamu sudah belajar {data.streak} hari berturut-turut.</p>
        <div className="streak-row">{[1,2,3,4,5,6,7].map(n => <span key={n} className={n <= data.streak ? 'lit' : ''}>{days[n % 7][0]}</span>)}</div>
      </div>
      <div className="side-profile" onClick={() => setPage('profile')}>
        <Avatar name={data.profile.name}/><div><strong>{data.profile.name}</strong><small>{data.profile.className}</small></div><MoreHorizontal size={18}/>
      </div>
    </aside>
    {mobileNav && <div className="scrim" onClick={() => setMobileNav(false)}/>}

    <main>
      <header>
        <button className="menu-btn" onClick={() => setMobileNav(true)}><Menu/></button>
        <div><small>Student planner</small><h1>{pageTitle}</h1></div>
        <div className="header-actions">
          <label className="search"><Search size={18}/><input placeholder="Cari tugas..." /></label>
          <span className={`sync-state ${syncState}`} title="Status sinkronisasi"><Cloud size={15}/>{syncState === 'saving' ? 'Menyimpan' : syncState === 'error' ? 'Offline' : 'Tersimpan'}</span>
          <ThemePicker theme={theme} setTheme={setTheme}/>
          <button className="icon-btn" aria-label="Notifikasi"><Bell size={19}/><i/></button>
          <button className="icon-btn logout-btn" aria-label="Keluar" title="Keluar" onClick={() => supabase.auth.signOut()}><LogOut size={18}/></button>
          {page !== 'profile' && <button className="primary-btn" onClick={openAdd}><Plus size={18}/>{page === 'calendar' ? 'Tambah jadwal' : 'Tambah tugas'}</button>}
        </div>
      </header>

      <section className="content">
        {page === 'dashboard' && <Dashboard data={data} setData={setData} setPage={setPage} openTask={() => setTaskModal(true)} openFocus={setFocusedTaskId}/>}
        {page === 'tasks' && <Tasks data={data} setData={setData} onAdd={() => setTaskModal(true)} openFocus={setFocusedTaskId} notify={notify}/>}
        {page === 'calendar' && <Calendar data={data} setData={setData} onAdd={() => setScheduleModal(true)} notify={notify}/>}
        {page === 'profile' && <Profile data={data} setData={setData} notify={notify}/>}
      </section>
    </main>

    {taskModal && <TaskModal onClose={() => setTaskModal(false)} onSave={(task) => {setData(d => ({...d,tasks:[...d.tasks,task]}));setTaskModal(false);notify('Tugas berhasil ditambahkan')}}/>}
    {scheduleModal && <ScheduleModal onClose={() => setScheduleModal(false)} onSave={(schedule) => {setData(d => ({...d,schedules:[...d.schedules,schedule]}));setScheduleModal(false);notify('Jadwal berulang berhasil dibuat')}}/>}
    {focusedTask && <TaskFocusModal task={focusedTask} onClose={() => setFocusedTaskId(null)} onChange={(updated, finished=false) => { setData(d => ({...d, tasks:d.tasks.map(t => t.id===updated.id?updated:t), studyMinutes: finished ? d.studyMinutes + Math.max(1, Math.round(updated.elapsedSeconds/60)) : d.studyMinutes})); if (finished) notify('Tugas selesai. Kerja bagus!') }}/>}
    {toast && <div className="toast"><Check size={17}/>{toast}</div>}
  </div>
}

function ThemePicker({theme,setTheme}) {
  const options = [['light',Sun],['dark',Moon],['purple',Palette]]
  return <div className="theme-picker">{options.map(([id,Icon])=><button key={id} className={theme===id?'active':''} onClick={()=>setTheme(id)} aria-label={`Tema ${id}`} title={`Tema ${id}`}><Icon size={14}/></button>)}</div>
}

function Avatar({name, large=false}) {
  return <div className={`avatar ${large ? 'large' : ''}`}>{name.split(' ').slice(0,2).map(x => x[0]).join('')}</div>
}

function Dashboard({data,setData,setPage,openTask,openFocus}) {
  const active = [...data.tasks].filter(t => !t.done).sort((a,b) => new Date(a.due)-new Date(b.due))
  const today = iso(new Date())
  const upcoming = occurrences(data.schedules, new Date(), addDays(new Date(), 7)).slice(0,4)
  const done = data.tasks.filter(t => t.done).length
  const completion = data.tasks.length ? Math.round(done/data.tasks.length*100) : 0
  return <>
    <div className="welcome-banner">
      <div><span className="eyebrow">SELAMAT DATANG KEMBALI</span><h2>Halo, {data.profile.name.split(' ')[0]}! <span>👋</span></h2><p>Hari ini waktu yang tepat untuk selangkah lebih dekat dengan tujuanmu.</p></div>
      <div className="focus-orb"><div><Target/><b>{active.length}</b><small>fokus tugas</small></div></div>
    </div>
    <div className="stats-grid">
      <Stat icon={Clock3} tone="purple" value={`${Math.floor(data.studyMinutes/60)}j ${data.studyMinutes%60}m`} label="Waktu belajar" note="minggu ini"/>
      <Stat icon={CheckSquare2} tone="green" value={`${completion}%`} label="Tugas selesai" note={`${done} dari ${data.tasks.length} tugas`}/>
      <Stat icon={BookOpen} tone="blue" value={upcoming.length} label="Jadwal dekat" note="7 hari ke depan"/>
      <Stat icon={Flame} tone="orange" value={`${data.streak} hari`} label="Streak belajar" note="rekor terbaikmu"/>
    </div>
    <div className="dashboard-grid">
      <section className="panel priority-panel">
        <PanelHead title="Prioritas tugas" sub="Selesaikan yang paling mendesak" action="Lihat semua" onClick={() => setPage('tasks')}/>
        <div className="task-list">{active.slice(0,4).map((task,i) => <TaskRow key={task.id} task={task} rank={i+1} onOpen={() => openFocus(task.id)} onToggle={() => setData(d => ({...d,tasks:d.tasks.map(t => t.id===task.id?{...t,done:true}:t)}))}/>)}</div>
        {!active.length && <Empty text="Semua tugas sudah beres. Hebat!"/>}
        <button className="ghost-add" onClick={openTask}><Plus size={17}/> Tambah tugas baru</button>
      </section>
      <section className="panel schedule-panel">
        <PanelHead title="Jadwal belajar" sub={dateLabel(today)} action="Kalender" onClick={() => setPage('calendar')}/>
        <div className="timeline">{upcoming.map((event,i) => <div className="timeline-item" key={`${event.id}-${event.actualDate}-${i}`}><div className="time"><b>{event.time}</b><small>{event.endTime}</small></div><i style={{background:event.color}}/><div><strong>{event.title}</strong><span>{event.actualDate === today ? 'Hari ini' : dateLabel(event.actualDate)} · {event.room}</span></div></div>)}</div>
        {!upcoming.length && <Empty text="Belum ada jadwal minggu ini."/>}
      </section>
    </div>
    <section className="panel weekly-focus">
      <div><span className="eyebrow">FOKUS MINGGU INI</span><h3>Persiapan ujian tengah semester</h3><p>Pertahankan ritme belajarmu. Sedikit progres setiap hari akan memberi hasil besar.</p></div>
      <div className="progress-wrap"><div className="progress-label"><span>Target belajar</span><b>{Math.min(100,Math.round(data.studyMinutes/(data.profile.dailyTarget*60*7)*100))}%</b></div><div className="progress"><i style={{width:`${Math.min(100,data.studyMinutes/(data.profile.dailyTarget*60*7)*100)}%`}}/></div><small>{Math.floor(data.studyMinutes/60)} dari {data.profile.dailyTarget*7} jam</small></div>
    </section>
  </>
}

function Stat({icon:Icon,tone,value,label,note}) { return <div className="stat-card"><span className={`stat-icon ${tone}`}><Icon size={21}/></span><div><b>{value}</b><strong>{label}</strong><small>{note}</small></div></div> }
function PanelHead({title,sub,action,onClick}) { return <div className="panel-head"><div><h3>{title}</h3><p>{sub}</p></div><button onClick={onClick}>{action} <ChevronRight size={16}/></button></div> }
function Empty({text}) { return <div className="empty"><CheckSquare2/><p>{text}</p></div> }
function urgency(task) {
  const diff = Math.ceil((new Date(`${task.due}T23:59:59`)-new Date())/86400000)
  if (diff < 0) return ['Terlambat','late']
  if (diff === 0) return ['Hari ini','late']
  if (diff === 1) return ['Besok','soon']
  return [`${diff} hari lagi`, diff <= 3 ? 'soon' : 'normal']
}
function TaskRow({task,rank,onToggle,onDelete,onOpen}) {
  const [label,tone] = urgency(task)
  return <div className={`task-row ${task.done?'is-done':''}`} onClick={onOpen} role={onOpen?'button':undefined} tabIndex={onOpen?0:undefined} onKeyDown={e=>{if(onOpen&&(e.key==='Enter'||e.key===' '))onOpen()}}><button className="check" onClick={e=>{e.stopPropagation();onToggle()}}>{task.done && <Check size={14}/>}</button><span className="rank">{rank}</span><div className="task-copy"><strong>{task.title}</strong><span><i style={{background:subjectColors[task.subject]||subjectColors.Lainnya}}/>{task.subject}{task.timerState==='running'&&<em className="focus-status">● Sedang fokus</em>}{task.timerState==='paused'&&<em className="focus-status paused">Dijeda</em>}</span></div><div className={`deadline ${tone}`}><Clock3 size={14}/>{label}</div>{onDelete && <button className="delete-btn" onClick={e=>{e.stopPropagation();onDelete()}}><Trash2 size={16}/></button>}</div>
}

function Tasks({data,setData,onAdd,openFocus,notify}) {
  const [filter,setFilter] = useState('Aktif')
  const [query,setQuery] = useState('')
  const tasks = useMemo(() => [...data.tasks].filter(t => filter==='Semua'||(filter==='Selesai'?t.done:!t.done)).filter(t => t.title.toLowerCase().includes(query.toLowerCase())).sort((a,b) => a.done-b.done || new Date(a.due)-new Date(b.due)),[data.tasks,filter,query])
  const toggle = id => setData(d => ({...d,tasks:d.tasks.map(t => t.id===id?{...t,done:!t.done}:t)}))
  const remove = id => {setData(d => ({...d,tasks:d.tasks.filter(t => t.id!==id)}));notify('Tugas dihapus')}
  return <>
    <div className="page-intro"><div><span className="eyebrow">DAFTAR TUGAS</span><h2>Satu per satu, pasti selesai.</h2><p>Tugas otomatis diurutkan berdasarkan tenggat terdekat.</p></div><button className="primary-btn" onClick={onAdd}><Plus size={18}/>Tambah tugas</button></div>
    <section className="panel tasks-page">
      <div className="task-toolbar"><div className="tabs">{['Aktif','Selesai','Semua'].map(x => <button key={x} className={filter===x?'active':''} onClick={() => setFilter(x)}>{x}<span>{x==='Aktif'?data.tasks.filter(t=>!t.done).length:x==='Selesai'?data.tasks.filter(t=>t.done).length:data.tasks.length}</span></button>)}</div><label className="inline-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari tugas"/></label></div>
      <div className="task-list roomy">{tasks.map((task,i)=><TaskRow key={task.id} task={task} rank={i+1} onOpen={()=>openFocus(task.id)} onToggle={()=>toggle(task.id)} onDelete={()=>remove(task.id)}/>)}</div>
      {!tasks.length && <Empty text="Tidak ada tugas pada kategori ini."/>}
    </section>
  </>
}

function occurrences(schedules,start,end) {
  const result=[]
  schedules.forEach(s => {
    const first=new Date(`${s.date}T12:00:00`)
    for(let d=new Date(first); d<=end; ) {
      if(d>=start) result.push({...s,actualDate:iso(d)})
      if(s.repeat==='Tidak berulang') break
      if(s.repeat==='Harian') d=addDays(d,1)
      else if(s.repeat==='Mingguan') d=addDays(d,7)
      else { const next=new Date(d); next.setMonth(next.getMonth()+1); d=next }
    }
  })
  return result.sort((a,b)=>`${a.actualDate}${a.time}`.localeCompare(`${b.actualDate}${b.time}`))
}

function Calendar({data,setData,onAdd,notify}) {
  const [cursor,setCursor] = useState(new Date())
  const year=cursor.getFullYear(), month=cursor.getMonth()
  const first=new Date(year,month,1), gridStart=addDays(first,-first.getDay())
  const cells=Array.from({length:42},(_,i)=>addDays(gridStart,i))
  const events=occurrences(data.schedules,gridStart,addDays(gridStart,41))
  const upcoming=occurrences(data.schedules,new Date(),addDays(new Date(),35)).slice(0,7)
  const remove=id=>{setData(d=>({...d,schedules:d.schedules.filter(s=>s.id!==id)}));notify('Jadwal dihapus')}
  return <>
    <div className="page-intro"><div><span className="eyebrow">KALENDER BELAJAR</span><h2>Atur sekali, berjalan otomatis.</h2><p>Buat jadwal harian, mingguan, atau bulanan tanpa mengisi berulang kali.</p></div><button className="primary-btn" onClick={onAdd}><Plus size={18}/>Tambah jadwal</button></div>
    <div className="calendar-layout">
      <section className="panel calendar-card">
        <div className="calendar-head"><div><h3>{months[month]} {year}</h3><button onClick={()=>setCursor(new Date())}>Hari ini</button></div><div><button onClick={()=>setCursor(new Date(year,month-1,1))}><ChevronLeft/></button><button onClick={()=>setCursor(new Date(year,month+1,1))}><ChevronRight/></button></div></div>
        <div className="calendar-grid weeknames">{days.map(d=><b key={d}>{d}</b>)}</div>
        <div className="calendar-grid">{cells.map((d,i)=>{const date=iso(d), dayEvents=events.filter(e=>e.actualDate===date);return <div key={i} className={`day-cell ${d.getMonth()!==month?'muted':''} ${date===iso(new Date())?'today':''}`}><span>{d.getDate()}</span><div>{dayEvents.slice(0,3).map((e,j)=><button key={`${e.id}-${j}`} style={{'--event':e.color}} title={`${e.time} ${e.title}`}>{e.time} {e.title}</button>)}{dayEvents.length>3&&<small>+{dayEvents.length-3} lainnya</small>}</div></div>})}</div>
      </section>
      <aside className="panel agenda">
        <div className="panel-head"><div><h3>Agenda mendatang</h3><p>35 hari ke depan</p></div></div>
        <div>{upcoming.map((e,i)=><article key={`${e.id}-${e.actualDate}-${i}`}><span className="agenda-date"><b>{new Date(`${e.actualDate}T12:00`).getDate()}</b><small>{months[new Date(`${e.actualDate}T12:00`).getMonth()].slice(0,3)}</small></span><i style={{background:e.color}}/><div><strong>{e.title}</strong><span>{e.time}–{e.endTime}</span><small><MapPin size={12}/>{e.room} · {e.repeat}</small></div><button onClick={()=>remove(e.id)}><Trash2 size={15}/></button></article>)}</div>
      </aside>
    </div>
  </>
}

function Profile({data,setData,notify}) {
  const [form,setForm]=useState(data.profile)
  const update=(k,v)=>setForm(f=>({...f,[k]:v}))
  const save=()=>{setData(d=>({...d,profile:{...form,dailyTarget:Number(form.dailyTarget)}}));notify('Profil berhasil diperbarui')}
  return <>
    <div className="profile-hero"><div className="profile-pattern"/><Avatar name={form.name} large/><div><span className="eyebrow">PROFIL PELAJAR</span><h2>{form.name}</h2><p>{form.className} · {form.school}</p></div><div className="level-chip"><Trophy size={18}/><span><small>Level belajar</small><b>Penjelajah</b></span></div></div>
    <div className="profile-grid">
      <section className="panel profile-form"><div className="panel-head"><div><h3>Informasi pribadi</h3><p>Kenali dirimu dan tujuan belajarmu.</p></div><Pencil size={18}/></div>
        <div className="form-grid"><Field label="Nama lengkap" value={form.name} onChange={v=>update('name',v)}/><Field label="Kelas" value={form.className} onChange={v=>update('className',v)}/><Field label="Sekolah" value={form.school} onChange={v=>update('school',v)}/><Field label="Email" type="email" value={form.email} onChange={v=>update('email',v)}/><Field label="Kota" value={form.city} onChange={v=>update('city',v)}/><Field label="Target belajar (jam/hari)" type="number" min="1" max="12" value={form.dailyTarget} onChange={v=>update('dailyTarget',v)}/><label className="full"><span>Cita-cita / target utama</span><textarea value={form.goal} onChange={e=>update('goal',e.target.value)}/></label></div>
        <button className="primary-btn save-btn" onClick={save}><Save size={17}/>Simpan perubahan</button>
      </section>
      <aside className="profile-side">
        <section className="panel achievement"><span className="stat-icon orange"><Flame/></span><div><small>Streak saat ini</small><b>{data.streak} hari</b><p>Teruskan, kamu luar biasa!</p></div></section>
        <section className="panel goals"><h3>Ringkasan belajar</h3><div><span><Timer/>Waktu minggu ini</span><b>{Math.floor(data.studyMinutes/60)}j {data.studyMinutes%60}m</b></div><div><span><CheckSquare2/>Tugas selesai</span><b>{data.tasks.filter(t=>t.done).length}</b></div><div><span><Target/>Target harian</span><b>{form.dailyTarget} jam</b></div></section>
        <section className="quote-card"><Sparkles/><p>“Kesuksesan adalah jumlah dari usaha kecil yang diulangi setiap hari.”</p><small>— Robert Collier</small></section>
      </aside>
    </div>
  </>
}

function Field({label,value,onChange,type='text',...rest}) { return <label><span>{label}</span><input type={type} value={value} onChange={e=>onChange(e.target.value)} {...rest}/></label> }

function Modal({title,subtitle,onClose,children}) { return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><div className="modal"><div className="modal-head"><div><h3>{title}</h3><p>{subtitle}</p></div><button onClick={onClose}><X/></button></div>{children}</div></div> }

function formatTimer(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  return [hours, minutes, rest].map(value => String(value).padStart(2, '0')).join(':')
}

function TaskFocusModal({task,onClose,onChange}) {
  const [now,setNow] = useState(Date.now())
  useEffect(() => {
    if (task.timerState !== 'running') return undefined
    setNow(Date.now())
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [task.timerState, task.activeSince])
  const elapsed = getElapsedSeconds(task, now)
  const state = task.done ? 'completed' : (task.timerState || 'idle')
  const stateLabel = { idle:'Siap dimulai', running:'Sedang dikerjakan', paused:'Dijeda — bisa dilanjutkan nanti', completed:'Tugas sudah selesai' }[state]
  return <div className="modal-backdrop focus-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><div className="focus-modal">
    <button className="focus-close" onClick={onClose} aria-label="Tutup"><X/></button>
    <div className="focus-top"><span className="focus-subject" style={{'--subject':subjectColors[task.subject]||subjectColors.Lainnya}}>{task.subject}</span><span className={`focus-state ${state}`}>{stateLabel}</span></div>
    <h3>{task.title}</h3>
    <div className="focus-meta"><span><CalendarDays/>Deadline {dateLabel(task.due)}</span><span><Target/>Prioritas {task.priority}</span></div>
    <div className={`timer-ring ${state}`}><div><Timer/><strong>{formatTimer(elapsed)}</strong><small>WAKTU FOKUS</small></div></div>
    <p className="focus-hint">{state==='running'?'Tetap fokus. Waktumu tersimpan otomatis meski popup ditutup.':state==='paused'?'Ada keperluan lain? Tidak masalah, progres waktumu sudah tersimpan.':state==='completed'?'Hebat! Durasi belajarmu sudah masuk ke statistik.':'Klik mulai saat kamu siap mengerjakan tugas ini.'}</p>
    <div className="focus-actions">
      {state==='idle'&&<button className="focus-primary" onClick={()=>onChange(startTask(task))}><Play/>Mulai</button>}
      {state==='running'&&<><button className="focus-secondary" onClick={()=>onChange(pauseTask(task))}><Pause/>Jeda</button><button className="focus-finish" onClick={()=>onChange(finishTask(task),true)}><CircleCheckBig/>Selesai</button></>}
      {state==='paused'&&<><button className="focus-primary" onClick={()=>onChange(resumeTask(task))}><Play/>Lanjutkan</button><button className="focus-finish" onClick={()=>onChange(finishTask(task),true)}><CircleCheckBig/>Selesai</button></>}
      {state==='completed'&&<button className="focus-primary" onClick={onClose}><Check/>Tutup</button>}
    </div>
  </div></div>
}

function TaskModal({onClose,onSave}) {
  const [form,setForm]=useState({title:'',subject:'Matematika',due:iso(addDays(new Date(),1)),priority:'Sedang'})
  const submit=e=>{e.preventDefault();if(!form.title.trim())return;onSave({id:uid(),...form,title:form.title.trim(),done:false,timerState:'idle',elapsedSeconds:0,activeSince:null})}
  return <Modal title="Tambah tugas baru" subtitle="Isi detail tugas dan kami akan mengatur prioritasnya." onClose={onClose}><form onSubmit={submit} className="modal-form"><Field label="Nama tugas" value={form.title} onChange={v=>setForm({...form,title:v})} placeholder="Contoh: Latihan integral"/><label><span>Mata pelajaran</span><select value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}>{Object.keys(subjectColors).map(x=><option key={x}>{x}</option>)}</select></label><div className="form-grid"><Field label="Tenggat" type="date" value={form.due} onChange={v=>setForm({...form,due:v})}/><label><span>Prioritas</span><select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}><option>Tinggi</option><option>Sedang</option><option>Rendah</option></select></label></div><div className="modal-actions"><button type="button" onClick={onClose}>Batal</button><button className="primary-btn" type="submit"><Plus size={17}/>Tambahkan tugas</button></div></form></Modal>
}
function ScheduleModal({onClose,onSave}) {
  const [form,setForm]=useState({title:'Matematika',date:iso(new Date()),time:'08:00',endTime:'09:00',room:'Ruang kelas',repeat:'Mingguan',color:subjectColors.Matematika})
  const submit=e=>{e.preventDefault();onSave({id:uid(),...form,color:subjectColors[form.title]||form.color})}
  return <Modal title="Tambah jadwal belajar" subtitle="Pilih pengulangan agar jadwal terisi otomatis." onClose={onClose}><form onSubmit={submit} className="modal-form"><label><span>Pelajaran / kegiatan</span><select value={form.title} onChange={e=>setForm({...form,title:e.target.value})}>{Object.keys(subjectColors).map(x=><option key={x}>{x}</option>)}<option>Belajar mandiri</option><option>Evaluasi target</option></select></label><div className="form-grid"><Field label="Mulai tanggal" type="date" value={form.date} onChange={v=>setForm({...form,date:v})}/><label><span>Ulangi</span><select value={form.repeat} onChange={e=>setForm({...form,repeat:e.target.value})}><option>Tidak berulang</option><option>Harian</option><option>Mingguan</option><option>Bulanan</option></select></label><Field label="Jam mulai" type="time" value={form.time} onChange={v=>setForm({...form,time:v})}/><Field label="Jam selesai" type="time" value={form.endTime} onChange={v=>setForm({...form,endTime:v})}/></div><Field label="Lokasi" value={form.room} onChange={v=>setForm({...form,room:v})}/><div className="repeat-note"><CircleAlert size={17}/><span>Jadwal <b>{form.repeat.toLowerCase()}</b> akan otomatis muncul di kalender tahun ini.</span></div><div className="modal-actions"><button type="button" onClick={onClose}>Batal</button><button className="primary-btn" type="submit"><CalendarDays size={17}/>Simpan jadwal</button></div></form></Modal>
}
