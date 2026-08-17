import os
import json
import glob
from pathlib import Path
from tqdm import tqdm
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SLS_DIR = Path("data/3515 poligon sls")
OUTPUT_DIR = Path("data-chunks")
BUCKET_NAME = "spatial-chunks-sidoarjo"

def process_sls():
    print("=" * 60)
    print("PROSES POLYGON SLS SIDOARJO (346 GeoJSON Desa)")
    print("=" * 60)

    geojson_files = glob.glob(str(SLS_DIR / "*.geojson"))
    print(f"Ditemukan {len(geojson_files)} file GeoJSON SLS desa.")

    all_features = []
    manifest_data = {}
    grouped_features = {}

    for filepath in tqdm(geojson_files, desc="Membaca file GeoJSON desa"):
        with open(filepath, "r", encoding="utf-8") as f:
            try:
                data = json.load(f)
            except Exception as e:
                print(f"Error membaca {filepath}: {e}")
                continue

        features = data.get("features", [])
        for feat in features:
            props = feat.get("properties", {})

            kdprov = str(props.get("kdprov", "35")).strip().zfill(2)
            kdkab = str(props.get("kdkab", "15")).strip().zfill(2)
            kdkec = str(props.get("kdkec", "")).strip().zfill(3)
            kddesa = str(props.get("kddesa", "")).strip().zfill(3)

            idkec_str = props.get("idkec")
            if not idkec_str or len(str(idkec_str)) < 7:
                idkec_str = f"{kdprov}{kdkab}{kdkec}"

            iddesa_str = props.get("iddesa")
            if not iddesa_str or len(str(iddesa_str)) < 10:
                iddesa_str = f"{kdprov}{kdkab}{kdkec}{kddesa}"

            idsls_raw = props.get("idsls_str") or props.get("idsls") or props.get("id_sls")
            idsls_str = str(idsls_raw).strip().replace(".0", "") if idsls_raw else ""

            nmkec = str(props.get("nmkec", "")).strip().upper()
            nmdesa = str(props.get("nmdesa", "")).strip().upper()

            feat["properties"]["idkec"] = idkec_str
            feat["properties"]["iddesa"] = iddesa_str
            feat["properties"]["idsls_str"] = idsls_str
            feat["properties"]["nmkec"] = nmkec
            feat["properties"]["nmdesa"] = nmdesa

            if idkec_str not in grouped_features:
                grouped_features[idkec_str] = []
            grouped_features[idkec_str].append(feat)

            if idkec_str not in manifest_data:
                manifest_data[idkec_str] = {
                    "name": nmkec or f"KECAMATAN {idkec_str}",
                    "desa": {}
                }
            if iddesa_str:
                manifest_data[idkec_str]["desa"][iddesa_str] = nmdesa or f"DESA {iddesa_str}"

    sls_out_dir = OUTPUT_DIR / "sls"
    sls_out_dir.mkdir(parents=True, exist_ok=True)

    print("\nMenulis file JSON Chunks SLS per Kecamatan...")
    sls_manifest = {"total_kecamatan": len(grouped_features), "total_features": 0, "kecamatan": {}}

    for kec_id, kec_feats in grouped_features.items():
        out_path = sls_out_dir / f"kec_{kec_id}.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump({
                "type": "FeatureCollection",
                "features": kec_feats,
                "count": len(kec_feats)
            }, f, ensure_ascii=False, separators=(",", ":"))

        size_kb = out_path.stat().st_size / 1024
        print(f"  [OK] SLS kec_{kec_id}: {len(kec_feats):,} polygons -> {size_kb:.0f} KB")
        sls_manifest["kecamatan"][kec_id] = len(kec_feats)
        sls_manifest["total_features"] += len(kec_feats)

    with open(sls_out_dir / "_manifest.json", "w", encoding="utf-8") as f:
        json.dump(sls_manifest, f, ensure_ascii=False, indent=2)

    manifest_list = []
    for kec_id, data in sorted(manifest_data.items()):
        desa_list = []
        for d_id, d_name in sorted(data["desa"].items()):
            desa_list.append({"iddesa": d_id, "nama": d_name})
        manifest_list.append({
            "idkec": kec_id,
            "nama": data["name"],
            "desa": desa_list
        })

    with open(OUTPUT_DIR / "wilayah_manifest.json", "w", encoding="utf-8") as f:
        json.dump({"total_kecamatan": len(manifest_list), "kecamatan": manifest_list}, f, ensure_ascii=False, indent=2)

    print("\n" + "=" * 60)
    print(f"UPLOAD KE SUPABASE STORAGE (BUCKET: '{BUCKET_NAME}')")
    print("=" * 60)

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("[ERROR] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum di-set di .env")
        return

    sb = create_client(url, key)

    files_to_upload = list(sls_out_dir.glob("*.json"))
    files_to_upload.append(OUTPUT_DIR / "wilayah_manifest.json")

    success_count = 0
    for fpath in tqdm(files_to_upload, desc="Uploading to Supabase"):
        if fpath.name == "wilayah_manifest.json":
            storage_path = "wilayah_manifest.json"
        else:
            storage_path = f"sls/{fpath.name}"

        with open(fpath, "rb") as fcontent:
            try:
                sb.storage.from_(BUCKET_NAME).upload(
                    path=storage_path,
                    file=fcontent,
                    file_options={"content-type": "application/json", "cache-control": "public, max-age=86400", "upsert": "true"}
                )
                success_count += 1
            except Exception as e:
                print(f"Error uploading {storage_path}: {e}")

    print(f"\n[OK] Upload Selesai: {success_count}/{len(files_to_upload)} file di bucket '{BUCKET_NAME}'")

if __name__ == "__main__":
    process_sls()
