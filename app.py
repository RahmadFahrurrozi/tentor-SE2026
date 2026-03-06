import streamlit as st
import geopandas as gpd
import pydeck as pdk
import pandas as pd
import numpy as np
import os

st.set_page_config(page_title="B-SPATIAL BANYUWANGI", layout="wide")

# --- CUSTOM CSS ---
st.markdown("""
<style>
    .stApp { background-color: #0e1117; }
    .block-container { padding-top: 1rem; }
    h1 { color: #e0f0ff; font-family: 'Courier New', monospace; letter-spacing: 2px; }
    .metric-label { color: #8899aa !important; }
    .metric-value { color: #00e5ff !important; }
</style>
""", unsafe_allow_html=True)

st.title("📡 B-SPATIAL BANYUWANGI")
st.caption("Monitoring SLS & Bangunan — powered by WebGL (pydeck)")

# ─────────────────────────────────────────────
# LOAD DATA
# ─────────────────────────────────────────────

@st.cache_data
def load_kab():
    gdf = gpd.read_file("data/peta-kabupaten-banyuwangi.geojson")
    gdf = gdf.to_crs(epsg=4326)
    return gdf

@st.cache_data
def load_sls():
    gdf = gpd.read_file("data/sls-after-ea-sls-2024.json")
    gdf = gdf.to_crs(epsg=4326)
    return gdf

@st.cache_data
def load_building():
    """
    Load bangunan — coba parquet dulu (cepat), fallback ke geojson.
    Kalau mau hemat: jalankan sekali convert_to_parquet() dulu.
    """
    parquet_path = "data/osm-building.parquet"
    geojson_path = "data/osm-building.geojson"

    if os.path.exists(parquet_path):
        gdf = gpd.read_parquet(parquet_path)
    else:
        st.warning("⚠️ Parquet belum ada, loading dari GeoJSON (lambat). Jalankan convert_to_parquet() dulu.")
        gdf = gpd.read_file(geojson_path)

    gdf = gdf.to_crs(epsg=4326)
    # Simplify
    gdf["geometry"] = gdf.simplify(0.00005, preserve_topology=True)
    # Sample max 30k — pydeck WebGL bisa handle ini tanpa nge-lag
    if len(gdf) > 30_000:
        gdf = gdf.sample(30_000, random_state=42)
    return gdf


def gdf_to_pydeck_geojson(gdf: gpd.GeoDataFrame) -> dict:
    """Convert GeoDataFrame ke dict GeoJSON untuk pydeck."""
    return gdf.__geo_interface__


def gdf_to_polygon_data(gdf: gpd.GeoDataFrame, color: list) -> list:
    """
    Convert GeoDataFrame polygon ke format pydeck PolygonLayer.
    Jauh lebih ringan dari GeoJsonLayer untuk data besar.
    """
    rows = []
    for geom in gdf.geometry:
        if geom is None:
            continue
        if geom.geom_type == "Polygon":
            coords = [list(c) for c in geom.exterior.coords]
            rows.append({"polygon": coords, "color": color})
        elif geom.geom_type == "MultiPolygon":
            for part in geom.geoms:
                coords = [list(c) for c in part.exterior.coords]
                rows.append({"polygon": coords, "color": color})
    return rows


# ─────────────────────────────────────────────
# SIDEBAR
# ─────────────────────────────────────────────
st.sidebar.header("🗂 Layer Control")
show_kab   = st.sidebar.checkbox("Kabupaten Border", value=True)
show_sls   = st.sidebar.checkbox("Tampilkan SLS", value=True)
show_build = st.sidebar.checkbox("Tampilkan Bangunan (sample 30k)", value=False)

st.sidebar.markdown("---")
st.sidebar.subheader("🎨 Opacity")
sls_opacity   = st.sidebar.slider("SLS opacity", 0.0, 1.0, 0.15, 0.05)
build_opacity = st.sidebar.slider("Bangunan opacity", 0.0, 1.0, 0.6, 0.05)

# ─────────────────────────────────────────────
# LOAD
# ─────────────────────────────────────────────
with st.spinner("Loading data..."):
    gdf_kab = load_kab()
    gdf_sls = load_sls()

layers = []

# --- Layer: Kabupaten ---
if show_kab:
    kab_data = gdf_to_polygon_data(gdf_kab, [0, 100, 255])
    layers.append(
        pdk.Layer(
            "PolygonLayer",
            data=kab_data,
            get_polygon="polygon",
            get_fill_color=[0, 100, 255, 20],
            get_line_color=[0, 100, 255, 200],
            get_line_width=150,
            pickable=False,
        )
    )

# --- Layer: SLS ---
if show_sls:
    sls_data = gdf_to_polygon_data(gdf_sls, [160, 32, 240])
    layers.append(
        pdk.Layer(
            "PolygonLayer",
            data=sls_data,
            get_polygon="polygon",
            get_fill_color=[160, 32, 240, int(sls_opacity * 255)],
            get_line_color=[160, 32, 240, 180],
            get_line_width=50,
            pickable=True,
        )
    )

# --- Layer: Building ---
gdf_build = None
if show_build:
    with st.spinner("Loading bangunan (WebGL render)..."):
        gdf_build = load_building()

    build_data = gdf_to_polygon_data(gdf_build, [255, 200, 0])
    layers.append(
        pdk.Layer(
            "PolygonLayer",
            data=build_data,
            get_polygon="polygon",
            get_fill_color=[255, 200, 0, int(build_opacity * 255)],
            get_line_color=[255, 140, 0, 180],
            get_line_width=20,
            pickable=True,
        )
    )

# ─────────────────────────────────────────────
# RENDER MAP
# ─────────────────────────────────────────────
view_state = pdk.ViewState(
    latitude=-8.2192,
    longitude=114.3691,
    zoom=9,
    pitch=0,
)

deck = pdk.Deck(
    layers=layers,
    initial_view_state=view_state,
    map_style="mapbox://styles/mapbox/dark-v10",
    tooltip={"text": "SLS / Bangunan"},
)

st.pydeck_chart(deck, use_container_width=True, height=680)

# ─────────────────────────────────────────────
# STATS
# ─────────────────────────────────────────────
st.write("---")
c1, c2, c3 = st.columns(3)
c1.metric("Total SLS", f"{len(gdf_sls):,}")
c2.metric("Wilayah Kabupaten", f"{len(gdf_kab):,} polygon")
if gdf_build is not None:
    c3.metric("Bangunan ditampilkan", f"{len(gdf_build):,}")
else:
    c3.info("Aktifkan layer bangunan di sidebar")

# ─────────────────────────────────────────────
# UTILITY: Konversi sekali ke parquet (jalankan manual)
# ─────────────────────────────────────────────
with st.expander("⚙️ Tools: Konversi GeoJSON → Parquet (jalankan sekali)"):
    st.code("""
# Jalankan di terminal / notebook sekali saja:
import geopandas as gpd

gdf = gpd.read_file("data/osm-building.geojson")
gdf.to_parquet("data/osm-building.parquet")
print("Done! Cek ukuran file-nya, harusnya jauh lebih kecil.")
""", language="python")
    st.info("Setelah ada file .parquet, app akan otomatis pakai yang itu (lebih cepat 5-10x load-nya).")