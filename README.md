# RuangBelajar — Web Student Planner

Planner pelajar responsif untuk mengatur tugas, jadwal belajar, dan target pribadi dalam satu tempat.

## Fitur

- Halaman login dan register dengan Supabase Auth.
- Setiap akun memiliki tugas, jadwal, statistik, dan profil yang terpisah.
- Sinkronisasi data otomatis antarperangkat dengan Row Level Security.
- Pilihan tema terang, hitam/dark, dan purple.
- Dashboard dengan statistik belajar, prioritas tugas, jadwal terdekat, streak, dan progres mingguan.
- Manajemen tugas dengan urutan tenggat otomatis, filter aktif/selesai, pencarian, dan status selesai.
- Kalender tahunan dengan jadwal sekali, harian, mingguan, atau bulanan.
- Profil siswa, tujuan belajar, target jam harian, dan ringkasan pencapaian.
- Cache lokal untuk ketahanan saat koneksi bermasalah; sumber data utama berada di Supabase.
- Tampilan responsif untuk desktop, tablet, dan ponsel.

## Konfigurasi Supabase

1. Buat proyek di [Supabase](https://supabase.com/dashboard).
2. Buka **SQL Editor** dan jalankan `supabase/schema.sql` untuk membuat tabel dan kebijakan Row Level Security.
3. Salin `.env.example` menjadi `.env.local`, lalu isi Project URL dan anon/public key:

```bash
cp .env.example .env.local
```

4. Untuk GitHub Pages, buat dua **Actions repository secrets**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Di Supabase Authentication → URL Configuration, tambahkan URL situs sebagai Redirect URL:
   `https://canas1257.github.io/web-student-planner/`

Jangan pernah menggunakan `service_role` key di frontend atau GitHub Pages.

## Menjalankan lokal

```bash
npm install
npm run dev
```

Build produksi:

```bash
npm run build
npm run preview
```

## Teknologi

React, Vite, Lucide React, CSS responsif, dan GitHub Pages.

## Catatan data

Data tersimpan hanya di browser/perangkat pengguna melalui `localStorage`. Membersihkan data situs pada browser akan menghapus data planner.
