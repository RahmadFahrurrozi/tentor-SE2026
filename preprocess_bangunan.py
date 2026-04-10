import geopandas as gpd
import pandas as pd
import os
import time

def safe_idsls(x):
    if pd.isna(x): return None
    try:
        val = float(x)
        if pd.isna(val): return None
        return str(int(val))
    except (ValueError, TypeError):
        return None

def normalize_columns(df):
    lat_col  = next((c for c in df.columns if "lat"  in c.lower()), None)
    lon_col  = next((c for c in df.columns if "long" in c.lower() or "lon" in c.lower()), None)
    idsls_col = next((c for c in df.columns if "idsls" in c.lower()), None)

    if lat_col and lon_col:
        df = df.rename(columns={lat_col: "lat final", lon_col: "long final"})
    if idsls_col and idsls_col != "idsls final":
        df = df.rename(columns={idsls_col: "idsls final"})

    df = df.dropna(subset=["lat final", "long final"])
    # Konversi float untuk jaga-jaga
    df["lat final"] = pd.to_numeric(df["lat final"], errors="coerce")
    df["long final"] = pd.to_numeric(df["long final"], errors="coerce")
    
    df = df.dropna(subset=["lat final", "long final"])
    df = df[df["lat final"].between(-90, 90)]
    df = df[df["long final"].between(-180, 180)]
    
    if "idsls final" in df.columns:
        df["idsls_str"] = df["idsls final"].apply(safe_idsls)
    else:
        df["idsls_str"] = None

    # Cast object columns to string to avoid pyarrow errors
    for col in df.select_dtypes(include=['object']).columns:
        df[col] = df[col].astype(str)
        
    return df

print("🚀 Memulai Pre-processing Bangunan...")
start_time = time.time()

# 1. Load Data
print("Memuat OSM Building...")
gdf_build = gpd.read_parquet("data/osm-building.parquet")
if gdf_build.crs is None:
    gdf_build = gdf_build.set_crs(epsg=4326)

# Pastikan polygon simplify buat performa yang bagus
# print("Menyederhanakan geometri (simplify) untuk performa...")
# gdf_build["geometry"] = gdf_build.simplify(0.00005, preserve_topology=True)

# index awal reset biar gampang dijoin balik
gdf_build = gdf_build.reset_index(drop=True)
gdf_build['build_idx'] = gdf_build.index

print("Memuat Data Usaha...")
df_usaha = pd.read_parquet("data/uji-coba-peta.parquet")
df_usaha = normalize_columns(df_usaha)
gdf_usaha = gpd.GeoDataFrame(
    df_usaha, 
    geometry=gpd.points_from_xy(df_usaha["long final"], df_usaha["lat final"]),
    crs=4326
)

print("Memuat Data Rumah Tangga...")
df_rt = pd.read_parquet("data/rumah-tangga.parquet")
df_rt = normalize_columns(df_rt)
gdf_rt = gpd.GeoDataFrame(
    df_rt, 
    geometry=gpd.points_from_xy(df_rt["long final"], df_rt["lat final"]),
    crs=4326
)

# 2. Spatial Join dengan DEVIASI (Snap to Nearest)
# Kita pindah ke proyeksi UTM 50S (untuk Banyuwangi) biar bisa ngitung Meter dengan akurat
print(" Melakukan Proyeksi ke UTM 50S (EPSG:32750) untuk perhitungan 2 meter...")
utm_crs = "EPSG:32750"
gdf_build_utm = gdf_build.to_crs(utm_crs)
gdf_usaha_utm = gdf_usaha.to_crs(utm_crs)
gdf_rt_utm    = gdf_rt.to_crs(utm_crs)

def perform_smart_join(gdf_pts, gdf_blg, label="Data"):
    print(f"   Proses Deviasi untuk {label}...")
    # Tahap 1: Yang emang beneran di DALAM (Within)
    join_inside = gpd.sjoin(gdf_pts, gdf_blg, how="inner", predicate="within")
    
    # Identifikasi titik yang belum dapet bangunan
    inside_indices = set(join_inside.index)
    gdf_homeless = gdf_pts[~gdf_pts.index.isin(inside_indices)]
    
    # Tahap 2: Yang di luar tapi DEKAT (Deviasi 2 Meter)
    # sjoin_nearest butuh rtree/pygeos
    # max_distance=2 (dalam satuan meter karena udah UTM)
    join_nearest = gpd.sjoin_nearest(gdf_homeless, gdf_blg, how="inner", max_distance=10)
    
    print(f"      - {len(join_inside):,} titik tepat di dalam bangunan")
    print(f"      - {len(join_nearest):,} titik berhasil ditempel lewat Deviasi (2m)")
    
    # Gabungin hasil
    return pd.concat([join_inside, join_nearest])

print("Melakukan Spatial Join: Usaha -> Bangunan...")
join_usaha = perform_smart_join(gdf_usaha_utm, gdf_build_utm, "Usaha")

print("Melakukan Spatial Join: Rumah Tangga -> Bangunan...")
join_rt = perform_smart_join(gdf_rt_utm, gdf_build_utm, "Rumah Tangga")

# Kumpulkan index bangunan
usaha_build_idx = set(join_usaha['build_idx'].tolist())
rt_build_idx = set(join_rt['build_idx'].tolist())

# JANGAN Buang bangunan kosong sesuai request logic bisnis
valid_build_idx = usaha_build_idx.union(rt_build_idx)
print(f"Total bangunan OSM: {len(gdf_build):,}")
print(f"Total bangunan aktif (ada RT/Usaha): {len(valid_build_idx):,}")
print(f"Tetap mempertahankan {len(gdf_build) - len(valid_build_idx):,} bangunan kosong (berstatus Belum Terdata)...")

# gdf_build = gdf_build[gdf_build['build_idx'].isin(valid_build_idx)].copy()

# 3. Hitung Status dan Warna
def get_color_and_status(b_idx):
    is_usaha = b_idx in usaha_build_idx
    is_rt = b_idx in rt_build_idx
    
    if is_usaha:
        return [255, 165, 0, 200], "Bangunan Usaha"    # Oranye Usaha
    elif is_rt:
        return [0, 114, 188, 200], "Rumah Tangga"      # Biru RT
    else:
        # Keamanan cadangan (tapi harusnya ga muncul karena difilter di atas)
        return [128, 128, 128, 100], "Kosong"

print("Menandai status dan warna pada bangunan...")
status_list = []
color_list = []
for idx in gdf_build['build_idx']:
    c, s = get_color_and_status(idx)
    color_list.append(c)
    status_list.append(s)

gdf_build['status_bangunan'] = status_list
gdf_build['color'] = color_list

# Coba hitung qty usaha per bangunan:
usaha_counts = join_usaha['build_idx'].value_counts().reset_index()
usaha_counts.columns = ['build_idx', 'jml_usaha']
gdf_build = gdf_build.merge(usaha_counts, on='build_idx', how='left')
gdf_build['jml_usaha'] = gdf_build['jml_usaha'].fillna(0).astype(int)

# 4. Tambahkan info SLS
print("Melakukan Spatial Join: Bangunan -> SLS (untuk atribut filter)...")
gdf_sls = gpd.read_file("data/sls-after-ea-sls-2024.json").to_crs(epsg=4326)
# Fix IDSLS str di geojson
id_candidates = ["idsls", "id_sls", "IDSLS", "ID_SLS", "kode_sls", "id"]
sls_id_col = next((c for c in id_candidates if c in gdf_sls.columns), None)
if not sls_id_col:
    non_geom = [c for c in gdf_sls.columns if c != "geometry"]
    sls_id_col = non_geom[0] if non_geom else None

if sls_id_col:
    def norm(v):
        s = str(v).strip()
        return s[:-2] if s.endswith(".0") else s
    gdf_sls["idsls_str"] = gdf_sls[sls_id_col].apply(norm)

# Ambil kecamatan dan desa
kec_col  = next((c for c in ["nmkec", "kec", "kecamatan"] if c in gdf_sls.columns), None)
desa_col = next((c for c in ["nmdesa", "desa", "kelurahan"] if c in gdf_sls.columns), None)

cols_sls = ["geometry", "idsls_str"]
if kec_col: cols_sls.append(kec_col)
if desa_col: cols_sls.append(desa_col)

# sjoin centroid bangunan ke SLS biar cepat
gak_perlu_poly = gdf_build.copy()
gak_perlu_poly["geometry"] = gak_perlu_poly.centroid
join_sls = gpd.sjoin(gak_perlu_poly, gdf_sls[cols_sls], how="left", predicate="within")

gdf_build["idsls_str"] = join_sls["idsls_str"].astype(str)
if kec_col: gdf_build["kecamatan"] = join_sls[kec_col].astype(str)
if desa_col: gdf_build["desa"] = join_sls[desa_col].astype(str)

print("Drop kolom build_idx temporary...")
gdf_build = gdf_build.drop("build_idx", axis=1)

# Simpan hasil!
print("Menyimpan ke Parquet...")
gdf_build.columns = gdf_build.columns.astype(str)
for col in gdf_build.select_dtypes(include=['object']).columns:
    gdf_build[col] = gdf_build[col].astype(str)

gdf_build.to_parquet("data/bangunan-terklasifikasi.parquet", index=False)

end_time = time.time()
print(f"✅ Selesai dalam {end_time - start_time:.1f} detik.")
print(f"File tersimpan di: data/bangunan-terklasifikasi.parquet")
print(f"Sample data:\n{gdf_build[['status_bangunan', 'jml_usaha']].value_counts().head()}")
