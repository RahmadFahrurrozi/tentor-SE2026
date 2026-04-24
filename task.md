# Checklist Optimasi Rendering Data Usaha

- [x] Konversi Data Excel (`uji-coba-peta.xlsx`) menjadi format data ringkas (`uji-coba-peta.parquet`)
- [x] Ubah Fungsi Data Loader (`load_usaha`) di `app.py` agar mengutamakan file Parquet dari lokal untuk proses *development/testing*.
- [x] Mengganti Loop `iterrows` dengan pola Pandas (Vectorization) pada blok Layer Titik Usaha.
- [x] Menghapus pembatasan limit sampel (200.000 / 50.000) agar semua titik bisa diproses & ter-render seketika.
- [x] Implementasi parameter skala radius otomatis pada Pydeck untuk menjaga kerapian titik (LOD) saat sedang dizoom jauh atau di-zoom out.

---

# Checklist Fitur Deteksi Bangunan (Usaha vs Rumah Tangga)

- [x] **FASE 1:** Persiapan Data (Rumah Tangga -> Parquet & Hapus Sampling OSM)
- [x] **FASE 2:** Pre-processing Offline (`preprocess_bangunan.py` & Spasial Join)
- [x] **FASE 3:** Integrasi UI PyDeck (Layer Polygon Bangunan Bersyarat)
- [x] **UI Tambahan:** Menambahkan Tabel Metrik Bangunan di Peta (Total Bangunan, Sudah Terdata, Belum Terdata)

### 🚀 To-Do / In Progress:

**FASE 4 iterasi system revisi atasan**
- [ ] Defiasai titik koordinat dengan bangunan polygon terdekat
- [ ] jumlah yang sudah di datangi itu adalah usaha atau rumah tangga yang sudah di dititiki koordinat
- [ ] tambahkan atribut jumlah keluarga diambil dari data titik koordinat data rumah tangga

**FASE 5 — Testing & Validasi**
- [x] Consolidate imports and remove redundant blocks in `app.py`
- [x] Implement robust cookie retrieval with error handling
- [x] Verify the fix by running the Streamlit app
- [ ] Test performa load data
- [ ] Validasi kebenaran intersek
- [ ] Test filter wilayah
- [ ] Test edge case

**FASE 6 — Deployment Lokal**
- [ ] Pastikan semua file data tersedia di environment lokal
- [ ] Pastikan `requirements.txt` lengkap
*(Catatan: Task 5.3 & 5.4 Deploy Web Server sementara dihapus atas perintah untuk tetap di Lokal)*
