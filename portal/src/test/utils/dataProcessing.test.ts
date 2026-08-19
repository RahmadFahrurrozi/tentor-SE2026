import { describe, it, expect } from "vitest";
import { assignSlsToPoints, calculateBbox, generateSyntheticBuildingForPoint } from "@/utils/dataProcessing";

describe("dataProcessing utils", () => {
  it("should calculate bounding box of geojson correctly", () => {
    const geojson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [114.3, -8.2],
          },
        },
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [114.5, -8.0],
          },
        },
      ],
    };

    const bbox = calculateBbox(geojson as any);
    expect(bbox).toEqual([114.3, -8.2, 114.5, -8.0]);
  });

  it("should assign SLS ID to points falling inside SLS geometry", () => {
    const points = [
      { id: "p1", lon: 114.35, lat: -8.21 },
      { id: "p2", lon: 0, lat: 0 },
    ];

    const slsGeoJson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { idsls: "35100100010001" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [114.30, -8.25],
                [114.40, -8.25],
                [114.40, -8.15],
                [114.30, -8.15],
                [114.30, -8.25],
              ],
            ],
          },
        },
      ],
    };

    const result = assignSlsToPoints(points, slsGeoJson as any);
    expect(result[0].idsls_str).toBe("35100100010001");
    expect(result[1].idsls_str).toBeFalsy();
  });

  it("should generate a 6m x 6m synthetic building polygon around point coordinates", () => {
    const lat = -8.21;
    const lng = 114.35;
    const polygon = generateSyntheticBuildingForPoint(lat, lng, 6);

    expect(polygon.type).toBe("Polygon");
    expect(polygon.coordinates[0].length).toBe(5);
    // Closed polygon ring
    expect(polygon.coordinates[0][0]).toEqual(polygon.coordinates[0][4]);
  });
});
