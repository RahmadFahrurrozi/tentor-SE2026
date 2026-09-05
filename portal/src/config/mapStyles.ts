import type { StyleSpecification } from "maplibre-gl";

export type BasemapId = "auto" | "dark" | "light" | "google-hybrid" | "esri-satellite";

export interface BasemapConfig {
  id: BasemapId;
  name: string;
  category: "vector" | "satellite";
  description: string;
  style: string | StyleSpecification;
}

// 1. CARTO Dark Matter (Vektor Gelap)
export const CARTO_DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

// 2. OpenFreeMap Liberty (Vektor Terang)
export const OPENFREEMAP_LIGHT_STYLE = "https://tiles.openfreemap.org/styles/liberty";

// 3. Google Hybrid (Satelit + Label Jalan & Batas Wilayah)
export const GOOGLE_HYBRID_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    "google-hybrid-tiles": {
      type: "raster",
      tiles: [
        "https://mt0.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
        "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
        "https://mt2.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
        "https://mt3.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
      ],
      tileSize: 256,
      attribution: "Map data © Google",
    },
  },
  layers: [
    {
      id: "google-hybrid-layer",
      type: "raster",
      source: "google-hybrid-tiles",
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};

// 4. ESRI Satellite Hybrid (Citra Satelit Dunia + Layer Label & Batas Wilayah)
export const ESRI_SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    "esri-imagery-tiles": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution:
        "Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
    },
    "esri-reference-tiles": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
    },
  },
  layers: [
    {
      id: "esri-imagery-layer",
      type: "raster",
      source: "esri-imagery-tiles",
      minzoom: 0,
      maxzoom: 20,
    },
    {
      id: "esri-reference-layer",
      type: "raster",
      source: "esri-reference-tiles",
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

// Default styles mapping untuk dark & light
export const DEFAULT_MAP_STYLES = {
  dark: CARTO_DARK_STYLE,
  light: OPENFREEMAP_LIGHT_STYLE,
};

// Katalog semua pilihan basemap untuk UI switcher
export const AVAILABLE_BASEMAPS: BasemapConfig[] = [
  {
    id: "auto",
    name: "Automated",
    category: "vector",
    description: "Follows the application theme (Dark / Light)",
    style: DEFAULT_MAP_STYLES.dark,
  },
  {
    id: "google-hybrid",
    name: "Google Maps",
    category: "satellite",
    description: "Google Satellite Imagery + Road Labels & POI",
    style: GOOGLE_HYBRID_STYLE,
  },
  // {
  //   id: "esri-satellite",
  //   name: "ESRI Satellite",
  //   category: "satellite",
  //   description: "ESRI Satellite Imagery + Official Boundaries",
  //   style: ESRI_SATELLITE_STYLE,
  // },
  {
    id: "dark",
    name: "Carto Dark",
    category: "vector",
    description: "Dark minimal display with focus on points",
    style: CARTO_DARK_STYLE,
  },
  {
    id: "light",
    name: "Light Map",
    category: "vector",
    description: "OpenFreeMap Liberty roads & open spaces",
    style: OPENFREEMAP_LIGHT_STYLE,
  },
];

/**
 * Resolver helper untuk mendapatkan style MapLibre sesuai pilihan basemap & tema aktif
 */
export function resolveMapStyle(
  basemapId: BasemapId,
  currentTheme: "dark" | "light" = "dark"
): string | StyleSpecification {
  switch (basemapId) {
    case "google-hybrid":
      return GOOGLE_HYBRID_STYLE;
    case "esri-satellite":
      return ESRI_SATELLITE_STYLE;
    case "dark":
      return CARTO_DARK_STYLE;
    case "light":
      return OPENFREEMAP_LIGHT_STYLE;
    case "auto":
    default:
      return currentTheme === "dark" ? CARTO_DARK_STYLE : OPENFREEMAP_LIGHT_STYLE;
  }
}
