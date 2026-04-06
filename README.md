# B-SPATIAL BANYUWANGI

Sistem Dashboard Geospasial Interaktif untuk monitoring Sensus, Batas SLS (Satuan Lingkungan Setempat), Bangunan OSM, serta penyebaran masif unit usaha di wilayah Banyuwangi, Jawa Timur.

## Stack & Teknologi

| Komponen | Library | Fitur/Alasan |
|---|---|---|
| Framwork Web | `streamlit` | Reactive UI yang instan untuk Dashboard Data Science. |
| Pengolahan Data | `pandas` & `geopandas` | Vektorisasi Matriks Super Cepat & Kalkulasi Geometri. |
| Web Engine | `pydeck` (WebGL) | Rendering via GPU yang jauh lebih ngebut dari Folium/Leaflet untuk merender ratusan ribu UI titik di browser. |
| Format Data Peta | `.parquet` (PyArrow) | Kompresi data _in-memory_, load tabel 50x lebih cepat dibanding GeoJSON maupun Excel mentah. |

---

## Setup & Instalasi

Pastikan Anda memiliki Python 3.9+ dan jalankan:

```bash
pip install streamlit pandas geopandas pydeck pyarrow fastparquet openpyxl
```

---

## Persiapan Data Cache (*Sangat Penting*)

Agar Peta dapat memuat data besar (bangunan dan usaha) dalam sepersekian detik, kita menggunakan arsitektur *Parquet Cached*. Lakukan tahap ini seusai instalasi:

### 1. Bangunan OSM
File `osm-building.geojson` (199MB) disarankan dikonversi ke Parquet menjadi `osm-building.parquet`. (Script bawaan `app.py` menanganinya jika file GeoJSON terbaca, tetapi butuh waktu parse diawal).

### 2. Titik Usaha (Sensus)
Aplikasi mendukung auto-update G-Sheets dan pembacaan *Excel Local*, namun untuk performa _production_:
Pastikan Anda meletakkan master data mentah berjudul `uji-coba-peta.xlsx` di dalam folder `data/`.
Lalu jalankan konversi Parquet (Bisa lewat klik 2x bat file, atau jalankan command):

```bash
# Untuk Pengguna Windows:
Update Data Parquet B-Spatial >> Klik Ganda file "update_data_parquet.bat"

# Untuk macOS / Linux via terminal:
python -c "import pandas as pd; df=pd.read_excel('data/uji-coba-peta.xlsx'); df['nama final'] = df['nama final'].astype(str); df['alamat final'] = df['alamat final'].astype(str); df['idsls final'] = df['idsls final'].astype(str); df.to_parquet('data/uji-coba-peta.parquet');"
```

---

## Jalankan Aplikasi

Setelah *Environment* teraktivasi dan modul siap, mainkan server-nya:

```bash
streamlit run app.py
```

---

## Matrix Performa Rendering

Sistem ini didesain agar _browser_ Anda tidak kehabisan nafas. Berikut hasil estimasi performa:

| Layar / Layer Aktif| Konfigurasi & Jumlah Data | Kecepatan Pemuatan (Load) |
|---|---|---|
| **SLS Sahaja** | Poligon Penuh Se-Banyuwangi | Instan / Kedipan Mata |
| **SLS + Titik Usaha** | 100% Full Data (Seluruh Baris Excel) | **Sangat Cepat** - Diatasi Pemangkasan Payload & Vektorisasi Pandas |
| **+ Mode Bangunan OSM** | *Sampled* di 30.000 struktur | ~2-3 detik saja (WebGL hardware acceleration) |

---

_Project B-Spatial dibangun untuk merevolusi visualisasi skalabilitas besar BPS/Pemerintah Daerah secara cerdas._
