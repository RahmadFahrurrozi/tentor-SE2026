# Panduan Update Data B-Spatial

Berikut adalah mekanisme urutan penarikan data untuk aplikasi `B-Spatial Banyuwangi`. Saat ini, sistem diprogram untuk memprioritaskan performa (kecepatan), sehingga ia akan mengutamakan format file cache `.parquet` terlebih dahulu. 

Jika Anda ingin memperbarui (update) data asli di masa mendatang, ikuti salah satu dari 3 skenario berikut, sesuai dengan kebutuhan!

---

### Skenario 1: Data Fix Menggunakan Google Sheets (Sistem _Live & Praktis_)
Jika Anda menaruh data akhir Fix Anda secara online di Google Sheets (pada variabel `GSHEET_URL`):

1. Hapus file `data/uji-coba-peta.parquet` dan `data/uji-coba-peta.xlsx` (jika tidak dipakai).
2. Sistem akan *otomatis berpindah* untuk membaca dari URL Google Sheets Anda. 
3. *Note:* Di dalam kode (`app.py`), telah ditetapkan batas memori sinkronisasi online sebesar **5 menit** (`ttl=300`). Artinya tiap kali ada perubahan di sel GSheets, perubahan itu otomatis akan tampil di Peta dalam waktu sekian menit!

<br>

### Skenario 2: Update Lewat Excel Lokal Biasa (Cepat & Manual PC)
Gunakan opsi ini jika Anda malas menaruh data di Internet dan sekadar ingin "meniban/me-replace" file Excel di laptop ini setiap kali ada perubahan:

1. **Wajib:** Hapus/buang file `data/uji-coba-peta.parquet`.
2. Timpa (*replace*) file `data/uji-coba-peta.xlsx` dengan file tipe Excel Anda yang baru.
3. Reload browser atau klik tombol **"Refresh Data Sekarang"** di barisan tombol _Sidebar_ kiri aplikasi Anda, maka titik usahanya akan disegarkan.

<br>

### Skenario 3: Production/Rilis Publik (Sangat Direkomendasikan)
Ini adalah opsi **performa paling maksimal**. Gunakanlah saat ini bila datanya sudah sangat FIX dan akan dilihat oleh banyak publik, supaya _browser_ atau server PC tidak kepanasan:

1. Timpa/Letakkan file Excel (yang Anda jamin 100% Fix) ke jalur aslinya: `data/uji-coba-peta.xlsx`.
2. **Klik-Ganda (Double Click) file >> `update_data_parquet.bat` <<** yang ada di folder ini.
3. Terjadi proses ekstraksi *Background* kecil-kecilan.
4. Python otomatis menyesuaikan tipe datanya dan sistem Parquet terbentuk, sehingga Peta siap di-_loading_ kembali dengan hitungan **SUPER NGEBUT**!


python -c "import pandas as pd; df=pd.read_excel('data/uji-coba-peta.xlsx'); df['nama final'] = df['nama final'].astype(str); df['alamat final'] = df['alamat final'].astype(str); df['idsls final'] = df['idsls final'].astype(str); df.to_parquet('data/uji-coba-peta.parquet'); print('Sukses!')"
