**Front End**

- [ ] Fix auth session expired on page refresh — user should not be forced to re-login `vo`
- [x] Create Terms of Service page
- [x] Create Privacy Policy page
- [x] Fix loading state flickering during redirect to main app
- [x] Fix login error alert visibility in light mode
- [ ] Refactor `use-auth` hook to use TanStack Query mutations
- [ ] Build User Creation page (Single & Bulk insert)
- [ ] Refactor Terms of Service page (structure/code cleanup)
- [ ] Refactor Privacy Policy page (structure/code cleanup)
- [x] Fix Toast Information UI

_Tambahan (Suggested)_:

- [] replace dumy user management service with real supabase service for user management
- [ ] Create 404 (Not Found) & 500 (Global Error Boundary) pages
- [ ] Build User Management DataTable (dengan TanStack Table untuk pagination & sorting) untuk Admin (Edit data, Hapus akun, Reset password satuan)
- [ ] Tambahkan Button navigasi di Dashboard Streamlit khusus Admin untuk kembali ke halaman User Management di React Portal

**Backend & Security**

- [ ] Support multiple location assignments per PPL/PML `vo`
- [ ] Split coordinate field into two separate variables: `usaha` di klasifikasikan warna kuning dan `keluarga` di kategorikan warna biru `vo`
- [ ] Benchmark database performance under bulk user insert load
- [ ] Define explicit types for user roles to improve type safety and DX
- [ ] Auto-delete OTC token after successful login (currently persists after use)

_Tambahan (Suggested)_:

- [ ] Konfigurasi Supabase RLS (Row Level Security) agar masing-masing PPL/PML benar-benar hanya bisa mengakses data wilayah mereka sendiri di tingkat database
- [ ] Rate limiting untuk login & pembuatan token OTC guna mencegah serangan _brute force_
- [ ] Validasi input ketat (menggunakan Zod server-side) saat bulk insert users agar data kotor tidak masuk DB
- [ ] Handle pencabutan token (Token Revocation) saat sistem force logout

**Deployment / DevOps (Suggested)**

- [ ] Persiapkan Dockerfile untuk `portal` (Frontend) dan `app.py` (Streamlit) agar deployment lebih rapi
- [ ] Manajemen `.env.production` (pemisahan environment development dan production)
