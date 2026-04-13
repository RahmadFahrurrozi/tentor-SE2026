import streamlit as st
import geopandas as gpd
import pydeck as pdk
import pandas as pd
import os

st.set_page_config(page_title="TENTORING SE2026", page_icon="logo.svg", layout="wide")

st.markdown("""
<style>
    .stApp { background-color: #0e1117; }
    .block-container { padding-top: 1rem; }
    h1 { color: #e0f0ff; font-family: 'Courier New', monospace; letter-spacing: 2px; }
</style>
""", unsafe_allow_html=True)


st.title("TENTORING SE2026")
st.caption(" Sistem Monitoring Bangunan Usaha Kabupaten Banyuwangi")
st.sidebar.image("logo.svg", width=60)

# ─────────────────────────────────────────────
# LOAD DATA
# ─────────────────────────────────────────────

@st.cache_data
def load_kab():
    return gpd.read_file("data/peta-kabupaten-banyuwangi.geojson").to_crs(epsg=4326)

@st.cache_data
def load_sls():
    return gpd.read_file("data/sls-after-ea-sls-2024.json").to_crs(epsg=4326)

@st.cache_data
def load_building():
    parquet_path = "data/bangunan-terklasifikasi.parquet"
    if os.path.exists(parquet_path):
        gdf = gpd.read_parquet(parquet_path)
    else:
        st.warning("Data pre-processed bangunan belum ada! Jalankan preprocess_bangunan.py terlebih dahulu.")
        return gpd.GeoDataFrame()
    return gdf

GSHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRI9DTFAbw8KbLPdcBbqSutIiTiDcEZLrDvdhOcQ7n53ckypw_p5Pi9WFt1-nmrMbL5WI7KUut42xQn/pub?gid=1280473743&single=true&output=csv"

@st.cache_data(ttl=300)  # auto-refresh setiap 5 menit
def load_usaha():
    parquet_path = "data/uji-coba-peta.parquet"
    if os.path.exists(parquet_path):
        try:
            df = pd.read_parquet(parquet_path)
        except Exception as e:
            st.warning(f"Gagal memuat Parquet, kembali ke load sheet... Error: {e}")
            df = pd.read_excel("data/uji-coba-peta.xlsx")
    else:
        try:
            df = pd.read_csv(GSHEET_URL)
        except Exception as e:
            st.warning(f"Gagal load dari Google Sheets, fallback ke Excel lokal. Error: {e}")
            df = pd.read_excel("data/uji-coba-peta.xlsx")

    # Cari kolom lat/long secara fleksibel
    lat_col  = next((c for c in df.columns if "lat"  in c.lower()), None)
    lon_col  = next((c for c in df.columns if "long" in c.lower() or "lon" in c.lower()), None)
    idsls_col = next((c for c in df.columns if "idsls" in c.lower()), None)

    if lat_col and lon_col:
        df = df.rename(columns={lat_col: "lat final", lon_col: "long final"})
    if idsls_col and idsls_col != "idsls final":
        df = df.rename(columns={idsls_col: "idsls final"})

    df = df.dropna(subset=["lat final", "long final"])
    df = df[df["lat final"].between(-90, 90)]
    df = df[df["long final"].between(-180, 180)]
    def safe_idsls(x):
        if pd.isna(x): return None
        try:
            val = float(x)
            if pd.isna(val): return None
            return str(int(val))
        except (ValueError, TypeError):
            return None
            
    df["idsls_str"] = df["idsls final"].apply(safe_idsls)
    return df

@st.cache_data
def load_rumah_tangga():
    parquet_path = "data/rumah-tangga.parquet"
    if os.path.exists(parquet_path):
        return pd.read_parquet(parquet_path)
    return pd.DataFrame()

@st.cache_data
def get_building_stats():
    gdf_build = load_building()
    if gdf_build.empty:
        return pd.DataFrame()
    stats = gdf_build.groupby(['idsls_str', 'status_bangunan']).size().unstack(fill_value=0)
    for col in ['Bangunan Usaha', 'Rumah Tangga', 'Belum Terdata']:
        if col not in stats.columns:
            stats[col] = 0
            
    stats['total_bangunan'] = stats['Bangunan Usaha'] + stats['Rumah Tangga'] + stats['Belum Terdata']
    stats['sudah_terdata'] = stats['Bangunan Usaha'] + stats['Rumah Tangga']
    stats['belum_terdata'] = stats['Belum Terdata']
    return stats[['total_bangunan', 'sudah_terdata', 'belum_terdata']].reset_index()

@st.cache_data
def merge_sls_dengan_count():
    gdf_sls = load_sls()
    df_usaha = load_usaha()
    df_rt = load_rumah_tangga()

    # Count Usaha per SLS
    count_usaha = (
        df_usaha.dropna(subset=["idsls_str"])
        .groupby("idsls_str")
        .size()
        .reset_index(name="jumlah_usaha")
    )

    # Count Keluarga (Rumah Tangga) per SLS
    if not df_rt.empty:
        count_keluarga = (
            df_rt.dropna(subset=["idsls_str"])
            .groupby("idsls_str")
            .size()
            .reset_index(name="jumlah_keluarga")
        )
    else:
        count_keluarga = pd.DataFrame(columns=["idsls_str", "jumlah_keluarga"])

    id_candidates = ["idsls", "id_sls", "IDSLS", "ID_SLS", "kode_sls", "id"]
    sls_id_col = next((c for c in id_candidates if c in gdf_sls.columns), None)
    if sls_id_col is None:
        non_geom = [c for c in gdf_sls.columns if c != "geometry"]
        sls_id_col = non_geom[0] if non_geom else None

    if sls_id_col:
        def norm(v):
            s = str(v).strip()
            return s[:-2] if s.endswith(".0") else s
        gdf_sls["idsls_str"] = gdf_sls[sls_id_col].apply(norm)
        
        # Merge Usaha
        gdf_sls = gdf_sls.merge(count_usaha, on="idsls_str", how="left")
        gdf_sls["jumlah_usaha"] = gdf_sls["jumlah_usaha"].fillna(0).astype(int)
        
        # Merge Keluarga
        gdf_sls = gdf_sls.merge(count_keluarga, on="idsls_str", how="left")
        gdf_sls["jumlah_keluarga"] = gdf_sls["jumlah_keluarga"].fillna(0).astype(int)
        
        # Merge stats bangunan
        stats_df = get_building_stats()
        if not stats_df.empty:
            gdf_sls = gdf_sls.merge(stats_df, on="idsls_str", how="left")
            gdf_sls["total_bangunan"] = gdf_sls["total_bangunan"].fillna(0).astype(int)
            gdf_sls["sudah_terdata"] = gdf_sls["sudah_terdata"].fillna(0).astype(int)
            gdf_sls["belum_terdata"] = gdf_sls["belum_terdata"].fillna(0).astype(int)
        else:
            gdf_sls["total_bangunan"] = 0; gdf_sls["sudah_terdata"] = 0; gdf_sls["belum_terdata"] = 0
    else:
        gdf_sls["jumlah_usaha"] = 0
        gdf_sls["jumlah_keluarga"] = 0
        gdf_sls["total_bangunan"] = 0; gdf_sls["sudah_terdata"] = 0; gdf_sls["belum_terdata"] = 0

    return gdf_sls, sls_id_col

# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def jumlah_to_color(jumlah):
    if jumlah == 0:    return [60,  20,  120, 160]
    elif jumlah < 10:  return [120, 20,  180, 180]
    elif jumlah < 50:  return [180, 60,  120, 190]
    elif jumlah < 100: return [220, 80,  60,  200]
    else:              return [255, 30,  30,  220]

def gc_to_color(gc):
    return {
        0:  [150, 150, 150, 160],
        1:  [255, 50,  50,  200],
        3:  [255, 165, 0,   200],
        4:  [50,  255, 100, 200],
        99: [100, 180, 255, 200],
    }.get(int(gc) if pd.notna(gc) else 0, [255, 50, 50, 180])

def gdf_to_polygon_rows(gdf, fixed_color):
    rows = []
    for _, row in gdf.iterrows():
        geom = row.geometry
        if geom is None: continue
        polys = [geom] if geom.geom_type == "Polygon" else list(geom.geoms)
        for poly in polys:
            rows.append({"polygon": [list(c) for c in poly.exterior.coords], "color": fixed_color})
    return rows

# ─────────────────────────────────────────────
# LOAD DATA UTAMA
# ─────────────────────────────────────────────
with st.spinner("Loading data..."):
    gdf_kab = load_kab()

with st.spinner("Menghitung usaha per SLS..."):
    gdf_sls, sls_id_col = merge_sls_dengan_count()

kec_col  = next((c for c in ["nmkec", "kec", "kecamatan"] if c in gdf_sls.columns), None)
desa_col = next((c for c in ["nmdesa", "desa", "kelurahan"] if c in gdf_sls.columns), None)
kec_list  = sorted(gdf_sls[kec_col].dropna().unique().tolist())  if kec_col  else []
desa_list = sorted(gdf_sls[desa_col].dropna().unique().tolist()) if desa_col else []

# ─────────────────────────────────────────────
# SIDEBAR
# ─────────────────────────────────────────────
st.sidebar.header("Layer Control")
show_kab      = st.sidebar.checkbox("Batas Kabupaten", value=True)
show_sls      = st.sidebar.checkbox("SLS", value=True)
show_usaha    = st.sidebar.checkbox("Titik Usaha", value=True)
show_rt       = st.sidebar.checkbox("Titik Rumah Tangga", value=False)
show_build    = st.sidebar.checkbox("Bangunan (Usaha & RT)", value=False)
enable_3d = st.sidebar.checkbox("Mode 3D Bangunan", value=False)
show_counting = st.sidebar.checkbox("Mode Choropleth", value=False)

st.sidebar.markdown("---")
st.sidebar.subheader("Filter Wilayah")
filter_kec  = st.sidebar.selectbox("Kecamatan", ["Semua"] + kec_list)  if kec_list  else "Semua"
if desa_list and desa_col and kec_col and filter_kec != "Semua":
    desa_options = sorted(gdf_sls[gdf_sls[kec_col] == filter_kec][desa_col].dropna().unique().tolist())
else:
    desa_options = desa_list
filter_desa = st.sidebar.selectbox("Desa/Kelurahan", ["Semua"] + desa_options) if desa_options else "Semua"

st.sidebar.markdown("---")
st.sidebar.subheader("Filter Titik Usaha")
GC_LABEL = {0:"0 — Tidak diketahui", 1:"1 — Akurasi tinggi", 3:"3 — Akurasi sedang", 4:"4 — Sangat tinggi", 99:"99 — Khusus"}
filter_gc   = st.sidebar.selectbox("Kualitas Koordinat (gc)", ["Semua"] + [GC_LABEL[g] for g in sorted(GC_LABEL)])
filter_nama = st.sidebar.text_input("Cari nama usaha", placeholder="contoh: BAKSO")

st.sidebar.markdown("---")
st.sidebar.subheader("Opacity")
sls_opacity   = st.sidebar.slider("SLS opacity", 0.0, 1.0, 0.3, 0.05)
build_opacity = st.sidebar.slider("Bangunan opacity", 0.0, 1.0, 0.6, 0.05)

st.sidebar.markdown("---")
st.sidebar.subheader("Data")
if st.sidebar.button("Refresh Data Sekarang"):
    st.cache_data.clear()
    st.rerun()
# st.sidebar.caption("Auto-refresh tiap 5 menit")

# ─────────────────────────────────────────────
# FILTER SLS
# ─────────────────────────────────────────────
gdf_sls_display = gdf_sls.copy()
if filter_kec  != "Semua" and kec_col:
    gdf_sls_display = gdf_sls_display[gdf_sls_display[kec_col] == filter_kec]
if filter_desa != "Semua" and desa_col:
    gdf_sls_display = gdf_sls_display[gdf_sls_display[desa_col] == filter_desa]

# ─────────────────────────────────────────────
# BUILD LAYERS
# ─────────────────────────────────────────────
layers = []

# Layer Kabupaten
if show_kab:
    kab_rows = gdf_to_polygon_rows(gdf_kab, [0, 100, 255, 15])
    layers.append(pdk.Layer("PolygonLayer", data=kab_rows,
        get_polygon="polygon", get_fill_color="color",
        get_line_color=[0, 150, 255, 220], get_line_width=80, pickable=False))

# Layer SLS
if show_sls:
    sls_rows = []
    for _, row in gdf_sls_display.iterrows():
        geom = row.geometry
        if geom is None: continue
        jumlah_usaha = int(row.get("jumlah_usaha", 0))
        jumlah_keluarga = int(row.get("jumlah_keluarga", 0))
        color  = jumlah_to_color(jumlah_usaha) if show_counting else [160, 32, 240, int(sls_opacity * 255)]
        props  = {
            "color": color,
            "jumlah_usaha": str(jumlah_usaha),
            "jumlah_keluarga": str(jumlah_keluarga),
            "total_bangunan": str(int(row.get("total_bangunan", 0))),
            "sudah_terdata": str(int(row.get("sudah_terdata", 0))),
            "belum_terdata": str(int(row.get("belum_terdata", 0))),
            "nama_sls": str(row.get("idsls_str", "-")),
            "kecamatan": str(row.get(kec_col,  "-")) if kec_col  else "-",
            "desa":      str(row.get(desa_col, "-")) if desa_col else "-",
            "nama": "Info SLS", "alamat": "Satuan Lingkungan Setempat", "gc_label": "", "divider": "",
        }
        polys = [geom] if geom.geom_type == "Polygon" else list(geom.geoms)
        for poly in polys:
            r = props.copy()
            r["polygon"] = [list(c) for c in poly.exterior.coords]
            sls_rows.append(r)

    layers.append(pdk.Layer("PolygonLayer", data=sls_rows,
        get_polygon="polygon", get_fill_color="color",
        get_line_color=[200, 200, 255, 60], 
        get_line_width=2, line_width_min_pixels=1, 
        pickable=True, auto_highlight=True))

# Layer Bangunan
if show_build:
    if filter_kec == "Semua" and filter_desa == "Semua":
        st.warning("Pilih spesifik Kecamatan/Desa di sidebar untuk memunculkan Polygon Bangunan di Peta (demi kestabilan memory browser).")
    else:
        with st.spinner("Merender bangunan untuk wilayah ini..."):
            gdf_build = load_building()
            if not gdf_build.empty:
                valid_idsls_b = set(gdf_sls_display["idsls_str"].dropna().unique())
                gdf_build_f = gdf_build[gdf_build["idsls_str"].isin(valid_idsls_b)].copy()
                
                import ast
                def parse_color(c):
                    if isinstance(c, str):
                        try:
                            lst = ast.literal_eval(c)
                            return lst
                        except:
                            return [128, 128, 128, 100]
                    return c
                    
                build_rows = []
                for _, row in gdf_build_f.iterrows():
                    geom = row.geometry
                    if geom is None: continue
                    color = parse_color(row.color)
                    color[3] = int(build_opacity * 255)
                    
                    props = {
                        "fill_color": color,
                        "nama_sls": str(row.get("idsls_str", "-")),
                        "status": str(row.get("status_bangunan", "-")),
                        "jml_usaha": str(row.get("jml_usaha", "0")),
                        "kecamatan": str(row.get("kecamatan", "-")),
                        "desa": str(row.get("desa", "-")),
                        "nama": "Bangunan Fisik",
                        "alamat": "Lihat info SLS di bawah",
                        "gc_label": "Status: " + str(row.get("status_bangunan", "-")),
                        "divider": "<hr style='margin:6px 0;border-color:#333'/>",
                        "jumlah_usaha": str(row.get("jml_usaha", "0")),
                        "jumlah_keluarga": "-",
                        "total_bangunan": "-",
                        "sudah_terdata": "-",
                        "belum_terdata": "-",
                    }
                    
                    polys = [geom] if geom.geom_type == "Polygon" else list(geom.geoms)
                    for poly in polys:
                        r = props.copy()
                        r["polygon"] = [list(c) for c in poly.exterior.coords]
                        build_rows.append(r)
                
                if len(build_rows) > 0:
                    layers.append(
                        pdk.Layer(
                            "PolygonLayer",
                            data=build_rows,
                            get_polygon="polygon",
                            get_fill_color="fill_color",

                            # 3D settings
                            extruded=enable_3d,
                            wireframe=True,
                            get_elevation=50, #volume bangunan
                            elevation_scale=1,

                            # style
                            get_line_color=[200, 200, 200, 80],

                            # interaction
                            pickable=True,
                            auto_highlight=True,
                        )
                    )

# Layer Titik Usaha (Dipindah ke bawah agar muncul di atas bangunan)
df_usaha_filtered = None
if show_usaha:
    with st.spinner("Loading titik usaha..."):
        df_usaha = load_usaha()

    df_f = df_usaha.copy()
    if filter_kec != "Semua" or filter_desa != "Semua":
        valid_idsls = set(gdf_sls_display["idsls_str"].dropna().unique())
        df_f = df_f[df_f["idsls_str"].isin(valid_idsls)]
    if filter_gc != "Semua":
        gc_val = int(filter_gc.split("—")[0].strip())
        df_f = df_f[df_f["gc final"] == gc_val]
    if filter_nama.strip():
        df_f = df_f[df_f["nama final"].str.contains(filter_nama.strip(), case=False, na=False)]

    df_sample = df_f.copy()
    st.sidebar.success(f"{len(df_sample):,} titik ditampilkan")
    df_usaha_filtered = df_sample

    sls_lookup_cols = ["idsls_str", "jumlah_usaha"]
    if kec_col:  sls_lookup_cols.append(kec_col)
    if desa_col: sls_lookup_cols.append(desa_col)
    sls_lookup = gdf_sls[sls_lookup_cols].drop_duplicates("idsls_str")

    df_sample = df_sample.merge(sls_lookup, on="idsls_str", how="left")
    
    if kec_col: df_sample["kecamatan"] = df_sample[kec_col].fillna("-").astype(str)
    else: df_sample["kecamatan"] = "-"
    if desa_col: df_sample["desa"] = df_sample[desa_col].fillna("-").astype(str)
    else: df_sample["desa"] = "-"
        
    df_sample["jumlah_usaha"] = "1"
    df_sample["jumlah_keluarga"] = "0"
    df_sample["nama_sls"] = df_sample["idsls_str"].fillna("-").astype(str)
    df_sample["nama"] = df_sample["nama final"].fillna("-").astype(str)
    df_sample["alamat"] = df_sample["alamat final"].fillna("-").astype(str)
    df_sample["lat"] = df_sample["lat final"]
    df_sample["lon"] = df_sample["long final"]
    
    df_sample["gc"] = df_sample["gc final"].fillna(0).astype(int)
    df_sample["gc_label"] = "gc: " + df_sample["gc"].astype(str)
    df_sample["divider"] = "<hr style='margin:6px 0;border-color:#333'/>"
    df_sample["total_bangunan"] = "-"
    df_sample["sudah_terdata"] = "-"
    df_sample["belum_terdata"] = "-"
    df_sample["color"] = df_sample["gc final"].apply(gc_to_color)

    kolom_pydeck = [
        "lon", "lat", "color", "nama", "alamat", "gc_label", 
        "divider", "nama_sls", "kecamatan", "desa", "jumlah_usaha", "jumlah_keluarga",
        "total_bangunan", "sudah_terdata", "belum_terdata"
    ]
    
    layers.append(pdk.Layer(
        "ScatterplotLayer", 
        data=df_sample[kolom_pydeck],
        get_position=["lon", "lat"], 
        get_color="color",
        get_radius=15, 
        radius_scale=1,       
        radius_min_pixels=1,
        radius_max_pixels=6,
        pickable=True,
        auto_highlight=True
    ))


# Layer Titik Rumah Tangga (Dipindah ke bawah bangunan agar di layer atas)
if show_rt:
    if filter_kec == "Semua" and filter_desa == "Semua":
        st.warning("Pilih spesifik Kecamatan/Desa di sidebar untuk memunculkan Titik Rumah Tangga (demi kestabilan memory browser).")
    else:
        with st.spinner("Loading titik rumah tangga..."):
            df_rt = load_rumah_tangga()
            
        df_rt_f = df_rt.copy()
        if filter_kec != "Semua" or filter_desa != "Semua":
            valid_idsls = set(gdf_sls_display["idsls_str"].dropna().unique())
            df_rt_f = df_rt_f[df_rt_f["idsls_str"].isin(valid_idsls)]
            
        st.sidebar.success(f"{len(df_rt_f):,} titik RT ditampilkan")
        df_rt_sample = df_rt_f.copy()
        
        sls_lookup_cols = ["idsls_str", "jumlah_usaha"]
        if kec_col: sls_lookup_cols.append(kec_col)
        if desa_col: sls_lookup_cols.append(desa_col)
        sls_lookup_rt = gdf_sls[sls_lookup_cols].drop_duplicates("idsls_str")
        
        df_rt_sample = df_rt_sample.merge(sls_lookup_rt, on="idsls_str", how="left")
        
        if kec_col: df_rt_sample["kecamatan"] = df_rt_sample[kec_col].fillna("-").astype(str)
        else: df_rt_sample["kecamatan"] = "-"
        if desa_col: df_rt_sample["desa"] = df_rt_sample[desa_col].fillna("-").astype(str)
        else: df_rt_sample["desa"] = "-"
        
        df_rt_sample["jumlah_usaha"] = "0"
        df_rt_sample["jumlah_keluarga"] = "1"
        df_rt_sample["nama_sls"] = df_rt_sample["idsls_str"].fillna("-").astype(str)
        
        # Tooltip properties
        df_rt_sample["nama"] = "Rumah Tangga"
        if "nama_kk" in df_rt_sample.columns:
            df_rt_sample.loc[df_rt_sample["nama_kk"].notna(), "nama"] = "Rumah Tangga (" + df_rt_sample["nama_kk"].astype(str) + ")"
            
        df_rt_sample["alamat"] = "Titik Rumah Tangga"
        df_rt_sample["gc_label"] = ""
        df_rt_sample["divider"] = "<hr style='margin:6px 0;border-color:#333'/>"
        df_rt_sample["lat"] = pd.to_numeric(df_rt_sample["lat final"], errors="coerce").fillna(0)
        df_rt_sample["lon"] = pd.to_numeric(df_rt_sample["long final"], errors="coerce").fillna(0)
        df_rt_sample["color"] = pd.Series([[0, 114, 188, 200]] * len(df_rt_sample), index=df_rt_sample.index)
        df_rt_sample["total_bangunan"] = "-"
        df_rt_sample["sudah_terdata"] = "-"
        df_rt_sample["belum_terdata"] = "-"
        
        rt_kolom_pydeck = [
            "lon", "lat", "color", "nama", "alamat", "gc_label", 
            "divider", "nama_sls", "kecamatan", "desa", "jumlah_usaha", "jumlah_keluarga",
            "total_bangunan", "sudah_terdata", "belum_terdata"
        ]
        
        layers.append(pdk.Layer(
            "ScatterplotLayer", 
            data=df_rt_sample[rt_kolom_pydeck],
            get_position=["lon", "lat"], 
            get_color="color",
            get_radius=10,          
            radius_scale=1,       
            radius_min_pixels=1,    
            radius_max_pixels=4,    
            pickable=True,
            auto_highlight=True
        ))

# ─────────────────────────────────────────────
# RENDER MAP
# ─────────────────────────────────────────────
if filter_kec != "Semua" and not gdf_sls_display.empty:
    bounds = gdf_sls_display.total_bounds
    center_lat, center_lon, zoom = (bounds[1]+bounds[3])/2, (bounds[0]+bounds[2])/2, 11
elif filter_desa != "Semua" and not gdf_sls_display.empty:
    bounds = gdf_sls_display.total_bounds
    center_lat, center_lon, zoom = (bounds[1]+bounds[3])/2, (bounds[0]+bounds[2])/2, 13
else:
    center_lat, center_lon, zoom = -8.2192, 114.3691, 9

view_state = pdk.ViewState(
    latitude=center_lat,
    longitude=center_lon,
    zoom=zoom,
    pitch=45,  
    bearing=0
)

# Tooltip berbeda untuk SLS vs Titik Usaha
# Pydeck pakai satu tooltip tapi field kosong otomatis disembunyikan
tooltip = {
    "html": """
        <div style="display:flex; align-items:flex-start; gap:24px;">
          <!-- SISI KIRI: INFO TEKS -->
          <div style="flex:1; min-width:140px;">
            <b style='font-size:15px;color:#ffe082'>{nama}</b>
            <div style='color:#ccc; font-size:12px; margin-bottom:4px'>{alamat}</div>
            <div style='color:#aaa; font-size:11px; margin-bottom:8px'>{gc_label}</div>
            {divider}
            <div style="margin-top:8px">
              <span style='color:#aaa;font-size:11px'>ID SLS</span><br/><b>{nama_sls}</b><br/>
              <span style='color:#aaa;font-size:11px; margin-top:4px; display:inline-block'>Kecamatan</span><br/><b>{kecamatan}</b><br/>
              <span style='color:#aaa;font-size:11px; margin-top:4px; display:inline-block'>Desa</span><br/><b>{desa}</b>
            </div>
          </div>

          <!-- SISI KANAN: DATA ANGKA -->
          <div style="flex:1; border-left:1px solid #444; padding-left:20px; min-width:120px;">
            <table style='width:100%; font-size:12px; border-collapse:collapse; color:#eee;'>
               <tr style='border-bottom:1px solid #333'>
                   <td style='padding:5px 0; color:#aaa'>Total Bangunan</td>
                   <td style='padding:5px 0; text-align:right; font-weight:bold;'>{total_bangunan}</td>
               </tr>
               <tr style='border-bottom:1px solid #333'>
                   <td style='padding:5px 0; color:#aaa'>Sudah Didatangi</td>
                   <td style='padding:5px 0; text-align:right; font-weight:bold; color:#f7d07e'>{sudah_terdata}</td>
               </tr>
               <tr style='border-bottom:1px solid #333'>
                   <td style='padding:5px 0; color:#aaa'>Belum Didatangi</td>
                   <td style='padding:5px 0; text-align:right; font-weight:bold; color:#f77e7e'>{belum_terdata}</td>
               </tr>
               <tr style='border-bottom:1px solid #333'>
                   <td style='padding:5px 0; color:#aaa'>Jumlah Usaha</td>
                   <td style='padding:5px 0; text-align:right; font-weight:bold; color:#7ef7a0'>{jumlah_usaha}</td>
               </tr>
               <tr>
                   <td style='padding:5px 0; color:#aaa'>Jumlah Keluarga</td>
                   <td style='padding:5px 0; text-align:right; font-weight:bold; color:#a0d7f7'>{jumlah_keluarga}</td>
               </tr>
            </table>
          </div>
        </div>
    """,
    "style": {
        "backgroundColor": "#1a1a2e", "color": "#e0f0ff",
        "padding": "12px 14px", "borderRadius": "8px",
        "border": "1px solid #4444aa", "maxWidth": "320px",
    }
}

deck = pdk.Deck(layers=layers, initial_view_state=view_state, map_style="dark", tooltip=tooltip)
st.pydeck_chart(deck, width="stretch", height=680)

# Legenda
# if show_sls and show_counting:
#     st.markdown("**Legenda SLS:**  `0` &nbsp;|&nbsp;  `1–9` &nbsp;|&nbsp;  `10–49` &nbsp;|&nbsp;  `50–99` &nbsp;|&nbsp;  `100+`")
# if show_build:
#     st.markdown("**Legenda Bangunan:** 🟠 Bangunan Usaha &nbsp;|&nbsp; 🔵 Bangunan Rumah Tangga")

# ─────────────────────────────────────────────
# STATISTIK
# ─────────────────────────────────────────────
st.write("---")
df_usaha_stat = load_usaha()

c1, c2, c3, c4 = st.columns(4)
c1.metric("Total SLS ditampilkan", f"{len(gdf_sls_display):,}")
c2.metric("Total Unit Usaha", f"{len(df_usaha_stat):,}")
c3.metric("SLS dengan usaha", f"{(gdf_sls_display['jumlah_usaha'] > 0).sum():,}")
c4.metric("Rata-rata usaha/SLS", f"{gdf_sls_display['jumlah_usaha'].mean():.1f}")

st.write("---")
st.subheader("Statistik Bangunan Per Wilayah Terpilih")

gdf_build = load_building()
if not gdf_build.empty:
    valid_idsls_b = set(gdf_sls_display["idsls_str"].dropna().unique())
    gdf_build_stats = gdf_build[gdf_build["idsls_str"].isin(valid_idsls_b)]
    
    # Hitung metrik bangunan sesuai dengan rule yang diminta
    # Total Bangunan = Semua OSM
    # Sudah Didatangi = Bangunan Usaha / Rumah Tangga
    # Belum Didatangi = Kosong
    aktif_bangunan = gdf_build_stats
    total_bangunan = len(aktif_bangunan)
    sudah_terdata = len(aktif_bangunan[aktif_bangunan["status_bangunan"] != "Belum Terdata"])
    belum_terdata = len(aktif_bangunan[aktif_bangunan["status_bangunan"] == "Belum Terdata"])
    
    cb1, cb2, cb3 = st.columns(3)
    cb1.metric("Total Bangunan (OSM)", f"{total_bangunan:,}")
    cb2.metric("Sudah Didatangi (Ada RT/Usaha)", f"{sudah_terdata:,}")
    cb3.metric("Belum Didatangi (Kosong Total)", f"{belum_terdata:,}")
else:
    st.info("Data bangunan belum tersedia untuk dihitung.")

# ─────────────────────────────────────────────
# TABEL DETAIL USAHA PER SLS
# ─────────────────────────────────────────────
st.write("---")
st.subheader("Detail Usaha per SLS")

col_left, col_right = st.columns([1, 2])

with col_left:
    st.markdown("**Top 10 SLS — Usaha Terbanyak**")
    top_cols = ["idsls_str", "jumlah_usaha"]
    if kec_col:  top_cols.append(kec_col)
    if desa_col: top_cols.append(desa_col)
    top_sls = (
        gdf_sls_display[top_cols]
        .sort_values("jumlah_usaha", ascending=False)
        .head(10).reset_index(drop=True)
    )
    top_sls.index += 1
    st.dataframe(top_sls, use_container_width=True)

with col_right:
    st.markdown("**Daftar usaha di SLS tertentu**")
    sls_options = (
        gdf_sls_display.sort_values("jumlah_usaha", ascending=False)["idsls_str"]
        .dropna().unique().tolist()
    )
    selected_sls = st.selectbox("Pilih SLS (ID)", ["— pilih SLS —"] + sls_options,
        format_func=lambda x: x if x == "— pilih SLS —" else f"SLS {x}")

    if selected_sls != "— pilih SLS —":
        df_detail = df_usaha_stat[df_usaha_stat["idsls_str"] == selected_sls].copy()
        st.markdown(f"**{len(df_detail):,} usaha** di SLS `{selected_sls}`")
        if not df_detail.empty:
            st.dataframe(
                df_detail[["nama final", "alamat final", "gc final"]].reset_index(drop=True),
                use_container_width=True, height=300,
            )
        else:
            st.info("Tidak ada data usaha untuk SLS ini.")

# ─────────────────────────────────────────────
# DISTRIBUSI
# ─────────────────────────────────────────────
st.write("---")
col_chart1, col_chart2 = st.columns(2)

with col_chart1:
    st.subheader("Total Usaha per Kecamatan")
    if kec_col in gdf_sls_display.columns:
        # Grouping data usaha per kecamatan
        kec_stats = gdf_sls_display.groupby(kec_col)["jumlah_usaha"].sum().sort_values(ascending=False).head(15)
        st.bar_chart(kec_stats, color="#7ef7a0")
    else:
        st.info("Data kecamatan tidak tersedia untuk ditampilkan.")

with col_chart2:
    st.subheader("Status Pendataan Bangunan")
    if not gdf_build.empty:
        # Menghitung total kategori bangunan untuk wilayah yang dipilih
        status_counts = gdf_build_stats["status_bangunan"].value_counts()
        # Filter hanya yang relevan untuk pendataan
        if "Belum Terdata" in status_counts:
            st.bar_chart(status_counts, color="#f77e7e")
        else:
            st.bar_chart(status_counts)
    else:
        st.info("Data statistik bangunan tidak tersedia.")