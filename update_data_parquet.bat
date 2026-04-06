@echo off
title Update Data Parquet B-Spatial
color 0A

echo ===================================================
echo   Konversi Data Excel B-Spatial ke format Parquet
echo ===================================================
echo.

if not exist "venv\Scripts\python.exe" (
    color 0C
    echo [ERROR] Virtual environment (venv) tidak ditemukan!
    echo Harap jalankan script ini di dalam folder b-spatial yang benar.
    pause
    exit /b
)

if not exist "data\uji-coba-peta.xlsx" (
    color 0C
    echo [ERROR] File data\uji-coba-peta.xlsx tidak ditemukan!
    echo Pastikan Anda sudah menyalin data Excel yang baru ke dalam folder data.
    pause
    exit /b
)

echo Membaca data Excel dan menyesuaikan metadata...
echo Ini mungkin memakan waktu beberapa detik...
venv\Scripts\python.exe -c "import pandas as pd; df=pd.read_excel('data/uji-coba-peta.xlsx'); df['nama final'] = df['nama final'].astype(str); df['alamat final'] = df['alamat final'].astype(str); df['idsls final'] = df['idsls final'].astype(str); df.to_parquet('data/uji-coba-peta.parquet');"

echo.
echo ===================================================
echo [SUKSES] Data uji-coba-peta.parquet berhasil disegarkan!
echo Anda bisa me-refresh aplikasi Streamlit sekarang.
echo ===================================================
pause
