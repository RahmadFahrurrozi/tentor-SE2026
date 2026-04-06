import geopandas as gpd

gdf = gpd.read_file("data/osm-building.geojson")
print(gdf.crs)

gdf2 = gpd.read_file("data/peta-kabupaten-banyuwangi.geojson")
print(gdf2.crs)

gdf3 = gpd.read_file("data/sls-after-ea-sls-2024.json")
print(gdf3.crs)