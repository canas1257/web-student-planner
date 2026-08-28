# Deployment notifikasi RuangBelajar

Dokumen ini sengaja tidak memuat API key, service-role key, private key, password, atau secret scheduler.

## Prasyarat

- Supabase CLI sudah login pada mesin operator.
- Proyek sudah di-link ke project ref yang benar.
- Firebase Cloud Messaging API (HTTP v1) aktif.
- File service-account Firebase berada di path lokal privat dengan izin `0600`; jangan salin ke repository.
- `google-services.json` Android berada lokal di `android/app/google-services.json` dan diabaikan Git.

## 1. Pasang schema

Jalankan berurutan melalui Supabase SQL Editor atau migration workflow yang telah direview:

1. `supabase/schema.sql`
2. `supabase/admin_monitoring.sql`
3. `supabase/notifications.sql`

Verifikasi:

- Empat tabel notifikasi memiliki RLS aktif.
- `authenticated` tidak memiliki akses langsung ke `push_subscriptions`.
- `claim_notification_jobs(integer)` hanya dapat dijalankan `service_role`.
- Akun biasa gagal memanggil `admin_create_announcement`.
- Akun admin berhasil membuat satu pengumuman uji.

## 2. Pasang Edge Function sender

Gunakan tiga Edge secrets:

- `FIREBASE_SERVICE_ACCOUNT`: seluruh JSON service-account dalam satu nilai secret.
- `NOTIFICATION_CRON_SECRET`: nilai acak minimal 32 byte, berbeda dari seluruh key lain.
- `APP_URL`: `https://belajarteratur.web.id/`.

`SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` disediakan otomatis oleh runtime Supabase. Jangan meletakkannya di frontend.

Deploy fungsi dengan verifikasi JWT platform dimatikan karena fungsi memverifikasi header `x-cron-secret` sendiri:

```bash
supabase functions deploy send-notifications --no-verify-jwt
```

Gunakan `supabase secrets set --env-file <file-privat>` agar private key tidak muncul di shell history atau process arguments. Hapus file sementara segera setelah secret berhasil dipasang.

## 3. Pasang scheduler

Buat dua Vault secrets melalui Supabase Dashboard:

- `notification_sender_url`: URL fungsi `send-notifications` proyek.
- `notification_cron_secret`: nilai yang sama dengan Edge secret `NOTIFICATION_CRON_SECRET`.

Setelah keduanya ada, jalankan `supabase/notification_cron.sql`. Job bernama `process-ruangbelajar-notifications` akan berjalan setiap menit.

Jangan mengganti `notification_cron_secret` pada satu sisi saja. Rotasi harus memperbarui Edge secret dan Vault secret secara berurutan dalam maintenance window singkat.

## 4. Uji end-to-end

1. Login dengan akun murid uji di PWA.
2. Tekan **Aktifkan notifikasi**; jangan meminta izin sebelum tindakan ini.
3. Pastikan satu token aktif tersimpan untuk user/perangkat tersebut.
4. Buat tugas dengan tenggat uji atau buat pengumuman dari akun admin.
5. Pastikan job berpindah `pending → sending → sent`.
6. Uji notifikasi saat PWA foreground, background, dan tertutup.
7. Uji Android foreground/background serta tap notifikasi menuju halaman yang benar.
8. Logout, lalu pastikan subscription perangkat dihapus dan token native/web di-unregister.
9. Blokir akun uji; pastikan job milik akun itu tidak lagi diklaim.
10. Uji token invalid dan pastikan `push_subscriptions.enabled` berubah menjadi `false`.

## 5. Release Android

APK debug pengujian tidak boleh disebut release produksi. Setelah smoke test pada perangkat nyata diterima:

- buat keystore release di lokasi privat di luar repo;
- jalankan lint/release build dengan signing environment yang fail-closed;
- hasilkan APK dan AAB;
- verifikasi signature, package ID, version, status non-debuggable, ZIP integrity, ukuran, dan SHA-256;
- uji final release APK pada perangkat nyata sebelum distribusi.
