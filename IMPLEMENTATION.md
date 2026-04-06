# 🛠️ B-SPATIAL BANYUWANGI — Implementation Plan
> Fitur: Deteksi & Tracking Status Bangunan (Usaha vs Rumah Tangga) per SLS
> Prioritas: **Akurasi** — semua data masuk, tidak ada sampling

---

## 🎨 Desain Warna

| Elemen | Warna | HEX | Keterangan |
|---|---|---|---|
| Bangunan Usaha | 🟠 Oranye | `#FFA500` | Ada titik usaha di dalamnya |
| Bangunan Rumah Tangga | 🔵 Biru BPS | `#0072BC` | Ada titik rumah tangga, tidak ada usaha |
| Bangunan Kosong | ⬜ Abu-abu | `#808080` | Tidak ada titik apapun (diabaikan dari metrik) |
| Titik Usaha (ScatterPlot) | 🟠 Oranye | `#FFA500` | Tetap seperti sekarang |

### Konversi ke format RGBA PyDeck:
```
#FFA500 → [255, 165, 0, 200]   ← Oranye usaha
#0072BC → [0, 114, 188, 200]   ← Biru BPS rumah tangga
#808080 → [128, 128, 128, 100] ← Abu-abu kosong (transparan)
```

---

## 📋 Task List

### FASE 1 — Persiapan Data
> Sebelum nulis kode apapun, data harus siap dulu

- [ ] **TASK 1.1** — Terima file data Rumah Tangga dari atasan
  - Pastikan ada kolom: `lat final`, `long final`, `idsls final`
  - Cek formatnya (Excel / CSV / JSON?)

- [ ] **TASK 1.2** — Cek CRS data Rumah Tangga
  - Jalankan `print(gdf.crs)` atau cek kolom lat/lon
  - Pastikan koordinatnya masuk akal (lat sekitar -8, lon sekitar 114)

- [ ] **TASK 1.3** — Konversi data Rumah Tangga ke Parquet
  - Data ~500k baris → wajib Parquet supaya load cepat
  - Simpan ke `data/rumah-tangga.parquet`
  - Validasi: jumlah baris sebelum dan sesudah konversi harus sama
  ```python
  # Script konversi sederhana
  import pandas as pd
  df = pd.read_excel("data/rumah-tangga.xlsx")  # atau .csv
  df.to_parquet("data/rumah-tangga.parquet", index=False)
  print(f"Tersimpan: {len(df):,} baris")
  ```

- [ ] **TASK 1.4** — Cek OSM Building apakah sample 30k perlu dihapus
  - Saat ini kode membatasi 30.000 bangunan secara acak
  - Karena prioritas akurasi → **hapus batas sampling**
  - Tapi perlu diuji dulu: berapa total bangunan OSM Banyuwangi?
  - Kalau > 100k pertimbangkan optimasi lain (bukan sampling)

---

### FASE 2 — Pre-processing Offline (Optimasi Performa)
> Memindahkan komputasi spatial join 500k data keluar dari `app.py` agar server/RAM tidak jebol.

- [ ] **TASK 2.1** — Buat script `preprocess_bangunan.py`
  - Load OSM Building Parquet secara penuh (tanpa sampling).
  - Load titik Usaha dan titik Rumah Tangga (ubah ke format GeoDataFrame).
  - Lakukan Spatial Join (`sjoin`) antara Bangunan dengan Rumah Tangga dan Usaha.
  
- [ ] **TASK 2.2** — Penyaringan & Pewarnaan di Pre-processing
  - Tandai status bangunan (Ada Rumah Tangga, Ada Usaha, Jumlah Usaha).
  - **Data Purging**: Buang bangunan "kosong" (tidak ada RT dan Usaha) dari hasil join agar ukurannya super ringan.
  - Simpan format hasil yang sudah difilter: `data/bangunan-terklasifikasi.parquet`.
  - Beri warna final langsung (Oranye untuk Usaha `[255,165,0]`, Biru untuk RT `[0,114,188]`).

- [ ] **TASK 2.3** — Hapus logic join di `app.py`
  - Di fungsi `load_building` pada `app.py`, ganti target load dari OSM Mentah ke file jadi `bangunan-terklasifikasi.parquet`.
  - Hapus limit 30k sampling OSM.

---

### FASE 3 — Integrasi UI & Pencegahan Browser Crash

- [ ] **TASK 3.1** — Tambah layer bangunan ke peta PyDeck
  - Polygon bangunan ditampilkan dengan pewarnaan yang sudah pre-calculated.
  - Pickable = True supaya bisa diklik.

- [ ] **TASK 3.2** — Implementasi Render Bersyarat (LOD/Level of Detail Constraint)
  - Untuk mencegah *browser out of memory* saat merender file bangunan seluruh Kabupaten:
  - **Syarat rendering**: Polygon bangunan hanya muncul saat var filter kecamatan / desa **tidak sama dengan `"Semua"`**.
  - Tampilkan warning `st.warning("Silakan pilih spesifik Kecamatan untuk memunculkan blok bangunan demi menjaga kestabilan Map")` saat view masih di luar wilayah spesifik.

- [ ] **TASK 3.3** — Tambah checkbox & legenda
  - Tambahkan checkbox Layer Bangunan.
  - Tambah Legenda / Tooltip info Bangunan.
  - Sinkronkan metrik perhitungan jumlah terdata/semua.

---

### FASE 4 — Testing & Validasi

- [ ] **TASK 4.1** — Test performa load data
  - Ukur waktu load data Rumah Tangga 500k baris
  - Ukur waktu spatial join Rumah Tangga → Building
  - Kalau > 30 detik → perlu optimasi (misal: filter per SLS dulu sebelum join)

- [ ] **TASK 4.2** — Validasi kebenaran intersek
  - Pilih 1 SLS tertentu
  - Cek manual: apakah bangunan yang ditandai oranye memang ada usahanya?
  - Cek manual: apakah hitungan total bangunan masuk akal?

- [ ] **TASK 4.3** — Test filter wilayah
  - Pilih kecamatan → metrik berubah sesuai wilayah?
  - Pilih desa → metrik berubah sesuai wilayah?
  - Kembali ke "Semua" → metrik kembali ke total?

- [ ] **TASK 4.4** — Test edge case
  - SLS yang tidak ada usahanya sama sekali → tampil semua biru?
  - Bangunan yang ada 2+ usaha di dalamnya → tetap oranye?
  - Data dengan koordinat kosong/null → tidak crash?

---

### FASE 5 — Deploy ke Streamlit

- [ ] **TASK 5.1** — Pastikan semua file data tersedia di server
  - `data/rumah-tangga.parquet` ✅
  - `data/osm-building.parquet` ✅
  - `data/sls-after-ea-sls-2024.json` ✅
  - `data/peta-kabupaten-banyuwangi.geojson` ✅

- [ ] **TASK 5.2** — Pastikan `requirements.txt` lengkap
  - `geopandas`
  - `pyarrow` (untuk Parquet)
  - `streamlit`
  - `pydeck`
  - `pandas`

- [ ] **TASK 5.3** — Push ke repository & deploy
  - Test di Streamlit Cloud / server production
  - Cek memory usage — spatial join 500k data bisa berat di server

- [ ] **TASK 5.4** — Monitor performa setelah deploy
  - Apakah cache bekerja dengan baik?
  - Apakah ada timeout saat pertama kali load?

---

## ⚠️ Batasan & Risiko

| Risiko | Kemungkinan | Solusi |
|---|---|---|
| Spatial join 500k rumah tangga × OSM building lambat | Tinggi | Jalankan di background, tampilkan loading spinner |
| OSM Building tidak lengkap (ada bangunan yang tidak ada di OSM) | Sedang | Terima sebagai limitasi, catat di dokumentasi |
| Koordinat rumah tangga tidak akurat (jatuh di luar bangunan) | Sedang | Gunakan `predicate="within"` → kalau tidak masuk bangunan, diabaikan |
| Memory server tidak cukup untuk 500k data | Sedang | Konversi kolom yang tidak perlu di-drop sebelum spatial join |
| Bangunan OSM tanpa sample 30k → render browser berat | Rendah | Uji dulu, kalau berat pakai simplify geometry |

---

## 📁 Struktur File yang Akan Berubah

```
data/
├── osm-building.parquet          ← sudah ada, hapus batas 30k
├── rumah-tangga.parquet          ← BARU, konversi dari Excel/CSV
├── sls-after-ea-sls-2024.json   ← tidak berubah
├── peta-kabupaten-banyuwangi.geojson ← tidak berubah
└── uji-coba-peta.parquet         ← tidak berubah (data usaha)

app.py (atau main script)
├── load_rumah_tangga()           ← BARU
├── hitung_status_bangunan()      ← BARU
├── join_bangunan_ke_sls()        ← BARU
└── [fungsi lama tidak diubah]
```

---

## 🚦 Urutan Pengerjaan yang Disarankan

```
FASE 1 (Persiapan Data)
    → Tunggu data Rumah Tangga dari atasan
    → Konversi ke Parquet
    → Validasi data
        ↓
FASE 2 (Fungsi Inti)
    → Koding fungsi-fungsi baru
    → Test di lokal dulu
        ↓
FASE 3 (Integrasi UI)
    → Sambungkan ke tampilan Streamlit
    → Test UI
        ↓
FASE 4 (Testing)
    → Validasi kebenaran data
    → Test performa
        ↓
FASE 5 (Deploy)
    → Upload ke server
    → Monitor
```

---

> Dibuat berdasarkan hasil diskusi perencanaan fitur B-SPATIAL Banyuwangi.
> Warna: Usaha `#FFA500` | Rumah Tangga `#0072BC`
> Prioritas: Akurasi — semua data masuk tanpa sampling.
