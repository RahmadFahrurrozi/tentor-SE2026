# Progress Tracking: Auth & Portal Gateway

## 🏁 Backend Setup (Supabase) - Done
- [x] Rancang Skema Database (`profiles`, `master_wilayah`, `assignments`)
- [x] Setup RLS (Row Level Security) awal
- [x] Setup Auth Trigger (Auto-create profile)
- [x] Import Data Master Wilayah (220 Desa) via Python script
- [x] Generate TypeScript Types dari Database

## 🏗️ Frontend Portal (React + Vite) - Next
- [ ] **Setup Auth Context**
    - State management untuk session user
    - Listener untuk perubahan status auth (login/logout)
- [ ] **Implementasi Routing**
    - Protected Routes (Guard)
    - Public Routes (Login)
- [ ] **Halaman Login**
    - UI Premium dengan Tailwind/Shadcn
    - Integrasi dengan Supabase Auth
- [ ] **Admin Dashboard**
    - Manajemen User (List & Status)
    - Fitur Bulk Upload Excel (Registrasi 5000 user)
- [ ] **Halaman Petugas (Gate)**
    - Verifikasi penugasan wilayah
    - Redirect aman ke Streamlit Dashboard

## 🔗 Integration with Streamlit
- [ ] Integrasi Token-based Auth di `app.py`
- [ ] Filter data otomatis berdasarkan Desa penugasan
