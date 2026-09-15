export interface RegionConfig {
  id: string; // "3510" | "3515" | "3577"
  name: string;
  shortName: string;
  bucketName: string;
  center: [number, number]; // [lng, lat]
  zoom: number;
  hasPrelist: boolean;
}

export const REGIONS: Record<string, RegionConfig> = {
  "3510": {
    id: "3510",
    name: "Kabupaten Banyuwangi",
    shortName: "Banyuwangi",
    bucketName: "spatial-chunks-se2026",
    center: [114.3692, -8.2192],
    zoom: 10,
    hasPrelist: true,
  },
  "3515": {
    id: "3515",
    name: "Kabupaten Sidoarjo",
    shortName: "Sidoarjo",
    bucketName: "spatial-chunks-sidoarjo",
    center: [112.7183, -7.4478],
    zoom: 11,
    hasPrelist: false,
  },
  "3577": {
    id: "3577",
    name: "Kota Madiun",
    shortName: "Madiun",
    bucketName: "spatial-chunks-madiun",
    center: [111.527, -7.638],
    zoom: 13,
    hasPrelist: false,
  },
};
