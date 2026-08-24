# RuangBelajar — Web Student Planner

Planner pelajar responsif untuk mengatur tugas, jadwal belajar, dan target pribadi dalam satu tempat.

## Fitur

- Dashboard dengan statistik belajar, prioritas tugas, jadwal terdekat, streak, dan progres mingguan.
- Manajemen tugas dengan urutan tenggat otomatis, filter aktif/selesai, pencarian, dan status selesai.
- Kalender tahunan dengan jadwal sekali, harian, mingguan, atau bulanan.
- Profil siswa, tujuan belajar, target jam harian, dan ringkasan pencapaian.
- Penyimpanan otomatis di `localStorage`; tidak membutuhkan akun atau backend.
- Tampilan responsif untuk desktop, tablet, dan ponsel.

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
