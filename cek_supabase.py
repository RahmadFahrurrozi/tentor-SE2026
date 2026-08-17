import sys
import argparse
import json
import requests

BUCKET_NAME = "spatial-chunks"
BASE_URL = f"https://xecqftjhqonemrrtcjzp.supabase.co/storage/v1/object/public/{BUCKET_NAME}"
DATASETS = ["usaha", "usaha_digital", "usaha_pertanian", "rumah_tangga", "bangunan", "sls"]

def set_bucket(bucket_or_version):
    global BUCKET_NAME, BASE_URL
    if bucket_or_version == "se2026":
        BUCKET_NAME = "spatial-chunks-se2026"
    elif bucket_or_version == "prelist":
        BUCKET_NAME = "spatial-chunks"
    elif bucket_or_version:
        BUCKET_NAME = bucket_or_version
    BASE_URL = f"https://xecqftjhqonemrrtcjzp.supabase.co/storage/v1/object/public/{BUCKET_NAME}"

def get_manifest(dataset="usaha"):
    url = f"{BASE_URL}/{dataset}/_manifest.json"
    if dataset == "sls":
        url = f"{BASE_URL}/wilayah_manifest.json"
    try:
        r = requests.get(url, timeout=10)
        if r.status_code == 200:
            return r.json()
    except Exception as e:
        print(f"[ERROR] Gagal koneksi ke manifest ({url}): {e}")
    return None

def fetch_chunk(dataset, kec_id):
    url = f"{BASE_URL}/{dataset}/kec_{kec_id}.json"
    try:
        r = requests.get(url, timeout=15)
        if r.status_code == 200:
            return r.json()
    except Exception:
        pass
    return None

def show_manifest(dataset="usaha"):
    print(f"\n" + "=" * 60)
    print(f"  RINGKASAN DATASET: '{dataset.upper()}' DI SUPABASE STORAGE")
    print("=" * 60)
    manifest = get_manifest(dataset)
    if not manifest:
        print(f"[WARN] Manifest untuk dataset '{dataset}' tidak ditemukan.")
        return

    if dataset == "sls":
        kec_list = manifest.get("kecamatan", [])
        print(f"Total Kecamatan: {len(kec_list)}")
        for kec in kec_list:
            print(f"  - Kec {kec.get('idkec')} ({kec.get('nama')}): {len(kec.get('desa', []))} Desa")
        return

    total_rows = sum(manifest.values())
    print(f"Total Kecamatan: {len(manifest)}")
    print(f"Total Data     : {total_rows:,} baris\n")
    print("Rincian per Kecamatan (Kode Kecamatan):")
    for kec_id, count in sorted(manifest.items()):
        print(f"  Kec {kec_id} : {count:,} baris  --> Perintah: python cek_supabase.py --kec {kec_id}")
    print("-" * 60)

def search_keyword(keyword, dataset="usaha"):
    manifest = get_manifest(dataset)
    if not manifest:
        print(f"[WARN] Tidak bisa mengambil manifest dataset '{dataset}'.")
        return

    print(f"\n[SEARCH] Mencari '{keyword}' pada dataset '{dataset}'...")
    kec_keys = list(manifest.keys()) if isinstance(manifest, dict) else [k.get("idkec") for k in manifest.get("kecamatan", [])]
    matches = []

    for kec_id in kec_keys:
        chunk = fetch_chunk(dataset, kec_id)
        if not chunk:
            continue
        data_list = chunk.get("data", chunk.get("features", []))
        for idx, item in enumerate(data_list):
            target = item.get("properties", item) if isinstance(item, dict) else item
            text_repr = json.dumps(target, ensure_ascii=False)
            if keyword.lower() in text_repr.lower():
                matches.append((kec_id, idx + 1, target))

    print("=" * 60)
    if matches:
        print(f"  FOUND {len(matches):,} HASIL UNTUK KATA KUNCI '{keyword}'")
        print("=" * 60)
        for i, (kec_id, row_no, item) in enumerate(matches, 1):
            print(f"[{i}] Kecamatan ID : {kec_id} | Baris Ke-{row_no}")
            for k, v in item.items():
                if v is not None and k not in ("_idkec",):
                    print(f"    {k:15s}: {v}")
            print("-" * 60)
    else:
        print(f"  Tidak ditemukan data dengan kata kunci '{keyword}' pada dataset '{dataset}'.")

def view_kecamatan_data(kec_id, dataset="usaha", limit=10, offset=0, interactive=False):
    print(f"\n[VIEW] Mengambil data Kecamatan ID '{kec_id}' (Dataset: {dataset})...")
    chunk = fetch_chunk(dataset, kec_id)
    if not chunk:
        print(f"[WARN] Data untuk kec_{kec_id}.json tidak ditemukan di Supabase Storage.")
        return

    data_list = chunk.get("data", chunk.get("features", []))
    total_data = len(data_list)
    print(f"Total data di Kecamatan {kec_id}: {total_data:,} baris\n")

    if interactive:
        page_size = limit if limit > 0 else 10
        current_offset = 0
        while current_offset < total_data:
            end_idx = min(current_offset + page_size, total_data)
            print("=" * 60)
            print(f"  MENAMPILKAN BARIS {current_offset + 1} S/D {end_idx} DARI TOTAL {total_data:,} BARIS")
            print("=" * 60)
            for i in range(current_offset, end_idx):
                item = data_list[i]
                target = item.get("properties", item) if isinstance(item, dict) else item
                print(f"[Baris {i + 1}]")
                for k, v in target.items():
                    if v is not None and k not in ("_idkec",):
                        print(f"    {k:15s}: {v}")
                print("-" * 60)
            
            if end_idx >= total_data:
                print("\n[INFO] Sudah mencapai akhir data kecamatan ini.")
                break
            
            try:
                cmd = input(f"\nTekan [ENTER] untuk {page_size} baris berikutnya, atau ketik 'q' untuk keluar: ").strip().lower()
            except (EOFError, KeyboardInterrupt):
                break
            if cmd == 'q':
                break
            current_offset = end_idx
    else:
        start_idx = max(0, offset)
        end_idx = min(start_idx + limit, total_data) if limit > 0 else total_data
        print(f"Menampilkan baris ke {start_idx + 1} s/d {end_idx} (Total {total_data:,} baris):")
        print("=" * 60)
        for i in range(start_idx, end_idx):
            item = data_list[i]
            target = item.get("properties", item) if isinstance(item, dict) else item
            print(f"[Baris {i + 1}]")
            for k, v in target.items():
                if v is not None and k not in ("_idkec",):
                    print(f"    {k:15s}: {v}")
            print("-" * 60)

def view_all_samples(dataset="usaha", limit_per_kec=2):
    manifest = get_manifest(dataset)
    if not manifest or not isinstance(manifest, dict):
        print(f"[WARN] Manifest tidak valid untuk dataset '{dataset}'.")
        return

    print(f"\n[ALL SAMPLES] Menampilkan sampel data per kecamatan (max {limit_per_kec} per kec)...")
    for kec_id in sorted(manifest.keys()):
        chunk = fetch_chunk(dataset, kec_id)
        if not chunk:
            continue
        data_list = chunk.get("data", [])
        print(f"\n>>> KECAMATAN {kec_id} (Total: {len(data_list):,} items)")
        for i, item in enumerate(data_list[:limit_per_kec], 1):
            print(f"  [Baris {i}] {item}")

def interactive_menu():
    current_dataset = "usaha"
    while True:
        print("\n" + "=" * 60)
        print("          SUPABASE SPATIAL DATA VIEWER & CHECKER          ")
        print("=" * 60)
        print(f"  Dataset Aktif : [{current_dataset.upper()}]")
        print("-" * 60)
        print("  [1] Cari berdasarkan Kata Kunci (Keyword Search)")
        print("  [2] Lihat Ringkasan Manifest (Daftar Kode Kecamatan & Total Baris)")
        print("  [3] Lihat Detail Per Kecamatan & Per Baris")
        print("  [4] Tampilkan Sampel Semua Data (Top N per Kecamatan)")
        print("  [5] Ganti Dataset Aktif (usaha / rumah_tangga / bangunan / sls)")
        print("  [0] Keluar")
        print("=" * 60)

        try:
            choice = input("Pilihan Anda (0-5): ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nKeluar.")
            break

        if choice == "1":
            try:
                kw = input("Masukkan kata kunci pencarian (contoh: Diki Hafish / Toko / Krajan): ").strip()
            except (EOFError, KeyboardInterrupt):
                break
            if kw:
                search_keyword(kw, dataset=current_dataset)
        elif choice == "2":
            show_manifest(dataset=current_dataset)
        elif choice == "3":
            try:
                kec = input("Masukkan Kode Kecamatan ID (contoh: 3510010): ").strip()
            except (EOFError, KeyboardInterrupt):
                break
            if kec:
                print("\nMode Tampilan Kecamatan:")
                print("  [1] Paginasi Interaktif (Tekan ENTER untuk lihat 10 baris berikutnya)")
                print("  [2] Tampilkan N baris pertama (misal: 10 baris)")
                print("  [3] Tampilkan SEMUA baris kecamatan ini")
                try:
                    mode = input("Pilih mode (1/2/3, default 1): ").strip()
                except (EOFError, KeyboardInterrupt):
                    break
                if mode == "2":
                    try:
                        lim_str = input("Masukkan jumlah baris (default 10): ").strip()
                    except (EOFError, KeyboardInterrupt):
                        break
                    lim = int(lim_str) if lim_str.isdigit() else 10
                    view_kecamatan_data(kec, dataset=current_dataset, limit=lim, interactive=False)
                elif mode == "3":
                    view_kecamatan_data(kec, dataset=current_dataset, limit=0, interactive=False)
                else:
                    view_kecamatan_data(kec, dataset=current_dataset, limit=10, interactive=True)
        elif choice == "4":
            try:
                limit_str = input("Jumlah sampel per kecamatan (default: 2): ").strip()
            except (EOFError, KeyboardInterrupt):
                break
            limit = int(limit_str) if limit_str.isdigit() else 2
            view_all_samples(dataset=current_dataset, limit_per_kec=limit)
        elif choice == "5":
            print("\nDaftar Dataset:")
            for idx, d in enumerate(DATASETS, 1):
                print(f"  {idx}. {d}")
            try:
                ds_choice = input(f"Pilih nomor (1-{len(DATASETS)}) atau ketik nama dataset: ").strip()
            except (EOFError, KeyboardInterrupt):
                break
            if ds_choice.isdigit() and 1 <= int(ds_choice) <= len(DATASETS):
                current_dataset = DATASETS[int(ds_choice) - 1]
            elif ds_choice in DATASETS:
                current_dataset = ds_choice
            else:
                print("[WARN] Dataset tidak valid.")
        elif choice == "0":
            print("Terima kasih!")
            break
        else:
            print("[WARN] Pilihan tidak valid, silakan coba lagi.")

def main():
    parser = argparse.ArgumentParser(description="Supabase Storage Data Viewer & Checker")
    parser.add_argument("-k", "--keyword", help="Cari kata kunci di dataset")
    parser.add_argument("-d", "--dataset", default="usaha", choices=DATASETS, help="Pilih dataset")
    parser.add_argument("-m", "--manifest", action="store_true", help="Tampilkan ringkasan manifest")
    parser.add_argument("-c", "--kec", help="Tampilkan data untuk kecamatan ID tertentu (contoh: 3510010)")
    parser.add_argument("-l", "--limit", type=int, default=10, help="Jumlah baris yang mau ditampilkan (default 10, 0 untuk semua)")
    parser.add_argument("-o", "--offset", type=int, default=0, help="Offset awal baris (default 0)")
    parser.add_argument("-i", "--interactive", action="store_true", help="Paginasi interaktif per 10 baris")
    parser.add_argument("-a", "--all-samples", action="store_true", help="Tampilkan sampel dari semua kecamatan")
    parser.add_argument("--dataset-version", choices=["prelist", "se2026"], default="prelist", help="Versi dataset (prelist -> spatial-chunks, se2026 -> spatial-chunks-se2026)")
    parser.add_argument("--bucket", help="Nama bucket kustom")
    args = parser.parse_args()

    bucket_target = args.bucket if args.bucket else args.dataset_version
    set_bucket(bucket_target)

    if len(sys.argv) == 1:
        interactive_menu()
        return

    if args.manifest:
        show_manifest(args.dataset)
    elif args.keyword:
        search_keyword(args.keyword, args.dataset)
    elif args.kec:
        view_kecamatan_data(args.kec, args.dataset, limit=args.limit, offset=args.offset, interactive=args.interactive)
    elif args.all_samples:
        view_all_samples(args.dataset)
    else:
        interactive_menu()

if __name__ == "__main__":
    main()
