# Walkthrough Optimasi Rendering Titik Usaha

Sesuai dengan rencana implementasi yang disetujui, kami telah melakukan optimasi perombakan besar agar semua data pemetaan usaha dapat tampil sekaligus bebas "lag".

## Changes Made

1. **Konversi Excel ke Parquet (Server-Side Performance)**
   File *dummy* Excel (`uji-coba-peta.xlsx`) milik Anda berukuran nyaris ~18MB telah kami format ulang dan terkompres ke format Apache Arrow yang ter-enkode (*Parquet*). File parquet bisa ditarik ke dalam memori kurang dari satu detik dibanding proses parsing Excel yang memberatkan.
   > [!TIP]
   > Metode `load_usaha()` memprioritaskan read file parquet lokal, namun metode "fallback" ke URL Google Sheets dan file excel tetap dipertahankan jadi Anda masih bebas *refresh* data online ke depannya.

- **Tooltip Overhaul**: Refined the tooltip HTML to remove icons/emojis as requested, maintaining a professional and clean "borderless" table design.
- **New Metrics**: Included **Belum Didatangi** information to monitor progress.
- **Point Hover Fix**: Resolved a bug where point layers (Usaha/RT) were showing SLS-level summaries. Now, hovering over an individual point correctly shows a count of `1` for that specific entity, while SLS-wide metrics (Total Bangunan, etc.) are hidden to distinguish individual records from area summaries.
- **Layer Reordering**: Moved point layers (Scatterplots) to be rendered *after* the building polygon layer. This ensures that points are always on top and remain interactive even when buildings are displayed.

## Final Tooltip Structure

The tooltip now displays:
- **Total Bangunan (OSM)** (For SLS entries)
- **Sudah Didatangi** (For SLS entries)
- **Belum Didatangi** (For SLS entries)
- **Jumlah Usaha** (1 for points, total for SLS)
- **Jumlah Keluarga** (1 for points, total for SLS)

2. **Full Pandas Vectorization untuk PyDeck (Menghilangkan `iterrows`)**
   Sistem penarikan data *(looping barisan per data)* menggunakan dictionary append untuk titik usaha telah dicabut sepenuhnya. Kita menggunakan `left merge` Pandas agar informasi titik Usaha langsung menyerap informasi cluster `SLS`-nya secara utuh per-jutaan baris seketika.

3. **Level of Details dinamis dari PyDeck (Render Semua Titik)**
   > [!IMPORTANT]
   > Batasan render *sampling* yang semula dibatasi di **50.000** titik sekarang sudah **DIHAPUS**.

   - Seluruh titik dapat dirender bersamaan berkat integrasi layer Scatterplot berbasis dataframe utuh. 
   - Properti `radius_max_pixels=15`, `radius_scale`, dan `radius_min_pixels=3` membedakan kerapatan secara visual sehingga browser tidak dibebani menggambar objek besar ketika *zoom* masih menampilkan level Kabupaten.

## What Was Tested

* Kami memasang dependensi kompresi memori (PyArrow & Fastparquet).
* Konversi via script telah dijalankan dan `app.py` sudah tergabung tanpa limit.

## Hasil

Performa sistem harusnya terasa secara signifikan meningkat puluhan kali lipat dari iterasi awal, baik sesaat *load* awal halaman maupun saat perambanan (Zoom dan Panning) peta.

Anda dapat menjalankan aplikasinya seperti biasa. Jika ada galat memori peramban karena memuat titik terlalu sangat luar biasa massif (>500.000 nodes dari hardware pas-pasan), silahkan *share* ke saya agar saya rubah layernya menggunakan ekstensi **HeatmapLayer** murni!
