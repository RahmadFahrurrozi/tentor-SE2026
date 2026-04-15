import json
import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables (Make sure to set these in your .env file)
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") # Use service role key for bypass RLS

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

FILE_PATH = "data/sls-after-ea-sls-2024.json"

def import_wilayah():
    print(f"Reading file: {FILE_PATH}...")
    
    with open(FILE_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    features = data.get('features', [])
    unique_wilayah = {}

    print(f"Processing {len(features)} records...")

    for feature in features:
        props = feature.get('properties', {})
        iddesa = props.get('iddesa')
        idkec = props.get('idkec')
        nmkec = props.get('nmkec')
        nmdesa = props.get('nmdesa')

        if iddesa and iddesa not in unique_wilayah:
            unique_wilayah[iddesa] = {
                "iddesa": iddesa,
                "idkec": idkec,
                "nmkec": nmkec,
                "nmdesa": nmdesa
            }

    records = list(unique_wilayah.values())
    total_records = len(records)
    print(f"Found {total_records} unique Desa.")

    # Batch insert to avoid huge requests
    batch_size = 100
    for i in range(0, total_records, batch_size):
        batch = records[i:i + batch_size]
        print(f"Uploading batch {i // batch_size + 1} ({len(batch)} records)...")
        
        try:
            # Upsert using iddesa as unique constraint
            supabase.table("master_wilayah").upsert(batch).execute()
        except Exception as e:
            print(f"Error uploading batch: {e}")
            break

    print("Import completed successfully!")

if __name__ == "__main__":
    import_wilayah()
