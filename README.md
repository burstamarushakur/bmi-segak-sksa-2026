# BMI & SEGAK SKSA — Supabase Edition

Versi ini menggunakan **project Supabase yang sama dengan Portal Koku** (`Perjumpaan Kokurikulum SKSA`), tetapi storan BMI/SEGAK diasingkan pada objek yang semuanya bermula dengan `segak_`.

## Prinsip pengasingan

Portal Koku kekal sebagai **master murid, kelas dan sesi** melalui table sedia ada `students`, `classes`, `student_enrolments` dan `academic_sessions`. BMI/SEGAK **tidak menulis** ke table-table tersebut.

BMI/SEGAK hanya menulis ke:

- `segak_student_profiles`
- `segak_records`
- `segak_settings`
- `segak_audit_log`
- `segak_legacy_staging` (staging migrasi lama sahaja)

Tiada foreign key daripada table SEGAK ke table Portal Koku. Ini sengaja dibuat supaya operasi BMI/SEGAK tidak boleh menghalang update/delete Portal Koku. `student_id` dan `class_id` disimpan sebagai rujukan/snapshot sahaja.

## Backend yang sudah live

Edge Function `segak-api` sudah dideploy pada project Portal Koku yang sama. Frontend mempunyai fallback URL terus ke function tersebut, jadi `.env` tidak wajib untuk deployment biasa.

API membaca master Koku melalui RPC SEGAK **read-only** dan menggunakan service role di server. RPC SEGAK telah dikeraskan supaya hanya `service_role` boleh execute. Browser tidak mempunyai direct SELECT/INSERT/UPDATE/DELETE pada table `segak_*`.

## Data lama 2026

Migrasi Google Sheet 2026 telah dibuat di server:

- 407 profil murid berjaya dipadankan kepada `student_id` master Portal Koku.
- 407/407 staging row berjaya dipadankan.
- 282 rekod yang benar-benar mempunyai data BMI/SEGAK dimasukkan ke `segak_records`.
- Derived value seperti BMI dikira semula; data lama yang kosong kekal kosong.
- Seed yang mengandungi nama/data murid **tidak dimasukkan dalam repo ini** untuk privasi.

## Fungsi aplikasi

- Pilih sesi 2026, 2027 dan sesi seterusnya berdasarkan `academic_sessions` Portal Koku.
- Senarai kelas dan murid datang terus daripada master Portal Koku.
- Pengisian 1 dan Pengisian 2 disimpan berasingan mengikut `student_id + session_year`.
- Kelas/tahun disimpan sebagai snapshot pada masa ujian supaya sejarah tidak berubah apabila murid naik kelas.
- PDF menggunakan template rasmi Borang SEGAK Sekolah Rendah (BSSR) KPM 2 muka surat.
- PDF seorang murid dan satu kelas disokong.
- Rekod Tahun 4 → Tahun 5 → Tahun 6 digabungkan menggunakan `student_id` stabil.
- MyKid/Sijil Beranak dan telefon penjaga disimpan hanya dalam `segak_student_profiles`, bukan table master Portal Koku.

## Struktur repo

- `src/` — frontend React/Vite.
- `public/templates/borang-segak-bssr.pdf` — template BSSR KPM.
- `supabase/functions/segak-api/` — Edge Function backend.
- `supabase/migrations/001_segak_schema.sql` — schema storan SEGAK yang terasing.
- `supabase/migrations/002_segak_readonly_bridge.sql` — RPC read-only untuk master Portal Koku.

## Deploy frontend ke GitHub

Repo ini boleh terus dipush ke GitHub. Untuk build biasa:

```bash
npm install
npm run build
```

URL API default sudah ditetapkan kepada Edge Function live. Jika mahu override, salin `.env.example` kepada `.env` dan ubah `VITE_SEGAK_API_URL`.

> Jangan masukkan Supabase `service_role` key ke GitHub atau frontend. Repo ini tidak memerlukannya; key tersebut hanya tersedia secara server-side dalam Edge Function runtime.

## Jika backend perlu dipasang semula pada masa depan

Jalankan migration `001_segak_schema.sql`, tetapkan nilai `segak_settings.app_password_sha256` secara server-side (jangan commit hash sebenar ke GitHub), kemudian jalankan `002_segak_readonly_bridge.sql`. Deploy folder `supabase/functions/segak-api` sebagai Edge Function bernama `segak-api` dengan Verify JWT OFF. Function menggunakan custom app-password authentication sebelum apa-apa operasi.
