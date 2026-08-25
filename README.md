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
- Dashboard guru/admin untuk memantau login dan aktivitas belajar harian tanpa membaca isi tugas pribadi.
- Verifikasi murid, blokir akses, pemulihan, dan penghapusan akun dengan audit log.

## Konfigurasi Supabase

1. Buat proyek di [Supabase](https://supabase.com/dashboard).
2. Buka **SQL Editor** dan jalankan `supabase/schema.sql` untuk membuat tabel dan kebijakan Row Level Security.
3. Jalankan `supabase/admin_monitoring.sql` untuk menambahkan direktori murid, role admin, pencatatan aktivitas, dan RPC yang dilindungi.
4. Salin `.env.example` menjadi `.env.local`, lalu isi Project URL dan anon/public key:

```bash
cp .env.example .env.local
```

5. Untuk GitHub Pages, buat dua **Actions repository secrets**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Di Supabase Authentication → URL Configuration, tambahkan URL situs sebagai Redirect URL:
   `https://canas1257.github.io/web-student-planner/`

Jangan pernah menggunakan `service_role` key di frontend atau GitHub Pages.

## Menetapkan akun admin

1. Daftarkan akun admin melalui halaman register biasa dan verifikasi emailnya.
2. Jalankan perintah berikut di Supabase SQL Editor dengan mengganti alamat email:

```sql
insert into public.admin_users (user_id)
select id from auth.users
where lower(email) = lower('admin@contoh.com')
on conflict (user_id) do nothing;
```

3. Keluar lalu login kembali. Akun tersebut otomatis diarahkan ke Admin Console.

Password admin tidak disimpan di source code, tabel publik, atau GitHub secrets. Admin Console hanya menerima anon key dan JWT akun yang sedang login; operasi sensitif diverifikasi ulang oleh fungsi database.

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

Sumber data utama planner berada di Supabase dan dipisahkan per akun dengan RLS. `localStorage` hanya digunakan sebagai cache per pengguna dan pilihan tema. Admin hanya menerima nama, email, status verifikasi, serta waktu login/belajar; isi tugas, kalender, profil rinci, dan timer tidak ditampilkan pada Admin Console.

“Belajar hari ini” berarti akun menekan kontrol sesi fokus (Mulai, Jeda, Lanjutkan, atau Selesai); ini adalah indikator aktivitas aplikasi, bukan bukti pengawasan fisik bahwa murid benar-benar belajar. Pemblokiran menghentikan akses server dan aplikasi akan memeriksa ulang status saat jendela difokuskan serta setiap 60 detik. Data yang sebelumnya sudah tersimpan di perangkat pengguna tidak dapat ditarik kembali sepenuhnya, sehingga jangan menyimpan informasi sangat sensitif di planner.
