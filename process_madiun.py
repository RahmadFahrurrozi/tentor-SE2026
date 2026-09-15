"""
process_madiun.py
=================
Skrip pemrosesan lengkap data spasial Kota Madiun (3577):
1. Membaca data/madiun/peta_sls_202513577-madiun.geojson:
   - Membuat SLS JSON Chunks per Kecamatan (sls/kec_3577010.json, sls/kec_3577020.json, sls/kec_3577030.json)
   - Membuat sls/_manifest.json
   - Menghasilkan wilayah_manifest.json (daftar resmi 3 kecamatan & 27 kelurahan)
   - Menghasilkan portal/public/data/madiun-regions.json (batas kelurahan)
   - Menghasilkan portal/public/data/peta-kabupaten-madiun.geojson (batas kota)
2. Membaca data/madiun/usaha-biasa-madiun.parquet:
   - Membuat usaha JSON Chunks per Kecamatan (usaha/kec_*.json)
   - Membuat usaha/_manifest.json
3. (Opsional) Mengunggah seluruh chunks & manifest ke Supabase Storage bucket 'spatial-chunks-madiun'.

Cara pakai:
    python process_madiun.py
    python process_madiun.py --upload
"""

import argparse
import json
import math
import os
from pathlib import Path
import geopandas as gpd
import pandas as pd
from dotenv import load_dotenv
from tqdm import tqdm

load_dotenv()

SLS_FILE = Path("data/madiun/peta_sls_202513577-madiun.geojson")
USAHA_FILE = Path("data/madiun/usaha-biasa-madiun.parquet")
OUTPUT_DIR = Path("./data-chunks-madiun")
PORTAL_PUBLIC_DATA = Path("portal/public/data")
BUCKET_NAME = "spatial-chunks-madiun"


def safe_val(v):
    if pd.isna(v) if not isinstance(v, (list, dict)) else False:
        return None
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    if hasattr(v, "item"):
        return v.item()
    return v


def df_to_records(df: pd.DataFrame) -> list[dict]:
    records = []
    cols = list(df.columns)
    for row in df.itertuples(index=False):
        rec = {}
        for c, v in zip(cols, row):
            rec[c] = safe_val(v)
        records.append(rec)
    return records


def process_sls_and_boundaries():
    print("\n" + "=" * 60)
    print("1. PROSES DATA POLIGON SLS & BATAS WILAYAH KOTA MADIUN")
    print("=" * 60)

    if not SLS_FILE.exists():
        print(f"[ERROR] File {SLS_FILE} tidak ditemukan!")
        return None, None

    print(f"Membaca {SLS_FILE}...")
    gdf = gpd.read_file(SLS_FILE)
    print(f"Total poligon SLS: {len(gdf):,}")

    # Normalisasi atribut standar portal
    gdf["kdprov"] = gdf["kdprov"].fillna("35").astype(str).str.zfill(2)
    gdf["kdkab"] = gdf["kdkab"].fillna("77").astype(str).str.zfill(2)
    gdf["kdkec"] = gdf["kdkec"].astype(str).str.zfill(3)
    gdf["kddesa"] = gdf["kddesa"].astype(str).str.zfill(3)

    gdf["idkec"] = gdf["kdprov"] + gdf["kdkab"] + gdf["kdkec"]
    gdf["iddesa"] = gdf["idkec"] + gdf["kddesa"]

    # idsls_str pakai idsubsls (16 digit) jika ada, fallback ke idsls (14 digit)
    gdf["idsls_str"] = gdf["idsubsls"].fillna(gdf["idsls"]).astype(str).str.strip().str.replace(".0", "", regex=False)
    gdf["nmkec"] = gdf["nmkec"].fillna("").astype(str).str.strip().str.upper()
    gdf["nmdesa"] = gdf["nmdesa"].fillna("").astype(str).str.strip().str.upper()
    gdf["nmsls"] = gdf["nmsls"].fillna("").astype(str).str.strip()

    # Ekstrak data wilayah_manifest
    wilayah_dict = {}
    for _, row in gdf.drop_duplicates(subset=["idkec", "iddesa"]).iterrows():
        k_id = row["idkec"]
        k_nm = row["nmkec"]
        d_id = row["iddesa"]
        d_nm = row["nmdesa"]

        if k_id not in wilayah_dict:
            wilayah_dict[k_id] = {"nama": k_nm, "desa": {}}
        wilayah_dict[k_id]["desa"][d_id] = d_nm

    # Buat wilayah_manifest.json
    wilayah_list = []
    for k_id in sorted(wilayah_dict.keys()):
        desa_list = []
        for d_id in sorted(wilayah_dict[k_id]["desa"].keys()):
            desa_list.append({"iddesa": d_id, "nama": wilayah_dict[k_id]["desa"][d_id]})
        wilayah_list.append({
            "idkec": k_id,
            "nama": wilayah_dict[k_id]["nama"],
            "desa": desa_list
        })

    wilayah_manifest_path = OUTPUT_DIR / "wilayah_manifest.json"
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(wilayah_manifest_path, "w", encoding="utf-8") as f:
        json.dump({"total_kecamatan": len(wilayah_list), "kecamatan": wilayah_list}, f, ensure_ascii=False, indent=2)
    print(f"  [OK] Disimpan: {wilayah_manifest_path} ({len(wilayah_list)} kecamatan, {sum(len(k['desa']) for k in wilayah_list)} kelurahan)")

    # Simpan SLS Chunks per kecamatan
    sls_out_dir = OUTPUT_DIR / "sls"
    sls_out_dir.mkdir(parents=True, exist_ok=True)
    sls_manifest = {"total_kecamatan": 0, "total_features": 0, "kecamatan": {}}

    for kec_id, group in gdf.groupby("idkec"):
        kec_geojson = json.loads(group.to_json())
        out_path = sls_out_dir / f"kec_{kec_id}.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump({
                "type": "FeatureCollection",
                "features": kec_geojson.get("features", []),
                "count": len(group)
            }, f, ensure_ascii=False, separators=(",", ":"))

        size_kb = out_path.stat().st_size / 1024
        print(f"  [OK] SLS kec_{kec_id} ({wilayah_dict.get(kec_id, {}).get('nama', kec_id)}): {len(group):,} poligon -> {size_kb:.0f} KB")
        sls_manifest["kecamatan"][kec_id] = len(group)
        sls_manifest["total_features"] += len(group)
        sls_manifest["total_kecamatan"] += 1

    with open(sls_out_dir / "_manifest.json", "w", encoding="utf-8") as f:
        json.dump(sls_manifest, f, ensure_ascii=False, indent=2)

    # 4. Generate batas kelurahan (madiun-regions.json) & batas kota (peta-kabupaten-madiun.geojson)
    PORTAL_PUBLIC_DATA.mkdir(parents=True, exist_ok=True)
    print("\nMenghasilkan file batas kelurahan dan kota untuk portal...")
    
    desa_gdf = gdf.dissolve(by=["idkec", "iddesa", "nmkec", "nmdesa"], as_index=False)
    desa_json_path = PORTAL_PUBLIC_DATA / "madiun-regions.json"
    desa_gdf.to_file(desa_json_path, driver="GeoJSON")
    print(f"  [OK] Disimpan batas kelurahan: {desa_json_path} ({len(desa_gdf)} kelurahan)")

    kab_gdf = gdf.dissolve()
    kab_json_path = PORTAL_PUBLIC_DATA / "peta-kabupaten-madiun.geojson"
    kab_gdf.to_file(kab_json_path, driver="GeoJSON")
    print(f"  [OK] Disimpan batas kota: {kab_json_path}")

    return wilayah_list, sls_manifest


def process_usaha():
    print("\n" + "=" * 60)
    print("2. PROSES DATA TITIK USAHA KOTA MADIUN")
    print("=" * 60)

    if not USAHA_FILE.exists():
        print(f"[WARN] File {USAHA_FILE} tidak ditemukan, skip.")
        return

    df = pd.read_parquet(USAHA_FILE)
    print(f"Total baris mentah: {len(df):,}")

    if "nama usaha" in df.columns and "nama final" not in df.columns:
        df["nama final"] = df["nama usaha"]
    if "alamat" in df.columns and "alamat final" not in df.columns:
        df["alamat final"] = df["alamat"]

    df["lat final"] = pd.to_numeric(df["lat final"], errors="coerce")
    df["long final"] = pd.to_numeric(df["long final"], errors="coerce")
    df = df.dropna(subset=["lat final", "long final"])
    df = df[df["lat final"].between(-90, 90) & df["long final"].between(-180, 180)]

    df["idsls_str"] = df["idsls_str"].astype(str).str.strip().str.replace(".0", "", regex=False)
    df["_idkec"] = df["idsls_str"].str[:7]
    df = df[df["_idkec"].str.startswith("3577")]

    usaha_out_dir = OUTPUT_DIR / "usaha"
    usaha_out_dir.mkdir(parents=True, exist_ok=True)
    manifest_usaha = {"total_kecamatan": 0, "total_rows": 0, "kecamatan": {}}

    for idkec, group in df.groupby("_idkec"):
        grp = group.drop(columns=["_idkec"])
        records = df_to_records(grp)

        out_path = usaha_out_dir / f"kec_{idkec}.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump({"data": records, "count": len(records)}, f, ensure_ascii=False, separators=(",", ":"))

        size_kb = out_path.stat().st_size / 1024
        print(f"  [OK] Usaha kec_{idkec}: {len(records):,} rows -> {size_kb:.0f} KB")

        manifest_usaha["kecamatan"][idkec] = len(records)
        manifest_usaha["total_rows"] += len(records)
        manifest_usaha["total_kecamatan"] += 1

    with open(usaha_out_dir / "_manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest_usaha, f, ensure_ascii=False, indent=2)

    print(f"  [OK] Selesai chunk usaha ({manifest_usaha['total_rows']:,} baris).")


def process_kk():
    print("\n" + "=" * 60)
    print("3. PROSES DATA TITIK KK / RUMAH TANGGA KOTA MADIUN")
    print("=" * 60)
    csv_file = Path("data/madiun/KK_madiun.csv")
    parquet_file = Path("data/madiun/KK_madiun.parquet")

    if csv_file.exists() and csv_file.stat().st_size > 100:
        print(f"Membaca CSV: {csv_file}...")
        df = pd.read_csv(csv_file, sep=";", dtype={"idsls": str, "latitude": str, "longitude": str})
    elif parquet_file.exists() and parquet_file.stat().st_size > 5000:
        print(f"Membaca Parquet: {parquet_file}...")
        df = pd.read_parquet(parquet_file)
    else:
        print("[WARN] File KK_madiun.csv / KK_madiun.parquet tidak ditemukan atau kosong, skip.")
        return

    print(f"Total baris mentah KK: {len(df):,}")
    if len(df) == 0:
        return

    # Normalisasi kolom nama dan alamat
    nama_col = [c for c in df.columns if "nama" in c.lower()]
    if nama_col and "nama final" not in df.columns:
        df["nama final"] = df[nama_col[0]]
    alamat_col = [c for c in df.columns if "alamat" in c.lower()]
    if alamat_col and "alamat final" not in df.columns:
        df["alamat final"] = df[alamat_col[0]]

    # Normalisasi lat & long (tangani pemisah koma desimal Indonesia)
    lat_col = [c for c in df.columns if "lat" in c.lower()][0]
    lon_col = [c for c in df.columns if "long" in c.lower() or "lon" in c.lower()][0]
    df["lat final"] = df[lat_col].astype(str).str.replace(",", ".").str.strip()
    df["long final"] = df[lon_col].astype(str).str.replace(",", ".").str.strip()
    df["lat final"] = pd.to_numeric(df["lat final"], errors="coerce")
    df["long final"] = pd.to_numeric(df["long final"], errors="coerce")
    df = df.dropna(subset=["lat final", "long final"])
    df = df[df["lat final"].between(-90, 90) & df["long final"].between(-180, 180)]

    idsls_col = [c for c in df.columns if "sls" in c.lower()][0]
    df["idsls_str"] = df[idsls_col].astype(str).str.strip().str.replace(".0", "", regex=False)
    df["_idkec"] = df["idsls_str"].str[:7]
    df = df[df["_idkec"].str.startswith("3577")]

    rt_out_dir = OUTPUT_DIR / "rumah_tangga"
    rt_out_dir.mkdir(parents=True, exist_ok=True)
    manifest_rt = {"total_kecamatan": 0, "total_rows": 0, "kecamatan": {}}

    for idkec, group in df.groupby("_idkec"):
        grp = group.drop(columns=["_idkec"])
        records = df_to_records(grp)
        out_path = rt_out_dir / f"kec_{idkec}.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump({"data": records, "count": len(records)}, f, ensure_ascii=False, separators=(",", ":"))

        size_kb = out_path.stat().st_size / 1024
        print(f"  [OK] KK kec_{idkec}: {len(records):,} rows -> {size_kb:.0f} KB")
        manifest_rt["kecamatan"][idkec] = len(records)
        manifest_rt["total_rows"] += len(records)
        manifest_rt["total_kecamatan"] += 1

    with open(rt_out_dir / "_manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest_rt, f, ensure_ascii=False, indent=2)
    print(f"  [OK] Selesai chunk KK ({manifest_rt['total_rows']:,} baris).")


def process_bangunan():
    print("\n" + "=" * 60)
    print("4. PROSES DATA TITIK BANGUNAN LAINNYA KOTA MADIUN")
    print("=" * 60)
    csv_file = Path("data/madiun/bangunan_lainnya_madiun.csv")
    parquet_file = Path("data/madiun/bangunan_lainnya_madiun.parquet")

    if csv_file.exists() and csv_file.stat().st_size > 100:
        print(f"Membaca CSV: {csv_file}...")
        df = pd.read_csv(csv_file, sep=";", dtype={"idsls": str, "latitude": str, "longitude": str})
    elif parquet_file.exists() and parquet_file.stat().st_size > 5000:
        print(f"Membaca Parquet: {parquet_file}...")
        df = pd.read_parquet(parquet_file)
    else:
        print("[WARN] File bangunan_lainnya_madiun.csv / .parquet tidak ditemukan atau kosong, skip.")
        return

    print(f"Total baris mentah Bangunan Lainnya: {len(df):,}")
    if len(df) == 0:
        return

    nama_col = [c for c in df.columns if "nama" in c.lower()]
    if nama_col and "nama final" not in df.columns:
        df["nama final"] = df[nama_col[0]]
    alamat_col = [c for c in df.columns if "alamat" in c.lower()]
    if alamat_col and "alamat final" not in df.columns:
        df["alamat final"] = df[alamat_col[0]]

    lat_col = [c for c in df.columns if "lat" in c.lower()][0]
    lon_col = [c for c in df.columns if "long" in c.lower() or "lon" in c.lower()][0]
    df["lat final"] = df[lat_col].astype(str).str.replace(",", ".").str.strip()
    df["long final"] = df[lon_col].astype(str).str.replace(",", ".").str.strip()
    df["lat final"] = pd.to_numeric(df["lat final"], errors="coerce")
    df["long final"] = pd.to_numeric(df["long final"], errors="coerce")
    df = df.dropna(subset=["lat final", "long final"])
    df = df[df["lat final"].between(-90, 90) & df["long final"].between(-180, 180)]

    idsls_col = [c for c in df.columns if "sls" in c.lower()][0]
    df["idsls_str"] = df[idsls_col].astype(str).str.strip().str.replace(".0", "", regex=False)
    df["_idkec"] = df["idsls_str"].str[:7]
    df = df[df["_idkec"].str.startswith("3577")]

    bg_out_dir = OUTPUT_DIR / "bangunan"
    bg_out_dir.mkdir(parents=True, exist_ok=True)
    manifest_bg = {"total_kecamatan": 0, "total_rows": 0, "kecamatan": {}}

    for idkec, group in df.groupby("_idkec"):
        grp = group.drop(columns=["_idkec"])
        records = df_to_records(grp)
        out_path = bg_out_dir / f"kec_{idkec}.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump({"data": records, "count": len(records)}, f, ensure_ascii=False, separators=(",", ":"))

        size_kb = out_path.stat().st_size / 1024
        print(f"  [OK] Bangunan kec_{idkec}: {len(records):,} rows -> {size_kb:.0f} KB")
        manifest_bg["kecamatan"][idkec] = len(records)
        manifest_bg["total_rows"] += len(records)
        manifest_bg["total_kecamatan"] += 1

    with open(bg_out_dir / "_manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest_bg, f, ensure_ascii=False, indent=2)
    print(f"  [OK] Selesai chunk Bangunan Lainnya ({manifest_bg['total_rows']:,} baris).")


def upload_to_supabase():
    print("\n" + "=" * 60)
    print(f"5. MENGUNGGAH KE SUPABASE STORAGE (BUCKET: '{BUCKET_NAME}')")
    print("=" * 60)

    try:
        from supabase import create_client
    except ImportError:
        print("[ERROR] Library supabase belum terinstall. Jalankan: pip install supabase")
        return

    sb_url = os.environ.get("SUPABASE_URL")
    sb_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not sb_url or not sb_key:
        print("[ERROR] SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum di-set di file .env")
        return

    sb = create_client(sb_url, sb_key)

    files_to_upload = []
    
    wilayah_manifest = OUTPUT_DIR / "wilayah_manifest.json"
    if wilayah_manifest.exists():
        files_to_upload.append((wilayah_manifest, "wilayah_manifest.json"))

    for folder in ["usaha", "sls", "rumah_tangga", "bangunan"]:
        f_dir = OUTPUT_DIR / folder
        if f_dir.exists():
            for p in f_dir.glob("*.json"):
                files_to_upload.append((p, f"{folder}/{p.name}"))

    print(f"Menemukan {len(files_to_upload)} file untuk diunggah...")
    success = 0
    for local_path, storage_path in tqdm(files_to_upload, desc="Uploading to Supabase"):
        with open(local_path, "rb") as fcontent:
            try:
                sb.storage.from_(BUCKET_NAME).upload(
                    path=storage_path,
                    file=fcontent,
                    file_options={
                        "content-type": "application/json",
                        "cache-control": "public, max-age=86400",
                        "upsert": "true"
                    }
                )
                success += 1
            except Exception as e:
                print(f"Gagal upload {storage_path}: {e}")

    print(f"\n[OK] Berhasil mengunggah {success}/{len(files_to_upload)} file ke bucket '{BUCKET_NAME}'")


def main():
    parser = argparse.ArgumentParser(description="Proses data spasial Kota Madiun untuk Web-GIS SE2026.")
    parser.add_argument("--upload", action="store_true", help="Upload hasil chunk ke Supabase Storage")
    args = parser.parse_args()

    process_sls_and_boundaries()
    process_usaha()
    process_kk()
    process_bangunan()

    if args.upload:
        upload_to_supabase()
    else:
        print("\n[INFO] Data lokal siap di folder 'data-chunks-madiun' dan 'portal/public/data'.")
        print("Untuk mengunggah ke Supabase Storage, jalankan:")
        print("  python process_madiun.py --upload")


if __name__ == "__main__":
    main()
