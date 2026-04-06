# Strategi Optimasi Rendering Data Usaha Berskala Besar

Berdasarkan pengecekan pada direktori `data` dan kode `app.py`, saat ini terdapat beberapa penyebab mengapa titik usaha tidak di-load semua dan membuat proses loading menjadi lambat:
1. **Sampling Data:** Di dalam `app.py`, ada batasan yang disengaja. Jika tanpa filter, data dibatasi (di-sample) hanya *50,000 titik*, dan bila di-filter dibatasi maksimal *200,000 titik*.
2. **Iterasi Lambat pada Python (Bottleneck Server):** Aplikasi saat ini menggunakan `for _, r in df_sample.iterrows():` untuk menyusun list dictionary baru. Proses ini *sangat* lambat di ekosistem Python/Pandas saat berhadapan dengan jutaan baris data, dan mengakibatkan "loading" lama sebelum peta bahkan terkirim ke browser.
3. **Visual Clutter di Browser:** Merender > 200.000 titik dengan `ScatterplotLayer` dan tooltip individu untuk setiap elemen dalam satu waktu bisa memakan banyak memori GPU/CPU pada browser pengguna, menyebabkan "lag".

## Proposed Changes

Untuk menyelesaikan masalah performa dan menampilkan *semua data* dengan lancar, berikut adalah strategi teknis yang akan diimplementasikan:

### 1. Vectorized Pandas (Hapus Iterrows)
Kita akan menghapus iterasi per-baris (`iterrows()`) dan menggantinya dengan operasi vektorisasi langsung pada DataFrame Pandas. PyDeck dapat menerima data berupa `pandas.DataFrame` secara langsung, yang diproses di balik layar dengan standar Apache Arrow. Proses mapping data dari server ke browser akan jauh lebih cepat.

#### [MODIFY] [app.py](file:///c:/Users/Acer/Desktop/b-spatial/app.py)
- Refactor pada blok *Layer Titik Usaha* untuk memproses kolom warna (dari `gc_to_color`), `tooltip`, dll secara _vectorized_ atau dengan pemetaan pandas massal.
- Hapus limit/sampling `50_000` dan `200_000` sehingga seluruh data titik dapat disiapkan tanpa hambatan.

### 2. Implementasi Visualisasi Berjenjang (Level of Detail)
Memaksakan semua titik individu dan tooltip-nya tampil saat zoom masih di level pandangan kabupaten akan memberatkan browser (DOM / WebGL limits).
- Kita akan menggunakan **Pydeck optimization** seperti properti radius yang dinamis (titik mengecil saat zoom out), dan yang lebih efisien membuang/menyembunyikan render tooltip jika data tidak di-pick.
- Alternatifnya: Kita membiarkan Layer berbasis Scatterplot dengan fitur **Pydeck auto-batching DataFrame**. Seluruh titik bisa dikembalikan ke browser, tetapi kita matikan iterasi render berat dengan langsung bypass properties Pydeck (e.g. `get_fill_color= [r,g,b]`, dll).

### 3. Penggunaan File Cache Cepat (Backend)
Saat tidak terhubung ke excel, memuat data 17MB+ setiap refresh cukup memberatkan Pandas/Streamlit walaupun di-cache. Saran: jika tidak menggunakan G-Sheet interaktif sepenuhnya di production, dump-lah file ke `.parquet`. Tapi untuk case logic ini, cache `load_usaha()` sudah cukup (`@st.cache_data`) selama logika pandas disederhanakan.

## Open Questions

> [!IMPORTANT]
> Terdapat beberapa pertanyaan untuk dikonfirmasi sebelum kita mulai merubah kode:
> 1. Apakah Anda setuju untuk menghapus _loop iterrows_ dan menggunakan metode vektorisasi pada pandas agar titik loading tidak lama?
> 2. Ketika semua data nanti ter-render, apakah Anda ingin mengatur batas otomatis render titik agar pada saat peta di "zoom out" penuh browser tidak melambat? (Misalnya menggunakan visual radius yang mengecil sesuai zoom).
> 3. Apakah ini masih sebatas pengetesan menggunakan excel (`uji-coba-peta.xlsx`) atau format excel ini perlu diubah saja sementara menjadi Parquet agar file menjadi ringkas dan bisa diload kurang dari 1 detik?
