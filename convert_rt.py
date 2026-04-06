import pandas as pd

# Load Excel
df = pd.read_excel('data/data-rumah-tangga.xlsx')

# Buang kolom kosong
df = df.drop(columns=['Unnamed: 11'], errors='ignore')

# Rename kolom biar konsisten dengan data usaha
df = df.rename(columns={
    'latitude':  'lat final',
    'longitude': 'long final',
    'idsls':     'idsls final',
})

# Validasi koordinat
df = df.dropna(subset=['lat final', 'long final'])
df = df[df['lat final'].between(-90, 90)]
df = df[df['long final'].between(-180, 180)]

# Normalisasi idsls jadi string
def safe_idsls(x):
    if pd.isna(x): return None
    try:
        return str(int(float(x)))
    except:
        return None

df['idsls_str'] = df['idsls final'].apply(safe_idsls)

df['wid'] = df['wid'].astype(str)

# Convert all column names to string to avoid pyarrow errors
df.columns = df.columns.astype(str)

# Convert all columns with object dtype to string to avoid ArrowTypeError: Expected bytes, got list object
for col in df.select_dtypes(include=['object']).columns:
    df[col] = df[col].astype(str)
# Simpan ke Parquet
df.to_parquet('data/rumah-tangga.parquet', index=False)

print(f'✅ Berhasil!')
print(f'Total baris  : {len(df):,}')
print(f'Kolom        : {df.columns.tolist()}')