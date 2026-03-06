import streamlit as st
import geopandas as gpd
import pydeck as pdk
import pandas as pd
import os

st.set_page_config(page_title="B-SPATIAL BANYUWANGI", layout="wide")

st.markdown("""
<style>
    .stApp { background-color: #0e1117; }
    .block-container { padding-top: 1rem; }
    h1 { color: #e0f0ff; font-family: 'Courier New', monospace; letter-spacing: 2px; }
</style>
""", unsafe_allow_html=True)

st.title("B-SPATIAL BANYUWANGI")
st.caption("Monitoring SLS & Bangunan — powered by WebGL (pydeck)")

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
    parquet_path = "data/osm-building.parquet"
    geojson_path = "data/osm-building.geojson"
    if os.path.exists(parquet_path):
        gdf = gpd.read_parquet(parquet_path)
    else:
        st.warning("Parquet belum ada, loading dari GeoJSON (lambat).")
        gdf = gpd.read_file(geojson_path)
    gdf = gdf.to_crs(epsg=4326)
    gdf["geometry"] = gdf.simplify(0.00005, preserve_topology=True)
    if len(gdf) > 30_000:
        gdf = gdf.sample(30_000, random_state=42)
    return gdf

GSHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRI9DTFAbw8KbLPdcBbqSutIiTiDcEZLrDvdhOcQ7n53ckypw_p5Pi9WFt1-nmrMbL5WI7KUut42xQn/pub?gid=1280473743&single=true&output=csv"

@st.cache_data(ttl=300)  # auto-refresh setiap 5 menit
def load_usaha():
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
    df["idsls_str"] = df["idsls final"].apply(
        lambda x: str(int(float(x))) if pd.notna(x) else None
    )
    return df

@st.cache_data
def merge_sls_dengan_count():
    gdf_sls = load_sls()
    df_usaha = load_usaha()

    count_df = (
        df_usaha.dropna(subset=["idsls_str"])
        .groupby("idsls_str")
        .size()
        .reset_index(name="jumlah_usaha")
    )

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
        gdf_sls = gdf_sls.merge(count_df, on="idsls_str", how="left")
        gdf_sls["jumlah_usaha"] = gdf_sls["jumlah_usaha"].fillna(0).astype(int)
    else:
        gdf_sls["jumlah_usaha"] = 0

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
show_kab      = st.sidebar.checkbox("Kabupaten Border", value=True)
show_sls      = st.sidebar.checkbox("SLS (warna = jumlah usaha)", value=True)
show_usaha    = st.sidebar.checkbox("Titik Usaha", value=False)
show_build    = st.sidebar.checkbox("Bangunan OSM (sample 30k)", value=False)
show_counting = st.sidebar.checkbox("Mode Choropleth", value=True)

st.sidebar.markdown("---")
st.sidebar.subheader("Opacity")
sls_opacity   = st.sidebar.slider("SLS opacity", 0.0, 1.0, 0.3, 0.05)
build_opacity = st.sidebar.slider("Bangunan opacity", 0.0, 1.0, 0.6, 0.05)

st.sidebar.markdown("---")
st.sidebar.subheader("Data Google Sheets")
if st.sidebar.button("Refresh Data Sekarang"):
    st.cache_data.clear()
    st.rerun()
st.sidebar.caption("Auto-refresh tiap 5 menit")

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
        get_line_color=[0, 150, 255, 220], get_line_width=200, pickable=False))

# Layer SLS
if show_sls:
    sls_rows = []
    for _, row in gdf_sls_display.iterrows():
        geom = row.geometry
        if geom is None: continue
        jumlah = int(row.get("jumlah_usaha", 0))
        color  = jumlah_to_color(jumlah) if show_counting else [160, 32, 240, int(sls_opacity * 255)]
        props  = {
            "color": color,
            "jumlah_usaha": jumlah,
            "nama_sls": str(row.get("idsls_str", "-")),
            "kecamatan": str(row.get(kec_col,  "-")) if kec_col  else "-",
            "desa":      str(row.get(desa_col, "-")) if desa_col else "-",
            "nama": "", "alamat": "", "gc_label": "", "divider": "",
        }
        polys = [geom] if geom.geom_type == "Polygon" else list(geom.geoms)
        for poly in polys:
            r = props.copy()
            r["polygon"] = [list(c) for c in poly.exterior.coords]
            sls_rows.append(r)

    layers.append(pdk.Layer("PolygonLayer", data=sls_rows,
        get_polygon="polygon", get_fill_color="color",
        get_line_color=[200, 200, 255, 80], get_line_width=30,
        pickable=True, auto_highlight=True))

# Layer Titik Usaha
df_usaha_filtered = None
if show_usaha:
    with st.spinner("Loading titik usaha..."):
        df_usaha = load_usaha()

    df_f = df_usaha.copy()
    # Filter titik usaha berdasarkan idsls_str yang ada di SLS yang sudah difilter wilayah
    # Ini lebih andal daripada join via kode kecamatan yang formatnya bisa beda
    if filter_kec != "Semua" or filter_desa != "Semua":
        valid_idsls = set(gdf_sls_display["idsls_str"].dropna().unique())
        df_f = df_f[df_f["idsls_str"].isin(valid_idsls)]
    if filter_gc != "Semua":
        gc_val = int(filter_gc.split("—")[0].strip())
        df_f = df_f[df_f["gc final"] == gc_val]
    if filter_nama.strip():
        df_f = df_f[df_f["nama final"].str.contains(filter_nama.strip(), case=False, na=False)]

    # Kalau filter wilayah aktif, tampilkan semua (biasanya jauh lebih sedikit)
    # Kalau global (semua kecamatan), baru di-sample biar tidak berat
    is_filtered = (filter_kec != "Semua" or filter_desa != "Semua" or filter_nama.strip() != "")
    limit = 200_000 if is_filtered else 50_000
    if len(df_f) > limit:
        df_sample = df_f.sample(limit, random_state=42)
        st.sidebar.info(f"Sample {limit:,} dari {len(df_f):,}")
    else:
        df_sample = df_f

    st.sidebar.success(f"{len(df_sample):,} titik ditampilkan")
    df_usaha_filtered = df_sample

    # Lookup pakai semua SLS (bukan hanya display) supaya titik yang idsls-nya ada
    # di luar filter wilayah tetap bisa dapat info nama kec/desa/jumlah usaha
    sls_lookup_cols = ["idsls_str", "jumlah_usaha"]
    if kec_col:  sls_lookup_cols.append(kec_col)
    if desa_col: sls_lookup_cols.append(desa_col)
    sls_lookup = (
        gdf_sls[sls_lookup_cols]
        .drop_duplicates("idsls_str")
        .set_index("idsls_str")
    )

    usaha_data = []
    for _, r in df_sample.iterrows():
        idsls = r.get("idsls_str", None)
        sls_info = sls_lookup.loc[idsls] if idsls and idsls in sls_lookup.index else None
        gc_val = int(r["gc final"]) if pd.notna(r["gc final"]) else 0
        usaha_data.append({
            "lon":          r["long final"],
            "lat":          r["lat final"],
            "nama":         str(r["nama final"]),
            "alamat":       str(r["alamat final"]) if pd.notna(r["alamat final"]) else "-",
            "gc":           gc_val,
            "gc_label":     f"gc: {gc_val}",
            "divider":      "<hr style='margin:6px 0;border-color:#333'/>",
            "color":        gc_to_color(r["gc final"]),
            "nama_sls":     idsls or "-",
            "kecamatan":    str(sls_info[kec_col])  if sls_info is not None and kec_col  else "-",
            "desa":         str(sls_info[desa_col]) if sls_info is not None and desa_col else "-",
            "jumlah_usaha": int(sls_info["jumlah_usaha"]) if sls_info is not None else 0,
        })

    layers.append(pdk.Layer("ScatterplotLayer", data=usaha_data,
        get_position="[lon, lat]", get_color="color",
        get_radius=40, radius_min_pixels=2, radius_max_pixels=10, pickable=True))

# Layer Bangunan
if show_build:
    with st.spinner("Loading bangunan..."):
        gdf_build = load_building()
    build_rows = gdf_to_polygon_rows(gdf_build, [255, 200, 0, int(build_opacity * 255)])
    layers.append(pdk.Layer("PolygonLayer", data=build_rows,
        get_polygon="polygon", get_fill_color="color",
        get_line_color=[255, 140, 0, 150], get_line_width=20, pickable=False))

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

view_state = pdk.ViewState(latitude=center_lat, longitude=center_lon, zoom=zoom, pitch=0)

# Tooltip berbeda untuk SLS vs Titik Usaha
# Pydeck pakai satu tooltip tapi field kosong otomatis disembunyikan
tooltip = {
    "html": """
        <div style='font-size:13px;line-height:1.8;min-width:180px'>
        <b style='font-size:14px;color:#ffe082'>{nama}</b>
        <div style='color:#ccc'>{alamat}</div>
        <div style='color:#aaa;font-size:11px'>{gc_label}</div>
        {divider}
        <span style='color:#aaa;font-size:11px'>SLS</span> <b>{nama_sls}</b><br/>
        <span style='color:#aaa;font-size:11px'>Kecamatan</span> <b>{kecamatan}</b><br/>
        <span style='color:#aaa;font-size:11px'>Desa</span> <b>{desa}</b><br/>
        <span style='color:#aaa;font-size:11px'>Jumlah Usaha</span> <b style='color:#7ef7a0'>{jumlah_usaha}</b>
        </div>
    """,
    "style": {
        "backgroundColor": "#1a1a2e", "color": "#e0f0ff",
        "padding": "12px 14px", "borderRadius": "8px",
        "border": "1px solid #4444aa", "maxWidth": "280px",
    }
}

deck = pdk.Deck(layers=layers, initial_view_state=view_state, map_style="dark", tooltip=tooltip)
st.pydeck_chart(deck, width="stretch", height=680)

# Legenda
if show_sls and show_counting:
    st.markdown("**Legenda:**  `0` &nbsp;|&nbsp;  `1–9` &nbsp;|&nbsp;  `10–49` &nbsp;|&nbsp;  `50–99` &nbsp;|&nbsp;  `100+`")

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
st.subheader("Distribusi Usaha per SLS")
bins   = [0, 1, 10, 50, 100, float("inf")]
labels = ["0 usaha", "1–9", "10–49", "50–99", "100+"]
tmp = gdf_sls_display.copy()
tmp["kategori"] = pd.cut(tmp["jumlah_usaha"], bins=bins, labels=labels, right=False)
st.bar_chart(tmp["kategori"].value_counts().sort_index())