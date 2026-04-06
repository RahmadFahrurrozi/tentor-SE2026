# 📍 B-SPATIAL BANYUWANGI — Planning Fitur Deteksi Bangunan

> Dokumen ini merangkum hasil diskusi perencanaan fitur baru:
> **Deteksi & Tracking Status Bangunan (Usaha vs Non-Usaha) per SLS**

---

## 🎯 Tujuan Fitur

Sistem harus bisa menjawab pertanyaan:

> **"Dalam 1 SLS, ada berapa bangunan? Dan dari sekian bangunan itu, berapa yang sudah terdata usahanya?"**

---

## 📦 Data yang Digunakan

| Data | Format | Fungsi |
|---|---|---|
| Bangunan OSM | Parquet / GeoJSON | Footprint fisik tiap bangunan (polygon) |
| Titik Usaha | Parquet / GSheet | Usaha yang sudah didata petugas (titik koordinat) |
| Titik Rumah Tangga | Parquet / Excel | Sebagai "penanda" bangunan terdeteksi (titik koordinat) |
| SLS | GeoJSON | Batas wilayah administrasi (polygon) |

### Catatan Penting Data

- **OSM Building** = universe semua bangunan fisik, tapi tidak selalu lengkap/up-to-date
- **Titik Rumah Tangga** = hasil pendataan lapangan langsung → lebih akurat untuk mendeteksi bangunan yang memang ada penghuninya
- **Titik Usaha** = usaha yang sudah dikunjungi & didata petugas
- Semua data titik (usaha & rumah tangga) punya kolom: `lat final`, `long final`, `idsls final`

---

## 🔑 Konsep Inti: Peran Masing-masing Data

```
Titik Rumah Tangga
        ↓
Intersek ke Bangunan OSM
        ↓
→ Bangunan yang "terdeteksi" = bangunan OSM yang ada titik Rumah Tangga di dalamnya
  (ini jadi TOTAL BANGUNAN yang dihitung per SLS)
        ↓
Dari bangunan terdeteksi itu, cek: ada titik Usaha di dalamnya?
├── YA  → status = SUDAH TERDATA USAHA ✅
└── TIDAK → status = BELUM TERDATA USAHA ❌
```

### Kenapa Pakai Titik Rumah Tangga sebagai "Penyebut"?

- OSM Building tidak selalu lengkap → bisa ada bangunan yang tidak ada di OSM
- Titik Rumah Tangga adalah hasil survei lapangan langsung → lebih representatif
- Titik Rumah Tangga dipakai untuk "mengaktifkan" bangunan OSM yang relevan
- Bangunan OSM yang tidak ada titik Rumah Tangga di dalamnya = diabaikan dari hitungan

---

## 📊 Logika Status Bangunan (4 Kasus)

| Kasus | Titik Rumah Tangga | Titik Usaha | Status | Warna |
|---|---|---|---|---|
| A | ✅ Ada | ✅ Ada | Sudah Terdata Usaha | 🟢 Hijau |
| B | ✅ Ada | ❌ Tidak ada | Belum Terdata Usaha | 🔴 Merah/Abu |
| C | ❌ Tidak ada | ✅ Ada | Sudah Terdata Usaha | 🟢 Hijau |
| D | ❌ Tidak ada | ❌ Tidak ada | Diabaikan / tidak dihitung | — |

> **Catatan Kasus C:** Titik usaha bisa saja jatuh di bangunan yang tidak ada titik Rumah Tangga-nya (misal: toko baru yang belum masuk data Rumah Tangga). Bangunan ini tetap dihitung sudah terdata usaha.

> **Penentu status = ada tidaknya titik USAHA**, bukan titik Rumah Tangga.
> Titik Rumah Tangga hanya sebagai penentu "bangunan mana yang dihitung".

---

## 🏗️ Kasus Khusus: 1 Bangunan, Banyak Titik

### Multi-Usaha dalam 1 Bangunan
```
┌──────────────────┐
│   BANGUNAN A     │
│  • Usaha Bakso   │  ← 2 titik usaha dalam 1 bangunan
│  • Usaha Laundry │
└──────────────────┘
```
- Bangunan tetap dihitung **1 bangunan**
- Status = **Sudah Terdata** (karena ada minimal 1 usaha)
- Jumlah usaha di dalamnya dicatat untuk info tambahan

### Kemungkinan Penyebab Multi-Titik dalam 1 Bangunan:
1. **Memang beneran beda usaha** (ruko berlantai / bersekat) → wajar
2. **Koordinat tidak akurat** → petugas input koordinat yang sama/berdekatan

> Untuk saat ini: tidak dibedakan, cukup dicatat jumlahnya.
> Bisa jadi bahan analisis kualitas data di tahap berikutnya.

---

## 📐 Flow Teknis (Belum Implementasi)

```
1. load_building()          → load OSM building (Parquet)
2. load_usaha()             → load titik usaha (Parquet/GSheet)
3. load_rumah_tangga()      → load titik Rumah Tangga (Parquet/Excel) [BARU]

4. Spatial join Rumah Tangga → Building
   → Bangunan yang ada titik Rumah Tangga = bangunan "aktif"

5. Spatial join Usaha → Building
   → Bangunan yang ada titik Usaha = sudah terdata

6. Tandai status tiap bangunan:
   → ada_usaha = True/False
   → jumlah_usaha_dalam = 0/1/2/...

7. Join bangunan ke SLS
   → tiap bangunan tahu masuk SLS/kec/desa mana

8. Filter by kec/desa (real-time)
   → gdf_build_display

9. Hitung metrik per wilayah:
   → total_bangunan   = len(gdf_build_display yang aktif)
   → sudah_terdata    = sum(ada_usaha == True)
   → belum_terdata    = total - sudah_terdata

10. Render ke peta (warna berbeda)
    + Tampilkan metrik di dashboard
```

---

## 🎨 Tampilan di Peta

| Elemen | Keterangan |
|---|---|
| Polygon bangunan hijau | Sudah terdata usaha |
| Polygon bangunan merah/abu | Belum terdata usaha |
| Titik usaha | Tetap ditampilkan seperti sekarang |
| Filter kec/desa | Ngaruh ke peta + metrik bangunan |

---

## 📈 Metrik yang Ditampilkan

Per wilayah yang dipilih (kab/kec/desa):

```
┌──────────────────┬──────────────────┬──────────────────┐
│  Total Bangunan  │ Sudah Terdata    │ Belum Terdata    │
│      150         │      45          │      105         │
└──────────────────┴──────────────────┴──────────────────┘
```

---

## ⚠️ Hal yang Perlu Diperhatikan saat Implementasi

1. **Performa** — spatial join bisa berat, semua join dilakukan sekali lalu di-cache dengan `@st.cache_data`
2. **Format data Rumah Tangga** — pastikan kolom `lat final`, `long final`, `idsls final` tersedia (sama seperti data usaha)
3. **Parquet** — data Rumah Tangga sebaiknya dikonversi ke Parquet dulu sebelum dipakai di production
4. **OSM Building** — masih pakai sample 30k, perlu dikaji apakah cukup representatif per SLS
5. **CRS** — semua data harus di-reproject ke EPSG:4326 sebelum spatial join

---

## 🚧 Status

| Item | Status |
|---|---|
| Data Usaha | ✅ Sudah ada |
| Data Bangunan OSM | ✅ Sudah ada (Parquet) |
| Data Rumah Tangga | ⏳ Minta ke atasan |
| Implementasi kode | ⏳ Menunggu data Rumah Tangga |
| Testing | ⏳ Belum |

---

> Dibuat berdasarkan hasil diskusi perencanaan fitur B-SPATIAL Banyuwangi.
> Next step: Dapatkan data rumah tangga → konversi ke Parquet → mulai implementasi.
