# Diskusi Lanjutan: Supabase Pause & Ketersediaan Data Wilayah Lokal

Pertanyaan Anda sangat kritis dan bagus. Kesiapan arsitektur memang harus dipikirkan sampai ke *worst-case scenario* nya.

## 1. Project Supabase Pause (Mati) Jika Tidak Aktif Seminggu?
Benar sekali, ini adalah aturan dari *Free Tier* Supabase. Jika tidak ada *request* sama sekali ke API selama 7 hari berturut-turut, *database* akan tertidur (paused).
*   **Apakah Aman & Bagaimana Mengatasinya?** Sangat aman dan sangat mudah diatasi. 
    1.  Secara natural, selama PPL/PML masih jalan ke lapangan, hit API pasti terjadi tiap ada yang login.
    2.  Jika aplikasi sedang libur panjang (misal masa sensus selesai), Supabase mungkin tertidur. Kalau tertidur, untuk membangunkannya cuma butuh waktu **1 menit** cukup dengan menekan tombol **"Restore"** di Dashboard Supabase. Data Anda TIDAK akan hilang, hanya dipause.
    3.  **Trik Anti-Pause Otomatis (Cron Job):** Nanti kita bisa setup sesuatu yang namanya *Cron-Job* (layanan gratis di internet seperti `cron-job.org` atau *GitHub Actions*) yang tugasnya mengetuk ("Ping") API Supabase Anda setiap 3 hari sekali secara otomatis di belakang layar. Dengan fitur ini, *project* Supabase Anda akan **hidup 24/7 selamanya tanpa pernah kena pause**.

## 2. Ketersediaan Data Wilayah (Desa/Kecamatan), Apakah Harus Buat Lagi?
**KABAR BAIK: ANDA TIDAK PERLU MEMBUAT DATANYA DARI AWAL!**

Saya baru saja mencek ke dalam kode referensi Anda (kodingan `app.py` pada baris 209-228), dan ternyata data Anda **SUDAH PUNYA** referensi wilayah tersebut!
File `data/sls-after-ea-sls-2024.json` Anda sudah mengandung kolom-kolom seperti:
*   `nmkec` / `kecamatan` (Nama Kecamatan)
*   `nmdesa` / `desa` / `kelurahan` (Nama Desa)
*   `idsls` / `ID_SLS` (Kode SLS)

**Bagaimana Nanti Cara Kerjanya di Supabase?**
1.  **Tidak Perlu Ketik Manual:** Kita **TIDAK AKAN** membuat sistem manual untuk mengetik ulang ratusan desa di Banyuwangi.
2.  **Skrip Ekstraksi Satu Kali (One-Time Script):** Nanti saya akan buatkan skrip Python kecil (`import_wilayah_to_supabase.py`). Skrip ini akan **membaca** file `sls-after-ea-sls-2024.json` milik Anda, mengekstrak secara otomatis semua nama kecamatan & nama desanya (beserta kodenya), lalu **meng-upload semuanya** secara langsung ke dalam tabel `wilayah` di Supabase Anda!
3.  Ini artinya relasi antara data *User* di Supabase dan file asli `json / parquet` Anda di Streamlit akan "nyambung" secara sempurna karena mengambil Master Data dari file Anda sendiri.

---
Bagaimana? Apakah dengan solusi *Cron Job (Ping API)* dan fakta bahwa *Data Desa Anda sudah komplit* ini menambah keyakinan untuk tancap gas ke langkah selanjutnya?

Jika ya, tahap selanjutnya adalah: **Saya akan membuatkan Daftar Skema Tabel Database (Tabel User, Roles, dan Wilayah) yang harus kita buat nanti di Supabase**. Setuju? Lanjut?
