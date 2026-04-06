import geopandas as gpd
import os

parquet_path = "data/osm-building.parquet"
geojson_path = "data/osm-building.geojson"

if os.path.exists(parquet_path):
    gdf = gpd.read_parquet(parquet_path)
else:
    gdf = gpd.read_file(geojson_path)

print(f'Total bangunan OSM: {len(gdf):,}')
print(f'Kolom: {gdf.columns.tolist()}')