import { useState } from 'react'
import { GraduationCap, Mail, LockKeyhole, UserRound, Eye, EyeOff, ArrowRight, Check, Sparkles, Palette } from 'lucide-react'
import { supabase } from './supabase'
import { buildEmailRedirectUrl } from './redirectUrl'

export default function AuthScreen({ theme, setTheme }) {
  const [mode, setMode] = useState('login')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const submit = async (event) => {
    event.preventDefault()
    setMessage({ type: '', text: '' })
    if (mode === 'register' && form.password !== form.confirm) {
      setMessage({ type: 'error', text: 'Konfirmasi password belum sama.' })
      return
    }
    if (form.password.length < 6) {
      setMessage({ type: 'error', text: 'Password minimal 6 karakter.' })
      return
    }
    setLoading(true)
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
      : await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: { full_name: form.name },
            emailRedirectTo: buildEmailRedirectUrl(window.location.href, import.meta.env.BASE_URL),
          },
        })
    setLoading(false)
    if (result.error) {
      setMessage({ type: 'error', text: result.error.message === 'Invalid login credentials' ? 'Email atau password salah.' : result.error.message })
      return
    }
    if (mode === 'register' && !result.data.session) {
      setMessage({ type: 'success', text: 'Pendaftaran berhasil. Periksa email untuk verifikasi akun.' })
    }
  }

  return <div className="auth-shell">
    <aside className="auth-story">
      <div className="auth-brand"><span><img src={`${import.meta.env.BASE_URL}brand/ruangbelajar-logo.svg`} alt=""/></span>Ruang<b>Belajar</b></div>
      <div className="auth-copy">
        <span className="auth-kicker"><Sparkles size={14}/> PLANNER PRIBADI PELAJAR</span>
        <h1>Rencanakan hari.<br/><em>Wujudkan mimpi.</em></h1>
        <p>Semua tugas, jadwal, dan progres belajarmu tersimpan aman dan dapat diakses dari mana saja.</p>
        <ul>
          <li><Check/>Jadwal pribadi untuk setiap akun</li>
          <li><Check/>Sinkron otomatis antarperangkat</li>
          <li><Check/>Prioritas tugas berdasarkan deadline</li>
        </ul>
      </div>
      <div className="auth-quote">“Masa depan dimulai dari apa yang kamu kerjakan hari ini.”<small>— Mahatma Gandhi</small></div>
      <div className="auth-decoration"><i/><i/><i/></div>
    </aside>

    <main className="auth-main">
      <div className="auth-theme"><Palette size={15}/>{[['light','Terang'],['dark','Hitam'],['purple','Purple']].map(([id,label]) => <button key={id} className={theme===id?'active':''} onClick={()=>setTheme(id)} title={`Tema ${label}`}>{label}</button>)}</div>
      <div className="auth-card">
        <div className="auth-mobile-brand"><img src={`${import.meta.env.BASE_URL}brand/ruangbelajar-logo.svg`} alt=""/>Ruang<b>Belajar</b></div>
        <span className="eyebrow">{mode === 'login' ? 'SELAMAT DATANG KEMBALI' : 'MULAI PERJALANANMU'}</span>
        <h2>{mode === 'login' ? 'Masuk ke akunmu' : 'Buat akun pelajar'}</h2>
        <p>{mode === 'login' ? 'Lanjutkan progres dan jadwal belajarmu.' : 'Satu langkah menuju belajar yang lebih teratur.'}</p>
        <div className="auth-tabs"><button className={mode==='login'?'active':''} onClick={()=>{setMode('login');setMessage({})}}>Masuk</button><button className={mode==='register'?'active':''} onClick={()=>{setMode('register');setMessage({})}}>Daftar</button></div>
        <form onSubmit={submit}>
          {mode === 'register' && <label><span>Nama lengkap</span><div><UserRound/><input required value={form.name} onChange={e=>update('name',e.target.value)} placeholder="Nama lengkapmu"/></div></label>}
          <label><span>Email</span><div><Mail/><input required type="email" value={form.email} onChange={e=>update('email',e.target.value)} placeholder="nama@email.com"/></div></label>
          <label><span>Password</span><div><LockKeyhole/><input required minLength="6" type={showPassword?'text':'password'} value={form.password} onChange={e=>update('password',e.target.value)} placeholder="Minimal 6 karakter"/><button type="button" onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff/>:<Eye/>}</button></div></label>
          {mode === 'register' && <label><span>Konfirmasi password</span><div><LockKeyhole/><input required type={showPassword?'text':'password'} value={form.confirm} onChange={e=>update('confirm',e.target.value)} placeholder="Ulangi password"/></div></label>}
          {message.text && <div className={`auth-message ${message.type}`}>{message.text}</div>}
          <button className="auth-submit" disabled={loading}>{loading ? 'Mohon tunggu...' : mode==='login'?'Masuk ke planner':'Buat akun'} {!loading&&<ArrowRight/>}</button>
        </form>
        <small className="auth-terms">Dengan melanjutkan, kamu menyetujui penggunaan data untuk menyimpan planner pribadimu.</small>
      </div>
    </main>
  </div>
}

export function SetupRequired({ theme, setTheme }) {
  return <div className="setup-required"><div className="auth-theme"><Palette size={15}/>{[['light','Terang'],['dark','Hitam'],['purple','Purple']].map(([id,label])=><button key={id} className={theme===id?'active':''} onClick={()=>setTheme(id)}>{label}</button>)}</div><div className="setup-card"><span><GraduationCap/></span><h1>Hubungkan Supabase</h1><p>Halaman login dan register sudah siap. Tambahkan kredensial publik Supabase agar autentikasi dapat digunakan.</p><code>VITE_SUPABASE_URL<br/>VITE_SUPABASE_ANON_KEY</code><small>Gunakan anon/public key — jangan pernah memakai service_role key.</small></div></div>
}
