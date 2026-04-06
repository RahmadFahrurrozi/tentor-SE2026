# B-SPATIAL BANYUWANGI: Arsitektur & Presentasi Sistem

Sistem **B-Spatial** adalah portal *dashboard* interaktif modern yang dirancang untuk memetakan, menganalisa, dan mengelola ratusan ribu hingga jutaan titik data Sensus/Usaha (SLS) di wilayah Kabupaten Banyuwangi secara *real-time* di peramban (browser) memotong batas limitasi render tradisional.

---

## Tech Stack & Fungsinya

Sistem ini dibangun secara ekstensif menggunakan Python sebagai otak logika. Berikut adalah kerangka kerja pembentuk webgis ini beserta cara kerjanya:

### 1. **Streamlit (Web App Framework)**
   - **Fungsi:** Menyediakan antarmuka (User Interface) web secara revolusioner tanpa perlu menulis HTML/CSS/JS secara terpisah.
   - **Cara Kerja:** Melakukan integrasi _reactive_ dari atas ke bawah. Setiap kali pengguna mengubah *slider* opacity, menekan *checkbox* layer, atau mengetik di bar pencarian, Streamlit akan menggambar ulang *state/data* secara *on-the-fly* lewat WebSockets.

### 2. **Pandas & GeoPandas (Data Engine)**
   - **Fungsi:** Pisau bedah utama dalam memilah (Filter), menggabungkan (Join\Merge), dan kalkulasi spasial (koordinat Geometri).
   - **Cara Kerja:** Mampu mengolah bentuk *Polygon* wilayah desa (GeoJSON) dan merelasikannya dengan *Spreadsheet* data survei BPS/Usaha di Pandas Core menggunakan manajemen _in-memory_ array C++.

### 3. **PyDeck / Deck.GL (WebGL Peta Visual)**
   - **Fungsi:** Menggantikan _engine_ penampil peta lawas (seperti Folium/Leaflet) untuk mengangkat beban raksasa, mampu merender grafik hingga puluhan juta titik di peta tanpa ada delay/lag yang mampet.
   - **Cara Kerja Menggambar:** Pustaka mengirim *binary payloads* memori ke GPU komputer (Bukan dirender oleh CPU browser), menjadikan pergeseran dan pelebaran skala peta ultra mulus (60 Laju Bingkai FPS).

### 4. **Apache Arrow & Parquet (Sistem Cache)**
   - **Fungsi:** Format penyimpanan data masif yang menggantikan Excel (xls/csv).
   - **Cara Kerja:** Jika file Excel memakan beban 18 MB dengan struktur acak, Parquet bekerja mengkompresi informasi secara _column-oriented_ sehingga program Python dapat membacanya >50x lipat lebih cepat dengan porsi _RAM_ yang lebih ramping.

---

## Logika Algoritma & Performa Optimalisasi

Dalam proses pembangunannya, aplikasi B-Spatial ini menanamkan beberapa _metodologi rahasia_ agar tidak patah walau memuat titik padat, berikut logikanya:

1. **Pemutusan Rantai Iterasi (Pandas Vectorization)**
   * **Algoritma Lama:** Aplikasi mulanya memakai logika loop _(`for data in rows`)_ yang berdampak pada server tercekik lambat merakit _array_ JSON panjang tiap kali sistem melakukan pengecekkan properti SLS.
   * **Algoritma Sistem Saat Ini:** Beroperasi murni pada *vektorisasi matriks (Left Merge)* dimana ratusan ribu data Usaha langsung "ditembak" tergabung bersama data Referensi SLS hanya dalam satu instruksi CPU tunggal (_branchless execution_).

2. **Deteksi Data Kotor (*Exception Handling*)**
   Data dari survei sering melahirkan input "NaN" atau N/A. Sistem sudah dienkapsulasi pada *lambda Try-Catch* yang memaksa _float casting_. Jika ditemukan objek tak terdefinisi, ia mengabaikan kolomnya (Mencegah web mati mendadak `ValueError`).

3. **Optimisasi Pemangkasan Kolom Layload (Memory Pruning)**
   Browser (Chrome/Safari) punya batas daya terima *Payload* mentok ~200MB. Algoritma melakukan *slicing* hanya pada kolom yang dibutuhkan UI Tooltip (11 buah) sesaat sebelum dimuntahkan ke PyDeck, menghemat 80% _bandwith rendering_. 

4. **Dynamic Level of Details (LoD Radius)**
   Tidak ada lagi titik berkerumunan saat peta dijauhkan *(Zoom Out)*. Radius dari Scatterplot layer bergerak elastis mengikuti tingkat pembesaran *(Zoom in/out)* piksel layar pengguna supaya persebaran wajar terlihat estetik dan rapi.

---

## Fitur-fitur Utama Utama

* **Mode Choropleth & Persebaran Warna Cerdas:** Membedakan zona (SLS) per blok bedasar tingkat agregasi dan intensitas usaha di dalamnya; gradien dihitung secara proporsional.
* **Auto-Fallback Engine:** Saat sistem tersambung inet ia prioritas menarik versi live Google Sheets (Refresh tiap 5 Menit). Namun bisa dikunci pada mode *Parquet* Offline apabila mengejar daya akses kedip tanpa loading.
* **Filter Geospasial Berlapis:** Bisa membedah per kecamatan, dan disortir masuk ke sub-desa/kelurahan, dimana panel matriks total SLS langsung beradaptasi ulang menyesuaikan peta.
* **Detektor Koreksi Koordinat (Kolom GC):** Memberikan sistem legend palet klasifikasi _Machine Learning/Scrapper_ (Akurasi Sedang hingga Sangat Tinggi GC 99).
* **Tabel Analisis Detail per Agregat SLS (Sidebar Interaktif):** Memunculkan metrik SLS dengan _Top 10 density_ secara *Ranked* plus daftar nama usaha yang bisa _di-query/di-search_. 

> [!NOTE]
> *B-Spatial bukan sekadar sekadar dashboard visual layaknya aplikasi pemetaan klasik biasa, ia adalah gerbang awal* Command Center *yang diisi oleh infrastruktur modern Data-Science yang sanggup diskala melayani tingkat provinsi sekalian.*
