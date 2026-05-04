import streamlit as st
import geopandas as gpd
import pydeck as pdk
import pandas as pd
import os
import requests
import io
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

st.set_page_config(page_title="TENTORING SE2026", page_icon="logo.svg", layout="wide")

st.markdown("""
<style>
    .stApp { background-color: #0e1117; }
    .block-container { padding-top: 1rem; }
    h1 { color: #e0f0ff; font-family: 'Courier New', monospace; letter-spacing: 2px; }
</style>
""", unsafe_allow_html=True)

st.title("TENTORING SE2026")
st.caption("Sistem Monitoring Bangunan Usaha Kabupaten Banyuwangi")
st.sidebar.image("logo.svg", width=60)

# ─────────────────────────────────────────────
# DATABASE & AUTHENTICATION (SUPABASE)
# ─────────────────────────────────────────────
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
LOGIN_URL = os.environ.get("LOGIN_URL", "http://localhost:5173/login")
GSHEET_URL = os.environ.get("GSHEET_URL")

if not SUPABASE_URL or not SUPABASE_KEY or not GSHEET_URL:
    st.error("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and GSHEET_URL must be set in .env")
    st.stop()

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def _load_user_from_supabase(user_id: str) -> bool:
    """
    Ambil profil + wilayah penugasan dari Supabase dan simpan ke session_state.
    Return True jika berhasil.
    """
    res_prof = supabase.table("profiles").select("*").eq("id", user_id).execute()
    if not res_prof.data:
        return False

    st.session_state["user"] = res_prof.data[0]

    res_assign = supabase.table("assignments").select("*").eq("user_id", user_id).execute()
    assignments = res_assign.data if res_assign.data else []

    st.session_state["assigned_iddesa"] = [
        str(a.get("iddesa", a.get("kd_desa", ""))).strip()
        for a in assignments if a.get("iddesa") or a.get("kd_desa")
    ]
    st.session_state["assigned_idkec"] = [
        str(a.get("idkec", a.get("kd_kec", ""))).strip()
        for a in assignments if a.get("idkec") or a.get("kd_kec")
    ]
    return True


# ── 1. Cek parameter URL: One-Time Code (OTC) ──────────────────────────────────
query_params = st.query_params
if "code" in query_params:
    otc_code = query_params["code"]
    try:
        res_otc = supabase.table("otc_tokens").select("user_id").eq("token", otc_code).execute()
        if res_otc.data:
            user_id = res_otc.data[0]["user_id"]

            if _load_user_from_supabase(user_id):
                # Simpan user_id untuk keperluan refresh otomatis
                st.session_state["user_id"] = user_id
                st.query_params["u"] = user_id
            # Hapus OTC agar tidak bisa dipakai ulang
            supabase.table("otc_tokens").delete().eq("token", otc_code).execute()

            # Bersihkan URL
            st.query_params.clear()
            st.rerun()
        else:
            st.error("Token sesi tidak valid atau sudah kadaluarsa (sekali pakai).")
            st.stop()
    except Exception as e:
        st.error(f"Gagal melakukan validasi sesi: {e}")
        st.stop()


# ── 2. Refresh otomatis: user_id sudah tersimpan tapi profil hilang ────────────
#    Ini yang menyelesaikan masalah session hilang saat browser refresh.
#    OTC sudah dihapus, tapi user_id masih ada di session_state (selama tab tidak ditutup).
if "user_id" in st.session_state and "user" not in st.session_state:
    user_id = st.session_state["user_id"]
    try:
        _load_user_from_supabase(user_id)
    except Exception as e:
        st.warning(f"Gagal memuat ulang sesi: {e}")
        st.session_state.clear()
        st.rerun()


# ── 3. Cek apakah user sudah terotentikasi ─────────────────────────────────────
# Pindahkan pengecekan ke awal agar tidak ada UI yang muncul sebelum login valid
if "user" not in st.session_state:
    st.markdown(f'<meta http-equiv= "refresh" content="0; url={LOGIN_URL}?back=true">', unsafe_allow_html=True)
    # Lakukan auto-redirect ke portal login dengan parameter ?back=true
    # Ini akan memicu portal untuk otomatis login ulang (jika sesi Supabase masih ada)
    # dan melempar balik ke Streamlit dengan token baru secara cepat (SSO).
    st.markdown(f"""
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 80vh;">
            <div class="spinner"></div>
            <h3 style="color: #e0f0ff; font-family: sans-serif; margin-top: 20px;">Sinkronisasi Sesi...</h3>
            <p style="color: #aaa; font-family: sans-serif;">Mohon tunggu, sedang memulihkan sesi Anda.</p>
        </div>
        <style>
            .spinner {{
                border: 4px solid rgba(255, 255, 255, 0.1);
                width: 36px;
                height: 36px;
                border-radius: 50%;
                border-left-color: #09f;
                animation: spin 1s linear infinite;
            }}
            @keyframes spin {{
                to {{ transform: rotate(360deg); }}
            }}
        </style>
        <script>
            window.location.href = "{LOGIN_URL}?back=true";
        </script>
    """, unsafe_allow_html=True)
    st.stop()


# ── Info user aktif ─────────────────────────────────────────────────────────────
curr_user = st.session_state["user"]
role = str(curr_user.get("role", "petugas")).lower()
petugas_name = curr_user.get("full_name") or curr_user.get("email") or "Petugas"
assigned_iddesa = st.session_state.get("assigned_iddesa", [])
assigned_idkec  = st.session_state.get("assigned_idkec", [])

st.sidebar.markdown(f"**{petugas_name}**")
st.sidebar.caption(f"Role: **{role.upper()}**")
# if role != "admin":
#     st.sidebar.caption(f"Wilayah Tugas: {len(assigned_iddesa)} Desa, {len(assigned_idkec)} Kecamatan")
if role == "ppl":
    st.sidebar.caption(f"Wilayah Tugas: {len(assigned_iddesa)} Desa")
if role == "pml":
    st.sidebar.caption(f"Wilayah Tugas: {len(assigned_idkec)} Kecamatan")

if role in ("ppl", "pml"):
    st.markdown("""
    <style>
        /* Sembunyikan semua toolbar action di dataframe (termasuk download) */
        [data-testid="stElementToolbarButton"] { display: none !important; }
    </style>
    """, unsafe_allow_html=True)

# ─────────────────────────────────────────────
# LOAD DATA
# ─────────────────────────────────────────────

def get_public_url(filename):
    """Menghasilkan public URL dari Supabase Storage bucket 'spatial-data'"""
    base = SUPABASE_URL.rstrip("/")
    return f"{base}/storage/v1/object/public/spatial-data/{filename}"

@st.cache_data(ttl=3600)
def load_kab():
    url = get_public_url("peta-kabupaten-banyuwangi.geojson")
    try:
        r = requests.get(url)
        r.raise_for_status()
        return gpd.read_file(io.BytesIO(r.content)).to_crs(epsg=4326)
    except Exception as e:
        st.error(f"Gagal memuat peta kabupaten dari Supabase: {e}")
        return gpd.GeoDataFrame()

@st.cache_data(ttl=3600)
def load_sls():
    url = get_public_url("sls-after-ea-sls-2024.json")
    try:
        r = requests.get(url)
        r.raise_for_status()
        return gpd.read_file(io.BytesIO(r.content)).to_crs(epsg=4326)
    except Exception as e:
        st.error(f"Gagal memuat SLS dari Supabase: {e}")
        return gpd.GeoDataFrame()

@st.cache_data(ttl=3600)
def load_building():
    url = get_public_url("data-bangunan.parquet")
    try:
        r = requests.get(url)
        r.raise_for_status()
        
        # Baca sebagai pandas biasa dulu
        df = pd.read_parquet(io.BytesIO(r.content))
        
        # Cek kolom geometry
        geom_col = next((c for c in df.columns if c.lower() in ["geometry", "geom"]), None)
        
        if geom_col:
            from shapely import wkt, wkb
            # Coba parse geometry (bisa WKT string atau WKB bytes)
            try:
                df[geom_col] = df[geom_col].apply(
                    lambda g: wkb.loads(g) if isinstance(g, bytes) else wkt.loads(str(g))
                )
            except Exception:
                df[geom_col] = gpd.GeoSeries.from_wkt(df[geom_col].astype(str))
            
            return gpd.GeoDataFrame(df, geometry=geom_col, crs="EPSG:4326")
        else:
            st.error("Kolom geometry tidak ditemukan di file bangunan.")
            return gpd.GeoDataFrame()
    except Exception as e:
        st.error(f"Gagal memuat data bangunan dari Supabase: {e}")
        return gpd.GeoDataFrame()


@st.cache_data(ttl=300)
def load_usaha():
    url = get_public_url("data-usaha.parquet")
    try:
        r = requests.get(url)
        r.raise_for_status()
        df = pd.read_parquet(io.BytesIO(r.content))
    except Exception as e:
        st.error(f"Gagal memuat data usaha dari Supabase: {e}")
        return pd.DataFrame()

    lat_col   = next((c for c in df.columns if "lat"  in c.lower()), None)
    lon_col   = next((c for c in df.columns if "long" in c.lower() or "lon" in c.lower()), None)
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

@st.cache_data(ttl=300)
def load_usaha_digital():
    url = get_public_url("data-usaha-digital.parquet")
    try:
        r = requests.get(url)
        r.raise_for_status()
        df = pd.read_parquet(io.BytesIO(r.content))
    except Exception as e:
        return pd.DataFrame()

    lat_col   = next((c for c in df.columns if "lat"  in c.lower()), None)
    lon_col   = next((c for c in df.columns if "long" in c.lower() or "lon" in c.lower()), None)
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

@st.cache_data(ttl=3600)
def load_rumah_tangga():
    url = get_public_url("data-rumah-tangga.parquet")
    try:
        r = requests.get(url)
        r.raise_for_status()
        return pd.read_parquet(io.BytesIO(r.content))
    except Exception as e:
        st.error(f"Gagal memuat data rumah tangga dari Supabase: {e}")
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
    stats['sudah_terdata']  = stats['Bangunan Usaha'] + stats['Rumah Tangga']
    stats['belum_terdata']  = stats['Belum Terdata']
    return stats[['total_bangunan', 'sudah_terdata', 'belum_terdata']].reset_index()

@st.cache_data
def merge_sls_dengan_count():
    gdf_sls  = load_sls()
    df_usaha = load_usaha()
    df_usaha_dig = load_usaha_digital()
    df_rt    = load_rumah_tangga()

    count_usaha = (
        df_usaha.dropna(subset=["idsls_str"])
        .groupby("idsls_str").size()
        .reset_index(name="jumlah_usaha")
    )

    if not df_usaha_dig.empty:
        count_usaha_dig = (
            df_usaha_dig.dropna(subset=["idsls_str"])
            .groupby("idsls_str").size()
            .reset_index(name="jumlah_usaha_digital")
        )
    else:
        count_usaha_dig = pd.DataFrame(columns=["idsls_str", "jumlah_usaha_digital"])

    if not df_rt.empty:
        count_keluarga = (
            df_rt.dropna(subset=["idsls_str"])
            .groupby("idsls_str").size()
            .reset_index(name="jumlah_keluarga")
        )
    else:
        count_keluarga = pd.DataFrame(columns=["idsls_str", "jumlah_keluarga"])

    id_candidates = ["idsls", "id_sls", "IDSLS", "ID_SLS", "kode_sls", "id"]
    sls_id_col = next((c for c in id_candidates if c in gdf_sls.columns), None)
    if sls_id_col is None:
        non_geom   = [c for c in gdf_sls.columns if c != "geometry"]
        sls_id_col = non_geom[0] if non_geom else None

    if sls_id_col:
        def norm(v):
            s = str(v).strip()
            return s[:-2] if s.endswith(".0") else s

        gdf_sls["idsls_str"] = gdf_sls[sls_id_col].apply(norm)
        gdf_sls = gdf_sls.merge(count_usaha,   on="idsls_str", how="left")
        gdf_sls["jumlah_usaha"]    = gdf_sls["jumlah_usaha"].fillna(0).astype(int)
        gdf_sls = gdf_sls.merge(count_usaha_dig, on="idsls_str", how="left")
        gdf_sls["jumlah_usaha_digital"] = gdf_sls["jumlah_usaha_digital"].fillna(0).astype(int)
        gdf_sls = gdf_sls.merge(count_keluarga, on="idsls_str", how="left")
        gdf_sls["jumlah_keluarga"] = gdf_sls["jumlah_keluarga"].fillna(0).astype(int)

        stats_df = get_building_stats()
        if not stats_df.empty:
            gdf_sls = gdf_sls.merge(stats_df, on="idsls_str", how="left")
            gdf_sls["total_bangunan"] = gdf_sls["total_bangunan"].fillna(0).astype(int)
            gdf_sls["sudah_terdata"]  = gdf_sls["sudah_terdata"].fillna(0).astype(int)
            gdf_sls["belum_terdata"]  = gdf_sls["belum_terdata"].fillna(0).astype(int)
        else:
            gdf_sls["total_bangunan"] = 0
            gdf_sls["sudah_terdata"]  = 0
            gdf_sls["belum_terdata"]  = 0
    else:
        gdf_sls["jumlah_usaha"]    = 0
        gdf_sls["jumlah_usaha_digital"] = 0
        gdf_sls["jumlah_keluarga"] = 0
        gdf_sls["total_bangunan"]  = 0
        gdf_sls["sudah_terdata"]   = 0
        gdf_sls["belum_terdata"]   = 0

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

kec_col  = next((c for c in ["nmkec",  "kec",  "kecamatan"] if c in gdf_sls.columns), None)
desa_col = next((c for c in ["nmdesa", "desa", "kelurahan"]  if c in gdf_sls.columns), None)


# ── Filter wilayah untuk PPL/PML ──────────────────────────────────────────────
if role != "admin":
    if not gdf_sls.empty:
        match_kec  = pd.Series(False, index=gdf_sls.index)
        match_desa = pd.Series(False, index=gdf_sls.index)

        if "idkec" in gdf_sls.columns and assigned_idkec:
            s_idkec  = gdf_sls["idkec"].astype(str).str.replace(".0", "", regex=False)
            match_kec = s_idkec.isin(assigned_idkec)

        if "iddesa" in gdf_sls.columns and assigned_iddesa:
            s_iddesa  = gdf_sls["iddesa"].astype(str).str.replace(".0", "", regex=False)
            match_desa = s_iddesa.isin(assigned_iddesa)

        # Pisahkan logika filter berdasarkan role agar PPL tidak melihat seluruh kecamatan
        if role == "ppl":
            gdf_sls = gdf_sls[match_desa]
        elif role == "pml":
            gdf_sls = gdf_sls[match_kec]
        else:
            gdf_sls = gdf_sls[match_kec | match_desa]

    if gdf_sls.empty:
        st.warning("Anda tidak memiliki data untuk wilayah penugasan terkait.")
        st.stop()

kec_list  = sorted(gdf_sls[kec_col].dropna().unique().tolist())  if kec_col  else []
desa_list = sorted(gdf_sls[desa_col].dropna().unique().tolist()) if desa_col else []


# ─────────────────────────────────────────────
# SIDEBAR
# ─────────────────────────────────────────────
st.sidebar.header("Layer Control")
show_kab      = st.sidebar.checkbox("Batas Kabupaten",          value=True)
show_sls      = st.sidebar.checkbox("SLS",                      value=True)
show_usaha    = st.sidebar.checkbox("Titik Usaha Biasa",        value=False)
show_usaha_dig= st.sidebar.checkbox("Titik Usaha Digital",      value=False)
show_rt       = st.sidebar.checkbox("Titik Rumah Tangga",       value=False)
show_build    = st.sidebar.checkbox("Bangunan (Usaha & RT)",    value=False)
enable_3d     = st.sidebar.checkbox("Mode 3D Bangunan",         value=False)
show_counting = st.sidebar.checkbox("Mode Choropleth",          value=False)

st.sidebar.markdown("---")
st.sidebar.subheader("Filter Wilayah")
filter_kec = st.sidebar.selectbox("Kecamatan", ["Semua"] + kec_list) if kec_list else "Semua"
if desa_list and desa_col and kec_col and filter_kec != "Semua":
    desa_options = sorted(gdf_sls[gdf_sls[kec_col] == filter_kec][desa_col].dropna().unique().tolist())
else:
    desa_options = desa_list
filter_desa = st.sidebar.selectbox("Desa/Kelurahan", ["Semua"] + desa_options) if desa_options else "Semua"

st.sidebar.markdown("---")
filter_nama = st.sidebar.text_input("Cari nama usaha", placeholder="contoh: BAKSO")

st.sidebar.markdown("---")
st.sidebar.subheader("Opacity")
sls_opacity   = st.sidebar.slider("SLS opacity",      0.0, 1.0, 0.3, 0.05)
build_opacity = st.sidebar.slider("Bangunan opacity", 0.0, 1.0, 0.6, 0.05)

st.sidebar.markdown("---")
if st.sidebar.button("Refresh Data Sekarang"):
    st.cache_data.clear()
    st.rerun()

# ── Kontrol Admin & Logout ────────────────────────────────────────────────────
if role == "admin":
    st.sidebar.link_button("User Management (Portal)", "http://localhost:5173/users", use_container_width=True)

if st.sidebar.button("Keluar (Log Out)", use_container_width=True):
    # Hapus semua session state Streamlit
    st.session_state.clear()
    # Redirect ke login page dengan flag ?logout=true
    # sehingga login page tahu harus benar-benar logout dari Supabase juga
    st.markdown(
        f'<meta http-equiv="refresh" content="0; url={LOGIN_URL}?logout=true">',
        unsafe_allow_html=True,
    )
    st.stop()


# ─────────────────────────────────────────────
# FILTER SLS
# ─────────────────────────────────────────────
gdf_sls_display = gdf_sls.copy()
if filter_kec  != "Semua" and kec_col:
    gdf_sls_display = gdf_sls_display[gdf_sls_display[kec_col]  == filter_kec]
if filter_desa != "Semua" and desa_col:
    gdf_sls_display = gdf_sls_display[gdf_sls_display[desa_col] == filter_desa]


# ─────────────────────────────────────────────
# BUILD LAYERS
# ─────────────────────────────────────────────
layers = []

# Layer Kabupaten
if show_kab:
    kab_rows = gdf_to_polygon_rows(gdf_kab, [0, 100, 255, 15])
    layers.append(pdk.Layer(
        "PolygonLayer", data=kab_rows,
        get_polygon="polygon", get_fill_color="color",
        get_line_color=[0, 150, 255, 220], get_line_width=80, pickable=False,
    ))

# Layer SLS
if show_sls:
    sls_rows = []
    for _, row in gdf_sls_display.iterrows():
        geom = row.geometry
        if geom is None: continue
        jumlah_usaha    = int(row.get("jumlah_usaha",    0))
        jumlah_keluarga = int(row.get("jumlah_keluarga", 0))
        color = jumlah_to_color(jumlah_usaha) if show_counting else [160, 32, 240, int(sls_opacity * 255)]
        props = {
            "color": color,
            "jumlah_usaha":    str(jumlah_usaha),
            "jumlah_usaha_digital": str(int(row.get("jumlah_usaha_digital", 0))),
            "jumlah_keluarga": str(jumlah_keluarga),
            "total_bangunan":  str(int(row.get("total_bangunan", 0))),
            "sudah_terdata":   str(int(row.get("sudah_terdata",  0))),
            "belum_terdata":   str(int(row.get("belum_terdata",  0))),
            "nama_sls":   str(row.get("idsls_str", "-")),
            "kecamatan":  str(row.get(kec_col,  "-")) if kec_col  else "-",
            "desa":       str(row.get(desa_col, "-")) if desa_col else "-",
            "nama": "Info SLS", "alamat": "Satuan Lingkungan Setempat", "gc_label": "", "divider": "",
        }
        polys = [geom] if geom.geom_type == "Polygon" else list(geom.geoms)
        for poly in polys:
            r = props.copy()
            r["polygon"] = [list(c) for c in poly.exterior.coords]
            sls_rows.append(r)

    layers.append(pdk.Layer(
        "PolygonLayer", data=sls_rows,
        get_polygon="polygon", get_fill_color="color",
        get_line_color=[200, 200, 255, 60],
        get_line_width=2, line_width_min_pixels=1,
        pickable=True, auto_highlight=True,
    ))

# Layer Bangunan
if show_build:
    if role == "admin" and filter_kec == "Semua" and filter_desa == "Semua":
        st.warning("Pilih spesifik Kecamatan/Desa di sidebar untuk memunculkan Polygon Bangunan di Peta (demi kestabilan memory browser).")
    else:
        with st.spinner("Merender bangunan untuk wilayah ini..."):
            gdf_build = load_building()
            if not gdf_build.empty:
                valid_idsls_b = set(gdf_sls_display["idsls_str"].dropna().unique())
                gdf_build_f   = gdf_build[gdf_build["idsls_str"].isin(valid_idsls_b)].copy()

                import ast
                def parse_color(c):
                    if isinstance(c, str):
                        try:    return ast.literal_eval(c)
                        except: return [128, 128, 128, 100]
                    return c

                build_rows = []
                for _, row in gdf_build_f.iterrows():
                    geom = row.geometry
                    if geom is None: continue
                    color = parse_color(row.color)
                    color[3] = int(build_opacity * 255)
                    props = {
                        "fill_color":      color,
                        "nama_sls":        str(row.get("idsls_str",       "-")),
                        "status":          str(row.get("status_bangunan", "-")),
                        "jml_usaha":       str(row.get("jml_usaha",       "0")),
                        "kecamatan":       str(row.get("kecamatan",       "-")),
                        "desa":            str(row.get("desa",            "-")),
                        "nama":            "Bangunan Fisik",
                        "alamat":          "Lihat info SLS di bawah",
                        "gc_label":        "Status: " + str(row.get("status_bangunan", "-")),
                        "divider":         "<hr style='margin:6px 0;border-color:#333'/>",
                        "jumlah_usaha":    str(row.get("jml_usaha", "0")),
                        "jumlah_usaha_digital": "-",
                        "jumlah_keluarga": "-",
                        "total_bangunan":  "-",
                        "sudah_terdata":   "-",
                        "belum_terdata":   "-",
                    }
                    polys = [geom] if geom.geom_type == "Polygon" else list(geom.geoms)
                    for poly in polys:
                        r = props.copy()
                        r["polygon"] = [list(c) for c in poly.exterior.coords]
                        build_rows.append(r)

                if build_rows:
                    layers.append(pdk.Layer(
                        "PolygonLayer", data=build_rows,
                        get_polygon="polygon", get_fill_color="fill_color",
                        extruded=enable_3d, wireframe=True,
                        get_elevation=50, elevation_scale=1,
                        get_line_color=[200, 200, 200, 80],
                        pickable=True, auto_highlight=True,
                    ))

# Layer Titik Usaha
df_usaha_filtered = None
if show_usaha:
    with st.spinner("Loading titik usaha..."):
        df_usaha = load_usaha()

    df_f = df_usaha.copy()
    # PPL/PML sudah terfilter gdf_sls_display-nya sejak awal, jadi selalu filter titik ini ke gdf_sls_display
    valid_idsls = set(gdf_sls_display["idsls_str"].dropna().unique())
    df_f = df_f[df_f["idsls_str"].isin(valid_idsls)]
    
    if filter_nama.strip():
        df_f = df_f[df_f["nama final"].str.contains(filter_nama.strip(), case=False, na=False)]

    df_sample         = df_f.copy()
    df_usaha_filtered = df_sample
    st.sidebar.success(f"{len(df_sample):,} titik ditampilkan")

    sls_lookup_cols = ["idsls_str", "jumlah_usaha"]
    if kec_col:  sls_lookup_cols.append(kec_col)
    if desa_col: sls_lookup_cols.append(desa_col)
    sls_lookup = gdf_sls[sls_lookup_cols].drop_duplicates("idsls_str")
    df_sample  = df_sample.merge(sls_lookup, on="idsls_str", how="left")

    df_sample["kecamatan"]       = df_sample[kec_col].fillna("-").astype(str)  if kec_col  else "-"
    df_sample["desa"]            = df_sample[desa_col].fillna("-").astype(str) if desa_col else "-"
    df_sample["jumlah_usaha"]    = "1"
    df_sample["jumlah_usaha_digital"] = "0"
    df_sample["jumlah_keluarga"] = "0"
    df_sample["nama_sls"]        = df_sample["idsls_str"].fillna("-").astype(str)
    df_sample["nama"]            = df_sample["nama final"].fillna("-").astype(str)
    df_sample["alamat"]          = df_sample["alamat final"].fillna("-").astype(str)
    df_sample["lat"]             = df_sample["lat final"]
    df_sample["lon"]             = df_sample["long final"]
    df_sample["gc"]              = df_sample["gc final"].fillna(0).astype(int)
    df_sample["gc_label"]        = "gc: " + df_sample["gc"].astype(str)
    df_sample["divider"]         = "<hr style='margin:6px 0;border-color:#333'/>"
    df_sample["total_bangunan"]  = "-"
    df_sample["sudah_terdata"]   = "-"
    df_sample["belum_terdata"]   = "-"
    df_sample["color"] = [[255, 220, 50, 220]] * len(df_sample)

    kolom_pydeck = [
        "lon", "lat", "color", "nama", "alamat", "gc_label",
        "divider", "nama_sls", "kecamatan", "desa", "jumlah_usaha", "jumlah_usaha_digital", "jumlah_keluarga",
        "total_bangunan", "sudah_terdata", "belum_terdata",
    ]
    layers.append(pdk.Layer(
        "ScatterplotLayer", data=df_sample[kolom_pydeck],
        get_position=["lon", "lat"], get_color="color",
        get_radius=15, radius_scale=1,
        radius_min_pixels=1, radius_max_pixels=6,
        pickable=True, auto_highlight=True,
    ))

# Layer Titik Usaha Digital
if show_usaha_dig:
    with st.spinner("Loading titik usaha digital..."):
        df_usaha_dig = load_usaha_digital()

    if not df_usaha_dig.empty:
        df_f_dig = df_usaha_dig.copy()
        valid_idsls_dig = set(gdf_sls_display["idsls_str"].dropna().unique())
        df_f_dig = df_f_dig[df_f_dig["idsls_str"].isin(valid_idsls_dig)]
        
        if filter_nama.strip():
            df_f_dig = df_f_dig[df_f_dig["nama final"].str.contains(filter_nama.strip(), case=False, na=False)]

        df_sample_dig = df_f_dig.copy()
        st.sidebar.success(f"{len(df_sample_dig):,} titik digital ditampilkan")

        sls_lookup_cols_dig = ["idsls_str", "jumlah_usaha_digital"]
        if kec_col:  sls_lookup_cols_dig.append(kec_col)
        if desa_col: sls_lookup_cols_dig.append(desa_col)
        sls_lookup_dig = gdf_sls[sls_lookup_cols_dig].drop_duplicates("idsls_str")
        df_sample_dig = df_sample_dig.merge(sls_lookup_dig, on="idsls_str", how="left")

        df_sample_dig["kecamatan"]       = df_sample_dig[kec_col].fillna("-").astype(str)  if kec_col  else "-"
        df_sample_dig["desa"]            = df_sample_dig[desa_col].fillna("-").astype(str) if desa_col else "-"
        df_sample_dig["jumlah_usaha"]    = "0"
        df_sample_dig["jumlah_usaha_digital"] = "1"
        df_sample_dig["jumlah_keluarga"] = "0"
        df_sample_dig["nama_sls"]        = df_sample_dig["idsls_str"].fillna("-").astype(str)
        df_sample_dig["nama"]            = df_sample_dig["nama final"].fillna("-").astype(str)
        df_sample_dig["alamat"]          = df_sample_dig["alamat final"].fillna("-").astype(str)
        df_sample_dig["lat"]             = df_sample_dig["lat final"]
        df_sample_dig["lon"]             = df_sample_dig["long final"]
        
        df_sample_dig["gc"]              = df_sample_dig["gc final"].fillna(0).astype(int) if "gc final" in df_sample_dig.columns else 0
        df_sample_dig["gc_label"]        = "gc: " + df_sample_dig["gc"].astype(str)
        df_sample_dig["divider"]         = "<hr style='margin:6px 0;border-color:#333'/>"
        df_sample_dig["total_bangunan"]  = "-"
        df_sample_dig["sudah_terdata"]   = "-"
        df_sample_dig["belum_terdata"]   = "-"
        df_sample_dig["color"] = pd.Series([[46, 204, 113, 220]] * len(df_sample_dig), index=df_sample_dig.index)

        kolom_pydeck_dig = [
            "lon", "lat", "color", "nama", "alamat", "gc_label",
            "divider", "nama_sls", "kecamatan", "desa", "jumlah_usaha", "jumlah_usaha_digital", "jumlah_keluarga",
            "total_bangunan", "sudah_terdata", "belum_terdata",
        ]
        
        for col in kolom_pydeck_dig:
            if col not in df_sample_dig.columns:
                df_sample_dig[col] = "-"
        
        layers.append(pdk.Layer(
            "ScatterplotLayer", data=df_sample_dig[kolom_pydeck_dig],
            get_position=["lon", "lat"], get_color="color",
            get_radius=15, radius_scale=1,
            radius_min_pixels=1, radius_max_pixels=6,
            pickable=True, auto_highlight=True,
        ))

# Layer Titik Rumah Tangga
if show_rt:
    if role == "admin" and filter_kec == "Semua" and filter_desa == "Semua":
        st.warning("Pilih spesifik Kecamatan/Desa di sidebar untuk memunculkan Titik Rumah Tangga (demi kestabilan memory browser).")
    else:
        with st.spinner("Loading titik rumah tangga..."):
            df_rt = load_rumah_tangga()

        df_rt_f = df_rt.copy()
        valid_idsls = set(gdf_sls_display["idsls_str"].dropna().unique())
        df_rt_f = df_rt_f[df_rt_f["idsls_str"].isin(valid_idsls)]

        st.sidebar.success(f"{len(df_rt_f):,} titik RT ditampilkan")
        df_rt_sample = df_rt_f.copy()

        sls_lookup_cols = ["idsls_str", "jumlah_usaha"]
        if kec_col:  sls_lookup_cols.append(kec_col)
        if desa_col: sls_lookup_cols.append(desa_col)
        sls_lookup_rt = gdf_sls[sls_lookup_cols].drop_duplicates("idsls_str")
        df_rt_sample  = df_rt_sample.merge(sls_lookup_rt, on="idsls_str", how="left")

        df_rt_sample["kecamatan"]       = df_rt_sample[kec_col].fillna("-").astype(str)  if kec_col  else "-"
        df_rt_sample["desa"]            = df_rt_sample[desa_col].fillna("-").astype(str) if desa_col else "-"
        df_rt_sample["jumlah_usaha"]    = "0"
        df_rt_sample["jumlah_usaha_digital"] = "0"
        df_rt_sample["jumlah_keluarga"] = "1"
        df_rt_sample["nama_sls"]        = df_rt_sample["idsls_str"].fillna("-").astype(str)
        df_rt_sample["nama"]            = "Rumah Tangga"
        if "nama_kk" in df_rt_sample.columns:
            df_rt_sample.loc[df_rt_sample["nama_kk"].notna(), "nama"] = (
                "Rumah Tangga (" + df_rt_sample["nama_kk"].astype(str) + ")"
            )
        df_rt_sample["alamat"]         = "Titik Rumah Tangga"
        df_rt_sample["gc_label"]       = ""
        df_rt_sample["divider"]        = "<hr style='margin:6px 0;border-color:#333'/>"
        df_rt_sample["lat"]            = pd.to_numeric(df_rt_sample["lat final"],  errors="coerce").fillna(0)
        df_rt_sample["lon"]            = pd.to_numeric(df_rt_sample["long final"], errors="coerce").fillna(0)
        df_rt_sample["color"]          = pd.Series([[0, 114, 188, 200]] * len(df_rt_sample), index=df_rt_sample.index)
        df_rt_sample["total_bangunan"] = "-"
        df_rt_sample["sudah_terdata"]  = "-"
        df_rt_sample["belum_terdata"]  = "-"

        rt_kolom_pydeck = [
            "lon", "lat", "color", "nama", "alamat", "gc_label",
            "divider", "nama_sls", "kecamatan", "desa", "jumlah_usaha", "jumlah_usaha_digital", "jumlah_keluarga",
            "total_bangunan", "sudah_terdata", "belum_terdata",
        ]
        layers.append(pdk.Layer(
            "ScatterplotLayer", data=df_rt_sample[rt_kolom_pydeck],
            get_position=["lon", "lat"], get_color="color",
            get_radius=10, radius_scale=1,
            radius_min_pixels=1, radius_max_pixels=4,
            pickable=True, auto_highlight=True,
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

view_state = pdk.ViewState(latitude=center_lat, longitude=center_lon, zoom=zoom, pitch=45, bearing=0)

tooltip = {
    "html": """
        <div style="display:flex; align-items:flex-start; gap:24px;">
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
                   <td style='padding:5px 0; color:#aaa'>Jumlah Usaha Biasa</td>
                   <td style='padding:5px 0; text-align:right; font-weight:bold; color:#7ef7a0'>{jumlah_usaha}</td>
               </tr>
               <tr style='border-bottom:1px solid #333'>
                   <td style='padding:5px 0; color:#aaa'>Jumlah Usaha Digital</td>
                   <td style='padding:5px 0; text-align:right; font-weight:bold; color:#4ade80'>{jumlah_usaha_digital}</td>
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
    },
}

deck = pdk.Deck(layers=layers, initial_view_state=view_state, map_style="dark", tooltip=tooltip)
st.pydeck_chart(deck, width="stretch", height=680)


# ─────────────────────────────────────────────
# STATISTIK
# ─────────────────────────────────────────────
st.write("---")
df_usaha_stat = load_usaha()

c1, c2, c3, c4 = st.columns(4)
c1.metric("Total SLS ditampilkan",  f"{len(gdf_sls_display):,}")
c2.metric("Total Unit Usaha",       f"{len(df_usaha_stat):,}")
c3.metric("SLS dengan usaha",       f"{(gdf_sls_display['jumlah_usaha'] > 0).sum():,}")
c4.metric("Rata-rata usaha/SLS",    f"{gdf_sls_display['jumlah_usaha'].mean():.1f}")

st.write("---")
st.subheader("Statistik Bangunan Per Wilayah Terpilih")

gdf_build = load_building()
if not gdf_build.empty:
    valid_idsls_b  = set(gdf_sls_display["idsls_str"].dropna().unique())
    gdf_build_stats = gdf_build[gdf_build["idsls_str"].isin(valid_idsls_b)]

    total_bangunan = len(gdf_build_stats)
    sudah_terdata  = len(gdf_build_stats[gdf_build_stats["status_bangunan"] != "Belum Terdata"])
    belum_terdata  = len(gdf_build_stats[gdf_build_stats["status_bangunan"] == "Belum Terdata"])

    cb1, cb2, cb3 = st.columns(3)
    cb1.metric("Total Bangunan (OSM)",             f"{total_bangunan:,}")
    cb2.metric("Sudah Didatangi (Ada RT/Usaha)",   f"{sudah_terdata:,}")
    cb3.metric("Belum Didatangi (Kosong Total)",   f"{belum_terdata:,}")
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
    sls_options  = gdf_sls_display.sort_values("jumlah_usaha", ascending=False)["idsls_str"].dropna().unique().tolist()
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
        kec_stats = gdf_sls_display.groupby(kec_col)["jumlah_usaha"].sum().sort_values(ascending=False).head(15)
        st.bar_chart(kec_stats, color="#7ef7a0")
    else:
        st.info("Data kecamatan tidak tersedia untuk ditampilkan.")

with col_chart2:
    st.subheader("Status Pendataan Bangunan")
    if not gdf_build.empty:
        status_counts = gdf_build_stats["status_bangunan"].value_counts()
        if "Belum Terdata" in status_counts:
            st.bar_chart(status_counts, color="#f77e7e")
        else:
            st.bar_chart(status_counts)
    else:
        st.info("Data statistik bangunan tidak tersedia.")