import os
import math
import warnings

import numpy as np
import pandas as pd
import geopandas as gpd

from sklearn.cluster import DBSCAN
from sklearn.neighbors import NearestNeighbors

import folium
from folium.plugins import Fullscreen

warnings.filterwarnings("ignore")


# ============================================================
# KONFIGURASI
# ============================================================

# File input
FILE_SLS = "D:/OneDrive - BPS RI PUSAT/Catatan Pekerjaan/2026/Master Peta SLS Kabko 3500 smt 1 2025/Final_SLS_202513576.geojson"
FILE_TITIK = "geotag_35_3576_20260901021343.csv"

# Kolom pada GeoJSON
SLS_ID_COLUMN = "idsls"

# Kolom pada CSV titik
LAT_COLUMN = "geotag_latitude"
LON_COLUMN = "geotag_longitude"

# ID titik.
# Jika tidak ada kolom ID, program akan membuat otomatis.
POINT_ID_COLUMN = "assignment_id"

# Kolom SLS yang tercatat di CSV
CSV_SLS_COLUMN = "level_5_full_code"
# contoh: CSV_SLS_COLUMN = "level_5_full_code"

# contoh:
# POINT_ID_COLUMN = "id"

# Delimiter CSV
CSV_SEPARATOR = "|"

# ============================================================
# PARAMETER DBSCAN
# ============================================================

# Radius maksimum antar titik untuk dianggap berdekatan
EPS_METERS = 5

# Minimal jumlah titik untuk membentuk cluster
MIN_SAMPLES = 5

# Minimal proporsi titik yang harus masuk cluster
# agar SLS dinyatakan BERGEROMBOL.
#
# Misalnya 0.20 = minimal 20% titik masuk cluster.
MIN_CLUSTER_PERCENT = 0.20

# ============================================================
# OUTPUT
# ============================================================

OUTPUT_DIR = "hasil_analisis_sls"

DIR_CSV = os.path.join(OUTPUT_DIR, "csv")
DIR_MAP = os.path.join(OUTPUT_DIR, "peta")
DIR_MAP_CSV = os.path.join(OUTPUT_DIR, "peta_csv")
DIR_CLUSTER = os.path.join(OUTPUT_DIR, "cluster")

os.makedirs(DIR_CSV, exist_ok=True)
os.makedirs(DIR_MAP, exist_ok=True)
os.makedirs(DIR_MAP_CSV, exist_ok=True)
os.makedirs(DIR_CLUSTER, exist_ok=True)


# ============================================================
# FUNGSI UTM
# ============================================================

def get_utm_epsg(longitude, latitude):
    """
    Menentukan EPSG UTM berdasarkan posisi titik.
    Cocok untuk menghitung jarak dalam meter.
    """

    zone = int((longitude + 180) / 6) + 1

    if latitude >= 0:
        epsg = 32600 + zone
    else:
        epsg = 32700 + zone

    return epsg


# ============================================================
# LOAD DATA
# ============================================================

print("=" * 70)
print("MEMUAT DATA")
print("=" * 70)

print(f"Polygon SLS : {FILE_SLS}")
print(f"Titik       : {FILE_TITIK}")

# Load polygon
sls = gpd.read_file(FILE_SLS)

print(f"Jumlah polygon SLS : {len(sls):,}")

if SLS_ID_COLUMN not in sls.columns:
    raise ValueError(
        f"Kolom '{SLS_ID_COLUMN}' tidak ditemukan pada GeoJSON.\n"
        f"Kolom tersedia: {list(sls.columns)}"
    )

# Pastikan CRS
if sls.crs is None:
    print("CRS polygon tidak tersedia. Diasumsikan EPSG:4326")
    sls = sls.set_crs("EPSG:4326")

# Load titik
df = pd.read_csv(
    FILE_TITIK,
    sep=CSV_SEPARATOR,
    dtype=str
)

print(f"Jumlah titik        : {len(df):,}")

# Validasi kolom
for col in [LAT_COLUMN, LON_COLUMN, CSV_SLS_COLUMN]:

    if col not in df.columns:
        raise ValueError(
            f"Kolom '{col}' tidak ditemukan pada CSV.\\n"
            f"Kolom tersedia: {list(df.columns)}"
        )

# SLS dari atribut CSV
df["sls_csv"] = df[CSV_SLS_COLUMN].where(
    df[CSV_SLS_COLUMN].notna(),
    None
)

df["sls_csv"] = df["sls_csv"].apply(
    lambda x: str(x).strip() if x is not None else None
)

# Nilai kosong dianggap NULL
df.loc[
    df["sls_csv"].isin(["", "None", "nan", "NaN"]),
    "sls_csv"
] = None


# ============================================================
# BERSIHKAN KOORDINAT
# ============================================================

print("\nMembersihkan koordinat...")

df[LAT_COLUMN] = pd.to_numeric(
    df[LAT_COLUMN],
    errors="coerce"
)

df[LON_COLUMN] = pd.to_numeric(
    df[LON_COLUMN],
    errors="coerce"
)

# Buang koordinat tidak valid
before = len(df)

df = df[
    df[LAT_COLUMN].between(-90, 90)
    & df[LON_COLUMN].between(-180, 180)
].copy()

after = len(df)

print(f"Titik valid : {after:,}")
print(f"Titik dibuang : {before - after:,}")


# ============================================================
# BUAT ID TITIK
# ============================================================

if POINT_ID_COLUMN is None:

    df["point_id"] = np.arange(1, len(df) + 1)

    POINT_ID_COLUMN = "point_id"

else:

    if POINT_ID_COLUMN not in df.columns:
        raise ValueError(
            f"Kolom ID '{POINT_ID_COLUMN}' tidak ditemukan."
        )


# ============================================================
# BUAT GEODATAFRAME TITIK
# ============================================================

points = gpd.GeoDataFrame(
    df,
    geometry=gpd.points_from_xy(
        df[LON_COLUMN],
        df[LAT_COLUMN]
    ),
    crs="EPSG:4326"
)


# ============================================================
# SAMAKAN CRS
# ============================================================

sls = sls.to_crs("EPSG:4326")


# ============================================================
# 1. PEMETAAN TITIK KE SLS
# ============================================================

print("\n")
print("=" * 70)
print("1. SPATIAL JOIN TITIK -> SLS")
print("=" * 70)

print("Melakukan point-in-polygon...")

# Spatial join
joined = gpd.sjoin(
    points,
    sls[[SLS_ID_COLUMN, "geometry"]],
    how="left",
    predicate="within"
)

# SLS hasil pemetaan berdasarkan polygon GeoJSON
joined = joined.rename(
    columns={
        SLS_ID_COLUMN: "sls_geojson"
    }
)

# ============================================================
# BANDINGKAN SLS GEOJSON vs SLS CSV
# ============================================================

def compare_sls(row):
    sls_geojson = row["sls_geojson"]
    sls_csv = row["sls_csv"]

    if pd.isna(sls_geojson):
        if pd.isna(sls_csv):
            return "KEDUANYA_NULL"
        return "GEOJSON_NULL"

    if pd.isna(sls_csv):
        return "CSV_NULL"

    if str(sls_geojson).strip() == str(sls_csv).strip():
        return "MATCH"

    return "BERBEDA"


joined["status_mapping"] = joined.apply(
    compare_sls,
    axis=1
)

# Untuk analisis DBSCAN, SLS ditentukan berdasarkan polygon GeoJSON.
joined["idsls"] = joined["sls_geojson"]

# ============================================================
# RINGKASAN PERBANDINGAN DETAIL
# ============================================================

comparison_detail = (
    joined
    .groupby(
        ["sls_geojson", "sls_csv", "status_mapping"],
        dropna=False
    )
    .size()
    .reset_index(name="jumlah_titik")
)

comparison_file = os.path.join(
    DIR_CSV,
    "perbandingan_sls_geojson_vs_csv.csv"
)

comparison_detail.to_csv(
    comparison_file,
    sep="|",
    index=False
)

print(f"Perbandingan SLS disimpan: {comparison_file}")

# Titik yang memiliki perbedaan SLS
titik_berbeda = joined[
    joined["status_mapping"] == "BERBEDA"
].copy()

titik_berbeda.drop(
    columns=["geometry"],
    errors="ignore"
).to_csv(
    os.path.join(DIR_CSV, "titik_sls_berbeda.csv"),
    sep="|",
    index=False
)

# Buang index spatial join
if "index_right" in joined.columns:
    joined = joined.drop(columns=["index_right"])


# ============================================================
# TANGANI TITIK YANG TEPAT DI BATAS POLYGON
# ============================================================

unassigned = joined["idsls"].isna()

print(
    f"Titik belum masuk SLS : {unassigned.sum():,}"
)

if unassigned.sum() > 0:

    print("Mencoba mencari titik pada batas polygon...")

    boundary_points = points.loc[unassigned].copy()

    boundary_join = gpd.sjoin(
        boundary_points,
        sls[[SLS_ID_COLUMN, "geometry"]],
        how="left",
        predicate="intersects"
    )

    boundary_join = boundary_join.rename(
        columns={
            SLS_ID_COLUMN: "idsls"
        }
    )

    if "index_right" in boundary_join.columns:
        boundary_join = boundary_join.drop(
            columns=["index_right"]
        )

    # Jika satu titik mengenai beberapa polygon,
    # ambil polygon pertama.
    boundary_join = (
        boundary_join
        .reset_index()
        .drop_duplicates(subset=[POINT_ID_COLUMN])
        .set_index("index")
    )

    for idx, row in boundary_join.iterrows():

        if pd.notna(row.get("idsls")):

            joined.loc[
                joined[POINT_ID_COLUMN] == row[POINT_ID_COLUMN],
                "idsls"
            ] = row["idsls"]


# ============================================================
# SUMMARY SPATIAL JOIN
# ============================================================

jumlah_belum_sls = joined["idsls"].isna().sum()

print(
    f"Titik berhasil masuk SLS : "
    f"{len(joined) - jumlah_belum_sls:,}"
)

print(
    f"Titik di luar SLS         : "
    f"{jumlah_belum_sls:,}"
)

# ============================================================
# SUMMARY VALIDASI SLS PER POLYGON
# ============================================================

validation_summary = (
    joined
    .groupby("sls_geojson", dropna=False)
    .agg(
        jumlah_titik=(POINT_ID_COLUMN, "count"),
        jumlah_match=(
            "status_mapping",
            lambda x: (x == "MATCH").sum()
        ),
        jumlah_berbeda=(
            "status_mapping",
            lambda x: (x == "BERBEDA").sum()
        ),
        jumlah_csv_null=(
            "status_mapping",
            lambda x: (x == "CSV_NULL").sum()
        ),
        jumlah_geojson_null=(
            "status_mapping",
            lambda x: (x == "GEOJSON_NULL").sum()
        )
    )
    .reset_index()
)

validation_summary["persen_match"] = np.where(
    validation_summary["jumlah_titik"] > 0,
    (
        validation_summary["jumlah_match"]
        / validation_summary["jumlah_titik"]
        * 100
    ).round(2),
    0
)

def validation_status(row):
    if row["persen_match"] == 100:
        return "SESUAI"
    elif row["persen_match"] >= 95:
        return "SEBAGIAN BESAR SESUAI"
    elif row["persen_match"] > 0:
        return "TERDAPAT PERBEDAAN"
    return "TIDAK SESUAI"

validation_summary["status_validasi"] = (
    validation_summary.apply(
        validation_status,
        axis=1
    )
)

validation_file = os.path.join(
    DIR_CSV,
    "summary_validasi_sls.csv"
)

validation_summary.to_csv(
    validation_file,
    sep="|",
    index=False
)

print(f"Summary validasi SLS: {validation_file}")


# ============================================================
# SIMPAN HASIL PEMETAAN
# ============================================================

mapping_csv = os.path.join(
    DIR_CSV,
    "titik_mapping_sls.csv"
)

mapping_export = joined.drop(
    columns=["geometry"],
    errors="ignore"
)

mapping_export.to_csv(
    mapping_csv,
    sep="|",
    index=False
)

print(f"\nHasil mapping: {mapping_csv}")


# ============================================================
# FUNGSI ANALISIS DBSCAN
# ============================================================

def analyze_cluster(group):

    """
    Analisis satu SLS.

    DBSCAN dilakukan menggunakan koordinat UTM
    sehingga eps dihitung dalam meter.
    """

    sls_id = group["idsls"].iloc[0]

    group = group.copy()

    jumlah_titik = len(group)

    # Tidak mungkin membentuk cluster
    # jika jumlah titik < MIN_SAMPLES
    if jumlah_titik < MIN_SAMPLES:

        group["cluster_id"] = -1

        summary = {
            "idsls": sls_id,
            "jumlah_titik": jumlah_titik,
            "jumlah_cluster": 0,
            "titik_bergerombol": 0,
            "titik_noise": jumlah_titik,
            "persen_bergerombol": 0,
            "cluster_terbesar": 0,
            "status": "MENYEBAR"
        }

        return group, summary


    # --------------------------------------------------------
    # Tentukan UTM lokal
    # --------------------------------------------------------

    centroid = group.geometry.unary_union.centroid

    longitude = centroid.x
    latitude = centroid.y

    utm_epsg = get_utm_epsg(
        longitude,
        latitude
    )

    group_utm = group.to_crs(
        epsg=utm_epsg
    )

    coords = np.column_stack(
        [
            group_utm.geometry.x,
            group_utm.geometry.y
        ]
    )


    # --------------------------------------------------------
    # DBSCAN
    # --------------------------------------------------------

    model = DBSCAN(
        eps=EPS_METERS,
        min_samples=MIN_SAMPLES,
        metric="euclidean"
    )

    labels = model.fit_predict(coords)

    group["cluster_id"] = labels


    # --------------------------------------------------------
    # Hitung cluster
    # --------------------------------------------------------

    valid_labels = labels[labels >= 0]

    unique_clusters = sorted(
        set(valid_labels)
    )

    jumlah_cluster = len(
        unique_clusters
    )

    titik_bergerombol = len(
        valid_labels
    )

    titik_noise = jumlah_titik - titik_bergerombol

    persen_bergerombol = (
        titik_bergerombol / jumlah_titik
    )


    # Cluster terbesar
    if jumlah_cluster > 0:

        cluster_sizes = (
            pd.Series(valid_labels)
            .value_counts()
        )

        cluster_terbesar = int(
            cluster_sizes.max()
        )

    else:

        cluster_terbesar = 0


    # --------------------------------------------------------
    # Status
    # --------------------------------------------------------

    if (
        jumlah_cluster > 0
        and persen_bergerombol >= MIN_CLUSTER_PERCENT
    ):

        status = "BERGEROMBOL"

    else:

        status = "MENYEBAR"


    summary = {
        "idsls": sls_id,
        "jumlah_titik": jumlah_titik,
        "jumlah_cluster": jumlah_cluster,
        "titik_bergerombol": titik_bergerombol,
        "titik_noise": titik_noise,
        "persen_bergerombol": round(
            persen_bergerombol * 100,
            2
        ),
        "cluster_terbesar": cluster_terbesar,
        "status": status
    }

    return group, summary


# ============================================================
# 2. ANALISIS SEMUA SLS
# ============================================================

print("\n")
print("=" * 70)
print("2. ANALISIS CLUSTER PER SLS")
print("=" * 70)

# Hanya titik yang sudah masuk SLS
assigned = joined[
    joined["idsls"].notna()
].copy()

all_results = []
all_summaries = []

jumlah_sls = assigned["idsls"].nunique()

print(
    f"Jumlah SLS yang dianalisis : {jumlah_sls:,}"
)

for counter, (sls_id, group) in enumerate(
    assigned.groupby("idsls"),
    start=1
):

    print(
        f"[{counter:,}/{jumlah_sls:,}] "
        f"SLS {sls_id} - "
        f"{len(group):,} titik"
    )

    result, summary = analyze_cluster(
        group
    )

    all_results.append(result)
    all_summaries.append(summary)


# Gabungkan
cluster_points = gpd.GeoDataFrame(
    pd.concat(
        all_results,
        ignore_index=True
    ),
    crs="EPSG:4326"
)

summary_df = pd.DataFrame(
    all_summaries
)

# Gabungkan hasil clustering dengan hasil validasi
summary_df = summary_df.merge(
    validation_summary,
    left_on="idsls",
    right_on="sls_geojson",
    how="left"
)

summary_df = summary_df.drop(
    columns=["sls_geojson"],
    errors="ignore"
)


# ============================================================
# 3. SIMPAN SUMMARY
# ============================================================

summary_file = os.path.join(
    DIR_CSV,
    "summary_cluster_sls.csv"
)

summary_df.to_csv(
    summary_file,
    sep="|",
    index=False
)

print(
    f"\nSummary disimpan: {summary_file}"
)


# ============================================================
# SIMPAN DETAIL CLUSTER
# ============================================================

detail_file = os.path.join(
    DIR_CSV,
    "detail_titik_cluster.csv"
)

detail_export = cluster_points.drop(
    columns=["geometry"],
    errors="ignore"
)

detail_export.to_csv(
    detail_file,
    sep="|",
    index=False
)

print(
    f"Detail cluster disimpan: {detail_file}"
)


# ============================================================
# 4. BUAT GEOJSON CLUSTER
# ============================================================

print("\nMembuat GeoJSON cluster...")

for sls_id, group in cluster_points.groupby(
    "idsls"
):

    # Hanya titik yang masuk cluster
    clustered = group[
        group["cluster_id"] >= 0
    ].copy()

    if len(clustered) == 0:
        continue

    # Bersihkan nama file
    safe_name = str(sls_id).replace(
        "/",
        "_"
    )

    output_geojson = os.path.join(
        DIR_CLUSTER,
        f"SLS_{safe_name}_cluster.geojson"
    )

    clustered.to_file(
        output_geojson,
        driver="GeoJSON"
    )


# ============================================================
# FUNGSI WARNA
# ============================================================

def cluster_color(cluster_id):

    colors = [
        "red",
        "blue",
        "green",
        "purple",
        "orange",
        "darkred",
        "cadetblue",
        "darkgreen",
        "pink",
        "darkblue"
    ]

    if cluster_id < 0:
        return "cyan"

    return colors[
        cluster_id % len(colors)
    ]


# ============================================================
# 5. BUAT PETA SETIAP SLS
# ============================================================

print("\n")
print("=" * 70)
print("5. MEMBUAT PETA")
print("=" * 70)


# Lookup polygon
sls_lookup = sls.set_index(
    SLS_ID_COLUMN
)


for counter, summary in enumerate(
    all_summaries,
    start=1
):

    sls_id = summary["idsls"]

    # Cari polygon SLS
    polygon = sls[
        sls[SLS_ID_COLUMN] == sls_id
    ]

    if polygon.empty:
        continue


    # Titik SLS
    points_sls = cluster_points[
        cluster_points["idsls"] == sls_id
    ].copy()


    # --------------------------------------------------------
    # Center map
    # --------------------------------------------------------

    center = polygon.geometry.iloc[0].centroid

    m = folium.Map(
        location=[
            center.y,
            center.x
        ],
        zoom_start=16,
        tiles="OpenStreetMap"
    )

    Fullscreen().add_to(m)


    # --------------------------------------------------------
    # Polygon SLS
    # --------------------------------------------------------

    folium.GeoJson(
        polygon.to_json(),
        name=f"SLS {sls_id}",
        style_function=lambda feature: {
            "fillColor": "transparent",
            "color": "black",
            "weight": 2,
            "fillOpacity": 0.05
        }
    ).add_to(m)


    # --------------------------------------------------------
    # Titik
    # --------------------------------------------------------

    for _, row in points_sls.iterrows():

        cluster_id = int(
            row["cluster_id"]
        )

        color = cluster_color(
            cluster_id
        )

        if cluster_id >= 0:

            status = (
                f"Cluster {cluster_id}"
            )

        else:

            status = "Noise / tidak masuk cluster"


        popup_text = f"""
        <b>ID Titik:</b> <a href='https://fasih-sm.bps.go.id/app/assignment/fd68e454-ba45-4b85-8205-f3bf777ded24/{row[POINT_ID_COLUMN]}' target='_blank'>{row[POINT_ID_COLUMN]}</a><br>
        <b>SLS GeoJSON:</b> {sls_id}<br>
        <b>SLS CSV:</b> {row["sls_csv"] if pd.notna(row["sls_csv"]) else "NULL"}<br>
        <b>Mapping:</b> {row["status_mapping"]}<br>
        <b>Cluster:</b> {status}<br>
        <b>Latitude:</b> {row[LAT_COLUMN]}<br>
        <b>Longitude:</b> {row[LON_COLUMN]}
        """


        folium.CircleMarker(
            location=[
                row[LAT_COLUMN],
                row[LON_COLUMN]
            ],
            radius=5 if cluster_id >= 0 else 3,
            color=color,
            fill=True,
            fill_color=color,
            fill_opacity=0.8,
            popup=folium.Popup(
                popup_text,
                max_width=350
            )
        ).add_to(m)


    # --------------------------------------------------------
    # Info summary
    # --------------------------------------------------------

    info_html = f"""
    <div style="
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 9999;
        background-color: white;
        padding: 10px;
        border: 2px solid black;
        font-size: 13px;
    ">

    <b>SLS: {sls_id}</b><br>
    Jumlah titik: {summary['jumlah_titik']:,}<br>
    Jumlah cluster: {summary['jumlah_cluster']:,}<br>
    Titik bergerombol: {summary['titik_bergerombol']:,}<br>
    Noise: {summary['titik_noise']:,}<br>
    Persentase cluster: {summary['persen_bergerombol']:.2f}%<br>
    Cluster terbesar: {summary['cluster_terbesar']:,}<br>
    Status: <b>{summary['status']}</b>

    </div>
    """

    m.get_root().html.add_child(
        folium.Element(info_html)
    )


    # --------------------------------------------------------
    # Layer control
    # --------------------------------------------------------
    # Google Satellite
    folium.TileLayer(
        tiles="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
        attr="Google",
        name="Google Satellite",
        overlay=False,
        control=True
    ).add_to(m)

    # OpenStreetMap sebagai alternatif
    folium.TileLayer(
        tiles="OpenStreetMap",
        name="OpenStreetMap",
        overlay=False,
        control=True
    ).add_to(m)
    folium.LayerControl().add_to(m)


    # --------------------------------------------------------
    # Save
    # --------------------------------------------------------

    safe_name = str(sls_id).replace(
        "/",
        "_"
    )

    map_file = os.path.join(
        DIR_MAP,
        f"SLS_{safe_name}.html"
    )

    m.save(map_file)

    print(
        f"[{counter:,}/{jumlah_sls:,}] "
        f"SLS {sls_id} -> {map_file}"
    )

# ============================================================
# 6. BUAT PETA BERDASARKAN SLS CSV
# ============================================================
print("\\n")
print("=" * 70)
print("6. MEMBUAT PETA BERDASARKAN SLS CSV")
print("=" * 70)

for sls_csv_id, points_csv in joined[joined["sls_csv"].notna()].groupby("sls_csv"):
    sls_csv_id = str(sls_csv_id).strip()

    # Pasangkan level_5_full_code CSV dengan idsls GeoJSON
    polygon_csv = sls[
        sls[SLS_ID_COLUMN].astype(str).str.strip() == sls_csv_id
    ].copy()

    if polygon_csv.empty:
        print(f"Peringatan: SLS CSV {sls_csv_id} tidak ditemukan sebagai idsls di GeoJSON.")
        continue

    polygon_wgs84 = polygon_csv.to_crs("EPSG:4326")
    center = polygon_wgs84.geometry.unary_union.centroid

    m_csv = folium.Map(
        location=[center.y, center.x],
        zoom_start=16,
        tiles="OpenStreetMap"
    )
    Fullscreen().add_to(m_csv)

    # Polygon SLS dari GeoJSON
    folium.GeoJson(
        polygon_wgs84.to_json(),
        name=f"SLS GeoJSON {sls_csv_id}",
        style_function=lambda feature: {
            "fillColor": "transparent",
            "color": "black",
            "weight": 3,
            "fillOpacity": 0.05
        },
        tooltip=folium.GeoJsonTooltip(
            fields=[SLS_ID_COLUMN],
            aliases=["idsls:"]
        )
    ).add_to(m_csv)

    # Titik dikelompokkan berdasarkan level_5_full_code CSV
    for _, row in points_csv.iterrows():
        sls_geojson = row.get("sls_geojson")

        if pd.isna(sls_geojson):
            status_pasangan = "GEOJSON_NULL"
        elif str(sls_geojson).strip() == sls_csv_id:
            status_pasangan = "MATCH"
        else:
            status_pasangan = "BERBEDA"

        try:
            cluster_id = int(row.get("cluster_id", -1))
        except Exception:
            cluster_id = -1

        color = cluster_color(cluster_id)
        status_cluster = f"Cluster {cluster_id}" if cluster_id >= 0 else "Noise / tidak masuk cluster"

        popup_text = f"""
        <b>ID Titik:</b> {row[POINT_ID_COLUMN]}<br>
        <b>SLS CSV:</b> {sls_csv_id}<br>
        <b>SLS GeoJSON:</b> {sls_geojson if not pd.isna(sls_geojson) else "-"}<br>
        <b>Status pasangan:</b> <b>{status_pasangan}</b><br>
        <b>Cluster:</b> {status_cluster}<br>
        <b>Latitude:</b> {row[LAT_COLUMN]}<br>
        <b>Longitude:</b> {row[LON_COLUMN]}
        """

        folium.CircleMarker(
            location=[float(row[LAT_COLUMN]), float(row[LON_COLUMN])],
            radius=5 if cluster_id >= 0 else 3,
            color=color,
            fill=True,
            fill_color=color,
            fill_opacity=0.8,
            popup=folium.Popup(popup_text, max_width=400)
        ).add_to(m_csv)

    # Basemap
    folium.TileLayer(
        tiles="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
        attr="Google",
        name="Google Satellite",
        overlay=False,
        control=True
    ).add_to(m_csv)

    folium.TileLayer(
        tiles="OpenStreetMap",
        name="OpenStreetMap",
        overlay=False,
        control=True
    ).add_to(m_csv)

    folium.LayerControl().add_to(m_csv)

    safe_name = (
        sls_csv_id.replace("/", "_")
        .replace("\\\\", "_")
        .replace(" ", "_")
    )

    output_map_csv = os.path.join(
        DIR_MAP_CSV,
        f"SLS_CSV_{safe_name}.html"
    )

    m_csv.save(output_map_csv)
    print(f"Peta SLS CSV {sls_csv_id} disimpan: {output_map_csv}")

# ============================================================
# SUMMARY AKHIR
# ============================================================

print("\n")
print("=" * 70)
print("SELESAI")
print("=" * 70)

print(
    f"Total SLS              : "
    f"{len(summary_df):,}"
)

print(
    f"SLS BERGEROMBOL        : "
    f"{(summary_df['status'] == 'BERGEROMBOL').sum():,}"
)

print(
    f"SLS MENYEBAR           : "
    f"{(summary_df['status'] == 'MENYEBAR').sum():,}"
)

print(
    f"Titik masuk SLS        : "
    f"{len(cluster_points):,}"
)

print(
    f"Titik di luar SLS      : "
    f"{jumlah_belum_sls:,}"
)

print("\nOutput:")
print(OUTPUT_DIR)