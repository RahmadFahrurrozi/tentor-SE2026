# Requirement: Authentication & Authorization System (TENTORING SE 2026)

Dokumen ini merangkum kebutuhan arsitektur dan fungsionalitas sistem keamanan untuk portal TENTORING SE 2026.

## 1. Arsitektur Utama
Sistem ini menggunakan arsitektur **Hybrid**:
- **Portal Depan (React + Supabase)**: Berfungsi sebagai gerbang login (Auth Gate) dan dashboard administrasi bagi Admin.
- **Sistem Backend (Supabase)**: Menyimpan data kredensial user, role, dan pembagian wilayah tugas (assignments).
- **Aplikasi Utama (Streamlit)**: Tetap menjadi engine utama visualisasi peta, namun hanya bisa diakses setelah divalidasi oleh "Pintu Depan".

## 2. Manajemen User (Bulk Registration)
Admin tidak mendaftarkan user satu per satu. Sistem harus mendukung pendaftaran massal.
- **Format Input**: File Excel (.xlsx) atau CSV.
- **Kolom File**:
    - `nama_petugas`: Nama lengkap petugas.
    - `email`: Alamat email (sebagai username login).
    - `role`: Peran petugas (PPL, PML, atau Admin).
    - `wilayah`: Daftar wilayah tugas (Desa/Kecamatan), dipisahkan dengan koma jika lebih dari satu.
- **Logika Password Otomatis**:
    Sistem akan men-generate password default dengan pola: `[6 Karakter Pertama Email] + "SE2026"`.
    *Contoh: email `rahmad@gmail.com` -> password `rahmadSE2026`.*

## 3. Matriks Otorisasi (Roles)

| Role | Cakupan Akses | Deskripsi |
| :--- | :--- | :--- |
| **PPL** | Desa Tertentu | Hanya bisa melihat data di 1 atau 2 desa yang ditugaskan. |
| **PML** | Kecamatan/Desa | Bisa melihat data di level Kecamatan atau beberapa Desa di bawah pengawasannya. |
| **Admin** | Nasional/Kabupaten | Akses penuh ke seluruh fitur sistem dan manajemen user. |

## 4. Alur Autentikasi & Redireksi
1.  **Login**: User masuk ke Portal React menggunakan email dan password default.
2.  **Validasi Role**: React mengecek role dan wilayah tugas user dari database Supabase.
3.  **Redirect ke Streamlit**: 
    -   React mengarahkan user ke URL Streamlit.
    -   URL menyertakan identitas aman (JWT Token).
    -   *Contoh:* `app.streamlit.io/?token=JWT_ABC123`
4.  **Verifikasi & Filter**:
    -   Streamlit memverifikasi token ke Supabase.
    -   Streamlit melakukan filter otomatis pada dataframe berdasarkan wilayah tugas user yang terdeteksi di dalam token.

## 5. Fitur Dashboard Admin
Halaman Admin akan memiliki menu khusus yang tidak bisa diakses oleh PPL/PML:
- **Dashboard Overview**: Ringkasan total user, progres wilayah yang sudah ada petugasnya, dan shortcut utama ke sistem Streamlit (Full Access).
- **Manajemen User (Table View)**: 
    - Menggunakan **TanStack Table** untuk pencarian dan filter cepat terhadap 5000+ user.
    - Tombol **Bulk Upload (Excel/CSV)** untuk registrasi massal.
    - Aksi edit wilayah tugas dan reset password.
- **Monitoring Penugasan**: Visualisasi list Kecamatan dan Desa untuk mengecek kekosongan petugas di wilayah tertentu secara real-time.
- **Pintu Akses Utama**: Tombol khusus untuk membuka aplikasi Streamlit utama dengan hak akses full sebagai Admin.

## 7. Mekanisme Pembaruan Data Lapangan (Batch Update)
Sistem tidak mengandalkan input real-time dari PPL di dalam aplikasi, melainkan melalui validasi Admin:
- **Pusat Data Admin**: Admin memiliki halaman khusus untuk mengunggah file hasil sensus terbaru (Excel/CSV).
- **Proses Validasi**: Data yang diunggah akan masuk ke tahap preprocessing (seperti matching koordinat) sebelum dipublikasikan ke peta.
- **Sinkronisasi**: Setelah diproses, seluruh user (PPL/PML) akan melihat versi data "Single Source of Truth" yang sama di peta sesuai unggahan terakhir Admin.

## 8. Kebutuhan Teknis (Tech Stack)
- **Frontend**: Vite + React (TypeScript), Tailwind CSS, Shadcn/UI.
- **State Management**: TanStack Query (fetching data user/wilayah).
- **Form & Validation**: React Hook Form + Zod (untuk handle upload file excel).
- **UI Table**: TanStack Table (untuk manajemen 5000+ user).
- **Backend/Auth**: Supabase (PostgreSQL, GoTrue Auth, RLS).
