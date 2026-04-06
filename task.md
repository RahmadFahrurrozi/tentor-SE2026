# Checklist Optimasi Rendering Data Usaha

- [x] Konversi Data Excel (`uji-coba-peta.xlsx`) menjadi format data ringkas (`uji-coba-peta.parquet`)
- [x] Ubah Fungsi Data Loader (`load_usaha`) di `app.py` agar mengutamakan file Parquet dari lokal untuk proses *development/testing*.
- [x] Mengganti Loop `iterrows` dengan pola Pandas (Vectorization) pada blok Layer Titik Usaha.
- [x] Menghapus pembatasan limit sampel (200.000 / 50.000) agar semua titik bisa diproses & ter-render seketika.
- [x] Implementasi parameter skala radius otomatis pada Pydeck untuk menjaga kerapian titik (LOD) saat sedang dizoom jauh atau di-zoom out.
