# Implementasi Authentication & OTC Architecture (Supabase Table)

Berdasarkan diskusi kita, kita akan menggunakan **Opsi Tabel Supabase (`otc_tokens`)** untuk mengimplementasikan One-Time Code. Metode ini sangat aman dan jauh lebih mudah dikelola dibandingkan Edge Functions.

Menjawab pertanyaan Anda:
1. **Mulai dari mana dulu?** Kita akan mulai dari **Database Supabase** (Membuat tabel OTC, memastikan user test ada), lalu ke React (Portal), dan terakhir ke Python (Streamlit).
2. **Apakah halaman transit itu perlu?** Secara teknis tidak wajib. Sebagai gantinya, kita akan membuat **Loading Overlay / State di Halaman Login**. Saat tombol "Masuk" ditekan dan berhasil, layar akan meredup/muncul loading "Menyiapkan Dashboard...", dan di belakang layar sistem menukar token lalu otomatis berpindah (*redirect*) ke Streamlit. Ini akan terasa lebih mulus dan premium tanpa harus ada halaman kosong "Gate".

## User Review Required

> [!IMPORTANT]
> **Pengecekan Kesiapan Database**
> Sebelum kita mulai ngoding di React, tolong pastikan **Tabel Supabase untuk OTC** sudah dibuat.
> Silakan *copy-paste* dan *RUN* SQL script di bawah ini pada menu **SQL Editor** di dashboard Supabase Anda:
> 
> ```sql
> -- 1. Buat tabel otc_tokens
> create table public.otc_tokens (
>   token uuid default gen_random_uuid() primary key,
>   user_id uuid references auth.users(id) on delete cascade not null,
>   created_at timestamp with time zone default now() not null
> );
> 
> -- 2. Pastikan RLS nyala untuk keamanan
> alter table public.otc_tokens enable row level security;
> 
> -- 3. Policy: User yang login hanya boleh INSERTS token untuk mereka sendiri
> create policy "Users can insert their own otc"
> on public.otc_tokens for insert
> to authenticated
> with check (auth.uid() = user_id);
> 
> -- 4. Policy: Service Role (Streamlit) bebas Read/Delete
> create policy "Service role has full access"
> on public.otc_tokens
> to service_role
> using (true)
> with check (true);
> ```
> *Apakah SQL ini berhasil dijalankan? Jika sudah, kita akan lanjut ke Langkah 2 (React Frontend).*

## Proposed Changes (Step by Step)

### Tahap 1: Setup Database (Action Needed dari Anda)
- Jalankan Query SQL (yang ada pada blok Important di atas) untuk membuat tabel penampung OTC.
- Pastikan di menu tabel `profiles` dan auth users, sudah ada user dummy (misal `erik@gmail.com` dengan role `PPL` dan wilayah tugasnya pada tabel `assignments`).

### Tahap 2: Frontend Aplikasi Portal (React)
- **Komponen Halaman Transit (Ditiadakan)**: Kita ganti dengan Loading Overlay halus pada halaman Login.
- **[MODIFY] `portal/src/pages/Login-page.tsx`**:
  - Ganti hardcode user dummy dengan `supabase.auth.signInWithPassword`.
  - Setelah sukses, insert `user_id` ke tabel `otc_tokens`. Supabase akan mengembalikan `token` (UUID).
  - Tampilkan animasi loading, lalu jalankan perintah `window.location.href = 'http://localhost:8501/?code=' + token;`.
- **[MODIFY] `portal/src/lib/supabase.ts` & `useAuth.ts`**:
  - Memastikan *hook* dan *auth instance* bekerja dengan benar tidak memicu error yang sudah ada.

### Tahap 3: Backend Dashboard (Streamlit / `app.py`)
- **[MODIFY] `app.py`**:
  - Saat aplikasi diload, cek `code` dari URL parameters (`st.query_params`).
  - Bila ada, gunakan *Supabase Service Role Key* untuk mencari UUID tersebut di `otc_tokens`.
  - Jika token valid, hapus UUID agar tidak bisa dipakai 2 kali (One Time).
  - Simpan profil user (`st.session_state.user`) dan tampilkan namanya (serta Rollenya, misal "Halo, Erik - PPL") di sidebar.
  - Implementasikan filter dinamis (`df = df[df['kd_desa'].isin(assignments_desa)]`) bila user bukan Admin.

## Open Questions

> [!TIP]
> **Konfirmasi Desain Halaman**
> Apakah Anda setuju dengan mengubah status **Halaman Transit** menjadi Loading Overlay/Spinner saja di tombol/halaman Login agar desainnya lebih rapi? 

## Verification Plan

### Manual Verification
1.  Buka Portal React (`localhost:5173`).
2.  Login dengan user test menggunakan email & password.
3.  Pastikan ada jeda sebentar (loading "Menyiapkan Dashboard"), kemudian browser pindah ke tab Streamlit `localhost:8501/?code=...`.
4.  Di Streamlit, URL parameter code langsung diclean dan akan muncul profil di Sidebar (Halo Erik - PPL). Akses filter wilayah langsung ter-lock.
