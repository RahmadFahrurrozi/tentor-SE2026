import geopandas as gpd

gdf = gpd.read_parquet("data/osm-building.parquet")

print("Contoh nilai kolom 'building':")
print(gdf['building'].value_counts().head(10))

print("\nContoh nilai kolom 'amenity':")
print(gdf['amenity'].value_counts().head(10))