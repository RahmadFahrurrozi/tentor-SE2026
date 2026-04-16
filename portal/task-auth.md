# Progress Tracking: Auth & Portal Gateway

## 🏁 Phase 1: Backend Setup (Supabase) - Done
- [x] Rancang Skema Database (`profiles`, `master_wilayah`, `assignments`)
- [x] Setup RLS (Row Level Security) awal
- [x] Setup Auth Trigger (Auto-create profile)
- [x] Import Data Master Wilayah (220 Desa) via Python script
- [x] Generate TypeScript Types dari Database

## 🏗️ Phase 2: Frontend Integration (React + Vite)
- [x] **Integrasi Login UI dengan Logic Auth**
    - [x] Hubungkan `portal/src/pages/Login-page.tsx` dengan `useAuth` hook / authService.
    - [x] Hapus hardcode (dummy) login.
- [x] **Setup Auth Context & Protected Routes**
    - [x] Implementasi fitur Loading Overlay sebagai halaman gate.
    - [x] Generate token otc & redirect aman ke Streamlit.
- [ ] **Admin Dashboard**
    - [ ] Manajemen User & Bulk Upload Excel.

## 🔗 Phase 3: Streamlit Auth Verification (`app.py`)
- [x] Membaca `token` (access_token) dari URL parameter.
- [x] Verifikasi token (Supabase auth client) untuk memastikan login valid.
- [x] Ambil data `profile` (Nama & Role) dari database Supabase.
- [x] Tampilkan informasi User di Sidebar Streamlit.
- [x] Tampilkan peringatan/Stop tampilan peta jika tidak login melalui Portal.

## 🗺️ Phase 4: Streamlit Data Filtering (Role-Based)
- [x] Fetch data wilayah tugas user dari tabel `assignments`.
- [x] Implementasikan logika di Sidebar Filter:
    - **Admin**: Bebas pilih Semua Kecamatan dan Desa.
    - **PPL/PML**: Dropdown Kecamatan dan Desa terisi otomatis sesuai wilayah tugas dan tidak bisa diubah (locked to user's assigned region).
- [x] Filter dataset `gdf_sls`, `titik usaha`, dan `bangunan` otomatis ter-restrict berdasarkan relasi tersebut.

# Implementasi Authentication & Authorization (OTC Architecture)

Berdasarkan diskusi dan gambar arsitektur yang Anda lampirkan (OTC - One Time Code), berikut adalah rencana implementasinya.

## 📌 Progress Anda Saat Ini
*   **Database:** Tabel, relasi, dan data master wilayah (Desa, Kecamatan) sudah ada di Supabase. RLS dan Trigger user mungkin juga sudah siap.
*   **Frontend UI:** UI halaman Login `portal/src/pages/Login-page.tsx` sudah sangat bagus dan interaktif. Namun logic autentikasinya masih statis (dummy).
*   **Setup:** React dan library pendukung (Tailwind, Supabase SDK) sudah siap.

## 🛠️ Langkah-langkah Selanjutnya (Mulai Dari Sini)

Kita akan mengimplementasikan alur OTC (One-Time-Code). Tujuannya agar kita bisa berpindah dari portal React ke Streamlit secara aman **tanpa** membocorkan JWT di URL (sangat rentan dicuri).

### Opsi Implementasi OTC: Edge Functions vs Table (Rekomendasi)
Pada gambar yang Anda kirimkan, proses generate dan verifikasi OTC dilakukan di **Edge Function**.
Namun, jika Anda tidak ingin repot melakukan setup Supabase CLI, Deno, dan men-deploy fungsi ke Edge Functions, kita bisa membuat mekanisme yang 100% sama amannya hanya menggunakan **Tabel Supabase biasa (`otc_tokens`)**. Saya menyarankan Opsi 2 (Tabel) untuk mempermudah, namun silakan pilih:

1.  **Opsi 1 (Sesuai Gambar - Edge Functions):** Memerlukan setup Deno, Supabase CLI, dan deployment function.
2.  **Opsi 2 (Alternatif Mudah - Tabel `otc_tokens`):** Portal React menulis `kode_otc` ke tabel (lewat RLS `insert`), lalu Streamlit membacanya lewat *Service Role Key* dan langsung menghapusnya.

*Silakan beri tahu saya opsi mana yang Anda pilih pada "User Review Required" di bawah.*

---

## Proposed Changes

### Database (Supabase)
Sebagai tempat penyimpanan sementara One-Time-Code.

#### [NEW] SQL Script untuk OTC
Mengeksekusi query untuk membuat tabel tempat menampung kode OTC dan JWT.
*   Tabel `otc_session` (token UUID, user_id, jwt_token, expires_at).
*   Otomatis menghapus data lebih dari 30 detik (cron/trigger) atau langsung dihapus saat dibaca Streamlit.

### Frontend Application (React Portal)
Menghubungkan form login ke Supabase dan membuat alur redirect OTC.

#### [MODIFY] [portal/src/pages/Login-page.tsx](file:///c:/Users/zfahr/OneDrive/Desktop/b-spatial-bwi/portal/src/pages/Login-page.tsx)
*   Mengganti logic form dummy dengan `supabase.auth.signInWithPassword`.
*   Setelah login sukses (mendapat token JWT), panggil Edge Function ATAU insert tabel untuk mendapatkan UUID (OTC Code).
*   Redirect user ke `http://localhost:8501/?code=<UUID_OTC>`.

#### [MODIFY] [portal/src/lib/supabase.ts](file:///c:/Users/zfahr/OneDrive/Desktop/b-spatial-bwi/portal/src/lib/supabase.ts)
*   Memastikan auth instance terekspos jika butuh helper tambahan.

### Backend Application (Streamlit)
Menangkap OTC dari URL dan menukarnya dengan akses penuh.

#### [MODIFY] [app.py](file:///c:/Users/zfahr/OneDrive/Desktop/b-spatial-bwi/app.py)
*   Diawal run, baca `st.query_params['code']`.
*   Jika ada `code`, jalankan query/EdgeFunction ke Supabase untuk menukar `code` dengan `jwt_token`.
*   Simpan `jwt_token` dan detail user ke `st.session_state`.
*   Bersihkan URL (`st.query_params.clear()`) agar lebih rapi dan aman.
*   Tambahkan logic Sidebar untuk menampilkan info Petugas, dan me-lock dropdown wilayah sesuai `assignments` (untuk PPL/PML).

---

## User Review Required

> [!IMPORTANT]
> **Keputusan Arsitektur: Edge Function vs Tabel Supabase?**
> Sesuai gambar Anda, menggunakan **Edge Function**. Apakah Anda sudah menginstall/paham Supabase CLI untuk deploy Edge Function?
> Jika belum, saya sangat menyarankan menggunakan arsitektur **Tabel Supabase** saja. Efek keamanannya SAAM (One Time Code dibangkitkan lalu dihapus saat dipakai), namun jauh lebih mudah di-coding dan tidak butuh maintain serverless function. 
> *Mohon konfirmasi, kita pakai Edge Function atau Tabel Supabase?*

## Verification Plan

### Automated Tests
*   Tidak ada test otomatis khusus, akan difokuskan di manual test.

### Manual Verification
1.  Buka Portal React, login menggunakan email & pass yang ada di Auth Database.
2.  Pastikan setelah login berhasil, ada jeda sebentar (loading generate OTC), kemudian browser pindah ke tab Streamlit `localhost:8501/?code=...`.
3.  Di Streamlit, URL code akan langsung hilang, dan profil pengguna (misalnya "Halo, Erik - PPL") akan muncul di Sidebar Streamlit.
4.  Fitur filter dropdown diaktifkan khusus untuk wilayah Erick saja (Dropdown Kecamatan/Desa disable/terkunci).
