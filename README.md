# B-SPATIAL BANYUWANGI

Monitoring SLS & Bangunan OSM — Banyuwangi, Jawa Timur.

## Stack

| Komponen | Library | Alasan |
|---|---|---|
| Map render | `pydeck` (WebGL) | Jauh lebih kenceng dari folium untuk data besar |
| Geodata | `geopandas` | Standard |
| Format data bangunan | `.parquet` | 5-10x lebih cepat load vs GeoJSON |

---

## Setup

```bash
pip install streamlit geopandas pydeck pyarrow
```

---

## Langkah pertama: Konversi data bangunan

File `osm-building.geojson` (199MB) **tidak di-push ke Git**. 
Setelah clone/download manual, konversi sekali ke parquet:

```python
import geopandas as gpd

gdf = gpd.read_file("data/osm-building.geojson")
gdf.to_parquet("data/osm-building.parquet")
```

Ukuran parquet biasanya ~60-80MB dan load-nya jauh lebih cepat.

---

## Jalankan

```bash
streamlit run app.py
```

---

## Performa

| Mode | Jumlah data | Render |
|---|---|---|
| SLS only | semua polygon | instant |
| + Bangunan | sample 30.000 | ~2-5 detik (WebGL) |
