"""
split_parquet_to_chunks.py
==========================
Jalankan SEKALI setiap kali ada update data.
Hasilnya: JSON chunks kecil di folder output/, siap upload ke Supabase Storage.

Cara pakai:
    pip install pandas geopandas pyarrow supabase python-dotenv tqdm
    python split_parquet_to_chunks.py

    # Atau langsung upload ke Supabase:
    python split_parquet_to_chunks.py --upload
"""

import argparse
import json
import math
import os
import sys
from pathlib import Path

import geopandas as gpd
import pandas as pd
from dotenv import load_dotenv
from tqdm import tqdm

load_dotenv()

# ─── Config ──────────────────────────────────────────────────────────────────

INPUT_DIR  = Path("./data-parquet")   # folder berisi file .parquet asli
OUTPUT_DIR = Path("./data-chunks")    # output JSON chunks

# Nama file parquet input
FILES = {
    "usaha":         "data-usaha.parquet",
    "usaha_digital": "data-usaha-digital.parquet",
    "rumah_tangga":  "data-rumah-tangga.parquet",
    "bangunan":      "data-bangunan.parquet",
}

# Kolom kecamatan dan desa — sesuaikan jika nama kolom berbeda
COL_IDKEC  = "idkec"    # atau "kd_kec", "id_kec"
COL_IDDESA = "iddesa"   # atau "kd_desa", "id_desa"
COL_IDSLS  = "idsls"    # atau "idsls final", "id_sls"

# Kolom koordinat
COL_LAT  = "lat final"
COL_LON  = "long final"
COL_GEOM = "geometry"   # untuk bangunan (WKT polygon)

# ─── Helpers ─────────────────────────────────────────────────────────────────

def normalize_idsls(val) -> str | None:
    """Normalisasi idsls: hapus '.0', handle NaN."""
    if pd.isna(val):
        return None
    s = str(val).strip()
    if s.endswith(".0"):
        s = s[:-2]
    return s if s not in ("", "nan", "None") else None


def find_col(df: pd.DataFrame, candidates: list[str]) -> str | None:
    """Cari kolom pertama yang ada di dataframe."""
    for c in candidates:
        if c in df.columns:
            return c
    return None


def safe_val(v):
    """Konversi nilai ke tipe JSON-safe."""
    if pd.isna(v) if not isinstance(v, (list, dict)) else False:
        return None
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    if hasattr(v, "item"):          # numpy scalar
        return v.item()
    if isinstance(v, bytes):
        return v.decode("utf-8", errors="replace")
    return v


def df_to_records(df: pd.DataFrame) -> list[dict]:
    """Konversi DataFrame ke list of plain dicts, JSON-safe."""
    records = []
    cols = list(df.columns)
    for row in df.itertuples(index=False):
        rec = {}
        for c, v in zip(cols, row):
            rec[c] = safe_val(v)
        records.append(rec)
    return records


def write_chunk(data: list[dict], path: Path, label: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"data": data, "count": len(data)}, f,
                  ensure_ascii=False, separators=(",", ":"))
    size_kb = path.stat().st_size / 1024
    print(f"  [OK] {label}: {len(data):,} rows -> {size_kb:.0f} KB -> {path.name}")


# ─── Load helpers ─────────────────────────────────────────────────────────────

def load_titik(filename: str, name: str) -> pd.DataFrame:
    """Load Parquet titik (usaha / RT), normalisasi kolom koordinat & idsls."""
    path = INPUT_DIR / filename
    if not path.exists():
        print(f"  [WARN] {filename} tidak ditemukan, skip.")
        return pd.DataFrame()

    df = pd.read_parquet(path)
    print(f"  Loaded {name}: {len(df):,} rows, kolom: {list(df.columns)[:8]}...")

    # Normalisasi kolom lat/lon
    lat_col = find_col(df, ["lat final", "lat", "latitude", "LAT"])
    lon_col = find_col(df, ["long final", "lon", "longitude", "long", "LON"])
    if lat_col and lat_col != "lat final":
        df = df.rename(columns={lat_col: "lat final"})
    if lon_col and lon_col != "long final":
        df = df.rename(columns={lon_col: "long final"})

    # Hapus baris dengan koordinat tidak valid
    if "lat final" in df.columns and "long final" in df.columns:
        df["lat final"] = pd.to_numeric(df["lat final"], errors="coerce")
        df["long final"] = pd.to_numeric(df["long final"], errors="coerce")
        before = len(df)
        df = df.dropna(subset=["lat final", "long final"])
        df = df[df["lat final"].between(-90, 90) & df["long final"].between(-180, 180)]
        dropped = before - len(df)
        if dropped:
            print(f"    Dropped {dropped:,} baris koordinat invalid")

    # Normalisasi idsls
    idsls_col = find_col(df, ["idsls_str", "idsls final", "idsls", "id_sls", "IDSLS"])
    if idsls_col:
        df["idsls_str"] = df[idsls_col].apply(normalize_idsls)
    else:
        df["idsls_str"] = None

    return df


def load_bangunan(filename: str) -> gpd.GeoDataFrame:
    """Load Parquet bangunan dengan geometry WKT."""
    path = INPUT_DIR / filename
    if not path.exists():
        print(f"  [WARN] {filename} tidak ditemukan, skip.")
        return gpd.GeoDataFrame()

    df = pd.read_parquet(path)
    print(f"  Loaded bangunan: {len(df):,} rows, kolom: {list(df.columns)[:8]}...")

    geom_col = find_col(df, ["geometry", "geom", "GEOMETRY"])
    if not geom_col:
        print("  [WARN] Kolom geometry tidak ditemukan di data bangunan!")
        return gpd.GeoDataFrame()

    # Parse geometry (WKT string atau WKB bytes)
    from shapely import wkt, wkb
    def parse_geom(g):
        if g is None or (isinstance(g, float) and math.isnan(g)):
            return None
        try:
            if isinstance(g, bytes):
                return wkb.loads(g)
            return wkt.loads(str(g))
        except Exception:
            return None

    df[geom_col] = df[geom_col].apply(parse_geom)
    gdf = gpd.GeoDataFrame(df, geometry=geom_col, crs="EPSG:4326")
    gdf = gdf[gdf.geometry.notna() & ~gdf.geometry.is_empty]

    # Normalisasi idsls
    idsls_col = find_col(gdf, ["idsls_str", "idsls final", "idsls", "id_sls"])
    if idsls_col:
        gdf["idsls_str"] = gdf[idsls_col].apply(normalize_idsls)
    else:
        gdf["idsls_str"] = None

    return gdf


# ─── Split logic ──────────────────────────────────────────────────────────────

def resolve_idkec(df: pd.DataFrame) -> pd.Series:
    """Resolve 7-digit Kecamatan ID (idkec) dari berbagai alternatif kolom."""
    res = pd.Series(None, index=df.index, dtype='object')
    
    # 1. Ambil dari idsls_str atau idsls final (first 7 characters)
    idsls_col = find_col(df, ["idsls_str", "idsls final", "idsls", "id_sls"])
    if idsls_col:
        s_sls = df[idsls_col].dropna().astype(str).str.strip().str.replace(".0", "", regex=False)
        s_kec = s_sls[s_sls.str.len() >= 7].str[:7]
        res.update(s_kec)
        
    # 2. Ambil dari kdprov + kdkab + kdkec jika ada sisa yang kosong
    null_mask = res.isna() | (res == "")
    if null_mask.any():
        kdprov_col = find_col(df, ["kdprov", "kd_prov", "idprov"])
        kdkab_col = find_col(df, ["kdkab", "kd_kab", "idkab"])
        kdkec_col = find_col(df, ["kdkec", "kd_kec", "idkec", "id_kec", "IDKEC"])
        if kdprov_col and kdkab_col and kdkec_col:
            concat_kec = (
                df.loc[null_mask, kdprov_col].astype(str).str.strip().str.replace(".0", "", regex=False) +
                df.loc[null_mask, kdkab_col].astype(str).str.strip().str.replace(".0", "", regex=False) +
                df.loc[null_mask, kdkec_col].astype(str).str.strip().str.replace(".0", "", regex=False)
            )
            res.update(concat_kec)
        elif kdkec_col:
            val_kec = df.loc[null_mask, kdkec_col].astype(str).str.strip().str.replace(".0", "", regex=False)
            # Jika hanya 3 digit (misal '010'), tambahkan prefix Banyuwangi '3510'
            val_kec_full = val_kec.apply(lambda x: "3510" + x if len(x) == 3 else x)
            res.update(val_kec_full)
            
    # 3. Ambil dari iddesa (first 7 characters) jika masih ada yang kosong
    null_mask = res.isna() | (res == "")
    if null_mask.any():
        iddesa_col = find_col(df, ["iddesa", "kd_desa", "id_desa", "IDDESA"])
        if iddesa_col:
            s_desa = df.loc[null_mask, iddesa_col].dropna().astype(str).str.strip().str.replace(".0", "", regex=False)
            s_kec = s_desa[s_desa.str.len() >= 7].str[:7]
            res.update(s_kec)
            
    res = res.fillna("").astype(str).str.strip().str.replace(".0", "", regex=False)
    return res


def get_kec_list(df: pd.DataFrame) -> list[str]:
    """Ambil daftar idkec unik dari dataframe."""
    idkec_series = resolve_idkec(df)
    return sorted(idkec_series[idkec_series != ""].unique().tolist())


def split_titik_by_kec(df: pd.DataFrame, dataset: str):
    """Split dataframe titik per kecamatan."""
    if df.empty:
        return

    df = df.copy()
    df["_idkec"] = resolve_idkec(df)
    
    # Filter out empty idkec
    df = df[df["_idkec"] != ""]
    if df.empty:
        print(f"  [WARN] Tidak ada idkec valid untuk {dataset}, skip.")
        return

    for kec, grp in tqdm(df.groupby("_idkec"), desc=f"  Split {dataset}", leave=False):
        grp = grp.drop(columns=["_idkec"])
        records = df_to_records(grp)
        out_path = OUTPUT_DIR / dataset / f"kec_{kec}.json"
        write_chunk(records, out_path, f"{dataset}/kec_{kec}")

    # Juga simpan manifest: idkec -> count
    manifest = df.groupby("_idkec").size().to_dict()
    manifest_path = OUTPUT_DIR / dataset / "_manifest.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"  [OK] Manifest {dataset}: {len(manifest)} kecamatan")


def split_bangunan_by_kec(gdf: gpd.GeoDataFrame):
    """Split bangunan per kecamatan. Geometry disimpan sebagai WKT string."""
    if gdf.empty:
        return

    gdf = gdf.copy()
    gdf["_idkec"] = resolve_idkec(gdf)
    
    gdf = gdf[gdf["_idkec"] != ""]
    if gdf.empty:
        print("  [WARN] Tidak ada idkec valid untuk bangunan, skip.")
        return

    # Konversi geometry ke WKT string untuk JSON
    gdf["geometry"] = gdf.geometry.apply(lambda g: g.wkt if g is not None else None)
    df = pd.DataFrame(gdf.drop(columns=[gdf.geometry.name] if hasattr(gdf, 'geometry') else []))

    for kec, grp in tqdm(df.groupby("_idkec"), desc="  Split bangunan", leave=False):
        grp = grp.drop(columns=["_idkec"])
        records = df_to_records(grp)
        out_path = OUTPUT_DIR / "bangunan" / f"kec_{kec}.json"
        write_chunk(records, out_path, f"bangunan/kec_{kec}")

    manifest = df.groupby("_idkec").size().to_dict()
    manifest_path = OUTPUT_DIR / "bangunan" / "_manifest.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"  [OK] Manifest bangunan: {len(manifest)} kecamatan")


def download_from_supabase_if_needed():
    """Download file asli dari Supabase Storage jika belum ada di data-parquet/"""
    INPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    url = os.environ.get("SUPABASE_URL")
    if not url:
        print("[ERROR] SUPABASE_URL tidak ditemukan di env!")
        return
        
    url = url.rstrip("/")
    files_to_download = [
        "data-usaha.parquet",
        "data-usaha-digital.parquet",
        "data-rumah-tangga.parquet",
        "data-bangunan.parquet",
        "sls-after-ea-sls-2024.json",
        "peta-kabupaten-banyuwangi.geojson"
    ]
    
    import requests
    for filename in files_to_download:
        dest_path = INPUT_DIR / filename
        if dest_path.exists() and dest_path.stat().st_size > 0:
            print(f"  [OK] {filename} sudah ada di lokal.")
            continue
            
        public_url = f"{url}/storage/v1/object/public/spatial-data/{filename}"
        print(f"  Downloading {filename} from Supabase...")
        try:
            r = requests.get(public_url, stream=True)
            if r.status_code == 200:
                with open(dest_path, "wb") as f:
                    for chunk in r.iter_content(chunk_size=8192):
                        f.write(chunk)
                print(f"    Downloaded {filename} -> {dest_path.stat().st_size / 1024 / 1024:.2f} MB")
            else:
                print(f"    [WARN] Gagal download {filename}: HTTP {r.status_code}")
        except Exception as e:
            print(f"    [WARN] Error download {filename}: {e}")


def find_col_dict(d: dict, candidates: list[str]):
    for c in candidates:
        if c in d:
            return d[c]
    return None


def normalize_id_str(val) -> str:
    if pd.isna(val) if 'pd' in globals() else (val is None):
        return ""
    s = str(val).strip()
    if s.endswith(".0"):
        s = s[:-2]
    return s


def split_sls_and_generate_manifest():
    """Split sls-after-ea-sls-2024.json by idkec dan buat wilayah_manifest.json"""
    sls_path = INPUT_DIR / "sls-after-ea-sls-2024.json"
    if not sls_path.exists():
        print("  [WARN] sls-after-ea-sls-2024.json tidak ditemukan, skip split SLS & manifest.")
        return

    print("\n[SLS & MANIFEST] Memproses SLS GeoJSON (ini mungkin memakan waktu)...")
    try:
        with open(sls_path, "r", encoding="utf-8") as f:
            geojson = json.load(f)
    except Exception as e:
        print(f"  [ERROR] Gagal membaca SLS GeoJSON: {e}")
        return

    features = geojson.get("features", [])
    print(f"    Loaded {len(features):,} SLS features.")

    # 1. Klasifikasi data & relasi Kec -> Desa untuk Manifest
    manifest_data = {}
    grouped_features = {}

    for feat in tqdm(features, desc="  Memproses SLS"):
        props = feat.get("properties", {})
        
        # Cari idkec & nmkec
        idkec_raw = find_col_dict(props, ["idkec", "kd_kec", "id_kec", "IDKEC"])
        nmkec = find_col_dict(props, ["nmkec", "nm_kec", "kecamatan", "NMKEC"]) or "-"
        
        # Cari iddesa & nmdesa
        iddesa_raw = find_col_dict(props, ["iddesa", "kd_desa", "id_desa", "IDDESA"])
        nmdesa = find_col_dict(props, ["nmdesa", "nm_desa", "desa", "kelurahan", "NMDESA"]) or "-"

        if idkec_raw is None:
            continue

        idkec_str = normalize_id_str(idkec_raw)
        iddesa_str = normalize_id_str(iddesa_raw) if iddesa_raw is not None else None

        if not idkec_str:
            continue

        # Tambahkan ke grup feature
        if idkec_str not in grouped_features:
            grouped_features[idkec_str] = []
        
        feat_copy = json.loads(json.dumps(feat)) # deepcopy
        feat_copy["properties"]["idsls_str"] = normalize_id_str(
            find_col_dict(props, ["idsls", "id_sls", "IDSLS", "kode_sls", "id"])
        )
        feat_copy["properties"]["idkec"] = idkec_str
        if iddesa_str:
            feat_copy["properties"]["iddesa"] = iddesa_str
            
        grouped_features[idkec_str].append(feat_copy)

        # Tambahkan ke data manifest
        if idkec_str not in manifest_data:
            manifest_data[idkec_str] = {
                "name": str(nmkec).strip().upper(),
                "desa": {}
            }
        
        if iddesa_str:
            manifest_data[idkec_str]["desa"][iddesa_str] = str(nmdesa).strip().upper()

    # 2. Simpan pecahan SLS per kecamatan
    sls_out_dir = OUTPUT_DIR / "sls"
    sls_out_dir.mkdir(parents=True, exist_ok=True)
    
    for kec_id, kec_feats in tqdm(grouped_features.items(), desc="  Menulis chunks SLS", leave=False):
        out_path = sls_out_dir / f"kec_{kec_id}.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump({
                "type": "FeatureCollection",
                "features": kec_feats,
                "count": len(kec_feats)
            }, f, ensure_ascii=False, separators=(",", ":"))

    # 3. Format & Simpan wilayah_manifest.json
    manifest_list = []
    for kec_id, data in sorted(manifest_data.items()):
        desa_list = []
        for d_id, d_name in sorted(data["desa"].items()):
            desa_list.append({
                "iddesa": d_id,
                "nama": d_name
            })
        manifest_list.append({
            "idkec": kec_id,
            "nama": data["name"],
            "desa": desa_list
        })

    manifest_path = OUTPUT_DIR / "wilayah_manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump({"kecamatan": manifest_list}, f, indent=2, ensure_ascii=False)
    
    print(f"  [OK] Berhasil membuat {len(grouped_features)} chunks SLS.")
    print(f"  [OK] Manifest wilayah disimpan -> {manifest_path.name} ({len(manifest_list)} kecamatan)")


# ─── Upload ke Supabase ───────────────────────────────────────────────────────

def upload_to_supabase():
    """Upload semua file JSON chunks ke Supabase Storage bucket 'spatial-chunks'."""
    try:
        from supabase import create_client
    except ImportError:
        print("[ERROR] Install dulu: pip install supabase")
        sys.exit(1)

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("[ERROR] Set SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env")
        sys.exit(1)

    sb = create_client(url, key)
    bucket = "spatial-chunks"

    # Pastikan bucket ada (buat jika belum)
    try:
        sb.storage.create_bucket(bucket, options={"public": True})
        print(f"  Bucket '{bucket}' dibuat")
    except Exception:
        pass  # Sudah ada

    # Upload semua file
    all_files = list(OUTPUT_DIR.rglob("*.json"))
    print(f"\nUpload {len(all_files)} file ke Supabase Storage bucket '{bucket}'...")

    for fpath in tqdm(all_files, desc="Upload"):
        # Storage path: "usaha/kec_1234.json"
        storage_path = str(fpath.relative_to(OUTPUT_DIR)).replace("\\", "/")

        with open(fpath, "rb") as f:
            content = f.read()

        try:
            # Upsert (overwrite jika sudah ada)
            sb.storage.from_(bucket).upload(
                path=storage_path,
                file=content,
                file_options={
                    "content-type": "application/json",
                    "cache-control": "public, max-age=86400",  # 24 jam cache
                    "upsert": "true",
                }
            )
        except Exception as e:
            print(f"  [ERROR] Gagal upload {storage_path}: {e}")

    print(f"\n[OK] Upload selesai. {len(all_files)} file di bucket '{bucket}'")
    print(f"   Public URL: {url}/storage/v1/object/public/{bucket}/")


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    global INPUT_DIR, OUTPUT_DIR
    parser = argparse.ArgumentParser(description="Split Parquet -> JSON chunks")
    parser.add_argument("--upload", action="store_true",
                        help="Upload hasil ke Supabase Storage setelah selesai")
    parser.add_argument("--input-dir", default=str(INPUT_DIR),
                        help="Folder berisi file .parquet")
    parser.add_argument("--output-dir", default=str(OUTPUT_DIR),
                        help="Folder output JSON chunks")
    args = parser.parse_args()

    INPUT_DIR  = Path(args.input_dir)
    OUTPUT_DIR = Path(args.output_dir)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("DOWNLOAD RAW DATA FROM SUPABASE")
    print("=" * 60)
    download_from_supabase_if_needed()

    print("\n" + "=" * 60)
    print("SPLIT PARQUET -> JSON CHUNKS")
    print("=" * 60)

    # 1. Data usaha
    print("\n[1/5] Data usaha biasa...")
    df_usaha = load_titik(FILES["usaha"], "usaha")
    split_titik_by_kec(df_usaha, "usaha")

    # 2. Data usaha digital
    print("\n[2/5] Data usaha digital...")
    df_usaha_dig = load_titik(FILES["usaha_digital"], "usaha_digital")
    split_titik_by_kec(df_usaha_dig, "usaha_digital")

    # 3. Data rumah tangga
    print("\n[3/5] Data rumah tangga...")
    df_rt = load_titik(FILES["rumah_tangga"], "rumah_tangga")
    split_titik_by_kec(df_rt, "rumah_tangga")

    # 4. Data bangunan
    print("\n[4/5] Data bangunan (dengan geometry)...")
    gdf_bangunan = load_bangunan(FILES["bangunan"])
    split_bangunan_by_kec(gdf_bangunan)

    # 5. Data SLS & Manifest
    print("\n[5/5] Data SLS & Manifest...")
    split_sls_and_generate_manifest()

    # Summary ukuran file
    print("\n" + "=" * 60)
    print("SUMMARY UKURAN CHUNKS")
    print("=" * 60)
    for dataset in ["usaha", "usaha_digital", "rumah_tangga", "bangunan", "sls"]:
        folder = OUTPUT_DIR / dataset
        if not folder.exists():
            continue
        files = list(folder.glob("kec_*.json"))
        if not files:
            continue
        sizes = [f.stat().st_size / 1024 for f in files]
        total_mb = sum(sizes) / 1024
        print(f"  {dataset:20s} {len(files):4d} chunks  "
              f"min={min(sizes):.0f}KB  max={max(sizes):.0f}KB  "
              f"total={total_mb:.1f}MB")

    # Check manifest size too
    manifest_file = OUTPUT_DIR / "wilayah_manifest.json"
    if manifest_file.exists():
        print(f"  {'wilayah_manifest':20s}    1 file    size={manifest_file.stat().st_size / 1024:.1f}KB")

    if args.upload:
        print("\n" + "=" * 60)
        print("UPLOAD KE SUPABASE STORAGE")
        print("=" * 60)
        upload_to_supabase()
    else:
        print("\n[OK] Selesai! Jalankan dengan --upload untuk upload ke Supabase.")
        print(f"   Output ada di: {OUTPUT_DIR.resolve()}")


if __name__ == "__main__":
    main()