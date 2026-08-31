import { ArrowRight, Bell, CalendarDays, CheckSquare2, Cloud, ShieldCheck } from 'lucide-react'

const features = [
  [CheckSquare2, 'Tugas terarah', 'Susun prioritas dan pantau tenggat dalam satu tempat.'],
  [CalendarDays, 'Jadwal belajar', 'Atur agenda berulang tanpa mengisi tanggal yang sama berkali-kali.'],
  [Bell, 'Pengingat pilihanmu', 'Notifikasi hanya diaktifkan setelah kamu menekan tombol izin.'],
]

export default function PublicLanding() {
  return <div className="public-landing">
    <header className="public-header">
      <a className="public-brand" href="./" aria-label="Beranda RuangBelajar">
        <img src={`${import.meta.env.BASE_URL}brand/ruangbelajar-logo.svg`} alt=""/>
        <span>Ruang<b>Belajar</b></span>
      </a>
      <a className="public-login" href="?auth=login">Masuk ke planner <ArrowRight/></a>
    </header>

    <main>
      <section className="public-hero">
        <div>
          <span className="eyebrow">STUDENT PLANNER RESMI</span>
          <h1>Belajar lebih teratur,<br/><em>tanpa kehilangan arah.</em></h1>
          <p>RuangBelajar adalah planner pelajar untuk mengelola tugas, jadwal, fokus belajar, dan pengingat pribadi.</p>
          <div className="public-actions">
            <a href="?auth=login">Buka halaman masuk <ArrowRight/></a>
            <span>Tidak perlu mengunduh software untuk menggunakan versi web.</span>
          </div>
        </div>
        <div className="public-preview" aria-label="Ringkasan fungsi RuangBelajar">
          <span><Cloud/> Data planner tersinkron aman</span>
          <strong>Semua rencana belajarmu<br/>dalam satu ruang.</strong>
          <ul>
            <li><CheckSquare2/>Kelola tugas dan deadline</li>
            <li><CalendarDays/>Jadwal berulang yang praktis</li>
            <li><Bell/>Pengingat atas persetujuan pengguna</li>
          </ul>
        </div>
      </section>

      <section className="public-features" aria-label="Fitur RuangBelajar">
        {features.map(([Icon, title, copy]) => <article key={title}><Icon/><h2>{title}</h2><p>{copy}</p></article>)}
      </section>

      <section className="public-trust" id="keamanan">
        <ShieldCheck/>
        <div>
          <span className="eyebrow">TRANSPARANSI & KEAMANAN</span>
          <h2>Login hanya untuk mengakses data planner milikmu.</h2>
          <p>Autentikasi akun diproses oleh Supabase melalui koneksi HTTPS. RuangBelajar tidak meminta data perbankan, kode OTP, seed phrase, atau instalasi software dari halaman login.</p>
          <small>Domain resmi aplikasi web: <strong>belajarteratur.web.id</strong></small>
        </div>
      </section>
    </main>

    <footer className="public-footer">
      <span>© RuangBelajar · Planner pribadi pelajar</span>
      <nav><a href="#keamanan">Keamanan</a><a href="?auth=login">Masuk</a></nav>
    </footer>
  </div>
}
